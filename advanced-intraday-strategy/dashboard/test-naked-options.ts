#!/usr/bin/env ts-node
/**
 * QUICK TEST: Naked Options Institutional Backtest
 * 
 * Tests if our updated system generates naked options trades
 */

import { DashboardBacktestRunner } from './backtest-runner';
import { TradingParameters, ParameterPresets } from './trading-parameters';

async function testNakedOptionsBacktest() {
  console.log('🚀 TESTING NAKED OPTIONS INSTITUTIONAL BACKTEST');
  console.log('='.repeat(50));
  
  // Use conservative preset parameters
  const testParams = ParameterPresets.CONSERVATIVE.parameters;
  
  try {
    console.log('🎯 Running 3-day naked options backtest...');
    const results = await DashboardBacktestRunner.runBacktestWithParameters(
      testParams,
      '15Min',
      3
    );
    
    console.log('\n✅ BACKTEST RESULTS:');
    console.log('='.repeat(30));
    console.log(`📊 Total Trades: ${results.totalTrades}`);
    console.log(`🎯 Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
    console.log(`💰 Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
    console.log(`📈 Avg Daily P&L: $${results.avgDailyPnL.toFixed(2)}`);
    console.log(`📉 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    
    if (results.totalTrades > 0) {
      console.log('\n🎉 SUCCESS: Naked options trades generated!');
      console.log(`💡 Strategy: Institutional-grade naked calls/puts`);
      console.log(`🏛️ Features: Greeks, Transaction Costs, Risk Management`);
    } else {
      console.log('\n⚠️ WARNING: No trades generated');
      console.log('🔍 Check signal generation logic');
    }
    
  } catch (error) {
    console.error('❌ BACKTEST ERROR:', error);
  }
}

// Run the test
testNakedOptionsBacktest().catch(console.error);