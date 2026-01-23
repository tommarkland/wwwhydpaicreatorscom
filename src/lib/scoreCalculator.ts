// Quality Score Calculator
// This uses a weighted formula that you can customize

interface MetricsInput {
  followingSize: number | null;
  cost: number | null;
  averageViews: number | null;
  contentQuality: number;
}

// Weights for each metric (customize these based on your formula)
const WEIGHTS = {
  engagementRatio: 0.3,  // Views vs Following ratio
  costEfficiency: 0.25,  // Cost per view
  contentQuality: 0.25,  // Quality slider value
  reach: 0.2,            // Raw following size
};

// Normalize a value to 0-100 scale based on typical ranges
const normalizeFollowing = (value: number): number => {
  // Assumes typical range of 0 to 10M followers
  const maxFollowing = 10000000;
  return Math.min((value / maxFollowing) * 100, 100);
};

const normalizeViews = (value: number): number => {
  // Assumes typical range of 0 to 1M views
  const maxViews = 1000000;
  return Math.min((value / maxViews) * 100, 100);
};

const normalizeCostEfficiency = (cost: number, views: number): number => {
  if (views === 0 || cost === 0) return 50; // Default middle score
  
  const costPerView = cost / views;
  // Lower cost per view = better score
  // Assumes $0.01 per view is excellent, $1 per view is poor
  if (costPerView <= 0.01) return 100;
  if (costPerView >= 1) return 0;
  
  return 100 - (Math.log10(costPerView * 100) * 50);
};

const normalizeEngagementRatio = (views: number, following: number): number => {
  if (following === 0) return 0;
  
  const ratio = views / following;
  // 10% engagement is considered average, 50%+ is excellent
  if (ratio >= 0.5) return 100;
  if (ratio <= 0.01) return 10;
  
  return Math.min(ratio * 200, 100);
};

export const calculateQualityScore = (metrics: MetricsInput): number => {
  const { followingSize, cost, averageViews, contentQuality } = metrics;

  // Convert nulls to 0 for calculation
  const following = followingSize || 0;
  const views = averageViews || 0;
  const costValue = cost || 0;

  // Calculate individual component scores (0-100)
  const reachScore = normalizeFollowing(following);
  const engagementScore = normalizeEngagementRatio(views, following);
  const costScore = normalizeCostEfficiency(costValue, views);
  const qualityScore = contentQuality * 10; // Already 1-10, scale to 0-100

  // Calculate weighted average
  const finalScore =
    reachScore * WEIGHTS.reach +
    engagementScore * WEIGHTS.engagementRatio +
    costScore * WEIGHTS.costEfficiency +
    qualityScore * WEIGHTS.contentQuality;

  // Return score capped at 100
  return Math.min(Math.max(finalScore, 0), 100);
};

// Export weights for reference
export const getScoreWeights = () => WEIGHTS;
