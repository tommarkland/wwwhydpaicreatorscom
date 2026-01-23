import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Trash2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export interface Evaluation {
  id: string;
  user_id: string;
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
  brand_safety_issues: string[];
  brand_safety_summary: string | null;
  notes: string | null;
  created_at: string;
}

interface EvaluationListProps {
  evaluations: Evaluation[];
  onView: (evaluation: Evaluation) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export const EvaluationList = ({
  evaluations,
  onView,
  onDelete,
  isLoading,
}: EvaluationListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvaluations = evaluations.filter((evaluation) =>
    evaluation.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSafetyBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 4) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          {score}/5
        </Badge>
      );
    }
    if (score >= 3) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          {score}/5
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {score}/5
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Evaluation History</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search evaluations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvaluations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {searchTerm ? 'No evaluations match your search' : 'No evaluations yet. Create your first one!'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Creator</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Quality Score</TableHead>
                <TableHead className="text-center">Brand Safety</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => (
                <TableRow key={evaluation.id} className="border-border/50 hover:bg-secondary/50 cursor-pointer" onClick={() => onView(evaluation)}>
                  <TableCell className="font-medium">{evaluation.creator_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-secondary">{evaluation.category}</Badge>
                  </TableCell>
                  <TableCell>{evaluation.region}</TableCell>
                  <TableCell className="text-center">
                    {evaluation.quality_score !== null ? (
                      <span className="font-semibold text-primary">
                        {evaluation.quality_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getSafetyBadge(evaluation.brand_safety_score)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(evaluation.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(evaluation)}
                        className="hover:bg-secondary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(evaluation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
