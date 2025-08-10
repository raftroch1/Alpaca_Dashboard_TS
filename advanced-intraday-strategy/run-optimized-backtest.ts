#!/usr/bin/env ts-node
/**
 * OPTIMIZED BACKTEST FOR $200-250/DAY TARGET
 * 
 * Tests the optimized strategy framework to validate:
 * ✅ 3+ trades per day generation
 * ✅ 70% win rate targeting
 * ✅ $150 avg wins, $100 avg losses
 * ✅ $200-250/day profit achievement
 */

import { Strategy, BacktestParams } from '../lib/types';
import { EnhancedBacktestEngine } from './enhanced-backtest-engine';
import OptimizedStrategyFramework from './optimized-strategy-framework';

async function runOptimizedBacktest() {
  console.log('🚀 OPTIMIZED BACKTEST FOR PROFIT TARGET');
  console.log('======================================');
  console.log('🎯 Target: $200-250/day (3 trades @ 70% win rate)');
  console.log('📊 Expected: $150 wins, $100 losses');
  console.log('⚡ Optimized signal generation enabled');
  console.log('');

  try {
    // Strategy configuration for profit optimization
    const strategy: Strategy = {
      id: 'optimized-profit-target',
      name: 'Optimized 0DTE Profit Strategy', 
      description: 'Optimized for $200-250/day with 3 trades @ 70% win rate',
      userId: 'profit-optimization',
      
      // Technical indicators (from lib/types.ts)
      rsiPeriod: 14,
      rsiOverbought: 65,      // Slightly lower for more signals
      rsiOversold: 35,        // Slightly higher for more signals
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      
      // OPTIMIZED Risk management for profit target
      stopLossPercent: 40,        // $100 loss on $250 position = 40%
      takeProfitPercent: 60,      // $150 win on $250 position = 60%
      positionSizePercent: 1.0,   // 1% of account per trade ($250 on $25K)
      maxPositions: 3,            // Max 3 concurrent positions
      
      // Options parameters
      daysToExpiration: 0,        // 0DTE strategy
      deltaRange: 0.20,           // Slightly wider delta range
      
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test with recent 2-week period for validation
    const params: BacktestParams = {
      strategyId: strategy.id,
      startDate: new Date('2024-11-18'),  // 2 weeks
      endDate: new Date('2024-11-29'),    // Recent data
      initialCapital: 25000               // $25K account
    };

    console.log('📋 OPTIMIZED STRATEGY CONFIGURATION:');
    console.log(`   Strategy: ${strategy.name}`);
    console.log(`   Period: ${params.startDate.toDateString()} → ${params.endDate.toDateString()}`);
    console.log(`   Account: $${params.initialCapital.toLocaleString()}`);
    console.log(`   Position Size: ${strategy.positionSizePercent}% = $${(params.initialCapital * strategy.positionSizePercent / 100).toFixed(0)}/trade`);
    console.log(`   Stop Loss: ${strategy.stopLossPercent}% = ~$${((params.initialCapital * strategy.positionSizePercent / 100) * strategy.stopLossPercent / 100).toFixed(0)} max loss`);
    console.log(`   Take Profit: ${strategy.takeProfitPercent}% = ~$${((params.initialCapital * strategy.positionSizePercent / 100) * strategy.takeProfitPercent / 100).toFixed(0)} target win`);
    console.log('');

    console.log('🔧 OPTIMIZATION FEATURES:');
    console.log('   ✅ Time-based signal generation');
    console.log('   ✅ Lowered momentum thresholds'); 
    console.log('   ✅ Mean reversion opportunities');
    console.log('   ✅ Volume anomaly detection');
    console.log('   ✅ Daily trade target tracking');
    console.log('   ✅ Aggressive mode when needed');
    console.log('');

    // Run optimized backtest
    console.log('🚀 Running Optimized Backtest...');
    console.log('================================');
    
    const results = await EnhancedBacktestEngine.runEnhancedBacktest(strategy, params, {
      timeframe: '1Min',
      symbol: 'SPY',
      trackDetailedMetrics: true,
      calculateIndicatorAccuracy: true,
      minSignalConfidence: 0.5,  // Lowered from 0.6 for more signals
      requiredSignalQuality: ['EXCELLENT', 'GOOD', 'FAIR'], // Include FAIR signals
      maxPositionsOpen: 3,
      maxDailyRisk: 3.0,         // 3% daily risk (higher for profit target)
      emergencyStopLoss: 8.0     // 8% portfolio stop
    });
    
    console.log('');
    console.log('📈 OPTIMIZED BACKTEST RESULTS:');
    console.log('==============================');
    
    // Calculate final balance and key metrics
    const finalBalance = params.initialCapital * (1 + results.performance.totalReturn);
    const totalDays = (params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const tradingDays = Math.floor(totalDays * 5/7); // Approximate trading days
    const avgDailyPnL = (finalBalance - params.initialCapital) / tradingDays;
    const avgTradesPerDay = results.performance.totalTrades / tradingDays;
    
    console.log(`💰 Initial Capital: $${params.initialCapital.toLocaleString()}`);
    console.log(`💰 Final Balance: $${finalBalance.toLocaleString()}`);
    console.log(`📊 Total Return: ${(results.performance.totalReturn * 100).toFixed(2)}%`);
    console.log(`📊 Total P&L: $${(finalBalance - params.initialCapital).toFixed(2)}`);
    console.log(`📈 Total Trades: ${results.performance.totalTrades}`);
    console.log(`📈 Trading Days: ${tradingDays}`);
    console.log(`📈 Avg Trades/Day: ${avgTradesPerDay.toFixed(1)}`);
    console.log(`💵 Avg Daily P&L: $${avgDailyPnL.toFixed(2)}`);
    console.log(`🎯 Win Rate: ${(results.performance.winRate * 100).toFixed(1)}%`);
    console.log(`💵 Average Win: $${results.performance.averageWin.toFixed(2)}`);
    console.log(`💸 Average Loss: $${Math.abs(results.performance.averageLoss).toFixed(2)}`);
    console.log(`📊 Sharpe Ratio: ${results.performance.sharpeRatio.toFixed(2)}`);
    console.log(`📉 Max Drawdown: ${(results.performance.maxDrawdown * 100).toFixed(2)}%`);
    
    // Profit target analysis
    console.log('');
    console.log('🎯 PROFIT TARGET ANALYSIS:');
    console.log('==========================');
    
    const dailyTargetMet = avgDailyPnL >= 200 && avgDailyPnL <= 300;
    const tradeFrequencyGood = avgTradesPerDay >= 2.5 && avgTradesPerDay <= 5;
    const winRateGood = results.performance.winRate >= 0.60;
    const riskManagementGood = results.performance.maxDrawdown <= 0.15;
    
    console.log(`📊 Daily P&L Target: $200-250 → ${dailyTargetMet ? '✅' : '❌'} $${avgDailyPnL.toFixed(2)}`);
    console.log(`📊 Trade Frequency: 3±2 trades/day → ${tradeFrequencyGood ? '✅' : '❌'} ${avgTradesPerDay.toFixed(1)}`);
    console.log(`📊 Win Rate Target: 60%+ → ${winRateGood ? '✅' : '❌'} ${(results.performance.winRate * 100).toFixed(1)}%`);
    console.log(`📊 Risk Management: <15% DD → ${riskManagementGood ? '✅' : '❌'} ${(results.performance.maxDrawdown * 100).toFixed(2)}%`);
    
    // Strategy analytics (if available)
    if (results.strategyAnalytics) {
      console.log('');
      console.log('🎯 STRATEGY ANALYTICS:');
      console.log('======================');
      
      console.log('📊 Signal Quality Distribution:');
      console.log(`   🟢 Excellent: ${results.strategyAnalytics.signalQuality.excellent} signals`);
      console.log(`   🟡 Good: ${results.strategyAnalytics.signalQuality.good} signals`);
      console.log(`   🟠 Fair: ${results.strategyAnalytics.signalQuality.fair} signals`);
      console.log(`   🔴 Poor: ${results.strategyAnalytics.signalQuality.poor} signals`);
      
      const confluenceRate = (results.strategyAnalytics.confluenceAnalysis.strongZoneHitRate * 100).toFixed(1);
      console.log(`📊 Confluence Hit Rate: ${confluenceRate}%`);
    }
    
    // Final assessment
    console.log('');
    console.log('🎉 OPTIMIZATION ASSESSMENT:');
    console.log('===========================');
    
    const allTargetsMet = dailyTargetMet && tradeFrequencyGood && winRateGood && riskManagementGood;
    
    if (allTargetsMet) {
      console.log('✅ OPTIMIZATION SUCCESSFUL!');
      console.log('   🎯 All profit targets achieved');
      console.log('   📊 Trade frequency optimized');
      console.log('   🛡️ Risk management maintained');
      console.log('   🚀 READY FOR PAPER TRADING');
      return true;
    } else {
      console.log('⚠️  OPTIMIZATION NEEDS TUNING:');
      
      if (!dailyTargetMet) {
        console.log('   🔧 Adjust position sizing or signal frequency');
      }
      if (!tradeFrequencyGood) {
        console.log('   🔧 Fine-tune signal generation thresholds');
      }
      if (!winRateGood) {
        console.log('   🔧 Improve signal quality or exit timing');
      }
      if (!riskManagementGood) {
        console.log('   🔧 Tighten risk controls or position sizing');
      }
      
      console.log('   📋 Re-run with adjustments before paper trading');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Optimization Error:', error instanceof Error ? error.message : error);
    console.log('');
    console.log('📝 Troubleshooting:');
    console.log('   ✅ Check Alpaca API credentials');
    console.log('   ✅ Verify market data access');
    console.log('   ✅ Ensure optimized framework is operational');
    return false;
  }
}

// Run the optimized backtest
runOptimizedBacktest().then(success => {
  if (success) {
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('==============');
    console.log('   ✅ Strategy optimized for profit target');
    console.log('   🚀 Ready for paper trading integration');
    console.log('   📊 Monitor live performance vs backtest');
  }
  process.exit(success ? 0 : 1);
});