/**
 * TRADING CONFIGURATION FOR $25K ACCOUNT
 * 
 * Optimized parameters for achieving $300/day target with proper risk management
 */

export interface TradingConfiguration {
  // Profile info
  name: string;
  
  // Account settings
  accountSize: number;
  dailyTarget: number;
  
  // Position settings
  basePositionValue: number;
  profitTargets: {
    conservative: number; // 30%
    aggressive: number;   // 50%
  };
  stopLosses: {
    tight: number;        // 15%
    standard: number;     // 30%
  };
  
  // Risk management
  maxDailyLoss: number;
  maxDailyLossPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  // Position limits
  maxConcurrentPositions: number;
  maxPositionConcentration: number;
  maxDailyExposure: number;
  
  // Performance expectations
  expectedWinRate: number;
  expectedTradesPerDay: number;
  expectedMonthlyReturn: number;
}

// Configuration profiles for different risk/return targets
export const TRADING_PROFILES = {
  CONSERVATIVE_25K: {
    name: 'Conservative ($200/day target)',
    // Account settings
    accountSize: 25000,
    dailyTarget: 200,              // $200/day (0.8% daily) - more achievable
    
    // Position settings
    basePositionValue: 250,        // $250 per position (1.0% of account)
    profitTargets: {
      conservative: 0.30,          // 30% profit = $75 on $250 position
      aggressive: 0.40             // 40% profit = $100 on $250 position
    },
    stopLosses: {
      tight: 0.15,                 // 15% loss = $37.50 on $250 position
      standard: 0.25               // 25% loss = $62.50 on $250 position
    },
    
    // Risk management
    maxDailyLoss: 400,             // $400 daily loss limit (1.6%)
    maxDailyLossPercent: 1.6,      // 1.6% daily loss limit
    maxDrawdown: 1750,             // $1750 max drawdown (7%)
    maxDrawdownPercent: 7.0,       // 7% max drawdown
    
    // Position limits
    maxConcurrentPositions: 2,     // Max 2 positions at once
    maxPositionConcentration: 15,  // 15% max in single position
    maxDailyExposure: 500,         // $500 max exposure (2% of account)
    
    // Performance expectations
    expectedWinRate: 0.65,         // 65% win rate target
    expectedTradesPerDay: 2.0,     // 2 trades per day average
    expectedMonthlyReturn: 0.16    // 16% monthly return target
  } as TradingConfiguration,
  
  BALANCED_25K: {
    name: 'Balanced ($250/day target)',
    // Account settings
    accountSize: 25000,
    dailyTarget: 250,              // $250/day (1.0% daily) - balanced
    
    // Position settings
    basePositionValue: 275,        // $275 per position (1.1% of account)
    profitTargets: {
      conservative: 0.30,          // 30% profit = $82.50 on $275 position
      aggressive: 0.45             // 45% profit = $123.75 on $275 position
    },
    stopLosses: {
      tight: 0.15,                 // 15% loss = $41.25 on $275 position
      standard: 0.27               // 27% loss = $74.25 on $275 position
    },
    
    // Risk management
    maxDailyLoss: 450,             // $450 daily loss limit (1.8%)
    maxDailyLossPercent: 1.8,      // 1.8% daily loss limit
    maxDrawdown: 1875,             // $1875 max drawdown (7.5%)
    maxDrawdownPercent: 7.5,       // 7.5% max drawdown
    
    // Position limits
    maxConcurrentPositions: 2,     // Max 2 positions at once
    maxPositionConcentration: 18,  // 18% max in single position
    maxDailyExposure: 650,         // $650 max exposure (2.6% of account)
    
    // Performance expectations
    expectedWinRate: 0.62,         // 62% win rate target
    expectedTradesPerDay: 2.3,     // 2-3 trades per day average
    expectedMonthlyReturn: 0.18    // 18% monthly return target
  } as TradingConfiguration,
  
  AGGRESSIVE_25K: {
    name: 'Aggressive ($300/day target)',
    // Account settings
    accountSize: 25000,
    dailyTarget: 300,              // $300/day (1.2% daily) - stretch target
    
    // Position settings
    basePositionValue: 300,        // $300 per position (1.2% of account)
    profitTargets: {
      conservative: 0.30,          // 30% profit = $90 on $300 position
      aggressive: 0.50             // 50% profit = $150 on $300 position
    },
    stopLosses: {
      tight: 0.15,                 // 15% loss = $45 on $300 position
      standard: 0.30               // 30% loss = $90 on $300 position
    },
    
    // Risk management
    maxDailyLoss: 500,             // $500 daily loss limit (2%)
    maxDailyLossPercent: 2.0,      // 2% daily loss limit
    maxDrawdown: 2000,             // $2000 max drawdown (8%)
    maxDrawdownPercent: 8.0,       // 8% max drawdown
    
    // Position limits
    maxConcurrentPositions: 3,     // Max 3 positions at once
    maxPositionConcentration: 20,  // 20% max in single position
    maxDailyExposure: 900,         // $900 max exposure (3.6% of account)
    
    // Performance expectations
    expectedWinRate: 0.60,         // 60% win rate target
    expectedTradesPerDay: 2.5,     // 2-3 trades per day average
    expectedMonthlyReturn: 0.20    // 20% monthly return target
  } as TradingConfiguration
};

