import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, ExternalLink, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Evaluation } from './EvaluationList';

interface EvaluationDetailProps {
  evaluation: Evaluation | null;
  open: boolean;
  onClose: () => void;
  onDownloadPdf: (evaluation: Evaluation) => void;
}

export const EvaluationDetail = ({
  evaluation,
  open,
  onClose,
  onDownloadPdf,
}: EvaluationDetailProps) => {
  if (!evaluation) return null;

  const getSafetyColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 4) return 'bg-green-50 border-green-200 text-green-700';
    if (score >= 3) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-red-50 border-red-200 text-red-700';
  };

  const getSafetyIcon = (score: number | null) => {
    if (score === null) return null;
    if (score >= 4) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 3) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
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

  const urls = evaluation.creator_urls?.split('\n').filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{evaluation.creator_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Category</span>
              <p className="font-medium">
                <Badge variant="secondary">{evaluation.category}</Badge>
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Region</span>
              <p className="font-medium">{evaluation.region}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Date Evaluated</span>
              <p className="font-medium">
                {format(new Date(evaluation.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {urls.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">URLs</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Metrics */}
          <div>
            <h3 className="font-semibold mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Following</span>
                <p className="font-semibold text-lg">{formatNumber(evaluation.following_size)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Cost</span>
                <p className="font-semibold text-lg">{formatCurrency(evaluation.cost)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Avg. Views</span>
                <p className="font-semibold text-lg">{formatNumber(evaluation.average_views)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Content Quality</span>
                <p className="font-semibold text-lg">
                  {evaluation.content_quality !== null ? `${evaluation.content_quality}/10` : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scores */}
          <div>
            <h3 className="font-semibold mb-3">Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm text-muted-foreground">Quality Score</span>
                <p className="font-bold text-3xl text-primary">
                  {evaluation.quality_score !== null ? evaluation.quality_score.toFixed(1) : '-'}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${getSafetyColor(evaluation.brand_safety_score)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Brand Safety Score</span>
                  {getSafetyIcon(evaluation.brand_safety_score)}
                </div>
                <p className="font-bold text-3xl">
                  {evaluation.brand_safety_score !== null ? evaluation.brand_safety_score : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Brand Safety Issues */}
          {evaluation.brand_safety_issues && evaluation.brand_safety_issues.length > 0 && (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Flagged Issues
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {evaluation.brand_safety_issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Brand Safety Summary */}
          {evaluation.brand_safety_summary && (
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Brand Safety Summary</h4>
              <p className="text-sm text-muted-foreground">{evaluation.brand_safety_summary}</p>
            </div>
          )}

          {/* Notes */}
          {evaluation.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {evaluation.notes}
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={() => onDownloadPdf(evaluation)}>
              <FileText className="mr-2 h-4 w-4" />
              Download PDF Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
