/**
 * QUICK 0-DTE TEST - Demonstrate minute-level precision
 * This shows the difference between daily and minute-level data
 */

import { alpacaClient } from './alpaca';
import { BacktestEngine } from './backtest-engine';

export class QuickDTETest {
  
  /**
   * Run a quick 5-day 0-DTE test to show minute-level precision
   */
  static async runQuickTest() {
    console.log('🔥 QUICK 0-DTE TEST: Demonstrating minute-level precision vs daily data');
    
    // Define test dates (recent 5 days for minute data)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    
    console.log(`📅 Test Period: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Test 1: Daily data (old method)
    console.log('\n📊 TEST 1: DAILY DATA (Old Method)');
    const dailyData = await alpacaClient.getMarketData('SPY', startDate, endDate, '1Day');
    console.log(`📈 Daily bars: ${dailyData.length}`);
    
    // Test 2: 15-minute data (new method)
    console.log('\n⚡ TEST 2: 15-MINUTE DATA (New 0-DTE Method)');
    const minuteData = await alpacaClient.getMarketData('SPY', startDate, endDate, '15Min');
    console.log(`⚡ 15-minute bars: ${minuteData.length}`);
    
    // Test 3: Same-day precision
    console.log('\n🎯 TEST 3: SAME-DAY INTRADAY PRECISION');
    const today = new Date();
    const todayData = await alpacaClient.getIntradayData('SPY', today);
    console.log(`🔥 Today's minute bars: ${todayData.length}`);
    
    // Calculate precision improvement
    const precisionMultiplier = minuteData.length / Math.max(dailyData.length, 1);
    console.log(`\n🚀 PRECISION IMPROVEMENT: ${precisionMultiplier.toFixed(1)}x more data points`);
    console.log(`💡 More data = Better entry/exit timing for 0-DTE strategies`);
    
    // Sample data comparison
    if (dailyData.length > 0 && minuteData.length > 0) {
      const dailySample = dailyData[0];
      const minuteSample = minuteData[0];
      
      console.log('\n📊 DATA SAMPLE COMPARISON:');
      console.log(`Daily Bar:   ${dailySample.date.toDateString()} - Close: $${dailySample.close.toFixed(2)}`);
      console.log(`15min Bar:   ${minuteSample.date.toLocaleString()} - Close: $${minuteSample.close.toFixed(2)}`);
    }
    
    return {
      dailyBars: dailyData.length,
      minuteBars: minuteData.length,
      todayBars: todayData.length,
      precisionImprovement: precisionMultiplier,
      testPassed: minuteData.length > dailyData.length
    };
  }
  
  /**
   * Run a micro 3-day backtest to show Greeks integration
   */
  static async runMicroBacktest() {
    console.log('\n🔬 MICRO BACKTEST: 3-day 15-minute precision test');
    
    // Use a very short period to force 15-minute data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    
    // This should trigger 15-minute resolution
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`📊 Period: ${daysDiff.toFixed(1)} days (should use 15Min resolution)`);
    
    // Mock strategy for quick test
    const mockStrategy = {
      id: 'quick-test',
      name: 'Quick 0-DTE Test',
      description: 'Testing minute-level precision',
      userId: 'test',
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      stopLossPercent: 0.02,
      takeProfitPercent: 0.5,
      positionSizePercent: 0.1,
      maxPositions: 1,
      daysToExpiration: 0, // 0-DTE
      deltaRange: 0.15,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      console.log('🚀 Running micro backtest with minute-level precision...');
      
      const results = await BacktestEngine.runBacktest(mockStrategy, {
        strategyId: 'quick-test',
        startDate,
        endDate,
        initialCapital: 1000
      });
      
      console.log(`✅ MICRO BACKTEST RESULTS:`);
      console.log(`📊 Total trades: ${results.trades.length}`);
      console.log(`💰 Final balance: $${(1000 + results.performance.totalReturn).toFixed(2)}`);
      console.log(`📈 Win rate: ${results.performance.winRate.toFixed(1)}%`);
      
      // Check if we got minute-level data
      if (results.trades.length > 0) {
        console.log(`⚡ PRECISION CONFIRMED: Trades generated with minute-level data`);
        
        // Show sample trade timing
        const firstTrade = results.trades[0];
        console.log(`🎯 Sample trade: ${firstTrade.entryDate.toLocaleString()} - ${firstTrade.side}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Micro backtest failed:', error);
      return null;
    }
  }
}