// Default configuration (can be changed)
export const TRADING_CONFIG_25K = TRADING_PROFILES.BALANCED_25K;

/**
 * Calculate realistic performance metrics
 */
export function calculatePerformanceProjections(config: TradingConfiguration): {
  dailyProjections: {
    scenario: string;
    tradesPerDay: number;
    avgProfitPerWin: number;
    avgLossPerLoss: number;
    expectedDailyPnL: number;
    requiredWinRate: number;
  }[];
  monthlyProjections: {
    conservativeReturn: number;
    averageReturn: number;
    aggressiveReturn: number;
  };
  riskMetrics: {
    maxDailyRisk: number;
    worstCaseScenario: number;
    breakevenWinRate: number;
  };
} {
  
  const { basePositionValue, profitTargets, stopLosses } = config;
  
  const scenarios = [
    {
      scenario: 'Conservative',
      profitTarget: profitTargets.conservative,
      stopLoss: stopLosses.tight,
      tradesPerDay: 2
    },
    {
      scenario: 'Balanced',
      profitTarget: (profitTargets.conservative + profitTargets.aggressive) / 2,
      stopLoss: stopLosses.standard,
      tradesPerDay: 2.5
    },
    {
      scenario: 'Aggressive',
      profitTarget: profitTargets.aggressive,
      stopLoss: stopLosses.standard,
      tradesPerDay: 3
    }
  ];
  
  const dailyProjections = scenarios.map(scenario => {
    const avgProfitPerWin = basePositionValue * scenario.profitTarget;
    const avgLossPerLoss = basePositionValue * scenario.stopLoss;
    
    // Calculate required win rate for break-even
    const breakevenWinRate = avgLossPerLoss / (avgProfitPerWin + avgLossPerLoss);
    
    // Calculate expected daily P&L with 60% win rate
    const winRate = 0.60;
    const expectedDailyPnL = scenario.tradesPerDay * (
      winRate * avgProfitPerWin - (1 - winRate) * avgLossPerLoss
    );
    
    return {
      scenario: scenario.scenario,
      tradesPerDay: scenario.tradesPerDay,
      avgProfitPerWin,
      avgLossPerLoss,
      expectedDailyPnL,
      requiredWinRate: breakevenWinRate
    };
  });
  
  // Monthly projections (20 trading days)
  const monthlyProjections = {
    conservativeReturn: dailyProjections[0].expectedDailyPnL * 20,
    averageReturn: dailyProjections[1].expectedDailyPnL * 20,
    aggressiveReturn: dailyProjections[2].expectedDailyPnL * 20
  };
  
  // Risk metrics
  const riskMetrics = {
    maxDailyRisk: config.maxDailyExposure * 0.30, // Assume 30% max loss on all positions
    worstCaseScenario: config.maxDrawdown,
    breakevenWinRate: dailyProjections[1].requiredWinRate
  };
  
  return {
    dailyProjections,
    monthlyProjections,
    riskMetrics
  };
}

/**
 * Select trading profile by name
 */
export function selectTradingProfile(profileName: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'): TradingConfiguration {
  switch(profileName) {
    case 'CONSERVATIVE':
      return TRADING_PROFILES.CONSERVATIVE_25K;
    case 'BALANCED':
      return TRADING_PROFILES.BALANCED_25K;
    case 'AGGRESSIVE':
      return TRADING_PROFILES.AGGRESSIVE_25K;
    default:
      return TRADING_PROFILES.BALANCED_25K;
  }
}

/**
 * Display all available profiles for comparison
 */
