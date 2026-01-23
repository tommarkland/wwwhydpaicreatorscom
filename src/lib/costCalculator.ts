// Recommended Cost Calculator based on Target CPV (Cost Per View)
// Base CPV varies by Region + Member Type
// Adjustments of ±$0.01 up to $0.10 based on creator size/quality

interface CostInput {
  averageViews: number | null;
  followingSize: number | null;
  contentQuality: number; // 1-10 scale
  region: string;
  memberType: string;
}

// Target CPV (Cost Per View) by Region + Member Type
const TARGET_CPV: Record<string, Record<string, number>> = {
  'EMEA': {
    'Influencer': 0.30,
    'Seller-trainer': 0.17,
  },
  'Americas': {
    'Influencer': 0.17,
    'Seller-trainer': 0.20,
  },
};

// Thresholds for "large" creators - top 30% of following size thresholds
const LARGE_CREATOR_THRESHOLDS: Record<string, Record<string, number>> = {
  'EMEA': {
    'Influencer': 168750,  // Score 7+ threshold
    'Seller-trainer': 45000,
  },
  'Americas': {
    'Influencer': 225000,
    'Seller-trainer': 45000,
  },
};

const getBaseCpv = (region: string, memberType: string): number => {
  const regionCpv = TARGET_CPV[region];
  if (!regionCpv) {
    console.warn(`Unknown region: ${region}, using EMEA defaults`);
    return TARGET_CPV['EMEA']['Influencer'];
  }

  const cpv = regionCpv[memberType];
  if (cpv === undefined) {
    console.warn(`Unknown member type: ${memberType}, using Influencer defaults`);
    return regionCpv['Influencer'];
  }

  return cpv;
};

const getLargeCreatorThreshold = (region: string, memberType: string): number => {
  const regionThresholds = LARGE_CREATOR_THRESHOLDS[region];
  if (!regionThresholds) {
    return LARGE_CREATOR_THRESHOLDS['EMEA']['Influencer'];
  }
  return regionThresholds[memberType] || regionThresholds['Influencer'];
};

export const calculateRecommendedCost = (input: CostInput): number | null => {
  const { averageViews, followingSize, contentQuality, region, memberType } = input;

  // Need average views to calculate cost
  if (!averageViews || averageViews <= 0) {
    return null;
  }

  // Get base CPV for region/member type
  const baseCpv = getBaseCpv(region, memberType);

  // Calculate adjustment based on creator size and content quality
  // Each factor can adjust ±$0.01 up to $0.05 each (total max ±$0.10)
  let adjustment = 0;

  // Size adjustment: +$0.01 to +$0.05 for large creators
  if (followingSize) {
    const largeThreshold = getLargeCreatorThreshold(region, memberType);
    if (followingSize >= largeThreshold * 2) {
      adjustment += 0.05; // Very large
    } else if (followingSize >= largeThreshold * 1.5) {
      adjustment += 0.04;
    } else if (followingSize >= largeThreshold * 1.2) {
      adjustment += 0.03;
    } else if (followingSize >= largeThreshold) {
      adjustment += 0.02;
    } else if (followingSize >= largeThreshold * 0.8) {
      adjustment += 0.01;
    }
  }

  // Content quality adjustment: -$0.05 to +$0.05 based on 1-10 scale
  // 5 = neutral, below = negative adjustment, above = positive
  const qualityAdjustment = (contentQuality - 5) * 0.01;
  adjustment += qualityAdjustment;

  // Cap adjustment at ±$0.10
  adjustment = Math.max(-0.10, Math.min(0.10, adjustment));

  // Calculate final CPV
  const finalCpv = baseCpv + adjustment;

  // Calculate recommended cost
  const recommendedCost = averageViews * finalCpv;

  return Math.round(recommendedCost * 100) / 100; // Round to 2 decimal places
};

export const getCpvBreakdown = (input: CostInput): {
  baseCpv: number;
  adjustment: number;
  finalCpv: number;
  sizeAdjustment: number;
  qualityAdjustment: number;
} | null => {
  const { averageViews, followingSize, contentQuality, region, memberType } = input;

  if (!averageViews || averageViews <= 0) {
    return null;
  }

  const baseCpv = getBaseCpv(region, memberType);

  // Size adjustment calculation
  let sizeAdjustment = 0;
  if (followingSize) {
    const largeThreshold = getLargeCreatorThreshold(region, memberType);
    if (followingSize >= largeThreshold * 2) {
      sizeAdjustment = 0.05;
    } else if (followingSize >= largeThreshold * 1.5) {
      sizeAdjustment = 0.04;
    } else if (followingSize >= largeThreshold * 1.2) {
      sizeAdjustment = 0.03;
    } else if (followingSize >= largeThreshold) {
      sizeAdjustment = 0.02;
    } else if (followingSize >= largeThreshold * 0.8) {
      sizeAdjustment = 0.01;
    }
  }

  // Quality adjustment
  const qualityAdjustment = (contentQuality - 5) * 0.01;

  // Total adjustment (capped)
  let adjustment = sizeAdjustment + qualityAdjustment;
  adjustment = Math.max(-0.10, Math.min(0.10, adjustment));

  return {
    baseCpv,
    adjustment,
    finalCpv: baseCpv + adjustment,
    sizeAdjustment,
    qualityAdjustment,
  };
};

// Export CPV table for reference
export const getTargetCpvTable = () => TARGET_CPV;
