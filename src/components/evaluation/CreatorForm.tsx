import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Shield, Save, Youtube, Instagram, Globe, Linkedin, Facebook, DollarSign, Info } from 'lucide-react';
import { calculateRecommendedCost, getCpvBreakdown } from '@/lib/costCalculator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
const evaluationSchema = z.object({
  creatorName: z.string().min(1, 'Creator name is required'),
  youtubeUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  region: z.string().min(1, 'Region is required'),
  category: z.string().min(1, 'Category is required'),
  followingSize: z.string().optional(),
  cost: z.string().optional(),
  averageViews: z.string().optional(),
  contentQuality: z.number().min(1).max(10),
  notes: z.string().optional(),
});

export type EvaluationFormData = z.infer<typeof evaluationSchema>;

interface CreatorFormProps {
  onSubmit: (data: EvaluationFormData) => Promise<void>;
  onRunBrandSafety: (creatorName: string, socialUrls: Record<string, string>) => Promise<void>;
  isSubmitting: boolean;
  isAnalyzing: boolean;
  brandSafetyResult?: {
    score: number;
    issues: string[];
    summary: string;
  } | null;
  qualityScore?: number;
  onRecommendedCostChange?: (cost: number | null) => void;
}

const REGIONS = [
  'Americas',
  'EMEA',
];

const MEMBER_TYPES = [
  'Influencer',
  'Seller-trainer',
];