export function displayAllProfiles(): void {
  console.log('\n🎯 AVAILABLE TRADING PROFILES FOR $25K ACCOUNT');
  console.log('='.repeat(60));
  
  Object.entries(TRADING_PROFILES).forEach(([key, profile]) => {
    console.log(`\n📊 ${profile.name.toUpperCase()}`);
    console.log(`   Daily Target: $${profile.dailyTarget}`);
    console.log(`   Position Size: $${profile.basePositionValue}`);
    console.log(`   Max Daily Loss: $${profile.maxDailyLoss} (${profile.maxDailyLossPercent}%)`);
    console.log(`   Expected Win Rate: ${(profile.expectedWinRate * 100).toFixed(0)}%`);
    console.log(`   Trades/Day: ${profile.expectedTradesPerDay}`);
    
    const projections = calculatePerformanceProjections(profile);
    const balancedProjection = projections.dailyProjections[1];
    console.log(`   Projected Daily P&L: $${balancedProjection.expectedDailyPnL.toFixed(0)}`);
    console.log(`   Target Achievement: ${(balancedProjection.expectedDailyPnL / profile.dailyTarget * 100).toFixed(0)}%`);
    console.log(`   Required Win Rate: ${(balancedProjection.requiredWinRate * 100).toFixed(1)}%`);
  });
}

/**
 * Display performance analysis
 */
export function displayPerformanceAnalysis(config: TradingConfiguration): void {
  const analysis = calculatePerformanceProjections(config);
  
  console.log('\n📊 PERFORMANCE ANALYSIS FOR $25K ACCOUNT');
  console.log('='.repeat(50));
  
  console.log('\n🎯 TARGET METRICS:');
  console.log(`   Account Size: $${config.accountSize.toLocaleString()}`);
  console.log(`   Daily Target: $${config.dailyTarget}`);
  console.log(`   Position Size: $${config.basePositionValue}`);
  console.log(`   Max Daily Loss: $${config.maxDailyLoss} (${config.maxDailyLossPercent}%)`);
  console.log(`   Max Drawdown: $${config.maxDrawdown} (${config.maxDrawdownPercent}%)`);
  
  console.log('\n📈 DAILY PROJECTIONS:');
  analysis.dailyProjections.forEach(proj => {
    console.log(`\n   ${proj.scenario} Strategy:`);
    console.log(`     Trades/Day: ${proj.tradesPerDay}`);
    console.log(`     Avg Win: $${proj.avgProfitPerWin.toFixed(0)}`);
    console.log(`     Avg Loss: $${proj.avgLossPerLoss.toFixed(0)}`);
    console.log(`     Expected Daily P&L: $${proj.expectedDailyPnL.toFixed(0)}`);
    console.log(`     Required Win Rate: ${(proj.requiredWinRate * 100).toFixed(1)}%`);
    console.log(`     Target Achievement: ${(proj.expectedDailyPnL / config.dailyTarget * 100).toFixed(0)}%`);
  });
  
  console.log('\n📅 MONTHLY PROJECTIONS (20 trading days):');
  console.log(`   Conservative: $${analysis.monthlyProjections.conservativeReturn.toFixed(0)} (${(analysis.monthlyProjections.conservativeReturn / config.accountSize * 100).toFixed(1)}%)`);
  console.log(`   Average: $${analysis.monthlyProjections.averageReturn.toFixed(0)} (${(analysis.monthlyProjections.averageReturn / config.accountSize * 100).toFixed(1)}%)`);
  console.log(`   Aggressive: $${analysis.monthlyProjections.aggressiveReturn.toFixed(0)} (${(analysis.monthlyProjections.aggressiveReturn / config.accountSize * 100).toFixed(1)}%)`);
  
  console.log('\n⚠️  RISK ASSESSMENT:');
  console.log(`   Max Daily Risk: $${analysis.riskMetrics.maxDailyRisk.toFixed(0)}`);
  console.log(`   Worst Case Scenario: -$${analysis.riskMetrics.worstCaseScenario}`);
  console.log(`   Breakeven Win Rate: ${(analysis.riskMetrics.breakevenWinRate * 100).toFixed(1)}%`);
  
  console.log('\n✅ REALISTIC ASSESSMENT:');
  const averageDaily = analysis.dailyProjections[1].expectedDailyPnL;
  if (averageDaily >= config.dailyTarget * 0.8) {
    console.log(`   🎯 TARGET ACHIEVABLE: $${averageDaily.toFixed(0)}/day projected`);
  } else {
    console.log(`   ⚠️  TARGET CHALLENGING: $${averageDaily.toFixed(0)}/day projected vs $${config.dailyTarget} target`);
  }
  
  if (analysis.riskMetrics.breakevenWinRate < 0.5) {
    console.log(`   ✅ WIN RATE REQUIREMENT REASONABLE: ${(analysis.riskMetrics.breakevenWinRate * 100).toFixed(1)}%`);
  } else {
    console.log(`   ⚠️  WIN RATE REQUIREMENT HIGH: ${(analysis.riskMetrics.breakevenWinRate * 100).toFixed(1)}%`);
  }
}

export default TRADING_CONFIG_25K;