/**
 * calculator.js - Carbon Footprint Calculation Engine
 * Contains scientific carbon emission factors and computation utilities.
 */

const EMISSION_FACTORS = {
  transport: {
    petrol_car: 0.18,    // kg CO2 per km
    diesel_car: 0.20,    // kg CO2 per km
    hybrid_car: 0.10,    // kg CO2 per km
    ev: 0.04,            // kg CO2 per km (based on average grid mix)
    motorcycle: 0.11,    // kg CO2 per km
    bus: 0.08,           // kg CO2 per km per passenger
    metro: 0.03,         // kg CO2 per km per passenger
    train: 0.04,         // kg CO2 per km per passenger
    walk: 0.00,
    bike: 0.00
  },
  electricity: {
    grid: 0.45,          // kg CO2 per kWh
    green: 0.05,         // kg CO2 per kWh (lifecycle emissions for renewables)
    // Estimates if kWh is unknown
    tier_low: 4,         // kWh/day (~1.8 kg CO2 grid, ~0.2 kg green)
    tier_medium: 10,     // kWh/day (~4.5 kg CO2 grid, ~0.5 kg green)
    tier_high: 25        // kWh/day (~11.25 kg CO2 grid, ~1.25 kg green)
  },
  food: {
    beef: 3.20,          // kg CO2 per serving/meal
    meat: 1.40,          // kg CO2 per serving/meal (chicken, pork, mixed)
    vegetarian: 0.60,    // kg CO2 per meal
    vegan: 0.30          // kg CO2 per meal
  },
  shopping: {
    clothing: 12.0,      // kg CO2 per item
    electronics: 120.0,  // kg CO2 per item
    furniture: 45.0,     // kg CO2 per item
    misc: 5.0,           // kg CO2 per item
    none: 0.0
  },
  waste: {
    standard_bag: 1.5,   // kg CO2 per bag of general waste
    // Recycling rate discounts applied to waste
    recycle_low: 1.0,    // No discount (100% of standard factor)
    recycle_medium: 0.7, // 30% reduction in general waste footprint
    recycle_high: 0.4    // 60% reduction in general waste footprint
  }
};

/**
 * Calculates the CO2 emissions in kg for a given category and input values.
 * 
 * @param {string} category - 'transport', 'electricity', 'food', 'shopping', or 'waste'
 * @param {number} value - The primary metric (km, kWh, servings, bags, items)
 * @param {string} subType - Specific subtype (e.g. 'petrol_car', 'grid', 'vegan')
 * @returns {number} Calculated emissions in kg CO2 (rounded to 2 decimal places)
 */
function calculateCategoryCarbon(category, value, subType = 'none') {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  
  let factor = 0;
  
  switch (category) {
    case 'transport':
      factor = EMISSION_FACTORS.transport[subType] !== undefined ? EMISSION_FACTORS.transport[subType] : 0;
      return parseFloat((value * factor).toFixed(2));
      
    case 'electricity':
      // subType represents 'grid' or 'green'
      factor = EMISSION_FACTORS.electricity[subType] !== undefined ? EMISSION_FACTORS.electricity[subType] : EMISSION_FACTORS.electricity.grid;
      return parseFloat((value * factor).toFixed(2));
      
    case 'food':
      // subType represents 'beef', 'meat', 'vegetarian', 'vegan'
      factor = EMISSION_FACTORS.food[subType] !== undefined ? EMISSION_FACTORS.food[subType] : EMISSION_FACTORS.food.vegetarian;
      // value here is number of meals
      return parseFloat((value * factor).toFixed(2));
      
    case 'shopping':
      // subType represents 'clothing', 'electronics', 'furniture', 'misc'
      factor = EMISSION_FACTORS.shopping[subType] !== undefined ? EMISSION_FACTORS.shopping[subType] : 0;
      // value here is number of items
      return parseFloat((value * factor).toFixed(2));
      
    case 'waste':
      // value represents standard general waste bags
      // subType represents 'recycle_low', 'recycle_medium', 'recycle_high'
      const baseWasteFactor = EMISSION_FACTORS.waste.standard_bag;
      const recyclingModifier = EMISSION_FACTORS.waste[subType] !== undefined ? EMISSION_FACTORS.waste[subType] : EMISSION_FACTORS.waste.recycle_low;
      return parseFloat((value * baseWasteFactor * recyclingModifier).toFixed(2));
      
    default:
      return 0;
  }
}

/**
 * Returns carbon grade metrics and descriptions.
 * 
 * @param {number} totalKg - Total daily carbon footprint in kg CO2
 * @returns {Object} { grade: String, class: String, description: String, percentageOfTarget: Number }
 */
function getCarbonScoreStats(totalKg) {
  const TARGET_DAILY_KG = 5.0; // Global target for carbon neutrality / sustainable living
  const GLOBAL_AVG_DAILY_KG = 11.0;
  
  let grade = 'B';
  let ratingClass = 'grade-average';
  let description = 'Average footprint. Your footprint is close to the global daily average.';
  let badgeColor = '#f59e0b'; // Amber
  
  if (totalKg <= 3.0) {
    grade = 'A+';
    ratingClass = 'grade-excellent';
    description = 'Outstanding! You are living well within the earth\'s carrying capacity.';
    badgeColor = '#10b981'; // Green
  } else if (totalKg <= 5.0) {
    grade = 'A';
    ratingClass = 'grade-very-good';
    description = 'Great job! You are meeting the daily target for sustainable living.';
    badgeColor = '#34d399'; // Mint Green
  } else if (totalKg <= 10.0) {
    grade = 'B+';
    ratingClass = 'grade-good';
    description = 'Good effort. Below the average global footprint, keep improving!';
    badgeColor = '#60a5fa'; // Light Blue
  } else if (totalKg <= 18.0) {
    grade = 'B';
    ratingClass = 'grade-average';
    description = 'Moderate impact. Close to the global daily average. Consider simple reductions.';
    badgeColor = '#f59e0b'; // Amber
  } else if (totalKg <= 30.0) {
    grade = 'C';
    ratingClass = 'grade-high';
    description = 'High carbon impact. Above average. There are many easy changes you can make!';
    badgeColor = '#f97316'; // Orange
  } else {
    grade = 'D';
    ratingClass = 'grade-heavy';
    description = 'Very high carbon footprint. Significant potential for reductions.';
    badgeColor = '#ef4444'; // Red
  }
  
  const percentageOfTarget = Math.round((totalKg / TARGET_DAILY_KG) * 100);
  
  return {
    grade,
    ratingClass,
    description,
    badgeColor,
    percentageOfTarget,
    targetDailyKg: TARGET_DAILY_KG,
    globalAvgDailyKg: GLOBAL_AVG_DAILY_KG
  };
}

// Export for Node testing or assign to global object for browser runtime
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EMISSION_FACTORS,
    calculateCategoryCarbon,
    getCarbonScoreStats
  };
} else {
  window.Calculator = {
    EMISSION_FACTORS,
    calculateCategoryCarbon,
    getCarbonScoreStats
  };
}
