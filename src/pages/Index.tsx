import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreatorForm, EvaluationFormData } from '@/components/evaluation/CreatorForm';
import { EvaluationList, Evaluation } from '@/components/evaluation/EvaluationList';
import { EvaluationDetail } from '@/components/evaluation/EvaluationDetail';
import { calculateQualityScore } from '@/lib/scoreCalculator';
import { generatePdfReport } from '@/lib/pdfGenerator';
import { LogOut, Plus, LayoutDashboard, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [brandSafetyResult, setBrandSafetyResult] = useState<{ score: number; issues: string[]; summary: string } | null>(null);
  const [qualityScore, setQualityScore] = useState<number | undefined>();
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<{ company_name?: string; logo_url?: string; brand_primary_color?: string; brand_secondary_color?: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvaluations();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
    if (data) setProfile(data);
  };

  const fetchEvaluations = async () => {
    setIsLoadingEvaluations(true);
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading evaluations', description: error.message, variant: 'destructive' });
    } else {
      setEvaluations((data || []) as Evaluation[]);
    }
    setIsLoadingEvaluations(false);
  };

  const handleRunBrandSafety = async (creatorName: string, urls: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ creatorName, creatorUrls: urls }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Brand safety analysis failed');
      }

      const result = await response.json();
      setBrandSafetyResult(result);
      toast({ title: 'Brand safety analysis complete' });
    } catch (error) {
      toast({ title: 'Analysis failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (formData: EvaluationFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    const score = calculateQualityScore({
      followingSize: formData.followingSize ? parseInt(formData.followingSize) : null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      averageViews: formData.averageViews ? parseInt(formData.averageViews) : null,
      contentQuality: formData.contentQuality,
    });

    const { error } = await supabase.from('evaluations').insert({
      user_id: user.id,
      creator_name: formData.creatorName,
      creator_urls: formData.creatorUrls || null,
      region: formData.region,
      category: formData.category,
      following_size: formData.followingSize ? parseInt(formData.followingSize) : null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      average_views: formData.averageViews ? parseInt(formData.averageViews) : null,
      content_quality: formData.contentQuality,
      quality_score: score,
      brand_safety_score: brandSafetyResult?.score ?? null,
      brand_safety_issues: brandSafetyResult?.issues ?? [],
      brand_safety_summary: brandSafetyResult?.summary ?? null,
      notes: formData.notes || null,
    });

    setIsSubmitting(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Evaluation saved!' });
      setBrandSafetyResult(null);
      setQualityScore(undefined);
      setActiveTab('dashboard');
      fetchEvaluations();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('evaluations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Evaluation deleted' });
      fetchEvaluations();
    }
  };

  const handleDownloadPdf = (evaluation: Evaluation) => {
    generatePdfReport(evaluation, {
      companyName: profile?.company_name,
      logoUrl: profile?.logo_url,
      primaryColor: profile?.brand_primary_color,
      secondaryColor: profile?.brand_secondary_color,
    });
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-primary">Creator Evaluation Tool</h1>
          <Button variant="ghost" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="new"><Plus className="mr-2 h-4 w-4" />New Evaluation</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <EvaluationList evaluations={evaluations} onView={setSelectedEvaluation} onDelete={handleDelete} onDownloadPdf={handleDownloadPdf} isLoading={isLoadingEvaluations} />
          </TabsContent>

          <TabsContent value="new">
            <CreatorForm onSubmit={handleSubmit} onRunBrandSafety={handleRunBrandSafety} isSubmitting={isSubmitting} isAnalyzing={isAnalyzing} brandSafetyResult={brandSafetyResult} qualityScore={qualityScore} />
          </TabsContent>
        </Tabs>
      </main>

      <EvaluationDetail evaluation={selectedEvaluation} open={!!selectedEvaluation} onClose={() => setSelectedEvaluation(null)} onDownloadPdf={handleDownloadPdf} />
    </div>
  );
};

export default Index;
