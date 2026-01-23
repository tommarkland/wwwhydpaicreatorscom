import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreatorForm, EvaluationFormData } from '@/components/evaluation/CreatorForm';
import { EvaluationList, Evaluation } from '@/components/evaluation/EvaluationList';
import { ReportPage } from '@/components/evaluation/ReportPage';
import { calculateQualityScore } from '@/lib/scoreCalculator';
import { calculateRecommendedCost } from '@/lib/costCalculator';
import { Logo } from '@/components/Logo';
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
  const [activeTab, setActiveTab] = useState('new');
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

  const handleRunBrandSafety = async (creatorName: string, socialUrls: Record<string, string>) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ creatorName, socialUrls }),
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

  const formatUrlsForStorage = (formData: EvaluationFormData): string => {
    const urls: string[] = [];
    if (formData.youtubeUrl) urls.push(`YouTube: ${formData.youtubeUrl}`);
    if (formData.instagramUrl) urls.push(`Instagram: ${formData.instagramUrl}`);
    if (formData.tiktokUrl) urls.push(`TikTok: ${formData.tiktokUrl}`);
    if (formData.twitterUrl) urls.push(`X/Twitter: ${formData.twitterUrl}`);
    if (formData.linkedinUrl) urls.push(`LinkedIn: ${formData.linkedinUrl}`);
    if (formData.facebookUrl) urls.push(`Facebook: ${formData.facebookUrl}`);
    if (formData.websiteUrl) urls.push(`Website: ${formData.websiteUrl}`);
    return urls.join('\n');
  };

  const handleSubmit = async (formData: EvaluationFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    const score = calculateQualityScore({
      averageViews: formData.averageViews ? parseInt(formData.averageViews) : null,
      followingSize: formData.followingSize ? parseInt(formData.followingSize) : null,
      region: formData.region,
      memberType: formData.category,
    });

    const recommendedCost = calculateRecommendedCost({
      averageViews: formData.averageViews ? parseInt(formData.averageViews) : null,
      followingSize: formData.followingSize ? parseInt(formData.followingSize) : null,
      contentQuality: formData.contentQuality,
      region: formData.region,
      memberType: formData.category,
    });

    const { error } = await supabase.from('evaluations').insert({
      user_id: user.id,
      creator_name: formData.creatorName,
      creator_urls: formatUrlsForStorage(formData) || null,
      region: formData.region,
      category: formData.category,
      following_size: formData.followingSize ? parseInt(formData.followingSize) : null,
      cost: recommendedCost,
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


  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Logo size="md" />
          <Button 
            variant="ghost" 
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Hero Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            CREATOR CALCULATOR
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Evaluate creators, analyze brand safety, and calculate recommended costs
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-secondary/50 p-1">
            <TabsTrigger 
              value="new" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Evaluation
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <CreatorForm 
              onSubmit={handleSubmit} 
              onRunBrandSafety={handleRunBrandSafety} 
              isSubmitting={isSubmitting} 
              isAnalyzing={isAnalyzing} 
              brandSafetyResult={brandSafetyResult} 
              qualityScore={qualityScore} 
            />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <EvaluationList 
              evaluations={evaluations} 
              onView={setSelectedEvaluation} 
              onDelete={handleDelete} 
              isLoading={isLoadingEvaluations} 
            />
          </TabsContent>
        </Tabs>
      </main>

      {selectedEvaluation && (
        <ReportPage 
          evaluation={selectedEvaluation} 
          onClose={() => setSelectedEvaluation(null)} 
        />
      )}
    </div>
  );
};

export default Index;
