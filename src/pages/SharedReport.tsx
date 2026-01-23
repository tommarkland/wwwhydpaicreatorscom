import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Logo } from '@/components/Logo';
import { AlertTriangle, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface SharedReportData {
  id: string;
  creator_name: string;
  creator_urls: string | null;
  region: string;
  category: string;
  following_size: number | null;
  cost: number | null;
  average_views: number | null;
  content_quality: number | null;
  quality_score: number | null;
  brand_safety_score: number | null;
  brand_safety_issues: string[] | null;
  brand_safety_summary: string | null;
  notes: string | null;
  created_at: string;
}

const SharedReport = () => {
  const { token } = useParams<{ token: string }>();
  const [evaluation, setEvaluation] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedReport = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      // First get the shared report entry
      const { data: sharedReport, error: shareError } = await supabase
        .from('shared_reports')
        .select('evaluation_id, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (shareError || !sharedReport) {
        setError('Report not found or link has expired');
        setLoading(false);
        return;
      }

      // Check if expired
      if (sharedReport.expires_at && new Date(sharedReport.expires_at) < new Date()) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Fetch the evaluation data
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', sharedReport.evaluation_id)
        .maybeSingle();

      if (evalError || !evalData) {
        setError('Report not found');
        setLoading(false);
        return;
      }

      setEvaluation({
        ...evalData,
        brand_safety_issues: Array.isArray(evalData.brand_safety_issues) 
          ? evalData.brand_safety_issues as string[] 
          : null
      });
      setLoading(false);
    };

    fetchSharedReport();
  }, [token]);

  const getSafetyColor = (score: number | null) => {
    if (score === null) return { bg: 'bg-secondary', text: 'text-muted-foreground', label: 'Not Analyzed' };
    if (score >= 4) return { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Safe' };
    if (score >= 3) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Acceptable' };
    return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Risky' };
  };

  const getSafetyIcon = (score: number | null) => {
    if (score === null) return null;
    if (score >= 4) return <CheckCircle className="h-6 w-6 text-green-400" />;
    if (score >= 3) return <AlertCircle className="h-6 w-6 text-yellow-400" />;
    return <AlertTriangle className="h-6 w-6 text-red-400" />;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mt-8 mb-2">Report Not Found</h1>
        <p className="text-muted-foreground mb-8">{error || 'This report does not exist or has been removed.'}</p>
        <Link to="/" className="text-primary hover:underline">
          Go to HYDP Creator Evaluator
        </Link>
      </div>
    );
  }

  const safetyStatus = getSafetyColor(evaluation.brand_safety_score);
  const urls = evaluation.creator_urls?.split('\n').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Logo size="md" />
          <span className="text-sm text-muted-foreground">Shared Report</span>
        </div>
      </header>

      {/* Report Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Title */}
        <h1 className="text-5xl font-bold tracking-tight mb-2">{evaluation.creator_name}</h1>
        <p className="text-muted-foreground text-lg mb-6">Creator Evaluation Report</p>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-3 mb-12">
          <span className="bg-secondary px-4 py-2 rounded-lg text-sm font-medium">
            {evaluation.category}
          </span>
          <span className="bg-secondary px-4 py-2 rounded-lg text-sm font-medium">
            {evaluation.region}
          </span>
          <span className="bg-secondary px-4 py-2 rounded-lg text-sm font-medium">
            Evaluated: {format(new Date(evaluation.created_at), 'MMM d, yyyy')}
          </span>
        </div>

        {/* URLs */}
        {urls.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Creator URLs</h2>
            <div className="flex flex-wrap gap-3">
              {urls.map((url, index) => {
                const parts = url.split(': ');
                const platform = parts[0];
                const link = parts[1] || url;
                return (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {platform}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary rounded-xl p-6 text-center">
              <div className="text-xs text-muted-foreground mb-2">Following Size</div>
              <div className="text-2xl font-semibold">{formatNumber(evaluation.following_size)}</div>
            </div>
            <div className="bg-secondary rounded-xl p-6 text-center">
              <div className="text-xs text-muted-foreground mb-2">Recommended Cost</div>
              <div className="text-2xl font-semibold">{formatCurrency(evaluation.cost)}</div>
            </div>
            <div className="bg-secondary rounded-xl p-6 text-center">
              <div className="text-xs text-muted-foreground mb-2">Average Views</div>
              <div className="text-2xl font-semibold">{formatNumber(evaluation.average_views)}</div>
            </div>
            <div className="bg-secondary rounded-xl p-6 text-center">
              <div className="text-xs text-muted-foreground mb-2">Content Quality</div>
              <div className="text-2xl font-semibold">
                {evaluation.content_quality !== null ? `${evaluation.content_quality}/10` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Evaluation Scores</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-8 text-center">
              <div className="text-sm text-muted-foreground mb-3">Quality Score</div>
              <div className="text-6xl font-bold text-primary">
                {evaluation.quality_score !== null ? evaluation.quality_score.toFixed(1) : '-'}
              </div>
            </div>
            <div className={`${safetyStatus.bg} border border-current/20 rounded-2xl p-8 text-center`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Brand Safety Score</span>
                {getSafetyIcon(evaluation.brand_safety_score)}
              </div>
              <div className={`text-6xl font-bold ${safetyStatus.text}`}>
                {evaluation.brand_safety_score !== null ? evaluation.brand_safety_score : '-'}
              </div>
              <div className={`text-sm mt-2 ${safetyStatus.text}`}>{safetyStatus.label}</div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {evaluation.brand_safety_issues && evaluation.brand_safety_issues.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Flagged Issues
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm">
              {evaluation.brand_safety_issues.map((issue, index) => (
                <li key={index} className="text-foreground/90">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        {evaluation.brand_safety_summary && (
          <div className="bg-secondary rounded-xl p-6 mb-10">
            <h4 className="font-semibold mb-3">Brand Safety Summary</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {evaluation.brand_safety_summary}
            </p>
          </div>
        )}

        {/* Notes */}
        {evaluation.notes && (
          <div className="mb-10">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Additional Notes</h2>
            <div className="bg-secondary rounded-xl p-6">
              <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                {evaluation.notes}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground text-sm">This report was generated by HYDP Creator Evaluator AmazonAds</p>
          <a 
            href="https://www.hydp.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            www.hydp.ai
          </a>
        </div>
      </div>
    </div>
  );
};

export default SharedReport;