const SOCIAL_PLATFORMS = [
  { key: 'youtubeUrl', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@creator' },
  { key: 'instagramUrl', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/creator' },
  { key: 'tiktokUrl', label: 'TikTok', icon: Globe, placeholder: 'https://tiktok.com/@creator' },
  { key: 'twitterUrl', label: 'X (Twitter)', icon: Globe, placeholder: 'https://x.com/creator' },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/creator' },
  { key: 'facebookUrl', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/creator' },
  { key: 'websiteUrl', label: 'Website', icon: Globe, placeholder: 'https://creator.com' },
];

export const CreatorForm = ({
  onSubmit,
  onRunBrandSafety,
  isSubmitting,
  isAnalyzing,
  brandSafetyResult,
  qualityScore,
}: CreatorFormProps) => {
  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      creatorName: '',
      youtubeUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
      twitterUrl: '',
      linkedinUrl: '',
      facebookUrl: '',
      websiteUrl: '',
      region: '',
      category: '',
      followingSize: '',
      cost: '',
      averageViews: '',
      contentQuality: 5,
      notes: '',
    },
  });

  // Watch fields needed for cost calculation
  const averageViews = useWatch({ control: form.control, name: 'averageViews' });
  const followingSize = useWatch({ control: form.control, name: 'followingSize' });
  const contentQuality = useWatch({ control: form.control, name: 'contentQuality' });
  const region = useWatch({ control: form.control, name: 'region' });
  const category = useWatch({ control: form.control, name: 'category' });

  // Calculate recommended cost
  const recommendedCost = calculateRecommendedCost({
    averageViews: averageViews ? parseInt(averageViews) : null,
    followingSize: followingSize ? parseInt(followingSize) : null,
    contentQuality: contentQuality || 5,
    region: region || 'EMEA',
    memberType: category || 'Influencer',
  });

  const cpvBreakdown = getCpvBreakdown({
    averageViews: averageViews ? parseInt(averageViews) : null,
    followingSize: followingSize ? parseInt(followingSize) : null,
    contentQuality: contentQuality || 5,
    region: region || 'EMEA',
    memberType: category || 'Influencer',
  });

  const handleBrandSafety = () => {
    const creatorName = form.getValues('creatorName');
    const socialUrls: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach(({ key }) => {
      const value = form.getValues(key as keyof EvaluationFormData);
      if (value && typeof value === 'string') {
        socialUrls[key] = value;
      }
    });
    if (creatorName) {
      onRunBrandSafety(creatorName, socialUrls);
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (score >= 3) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  const getSafetyLabel = (score: number) => {
    if (score >= 4) return 'Safe';
    if (score >= 3) return 'Acceptable';
    return 'Risky';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 stagger-fade-in">
        {/* Creator Information */}
        <Card className="glass-card border-border/30 hover-lift">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Creator Information</CardTitle>
            <CardDescription className="text-muted-foreground">Basic details about the content creator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="creatorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Creator Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter creator name" 
                      className="bg-secondary/50 border-border/30 focus:border-primary/50 input-glow transition-all duration-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Social Media URLs */}
            <div className="space-y-3">
              <FormLabel className="text-base font-medium">Social Media & Website</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as keyof EvaluationFormData}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative group">
                            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                            <Input
                              placeholder={placeholder}
                              className="pl-10 bg-secondary/50 border-border/30 focus:border-primary/50 input-glow transition-all duration-300"
                              {...field}
                              value={field.value as string || ''}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEMBER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="glass-card border-border/30 hover-lift">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
            <CardDescription className="text-muted-foreground">Enter the creator's performance data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="followingSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Following Size</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 100000" 
                        className="bg-secondary/50 border-border/30 focus:border-primary/50 input-glow transition-all duration-300"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="averageViews"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Average Views</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 50000" 
                        className="bg-secondary/50 border-border/30 focus:border-primary/50 input-glow transition-all duration-300"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contentQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Quality: {field.value}/10</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recommended Cost Display */}
            {recommendedCost !== null && (
              <div className="mt-6 highlight-card p-6 rounded-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Advised Creator Rate</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground ml-2 inline" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs glass-card">
                            <p className="text-sm">
                              Based on Average Views × Target CPV. Adjusted ±$0.01/view (max $0.10) for creator size and content quality.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold score-display">
                      ${recommendedCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Advised Creator Rate</p>
                  </div>
                  <div className="text-center border-l border-border/30 pl-4">
                    <span className="text-4xl font-bold text-primary">
                      ${(recommendedCost * 2).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Minimum Expected Content Value (ROI)</p>
                  </div>
                </div>
                {cpvBreakdown && (
                  <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t border-border/30">
                    <div className="flex justify-between">
                      <span>Base CPV:</span>
                      <span className="font-medium text-foreground">${cpvBreakdown.baseCpv.toFixed(2)}</span>
                    </div>
                    {cpvBreakdown.adjustment !== 0 && (
                      <div className="flex justify-between">
                        <span>Adjustment:</span>
                        <span className={cpvBreakdown.adjustment > 0 ? 'text-amber-400 font-medium' : 'text-green-400 font-medium'}>
                          {cpvBreakdown.adjustment > 0 ? '+' : ''}${cpvBreakdown.adjustment.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-foreground border-t border-border/30 pt-2 mt-2">
                      <span>Final CPV:</span>
                      <span>${cpvBreakdown.finalCpv.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {qualityScore !== undefined && (
              <div className="mt-4 glass-card p-5 rounded-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground uppercase text-sm tracking-wide">Quality Score</span>
                  <span className="text-3xl font-bold score-display">{qualityScore.toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Safety */}
        <Card className="glass-card border-border/30 hover-lift">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              Brand Safety Analysis
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI-powered analysis of the creator's brand safety
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBrandSafety}
              disabled={isAnalyzing || !form.getValues('creatorName')}
              className="w-full btn-glow bg-secondary/50 border-border/30 hover:bg-secondary/80 transition-all duration-300"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Brand Safety...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Run Brand Safety Check
                </>
              )}
            </Button>

            {brandSafetyResult && (
              <div className="space-y-4 animate-fade-in">
                <div className={`p-5 rounded-xl border transition-all duration-300 ${getSafetyScoreColor(brandSafetyResult.score)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium uppercase text-sm tracking-wide">Brand Safety Score</span>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-3xl font-bold">{brandSafetyResult.score}</span>
                      <span className="text-sm px-3 py-1 rounded-full bg-current/10">({getSafetyLabel(brandSafetyResult.score)})</span>
                    </div>
                  </div>
                </div>

                {brandSafetyResult.issues.length > 0 && (
                  <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/10 backdrop-blur-sm">
                    <h4 className="font-semibold text-destructive mb-3">Flagged Issues</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      {brandSafetyResult.issues.map((issue, index) => (
                        <li key={index} className="text-foreground/80">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-5 rounded-xl glass-card">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{brandSafetyResult.summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="glass-card border-border/30 hover-lift">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes or comments about this creator..."
                      className="min-h-[100px] bg-secondary/50 border-border/30 focus:border-primary/50 input-glow transition-all duration-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex-1 btn-glow bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base transition-all duration-300 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Evaluation
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
