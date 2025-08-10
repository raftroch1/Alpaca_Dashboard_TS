#!/usr/bin/env ts-node
/**
 * HYBRID BACKTEST TEST FOR $200-250/DAY TARGET
 * 
 * Tests the hybrid approach combining:
 * ✅ Sophisticated framework for quality
 * ✅ Simple signals for frequency
 * ✅ 1-minute precision 
 * ✅ Realistic profit targets
 */

import { Strategy, BacktestParams, MarketData, OptionsChain } from '../lib/types';
import { alpacaClient } from '../lib/alpaca';
import HybridSignalGenerator, { HybridSignal } from './hybrid-signal-generator';

interface HybridTrade {
  id: string;
  timestamp: Date;
  signal: HybridSignal;
  entryPrice: number;
  quantity: number;
  status: 'OPEN' | 'CLOSED_PROFIT' | 'CLOSED_LOSS' | 'CLOSED_TIME';
  exitPrice?: number;
  exitTime?: Date;
  pnl?: number;
  holdingMinutes?: number;
}

class HybridBacktestEngine {
  
  private hybridGenerator: HybridSignalGenerator;
  private openTrades: HybridTrade[] = [];
  private closedTrades: HybridTrade[] = [];
  private currentBalance: number;
  private equityCurve: { timestamp: Date; balance: number }[] = [];
  
  constructor(initialCapital: number) {
    this.hybridGenerator = new HybridSignalGenerator();
    this.currentBalance = initialCapital;
  }
  
  async runHybridBacktest(
    strategy: Strategy,
    params: BacktestParams
  ): Promise<{
    performance: {
      totalTrades: number;
      winRate: number;
      totalReturn: number;
      avgDailyPnL: number;
      avgTradesPerDay: number;
      avgWin: number;
      avgLoss: number;
      maxDrawdown: number;
    };
    trades: HybridTrade[];
    signalBreakdown: Record<string, number>;
  }> {
    
    console.log('🚀 Starting Hybrid Backtest...');
    
    // Fetch 1-minute market data
    const marketData = await alpacaClient.getMarketData(
      'SPY',
      params.startDate,
      params.endDate,
      '1Min'
    );
    
    console.log(`📊 Loaded ${marketData.length} 1-minute bars`);
    
    let dayCount = 0;
    let currentDay = '';
    
    // Main backtest loop
    for (let i = 20; i < marketData.length; i++) {
      const currentBar = marketData[i];
      const historicalBars = marketData.slice(0, i + 1);
      
      // Track daily changes
      const barDay = currentBar.date.toDateString();
      if (currentDay !== barDay) {
        if (currentDay !== '') dayCount++;
        currentDay = barDay;
        
        const stats = this.hybridGenerator.getDailyStats();
        console.log(`📅 ${barDay}: ${stats.generated}/${stats.target} signals generated`);
      }
      
      // Generate mock options chain
      const optionsChain = this.generateSimpleOptionsChain(currentBar.close);
      
      // Check exits for open trades
      this.checkExits(currentBar, i);
      
      // Generate new signals (every 5 minutes to avoid overtrading)
      if (i % 5 === 0) {
        const signal = await this.hybridGenerator.generateHybridSignal(
          historicalBars,
          optionsChain,
          strategy
        );
        
        if (signal && this.openTrades.length < 3) { // Max 3 concurrent trades
          this.executeHybridTrade(signal, currentBar, i);
        }
      }
      
      // Update equity curve (every hour)
      if (i % 60 === 0) {
        this.updateEquityCurve(currentBar);
      }
    }
    
    // Close remaining open trades
    this.closeAllOpenTrades(marketData[marketData.length - 1]);
    
    // Calculate final performance
    return this.calculateHybridPerformance(params, dayCount);
  }
  
