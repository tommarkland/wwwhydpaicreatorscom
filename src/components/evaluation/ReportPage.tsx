import { useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { FileText, Image, X, AlertTriangle, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Evaluation } from './EvaluationList';
import html2canvas from 'html2canvas';

interface ReportPageProps {
  evaluation: Evaluation;
  onClose: () => void;
}

export const ReportPage = ({ evaluation, onClose }: ReportPageProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

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

  const safetyStatus = getSafetyColor(evaluation.brand_safety_score);
  const urls = evaluation.creator_urls?.split('\n').filter(Boolean) || [];

  const downloadAsPng = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#161b26',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `${evaluation.creator_name.replace(/\s+/g, '-')}-report.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate PNG:', error);
    }
  };

  const downloadAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Creator Report - ${evaluation.creator_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #161b26;
            color: #f2f2f2;
            padding: 48px;
            min-height: 100vh;
          }
          .container { max-width: 900px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
          .logo { font-size: 24px; font-weight: 700; }
          .date { color: #6b7280; font-size: 14px; }
          .title { font-size: 48px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
          .subtitle { color: #6b7280; font-size: 18px; margin-bottom: 32px; }
          .meta { display: flex; gap: 12px; margin-bottom: 48px; }
          .badge { background: #1e2533; padding: 8px 16px; border-radius: 8px; font-size: 14px; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .metric-card { background: #1e2533; padding: 24px; border-radius: 12px; text-align: center; }
          .metric-label { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
          .metric-value { font-size: 24px; font-weight: 600; }
          .scores-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .score-card { padding: 32px; border-radius: 16px; text-align: center; }
          .quality-card { background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05)); border: 1px solid rgba(34, 197, 94, 0.2); }
          .safety-card-safe { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }
          .safety-card-warn { background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); }
          .safety-card-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
          .score-label { color: #6b7280; font-size: 14px; margin-bottom: 12px; }
          .score-value { font-size: 56px; font-weight: 700; }
          .score-value.primary { color: #22c55e; }
          .score-value.safe { color: #22c55e; }
          .score-value.warn { color: #eab308; }
          .score-value.danger { color: #ef4444; }
          .score-status { font-size: 14px; margin-top: 8px; }
          .issues-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 20px; margin-top: 24px; }
          .issues-title { color: #ef4444; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
          .issues-list { list-style: disc; margin-left: 20px; }
          .issues-list li { color: #f2f2f2; margin-bottom: 8px; font-size: 14px; }
          .summary-box { background: #1e2533; border-radius: 12px; padding: 20px; margin-top: 24px; }
          .summary-title { font-weight: 600; margin-bottom: 8px; }
          .summary-text { color: #9ca3af; font-size: 14px; line-height: 1.6; }
          .notes-box { background: #1e2533; border-radius: 12px; padding: 20px; }
          .notes-text { color: #9ca3af; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #1e2533; text-align: center; color: #4b5563; font-size: 12px; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HYDP</div>
            <div class="date">Generated on ${format(new Date(), 'MMMM d, yyyy')}</div>
          </div>
          
          <h1 class="title">${evaluation.creator_name}</h1>
          <p class="subtitle">Creator Evaluation Report</p>
          
          <div class="meta">
            <span class="badge">${evaluation.category}</span>
            <span class="badge">${evaluation.region}</span>
            <span class="badge">Evaluated: ${format(new Date(evaluation.created_at), 'MMM d, yyyy')}</span>
          </div>
          
          <div class="section">
            <h2 class="section-title">Performance Metrics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Following Size</div>
                <div class="metric-value">${formatNumber(evaluation.following_size)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Recommended Cost</div>
                <div class="metric-value">${formatCurrency(evaluation.cost)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Average Views</div>
                <div class="metric-value">${formatNumber(evaluation.average_views)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Content Quality</div>
                <div class="metric-value">${evaluation.content_quality !== null ? `${evaluation.content_quality}/10` : '-'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Evaluation Scores</h2>
            <div class="scores-grid">
              <div class="score-card quality-card">
                <div class="score-label">Quality Score</div>
                <div class="score-value primary">${evaluation.quality_score !== null ? evaluation.quality_score.toFixed(1) : '-'}</div>
              </div>
              <div class="score-card ${evaluation.brand_safety_score !== null ? (evaluation.brand_safety_score >= 4 ? 'safety-card-safe' : evaluation.brand_safety_score >= 3 ? 'safety-card-warn' : 'safety-card-danger') : ''}">
                <div class="score-label">Brand Safety Score</div>
                <div class="score-value ${evaluation.brand_safety_score !== null ? (evaluation.brand_safety_score >= 4 ? 'safe' : evaluation.brand_safety_score >= 3 ? 'warn' : 'danger') : ''}">${evaluation.brand_safety_score !== null ? evaluation.brand_safety_score : '-'}</div>
                <div class="score-status">${safetyStatus.label}</div>
              </div>
            </div>
            
            ${evaluation.brand_safety_issues && evaluation.brand_safety_issues.length > 0 ? `
              <div class="issues-box">
                <div class="issues-title">⚠️ Flagged Issues</div>
                <ul class="issues-list">
                  ${evaluation.brand_safety_issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${evaluation.brand_safety_summary ? `
              <div class="summary-box">
                <div class="summary-title">Brand Safety Summary</div>
                <p class="summary-text">${evaluation.brand_safety_summary}</p>
              </div>
            ` : ''}
          </div>
          
          ${evaluation.notes ? `
            <div class="section">
              <h2 class="section-title">Additional Notes</h2>
              <div class="notes-box">
                <p class="notes-text">${evaluation.notes}</p>
              </div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This report was generated by HYDP Creator Calculator</p>
            <p>Confidential - For internal use only</p>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={downloadAsPng} className="bg-secondary/50 border-border/50">
              <Image className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button variant="outline" onClick={downloadAsPdf} className="bg-secondary/50 border-border/50">
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Logo size="md" />
          <span className="text-muted-foreground text-sm">
            Generated on {format(new Date(), 'MMMM d, yyyy')}
          </span>
        </div>

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
          <p className="text-muted-foreground text-sm">This report was generated by HYDP Creator Calculator</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Confidential - For internal use only</p>
        </div>
      </div>
    </div>
  );
};
