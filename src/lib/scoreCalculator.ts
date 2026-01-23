// Quality Score Calculator based on Average Views
// Thresholds vary by Region and Member Type

interface MetricsInput {
  averageViews: number | null;
  region: string;
  memberType: string;
}

// Thresholds for each combination of Region + Member Type
// Score corresponds to minimum average views needed to achieve that score
const SCORE_THRESHOLDS: Record<string, Record<string, number[]>> = {
  // EMEA region (formerly MENA in the original table)
  'EMEA': {
    'Influencer': [
      1400,    // Score 1
      2800,    // Score 2
      5600,    // Score 3
      8000,    // Score 4
      10000,   // Score 5
      12000,   // Score 6
      14400,   // Score 7
      17280,   // Score 8
      25920,   // Score 9
      51840,   // Score 10
    ],
    'Seller-trainer': [
      1048.74,    // Score 1
      2097.48,    // Score 2
      4194.96,    // Score 3
      5992.80,    // Score 4
      7491.00,    // Score 5
      8989.20,    // Score 6
      10787.04,   // Score 7
      12944.45,   // Score 8
      19416.67,   // Score 9
      38833.34,   // Score 10
    ],
  },
  // Americas region
  'Americas': {
    'Influencer': [
      4173.12,    // Score 1
      8346.24,    // Score 2
      16692.48,   // Score 3
      23846.40,   // Score 4
      29808.00,   // Score 5
      35769.60,   // Score 6
      42923.52,   // Score 7
      51508.22,   // Score 8
      77262.34,   // Score 9
      154524.67,  // Score 10
    ],
    'Seller-trainer': [
      1048.74,    // Score 1
      2097.48,    // Score 2
      4194.96,    // Score 3
      5992.80,    // Score 4
      7491.00,    // Score 5
      8989.20,    // Score 6
      10787.04,   // Score 7
      12944.45,   // Score 8
      19416.67,   // Score 9
      38833.34,   // Score 10
    ],
  },
};

export const calculateQualityScore = (metrics: MetricsInput): number => {
  const { averageViews, region, memberType } = metrics;

  // If no average views provided, return 0
  if (!averageViews || averageViews <= 0) {
    return 0;
  }

  // Get the thresholds for this region and member type
  const regionThresholds = SCORE_THRESHOLDS[region];
  if (!regionThresholds) {
    console.warn(`Unknown region: ${region}, using EMEA defaults`);
    return calculateWithThresholds(averageViews, SCORE_THRESHOLDS['EMEA']['Influencer']);
  }

  const thresholds = regionThresholds[memberType];
  if (!thresholds) {
    console.warn(`Unknown member type: ${memberType}, using Influencer defaults`);
    return calculateWithThresholds(averageViews, regionThresholds['Influencer']);
  }

  return calculateWithThresholds(averageViews, thresholds);
};

const calculateWithThresholds = (views: number, thresholds: number[]): number => {
  // Find the highest score where views meet or exceed the threshold
  for (let score = 10; score >= 1; score--) {
    if (views >= thresholds[score - 1]) {
      return score;
    }
  }
  
  // If views are below the minimum threshold, return 0
  return 0;
};

// Export thresholds for reference
export const getScoreThresholds = () => SCORE_THRESHOLDS;