  private generateSimpleOptionsChain(currentPrice: number): OptionsChain[] {
    const strikes = [
      Math.floor(currentPrice) - 2,
      Math.floor(currentPrice) - 1,
      Math.floor(currentPrice),
      Math.floor(currentPrice) + 1,
      Math.floor(currentPrice) + 2
    ];
    
    return strikes.map(strike => ({
      symbol: `SPY${strike}`,
      strike,
      expiration: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day expiration
      type: 'call' as const,
      side: 'CALL' as const,
      bid: Math.max(0.01, currentPrice - strike + Math.random() * 1.5),
      ask: Math.max(0.05, currentPrice - strike + Math.random() * 1.5 + 0.08),
      volume: 100 + Math.floor(Math.random() * 400),
      openInterest: 500 + Math.floor(Math.random() * 1000),
      impliedVolatility: 0.15 + Math.random() * 0.25,
      delta: strike <= currentPrice ? 0.65 - (currentPrice - strike) * 0.1 : 0.35 + (strike - currentPrice) * 0.1,
      gamma: 0.03 + Math.random() * 0.07,
      theta: -0.08 - Math.random() * 0.15,
      vega: 0.12 + Math.random() * 0.08,
      lastPrice: Math.max(0.01, currentPrice - strike + Math.random() * 1.5),
      date: new Date()
    }));
  }
  
  private executeHybridTrade(signal: HybridSignal, currentBar: MarketData, barIndex: number): void {
    
    const targetOption = signal.targetOptions[0];
    if (!targetOption) return;
    
    // Calculate position size based on target profit/loss
    const optionPrice = (targetOption.bid + targetOption.ask) / 2;
    const maxRisk = signal.maxLoss;
    const contractsAffordable = Math.floor(maxRisk / (optionPrice * 100));
    const quantity = Math.max(1, Math.min(contractsAffordable, 5)); // 1-5 contracts
    
    const totalCost = quantity * optionPrice * 100;
    
    if (totalCost > this.currentBalance * 0.05) {
      return; // Don't risk more than 5% of account on single trade
    }
    
    const trade: HybridTrade = {
      id: `${signal.signalType}_${barIndex}`,
      timestamp: currentBar.date,
      signal,
      entryPrice: optionPrice,
      quantity,
      status: 'OPEN'
    };
    
    this.openTrades.push(trade);
    this.currentBalance -= totalCost; // Deduct premium paid
    
    console.log(`📈 OPENED: ${signal.action} ${quantity}x ${targetOption.symbol} @ $${optionPrice.toFixed(2)} (${signal.signalType}, conf: ${(signal.hybridConfidence * 100).toFixed(0)}%)`);
  }
  
