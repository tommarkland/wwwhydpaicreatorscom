// Quality Score Calculator based on Average Views + Following Size
// Thresholds vary by Region and Member Type

interface MetricsInput {
  averageViews: number | null;
  followingSize: number | null;
  region: string;
  memberType: string;
}

// Average Views thresholds for each combination of Region + Member Type
const AVERAGE_VIEWS_THRESHOLDS: Record<string, Record<string, number[]>> = {
  'EMEA': {
    'Influencer': [1400, 2800, 5600, 8000, 10000, 12000, 14400, 17280, 25920, 51840],
    'Seller-trainer': [1048.74, 2097.48, 4194.96, 5992.80, 7491.00, 8989.20, 10787.04, 12944.45, 19416.67, 38833.34],
  },
  'Americas': {
    'Influencer': [4173.12, 8346.24, 16692.48, 23846.40, 29808.00, 35769.60, 42923.52, 51508.22, 77262.34, 154524.67],
    'Seller-trainer': [1048.74, 2097.48, 4194.96, 5992.80, 7491.00, 8989.20, 10787.04, 12944.45, 19416.67, 38833.34],
  },
};

// Following Size thresholds for each combination of Region + Member Type
const FOLLOWING_SIZE_THRESHOLDS: Record<string, Record<string, number[]>> = {
  'EMEA': {
    'Influencer': [10500, 21000, 42000, 60000, 75000, 112500, 168750, 253125, 506250, 1012500],
    'Seller-trainer': [2800, 5600, 11200, 16000, 20000, 30000, 45000, 67500, 135000, 270000],
  },
  'Americas': {
    'Influencer': [14000, 28000, 56000, 80000, 100000, 150000, 225000, 337500, 675000, 1350000],
    'Seller-trainer': [2800, 5600, 11200, 16000, 20000, 30000, 45000, 67500, 135000, 270000],
  },
};

const calculateWithThresholds = (value: number, thresholds: number[]): number => {
  // Find the highest score where value meets or exceeds the threshold
  for (let score = 10; score >= 1; score--) {
    if (value >= thresholds[score - 1]) {
      return score;
    }
  }
  // If value is below the minimum threshold, return 0
  return 0;
};

const getThresholds = (
  thresholdTable: Record<string, Record<string, number[]>>,
  region: string,
  memberType: string
): number[] => {
  const regionThresholds = thresholdTable[region];
  if (!regionThresholds) {
    console.warn(`Unknown region: ${region}, using EMEA defaults`);
    return thresholdTable['EMEA']['Influencer'];
  }

  const thresholds = regionThresholds[memberType];
  if (!thresholds) {
    console.warn(`Unknown member type: ${memberType}, using Influencer defaults`);
    return regionThresholds['Influencer'];
  }

  return thresholds;
};

export const calculateQualityScore = (metrics: MetricsInput): number => {
  const { averageViews, followingSize, region, memberType } = metrics;

  const scores: number[] = [];

  // Calculate average views score if provided
  if (averageViews && averageViews > 0) {
    const viewsThresholds = getThresholds(AVERAGE_VIEWS_THRESHOLDS, region, memberType);
    const viewsScore = calculateWithThresholds(averageViews, viewsThresholds);
    scores.push(viewsScore);
  }

  // Calculate following size score if provided
  if (followingSize && followingSize > 0) {
    const followingThresholds = getThresholds(FOLLOWING_SIZE_THRESHOLDS, region, memberType);
    const followingScore = calculateWithThresholds(followingSize, followingThresholds);
    scores.push(followingScore);
  }

  // If no metrics provided, return 0
  if (scores.length === 0) {
    return 0;
  }

  // Average the scores (rounded to 1 decimal place)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avgScore * 10) / 10;
};

// Individual score calculators for display purposes
export const calculateViewsScore = (views: number, region: string, memberType: string): number => {
  if (!views || views <= 0) return 0;
  const thresholds = getThresholds(AVERAGE_VIEWS_THRESHOLDS, region, memberType);
  return calculateWithThresholds(views, thresholds);
};

export const calculateFollowingScore = (following: number, region: string, memberType: string): number => {
  if (!following || following <= 0) return 0;
  const thresholds = getThresholds(FOLLOWING_SIZE_THRESHOLDS, region, memberType);
  return calculateWithThresholds(following, thresholds);
};

// Export thresholds for reference
export const getScoreThresholds = () => ({
  averageViews: AVERAGE_VIEWS_THRESHOLDS,
  followingSize: FOLLOWING_SIZE_THRESHOLDS,
});
