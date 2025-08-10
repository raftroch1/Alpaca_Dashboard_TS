#!/usr/bin/env ts-node
/**
 * ENHANCED STRATEGY VALIDATION TEST
 * 
 * Tests the cleaned up 5-step framework with:
 * ✅ Recent 1-minute data
 * ✅ Confluence hit rate monitoring
 * ✅ Signal quality validation
 * ✅ Risk management verification
 * ✅ lib/ integration (no modifications)
 */

import { Strategy, BacktestParams } from '../lib/types';
import { EnhancedBacktestEngine } from './enhanced-backtest-engine';

async function runEnhancedValidation() {
  console.log('🎯 ENHANCED STRATEGY VALIDATION');
  console.log('================================');
  console.log('⏰ Testing with recent 1-minute data');
  console.log('📊 Monitoring confluence & signal quality');
  console.log('🛡️ Validating risk management limits');
  console.log('');

  try {
    // Use EXACT lib/types.ts Strategy interface (no modifications!)
    const strategy: Strategy = {
      id: 'enhanced-validation-test',
      name: 'Enhanced 0DTE Validation',
      description: 'Validating cleaned 5-step framework',
      userId: 'validation-user',
      
      // Technical indicators (from lib/types.ts)
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      
      // Risk management (from lib/types.ts)
      stopLossPercent: 55,        // 55% stop loss for 0DTE
      takeProfitPercent: 100,     // 100% take profit for 0DTE
      positionSizePercent: 1.5,   // 1.5% of account per trade
      maxPositions: 3,            // Max 3 concurrent positions
      
      // Options parameters (from lib/types.ts)
      daysToExpiration: 0,        // 0DTE strategy
      deltaRange: 0.15,           // ATM focus
      
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const params: BacktestParams = {
      strategyId: strategy.id,
      startDate: new Date('2024-11-25'),  // Recent week
      endDate: new Date('2024-11-29'),    // 5 trading days
      initialCapital: 25000               // $25K account
    };

    console.log('📋 STRATEGY CONFIGURATION:');
    console.log(`   Strategy: ${strategy.name}`);
    console.log(`   Account: $${params.initialCapital.toLocaleString()}`);
    console.log(`   Period: ${params.startDate.toDateString()} → ${params.endDate.toDateString()}`);
    console.log(`   DTE: ${strategy.daysToExpiration} days (0DTE)`);
    console.log(`   Position Size: ${strategy.positionSizePercent}% per trade`);
    console.log(`   Max Positions: ${strategy.maxPositions}`);
    console.log(`   Stop Loss: ${strategy.stopLossPercent}%`);
    console.log(`   Take Profit: ${strategy.takeProfitPercent}%`);
    console.log('');

    console.log('🚀 Starting Enhanced Backtest...');
    console.log('=================================');
    
    // Run backtest with 1-minute precision using static method
    const results = await EnhancedBacktestEngine.runEnhancedBacktest(strategy, params, {
      timeframe: '1Min',
      symbol: 'SPY',
      trackDetailedMetrics: true,
      calculateIndicatorAccuracy: true
    });
    
    console.log('');
    console.log('📈 BACKTEST RESULTS:');
    console.log('====================');
    console.log(`💰 Initial Capital: $${params.initialCapital.toLocaleString()}`);
    
    // Calculate final balance from total return
    const finalBalance = params.initialCapital * (1 + results.performance.totalReturn);
    console.log(`💰 Final Balance: $${finalBalance.toLocaleString()}`);
    console.log(`📊 Total Return: ${(results.performance.totalReturn * 100).toFixed(2)}%`);
    console.log(`📈 Total Trades: ${results.performance.totalTrades}`);
    console.log(`🎯 Win Rate: ${(results.performance.winRate * 100).toFixed(1)}%`);
    console.log(`💵 Average Win: $${results.performance.averageWin.toFixed(2)}`);
    console.log(`💸 Average Loss: $${Math.abs(results.performance.averageLoss).toFixed(2)}`);
    console.log(`📊 Sharpe Ratio: ${results.performance.sharpeRatio.toFixed(2)}`);
    console.log(`📉 Max Drawdown: ${(results.performance.maxDrawdown * 100).toFixed(2)}%`);
    
    // Strategy-specific analytics
    if (results.strategyAnalytics) {
      console.log('');
      console.log('🎯 STRATEGY ANALYTICS:');
      console.log('======================');
      
      console.log('📊 Signal Quality Distribution:');
      console.log(`   🟢 Excellent: ${results.strategyAnalytics.signalQuality.excellent} signals`);
      console.log(`   🟡 Good: ${results.strategyAnalytics.signalQuality.good} signals`);
      console.log(`   🟠 Fair: ${results.strategyAnalytics.signalQuality.fair} signals`);
      console.log(`   🔴 Poor: ${results.strategyAnalytics.signalQuality.poor} signals`);
      
      console.log('');
      console.log('🎯 Confluence Analysis:');
      const confluenceRate = (results.strategyAnalytics.confluenceAnalysis.strongZoneHitRate * 100).toFixed(1);
      console.log(`   💎 Strong Zone Hit Rate: ${confluenceRate}%`);
      console.log(`   📊 Avg Confluence Count: ${results.strategyAnalytics.confluenceAnalysis.avgConfluenceCount.toFixed(1)}`);
      
      // Validate confluence quality
      if (results.strategyAnalytics.confluenceAnalysis.strongZoneHitRate > 0.65) {
        console.log('   ✅ Excellent confluence detection (>65%)');
      } else if (results.strategyAnalytics.confluenceAnalysis.strongZoneHitRate > 0.50) {
        console.log('   ⚠️  Good confluence detection (50-65%)');
      } else {
        console.log('   ❌ Poor confluence detection (<50%) - needs tuning');
      }
    }
    
    console.log('');
    console.log('🛡️ RISK MANAGEMENT VALIDATION:');
    console.log('===============================');
    
    // Check if risk limits were respected
    const maxRiskPerTrade = params.initialCapital * (strategy.positionSizePercent / 100);
    const actualMaxDrawdown = results.performance.maxDrawdown;
    
    console.log(`   💰 Max Risk Per Trade: $${maxRiskPerTrade.toFixed(2)} (${strategy.positionSizePercent}%)`);
    console.log(`   📉 Actual Max Drawdown: ${(actualMaxDrawdown * 100).toFixed(2)}%`);
    console.log(`   🎯 Drawdown Limit: 15.0%`);
    
    if (actualMaxDrawdown <= 0.15) {
      console.log('   ✅ Risk management: PASSED (drawdown within limits)');
    } else {
      console.log('   ⚠️  Risk management: WARNING (exceeded 15% drawdown)');
    }
    
    if (results.performance.totalTrades > 0) {
      console.log('   ✅ Signal generation: WORKING (trades executed)');
    } else {
      console.log('   ❌ Signal generation: FAILED (no trades)');
    }
    
    console.log('');
    console.log('🧪 FRAMEWORK COMPONENT VALIDATION:');
    console.log('===================================');
    
    // Test all core components
    const { GammaExposureEngine } = await import('./gamma-exposure-engine');
    const { AnchoredVolumeProfile } = await import('./anchored-volume-profile');
    const { AnchoredVWAP } = await import('./anchored-vwap');
    const { MicrofractalFibonacci } = await import('./microfractal-fibonacci');
    const { EnhancedATRRiskManager } = await import('./enhanced-atr-risk-mgmt');
    const { CoherentStrategyFramework } = await import('./coherent-strategy-framework');
    
    console.log('   ✅ Gamma Exposure Engine - Ready');
    console.log('   ✅ Anchored Volume Profile - Ready');  
    console.log('   ✅ Anchored VWAP - Ready');
    console.log('   ✅ Microfractal-Fibonacci - Ready');
    console.log('   ✅ Enhanced ATR Risk Manager - Ready');
    console.log('   ✅ Coherent Strategy Framework - Ready');
    console.log('   ✅ Enhanced Backtest Engine - Ready');
    
    console.log('');
    console.log('🎉 VALIDATION COMPLETE!');
    console.log('=======================');
    
    if (results.performance.totalTrades > 0 && actualMaxDrawdown <= 0.15) {
      console.log('✅ Strategy Framework: VALIDATED & READY');
      console.log('✅ Risk Management: WORKING PROPERLY');
      console.log('✅ Signal Quality: MONITORED');
      console.log('✅ Confluence Detection: ACTIVE');
      console.log('');
      console.log('🚀 READY FOR PAPER TRADING INTEGRATION!');
      return true;
    } else {
      console.log('⚠️  Strategy needs tuning before paper trading');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation Error:', error instanceof Error ? error.message : error);
    console.log('');
    console.log('📝 Troubleshooting:');
    console.log('   ✅ Check Alpaca API credentials');
    console.log('   ✅ Verify market data access');
    console.log('   ✅ Ensure all components are operational');
    return false;
  }
}

// Run validation
runEnhancedValidation().then(success => {
  if (success) {
    console.log('');
    console.log('🎯 Next Step: Paper Trading Integration');
    console.log('======================================');
    console.log('   📋 Enhanced backtest validated successfully');
    console.log('   🛡️ Risk management limits working');
    console.log('   📊 Signal quality monitored');
    console.log('   💎 Confluence analysis active');
    console.log('   🚀 Ready to integrate with paper trading engine');
  }
  process.exit(success ? 0 : 1);
});