  private checkExits(currentBar: MarketData, barIndex: number): void {
    
    for (const trade of this.openTrades) {
      const holdingMinutes = (currentBar.date.getTime() - trade.timestamp.getTime()) / (1000 * 60);
      
      // Mock option price evolution (simplified)
      const priceChange = (currentBar.close - trade.signal.targetOptions[0].strike) / trade.signal.targetOptions[0].strike;
      const timeDecay = Math.max(0, 1 - holdingMinutes / (8 * 60)); // Decay over 8 hours
      
      let currentOptionPrice = trade.entryPrice;
      
      if (trade.signal.action === 'BUY_CALL') {
        // Call increases with positive price movement
        currentOptionPrice = trade.entryPrice * (1 + priceChange * 3) * timeDecay;
      } else {
        // Put increases with negative price movement  
        currentOptionPrice = trade.entryPrice * (1 - priceChange * 3) * timeDecay;
      }
      
      currentOptionPrice = Math.max(0.01, currentOptionPrice);
      
      let shouldClose = false;
      let exitReason = '';
      
      // Profit target: $150 target on $250 position = 60% gain
      if (currentOptionPrice >= trade.entryPrice * 1.60) {
        shouldClose = true;
        exitReason = 'PROFIT_TARGET';
        trade.status = 'CLOSED_PROFIT';
      }
      // Stop loss: $100 loss on $250 position = 40% loss
      else if (currentOptionPrice <= trade.entryPrice * 0.60) {
        shouldClose = true;
        exitReason = 'STOP_LOSS';
        trade.status = 'CLOSED_LOSS';
      }
      // Time exit: Close before end of day
      else if (currentBar.date.getHours() >= 15 && currentBar.date.getMinutes() >= 45) {
        shouldClose = true;
        exitReason = 'TIME_EXIT';
        trade.status = currentOptionPrice >= trade.entryPrice ? 'CLOSED_PROFIT' : 'CLOSED_LOSS';
      }
      // Maximum holding time
      else if (holdingMinutes >= trade.signal.expectedHoldMinutes * 1.5) {
        shouldClose = true;
        exitReason = 'MAX_HOLD_TIME';
        trade.status = currentOptionPrice >= trade.entryPrice ? 'CLOSED_PROFIT' : 'CLOSED_LOSS';
      }
      
      if (shouldClose) {
        const proceeds = trade.quantity * currentOptionPrice * 100;
        const pnl = proceeds - (trade.quantity * trade.entryPrice * 100);
        
        trade.exitPrice = currentOptionPrice;
        trade.exitTime = currentBar.date;
        trade.pnl = pnl;
        trade.holdingMinutes = holdingMinutes;
        
        this.currentBalance += proceeds;
        this.closedTrades.push(trade);
        
        console.log(`📉 CLOSED: ${trade.id} @ $${currentOptionPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)} | Reason: ${exitReason}`);
      }
    }
    
    // Remove closed trades from open list
    this.openTrades = this.openTrades.filter(t => !this.closedTrades.includes(t));
  }
  
  private closeAllOpenTrades(finalBar: MarketData): void {
    for (const trade of this.openTrades) {
      const finalPrice = trade.entryPrice * 0.5; // Assume some decay
      const proceeds = trade.quantity * finalPrice * 100;
      const pnl = proceeds - (trade.quantity * trade.entryPrice * 100);
      
      trade.exitPrice = finalPrice;
      trade.exitTime = finalBar.date;
      trade.pnl = pnl;
      trade.status = 'CLOSED_TIME';
      trade.holdingMinutes = (finalBar.date.getTime() - trade.timestamp.getTime()) / (1000 * 60);
      
      this.currentBalance += proceeds;
      this.closedTrades.push(trade);
    }
    
    this.openTrades = [];
  }
  
  private updateEquityCurve(currentBar: MarketData): void {
    this.equityCurve.push({
      timestamp: currentBar.date,
      balance: this.currentBalance
    });
  }
  
