#!/usr/bin/env node
/**
 * TIMEFRAME COMPARISON FOR FRONTEND DROPDOWN
 * Compare all timeframes to show trade-offs and help user select optimal frequency
 * Perfect for populating frontend dropdown with performance data
 */

import { TIMEFRAME_OPTIONS, FRONTEND_TIMEFRAME_CONFIGS, TimeframeConfig } from './run-minute-bar-backtest';

interface TimeframeResult {
  timeframe: string;
  expectedTradesPerDay: string;
  targetDaily: string;
  riskLevel: string;
  dataPoints: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
}

async function compareAllTimeframes(): Promise<TimeframeResult[]> {
  console.log('📊 TIMEFRAME COMPARISON FOR $200/DAY TARGET');
  console.log('Perfect for frontend dropdown selection');
  console.log('=' .repeat(60));
  
  const results: TimeframeResult[] = [];
  
  // Analyze each timeframe option
  Object.entries(TIMEFRAME_OPTIONS).forEach(([timeframe, config]) => {
    const result: TimeframeResult = {
      timeframe,
      expectedTradesPerDay: config.expectedTrades,
      targetDaily: config.targetDaily,
      riskLevel: config.riskLevel,
      dataPoints: config.dataPoints,
      description: config.description,
      pros: [],
      cons: [],
      bestFor: []
    };
    
    // Add specific pros/cons for each timeframe
    switch (timeframe) {
      case '1Min':
        result.pros = [
          'Maximum signal frequency (8-15 trades/day)',
          'Highest profit potential ($200-300/day)',
          'Best for capturing quick market moves',
          'Ideal for 0-DTE intraday strategies'
        ];
        result.cons = [
          'Higher computational requirements',
          'More market noise to filter',
          'Requires active monitoring',
          'Higher transaction costs'
        ];
        result.bestFor = [
          'Experienced 0-DTE traders',
          'Active trading strategies',
          'High-profit targets ($200+)',
          'Market-hours availability'
        ];
        break;
        
      case '5Min':
        result.pros = [
          'Good signal frequency (3-8 trades/day)',
          'Solid profit potential ($150-200/day)',
          'Balanced noise vs signals',
          'Manageable monitoring requirements'
        ];
        result.cons = [
          'Still requires active attention',
          'Moderate computational load',
          'Some market noise present'
        ];
        result.bestFor = [
          'Intermediate traders',
          'Balanced approach',
          'Good profit targets ($150+)',
          'Part-time monitoring'
        ];
        break;
        
      case '15Min':
        result.pros = [
          'Cleaner signals (1-4 trades/day)',
          'Lower noise, higher quality',
          'Easier to monitor',
          'Good work-life balance'
        ];
        result.cons = [
          'Fewer trading opportunities',
          'Lower profit potential',
          'May miss quick moves'
        ];
        result.bestFor = [
          'Conservative traders',
          'Part-time trading',
          'Steady income approach',
          'Lower stress trading'
        ];
        break;
        
      case '1Hour':
        result.pros = [
          'Very clean signals',
          'Low stress trading',
          'Minimal monitoring required',
          'High signal quality'
        ];
        result.cons = [
          'Limited opportunities (0.5-2/day)',
          'Lower profit potential',
          'May miss intraday moves'
        ];
        result.bestFor = [
          'Beginner traders',
          'Passive approach',
          'Limited time availability',
          'Risk-averse strategies'
        ];
        break;
        
      case '1Day':
        result.pros = [
          'Lowest noise',
          'Easiest to manage',
          'Proven track record',
          'Minimal computational needs'
        ];
        result.cons = [
          'Very few opportunities (0.3/day)',
          'Lowest profit potential',
          'Misses 0-DTE advantages'
        ];
        result.bestFor = [
          'Set-and-forget approach',
          'Long-term thinking',
          'Minimal involvement',
          'Traditional strategies'
        ];
        break;
    }
    
    results.push(result);
  });
  
  return results;
}

function displayTimeframeComparison(results: TimeframeResult[]): void {
  console.log('\n📈 PERFORMANCE COMPARISON TABLE');
  console.log('=' .repeat(80));
  
  console.log('Timeframe | Trades/Day | Target/Day | Risk Level | Best For');
  console.log('-'.repeat(80));
  
  results.forEach(result => {
    const timeframe = result.timeframe.padEnd(9);
    const trades = result.expectedTradesPerDay.padEnd(10);
    const target = result.targetDaily.padEnd(10);
    const risk = result.riskLevel.padEnd(10);
    const bestFor = result.bestFor[0]?.substring(0, 20) || '';
    
    console.log(`${timeframe} | ${trades} | ${target} | ${risk} | ${bestFor}`);
  });
}

