#!/usr/bin/env ts-node
/**
 * REALISTIC TEST: Naked Options with Balanced Parameters
 * 
 * Tests naked options with more realistic RSI thresholds
 */

import { DirectInstitutionalBacktestRunner } from './direct-institutional-backtest-runner';
import { TradingParameters, ParameterPresets } from './trading-parameters';

async function testRealisticNakedOptions() {
  console.log('🚀 TESTING NAKED OPTIONS WITH REALISTIC PARAMETERS');
  console.log('='.repeat(55));
  
  // Use BALANCED preset (more realistic thresholds)
  const testParams = ParameterPresets.BALANCED.parameters;
  
  console.log('📊 BALANCED PRESET RSI THRESHOLDS:');
  console.log(`   RSI Oversold: ${testParams.rsiOversold}`);
  console.log(`   RSI Overbought: ${testParams.rsiOverbought}`);
  console.log(`   Breakout Signals: ${testParams.enableBreakoutSignals}`);
  console.log(`   Time-based Signals: ${testParams.enableTimeBasedSignals}`);
  console.log('');
  
  try {
    console.log('🎯 Running 3-day REALISTIC naked options backtest...');
    const results = await DirectInstitutionalBacktestRunner.runDirectInstitutionalBacktest(
      testParams,
      '15Min',
      3
    );
    
    console.log('\n✅ REALISTIC BACKTEST RESULTS:');
    console.log('='.repeat(35));
    console.log(`📊 Total Trades: ${results.totalTrades}`);
    console.log(`🎯 Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
    console.log(`💰 Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
    console.log(`📈 Avg Daily P&L: $${results.avgDailyPnL.toFixed(2)}`);
    console.log(`📉 Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
    
    if (results.totalTrades > 0) {
      console.log('\n🎉 SUCCESS: Naked options trades generated!');
      console.log(`💡 Strategy: Institutional naked calls/puts`);
      console.log(`🏛️ Features: Greeks, Transaction Costs, Risk Management`);
      console.log(`📊 Signal Types: RSI, Momentum, Breakout, Time-based`);
    } else {
      console.log('\n⚠️ Still no trades - may need even more aggressive parameters');
      console.log('🔍 Consider using AGGRESSIVE preset or custom parameters');
    }
    
  } catch (error) {
    console.error('❌ REALISTIC BACKTEST ERROR:', error);
  }
}

testRealisticNakedOptions();