  private calculateHybridPerformance(params: BacktestParams, dayCount: number) {
    
    const totalTrades = this.closedTrades.length;
    const winningTrades = this.closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = this.closedTrades.filter(t => (t.pnl || 0) <= 0);
    
    const totalPnL = this.closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length : 0;
    
    const signalBreakdown: Record<string, number> = {};
    this.closedTrades.forEach(trade => {
      const type = trade.signal.signalType;
      signalBreakdown[type] = (signalBreakdown[type] || 0) + 1;
    });
    
    // Calculate max drawdown
    let maxBalance = params.initialCapital;
    let maxDrawdown = 0;
    
    for (const point of this.equityCurve) {
      if (point.balance > maxBalance) {
        maxBalance = point.balance;
      }
      const drawdown = (maxBalance - point.balance) / maxBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return {
      performance: {
        totalTrades,
        winRate: totalTrades > 0 ? winningTrades.length / totalTrades : 0,
        totalReturn: totalPnL / params.initialCapital,
        avgDailyPnL: dayCount > 0 ? totalPnL / dayCount : 0,
        avgTradesPerDay: dayCount > 0 ? totalTrades / dayCount : 0,
        avgWin,
        avgLoss,
        maxDrawdown
      },
      trades: this.closedTrades,
      signalBreakdown
    };
  }
}

async function testHybridBacktest() {
  console.log('🎯 HYBRID BACKTEST TEST');
  console.log('=======================');
  console.log('📊 Strategy: Sophisticated + Simple signals');
  console.log('⏰ Timeframe: 1-minute bars');
  console.log('🎯 Target: $200-250/day with 3 trades/day');
  console.log('');

  const strategy: Strategy = {
    id: 'hybrid-test',
    name: 'Hybrid Signal Strategy',
    description: 'Combining sophisticated and simple signals',
    userId: 'hybrid-test',
    
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    
    stopLossPercent: 40,        // $100 loss on $250 position
    takeProfitPercent: 60,      // $150 win on $250 position
    positionSizePercent: 1.0,   // 1% of account per trade
    maxPositions: 3,
    
    daysToExpiration: 0,
    deltaRange: 0.15,
    
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const params: BacktestParams = {
    strategyId: strategy.id,
    startDate: new Date('2024-11-18'),  // 2 weeks test
    endDate: new Date('2024-11-29'),
    initialCapital: 25000
  };

  try {
    const backtest = new HybridBacktestEngine(params.initialCapital);
    const results = await backtest.runHybridBacktest(strategy, params);
    
    console.log('');
    console.log('📈 HYBRID BACKTEST RESULTS:');
    console.log('===========================');
    
    const finalBalance = params.initialCapital + (results.performance.totalReturn * params.initialCapital);
    
    console.log(`💰 Initial Capital: $${params.initialCapital.toLocaleString()}`);
    console.log(`💰 Final Balance: $${finalBalance.toLocaleString()}`);
    console.log(`📊 Total Return: ${(results.performance.totalReturn * 100).toFixed(2)}%`);
    console.log(`📈 Total Trades: ${results.performance.totalTrades}`);
    console.log(`📈 Avg Trades/Day: ${results.performance.avgTradesPerDay.toFixed(1)}`);
    console.log(`💵 Avg Daily P&L: $${results.performance.avgDailyPnL.toFixed(2)}`);
    console.log(`🎯 Win Rate: ${(results.performance.winRate * 100).toFixed(1)}%`);
    console.log(`💵 Average Win: $${results.performance.avgWin.toFixed(2)}`);
    console.log(`💸 Average Loss: $${Math.abs(results.performance.avgLoss).toFixed(2)}`);
    console.log(`📉 Max Drawdown: ${(results.performance.maxDrawdown * 100).toFixed(2)}%`);
    
    console.log('');
    console.log('🎯 SIGNAL BREAKDOWN:');
    console.log('====================');
    Object.entries(results.signalBreakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} trades`);
    });
    
    console.log('');
    console.log('🎯 TARGET ASSESSMENT:');
    console.log('=====================');
    
    const dailyTargetMet = results.performance.avgDailyPnL >= 200 && results.performance.avgDailyPnL <= 300;
    const tradeFrequencyGood = results.performance.avgTradesPerDay >= 2 && results.performance.avgTradesPerDay <= 5;
    const winRateGood = results.performance.winRate >= 0.6;
    
    console.log(`📊 Daily P&L Target: $200-250 → ${dailyTargetMet ? '✅' : '❌'} $${results.performance.avgDailyPnL.toFixed(2)}`);
    console.log(`📊 Trade Frequency: 2-5/day → ${tradeFrequencyGood ? '✅' : '❌'} ${results.performance.avgTradesPerDay.toFixed(1)}`);
    console.log(`📊 Win Rate Target: 60%+ → ${winRateGood ? '✅' : '❌'} ${(results.performance.winRate * 100).toFixed(1)}%`);
    
    if (dailyTargetMet && tradeFrequencyGood && winRateGood) {
      console.log('');
      console.log('🎉 HYBRID STRATEGY: SUCCESS!');
      console.log('✅ All profit targets achieved');
      console.log('✅ Trade frequency optimized');
      console.log('🚀 READY FOR PAPER TRADING');
      return true;
    } else {
      console.log('');
      console.log('⚠️  HYBRID STRATEGY: NEEDS TUNING');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Hybrid Test Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

testHybridBacktest().then(success => {
  process.exit(success ? 0 : 1);
});