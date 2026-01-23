import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Shield, Save, Youtube, Instagram, Globe, Linkedin, Facebook } from 'lucide-react';

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
    if (score >= 4) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSafetyLabel = (score: number) => {
    if (score >= 4) return 'Safe';
    if (score >= 3) return 'Acceptable';
    return 'Risky';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Creator Information */}
        <Card>
          <CardHeader>
            <CardTitle>Creator Information</CardTitle>
            <CardDescription>Basic details about the content creator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="creatorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Creator Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter creator name" {...field} />
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
                          <div className="relative">
                            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder={placeholder}
                              className="pl-10"
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
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Enter the creator's performance data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="followingSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Following Size</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 5000.00" {...field} />
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
                    <FormLabel>Average Views</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50000" {...field} />
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

            {qualityScore !== undefined && (
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Quality Score</span>
                  <span className="text-2xl font-bold text-primary">{qualityScore.toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Brand Safety Analysis
            </CardTitle>
            <CardDescription>
              AI-powered analysis of the creator's brand safety
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBrandSafety}
              disabled={isAnalyzing || !form.getValues('creatorName')}
              className="w-full"
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
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${getSafetyScoreColor(brandSafetyResult.score)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Brand Safety Score</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{brandSafetyResult.score}</span>
                      <span className="text-sm ml-2">({getSafetyLabel(brandSafetyResult.score)})</span>
                    </div>
                  </div>
                </div>

                {brandSafetyResult.issues.length > 0 && (
                  <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <h4 className="font-medium text-destructive mb-2">Flagged Issues</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {brandSafetyResult.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{brandSafetyResult.summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
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
                      className="min-h-[100px]"
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
          <Button type="submit" disabled={isSubmitting} className="flex-1">
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