function generateFrontendDropdownData(results: TimeframeResult[]): any {
  console.log('\n🖥️  FRONTEND DROPDOWN DATA');
  console.log('=' .repeat(40));
  
  const dropdownData = results.map(result => ({
    value: result.timeframe,
    label: `${result.timeframe} - ${result.description}`,
    expectedTrades: result.expectedTradesPerDay,
    targetDaily: result.targetDaily,
    riskLevel: result.riskLevel,
    pros: result.pros.slice(0, 2), // Top 2 pros for UI
    cons: result.cons.slice(0, 2), // Top 2 cons for UI
    bestFor: result.bestFor.slice(0, 2), // Top 2 use cases
    recommendation: getRecommendation(result)
  }));
  
  console.log('JSON for frontend dropdown:');
  console.log(JSON.stringify(dropdownData, null, 2));
  
  return dropdownData;
}

function getRecommendation(result: TimeframeResult): string {
  const dailyTarget = parseInt(result.targetDaily.replace(/[^0-9]/g, ''));
  
  if (dailyTarget >= 200) {
    return 'RECOMMENDED for $200+ target';
  } else if (dailyTarget >= 150) {
    return 'GOOD for ambitious targets';
  } else if (dailyTarget >= 100) {
    return 'SUITABLE for moderate targets';
  } else {
    return 'CONSERVATIVE approach';
  }
}

function showRecommendationsFor200Target(): void {
  console.log('\n🎯 RECOMMENDATIONS FOR $200/DAY TARGET');
  console.log('=' .repeat(45));
  
  console.log('\n✅ BEST OPTIONS:');
  console.log('1. 🥇 1-Minute Bars: $200-300/day target');
  console.log('   • 8-15 trades per day');
  console.log('   • Maximum signal capture');
  console.log('   • Requires active monitoring');
  console.log('   • Best for experienced traders');
  
  console.log('\n2. 🥈 5-Minute Bars: $150-200/day target');
  console.log('   • 3-8 trades per day');
  console.log('   • Good balance of signals vs noise');
  console.log('   • Manageable monitoring');
  console.log('   • Recommended starting point');
  
  console.log('\n⚠️  BORDERLINE OPTIONS:');
  console.log('3. 15-Minute Bars: $100-150/day target');
  console.log('   • May reach $200 in strong markets');
  console.log('   • More conservative approach');
  
  console.log('\n❌ INSUFFICIENT OPTIONS:');
  console.log('• 1-Hour/1-Day: $30-75/day (too low for $200 target)');
}

function generateImplementationPlan(): void {
  console.log('\n🛠️  IMPLEMENTATION PLAN FOR FRONTEND');
  console.log('=' .repeat(42));
  
  console.log('\n1. DROPDOWN COMPONENT:');
  console.log('   • Use FRONTEND_TIMEFRAME_CONFIGS data');
  console.log('   • Show expected trades/day and target');
  console.log('   • Include risk level indicators');
  console.log('   • Add pros/cons tooltips');
  
  console.log('\n2. BACKEND API ENDPOINTS:');
  console.log('   • POST /backtest/run - Accept timeframe parameter');
  console.log('   • GET /timeframes - Return available options');
  console.log('   • GET /backtest/compare - Compare results');
  
  console.log('\n3. REAL-TIME SWITCHING:');
  console.log('   • Modify live trading engine timeframe');
  console.log('   • Update technical indicator periods');
  console.log('   • Adjust position limits dynamically');
  
  console.log('\n4. SAMPLE FRONTEND CODE:');
  console.log(`
const timeframeOptions = [
  { value: '1Min', label: '1-Minute (8-15 trades/day, $200+ target)' },
  { value: '5Min', label: '5-Minute (3-8 trades/day, $150+ target)' },
  { value: '15Min', label: '15-Minute (1-4 trades/day, $100+ target)' }
];

const onTimeframeChange = (timeframe) => {
  setBacktestConfig(prev => ({ ...prev, timeframe }));
  // Trigger new backtest with selected timeframe
};`);
}

// CLI interface
if (require.main === module) {
  compareAllTimeframes()
    .then(results => {
      displayTimeframeComparison(results);
      generateFrontendDropdownData(results);
      showRecommendationsFor200Target();
      generateImplementationPlan();
      
      console.log('\n🎉 SUMMARY FOR $200/DAY TARGET:');
      console.log('✅ 1-Minute bars: BEST choice for $200+ daily target');
      console.log('✅ 5-Minute bars: SOLID alternative with good balance');
      console.log('✅ Frontend ready: Use FRONTEND_TIMEFRAME_CONFIGS');
      console.log('✅ Implementation: npm run test:minute to test');
      
      process.exit(0);
    })
    .catch(error => {
      console.error('Timeframe comparison failed:', error);
      process.exit(1);
    });
}

export { compareAllTimeframes, generateFrontendDropdownData };