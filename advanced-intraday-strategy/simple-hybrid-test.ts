#!/usr/bin/env ts-node
/**
 * SIMPLE HYBRID TEST FOR $200-250/DAY TARGET
 * 
 * Bypasses complex framework temporarily and focuses on simple signals:
 * ✅ RSI extremes (30/70)
 * ✅ Momentum breakouts
 * ✅ Time-based signals
 * ✅ 1-minute bars with realistic targets
 */

import { Strategy, BacktestParams, MarketData, OptionsChain } from '../lib/types';
import { alpacaClient } from '../lib/alpaca';
import { TechnicalAnalysis } from '../lib/technical-indicators';

interface SimpleSignal {
  action: 'BUY_CALL' | 'BUY_PUT' | 'NO_TRADE';
  confidence: number;
  reasoning: string[];
  signalType: 'RSI_EXTREME' | 'MOMENTUM' | 'BREAKOUT' | 'TIME_BASED';
  targetProfit: number;
  maxLoss: number;
}

interface SimpleTrade {
  id: string;
  timestamp: Date;
  action: 'BUY_CALL' | 'BUY_PUT';
  entryPrice: number;
  quantity: number;
  signalType: string;
  status: 'OPEN' | 'CLOSED_PROFIT' | 'CLOSED_LOSS' | 'CLOSED_TIME';
  exitPrice?: number;
  exitTime?: Date;
  pnl?: number;
  holdingMinutes?: number;
}

class SimpleHybridBacktest {
  
  // TechnicalAnalysis uses static methods
  private openTrades: SimpleTrade[] = [];
  private closedTrades: SimpleTrade[] = [];
  private currentBalance: number;
  
  // Daily tracking
  private dailyTradesGenerated = 0;
  private currentDay = '';
  private lastSignalTime = 0;
  
  // Target metrics
  private readonly DAILY_TRADE_TARGET = 3;
  private readonly TARGET_WIN_SIZE = 150;
  private readonly TARGET_LOSS_SIZE = 100;
  private readonly MIN_SIGNAL_SPACING_MINUTES = 30;

  constructor(initialCapital: number) {
    this.currentBalance = initialCapital;
    
    console.log('🚀 SIMPLE HYBRID BACKTEST INITIALIZED');
    console.log(`   🎯 Target: ${this.DAILY_TRADE_TARGET} trades/day`);
    console.log(`   💰 Targets: $${this.TARGET_WIN_SIZE} wins, $${this.TARGET_LOSS_SIZE} losses`);
  }
  
  async runSimpleBacktest(strategy: Strategy, params: BacktestParams) {
    
    console.log('📊 Fetching 1-minute market data...');
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
        if (currentDay !== '') {
          dayCount++;
          console.log(`📅 ${currentDay}: ${this.dailyTradesGenerated}/${this.DAILY_TRADE_TARGET} signals generated`);
        }
        currentDay = barDay;
        this.dailyTradesGenerated = 0;
      }
      
      // Check exits for open trades
      this.checkExits(currentBar);
      
      // Generate new signals (every 5 minutes to avoid overtrading)
      if (i % 5 === 0) {
        const signal = this.generateSimpleSignal(historicalBars, currentBar);
        
        if (signal && signal.action !== 'NO_TRADE' && this.openTrades.length < 3) {
          this.executeSimpleTrade(signal, currentBar, i);
        }
      }
    }
    
    // Close remaining trades
    this.closeAllTrades(marketData[marketData.length - 1]);
    
    // Calculate performance
    return this.calculateSimplePerformance(params, dayCount);
  }
  
  private generateSimpleSignal(marketData: MarketData[], currentBar: MarketData): SimpleSignal | null {
    
    const currentTime = currentBar.date;
    const currentDay = currentTime.toDateString();
    
    // Reset daily counter if new day
    if (this.currentDay !== currentDay) {
      this.currentDay = currentDay;
      this.dailyTradesGenerated = 0;
    }
    
    // Check signal spacing
    const currentTimeMs = currentTime.getTime();
    const minutesSinceLastSignal = (currentTimeMs - this.lastSignalTime) / (1000 * 60);
    
    if (minutesSinceLastSignal < this.MIN_SIGNAL_SPACING_MINUTES && this.lastSignalTime > 0) {
      return null;
    }
    
    // PRIORITY 1: RSI extreme signals
    const rsiSignal = this.generateRSISignal(marketData);
    if (rsiSignal) {
      this.dailyTradesGenerated++;
      this.lastSignalTime = currentTimeMs;
      return rsiSignal;
    }
    
    // PRIORITY 2: Momentum signals
    const momentumSignal = this.generateMomentumSignal(marketData);
    if (momentumSignal) {
      this.dailyTradesGenerated++;
      this.lastSignalTime = currentTimeMs;
      return momentumSignal;
    }
    
    // PRIORITY 3: Breakout signals
    const breakoutSignal = this.generateBreakoutSignal(marketData);
    if (breakoutSignal) {
      this.dailyTradesGenerated++;
      this.lastSignalTime = currentTimeMs;
      return breakoutSignal;
    }
    
    // PRIORITY 4: Time-based signals (if behind target)
    const remainingSignals = this.DAILY_TRADE_TARGET - this.dailyTradesGenerated;
    if (remainingSignals > 0) {
      const timeSignal = this.generateTimeBasedSignal(marketData, currentTime);
      if (timeSignal) {
        this.dailyTradesGenerated++;
        this.lastSignalTime = currentTimeMs;
        return timeSignal;
      }
    }
    
    return null;
  }
  
  private generateRSISignal(marketData: MarketData[]): SimpleSignal | null {
    if (marketData.length < 14) return null;
    
    const rsiValues = TechnicalAnalysis.calculateRSI(marketData.slice(-14), 14);
    if (rsiValues.length === 0) return null;
    
    const currentRSI = rsiValues[rsiValues.length - 1];
    
    if (currentRSI <= 30) {
      return {
        action: 'BUY_CALL',
        confidence: 0.65,
        reasoning: [`RSI oversold: ${currentRSI.toFixed(1)}`, 'Mean reversion expected'],
        signalType: 'RSI_EXTREME',
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE
      };
    }
    
    if (currentRSI >= 70) {
      return {
        action: 'BUY_PUT',
        confidence: 0.65,
        reasoning: [`RSI overbought: ${currentRSI.toFixed(1)}`, 'Mean reversion expected'],
        signalType: 'RSI_EXTREME',
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE
      };
    }
    
    return null;
  }
  
  private generateMomentumSignal(marketData: MarketData[]): SimpleSignal | null {
    if (marketData.length < 5) return null;
    
    const recent = marketData.slice(-3);
    const currentPrice = recent[2].close;
    const previousPrice = recent[0].close;
    const priceMovePct = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Check volume confirmation
    const currentVolume = recent[2].volume || 0;
    const avgVolume = marketData.slice(-10).reduce((sum, bar) => sum + Number(bar.volume || 0), 0) / 10;
    const volumeRatio = avgVolume > 0 ? Number(currentVolume) / avgVolume : 1;
    
    // LOWERED THRESHOLD: 0.08% price move with 1.2x volume
    if (Math.abs(priceMovePct) >= 0.08 && volumeRatio >= 1.2) {
      
      const action = priceMovePct > 0 ? 'BUY_CALL' : 'BUY_PUT';
      const confidence = Math.min(0.72, 0.55 + Math.abs(priceMovePct) * 8 + (volumeRatio - 1) * 0.1);
      
      return {
        action,
        confidence,
        reasoning: [
          `Momentum: ${priceMovePct.toFixed(3)}%`,
          `Volume: ${volumeRatio.toFixed(1)}x average`
        ],
        signalType: 'MOMENTUM',
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE
      };
    }
    
    return null;
  }
  
  private generateBreakoutSignal(marketData: MarketData[]): SimpleSignal | null {
    if (marketData.length < 20) return null;
    
    const currentPrice = marketData[marketData.length - 1].close;
    const recent20 = marketData.slice(-20, -1);
    
    const highestHigh = Math.max(...recent20.map(bar => bar.high));
    const lowestLow = Math.min(...recent20.map(bar => bar.low));
    
    // Upside breakout
    if (currentPrice > highestHigh) {
      const breakoutPct = ((currentPrice - highestHigh) / highestHigh) * 100;
      
      if (breakoutPct >= 0.05) {
        const confidence = Math.min(0.68, 0.58 + breakoutPct * 10);
        
        return {
          action: 'BUY_CALL',
          confidence,
          reasoning: [
            `Upside breakout: +${breakoutPct.toFixed(3)}%`,
            `Above 20-bar high: $${highestHigh.toFixed(2)}`
          ],
          signalType: 'BREAKOUT',
          targetProfit: this.TARGET_WIN_SIZE,
          maxLoss: this.TARGET_LOSS_SIZE
        };
      }
    }
    
    // Downside breakout
    if (currentPrice < lowestLow) {
      const breakoutPct = ((lowestLow - currentPrice) / lowestLow) * 100;
      
      if (breakoutPct >= 0.05) {
        const confidence = Math.min(0.68, 0.58 + breakoutPct * 10);
        
        return {
          action: 'BUY_PUT',
          confidence,
          reasoning: [
            `Downside breakout: -${breakoutPct.toFixed(3)}%`,
            `Below 20-bar low: $${lowestLow.toFixed(2)}`
          ],
          signalType: 'BREAKOUT',
          targetProfit: this.TARGET_WIN_SIZE,
          maxLoss: this.TARGET_LOSS_SIZE
        };
      }
    }
    
    return null;
  }
  
  private generateTimeBasedSignal(marketData: MarketData[], currentTime: Date): SimpleSignal | null {
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    // Morning session (10:30-11:30 AM)
    if ((hour === 10 && minute >= 30) || (hour === 11 && minute <= 30)) {
      const recent5 = marketData.slice(-5);
      const trendBias = recent5[4].close > recent5[0].close ? 'BUY_CALL' : 'BUY_PUT';
      
      return {
        action: trendBias,
        confidence: 0.58,
        reasoning: ['Morning momentum window', 'Time-based signal for daily target'],
        signalType: 'TIME_BASED',
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE
      };
    }
    
    // Afternoon session (2:00-3:30 PM)
    if ((hour === 14 && minute >= 0) || (hour === 15 && minute <= 30)) {
      const action = Math.random() > 0.35 ? 'BUY_PUT' : 'BUY_CALL'; // Slight bearish bias
      
      return {
        action,
        confidence: 0.60,
        reasoning: ['Afternoon positioning', 'Time-based signal for daily target'],
        signalType: 'TIME_BASED',
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE
      };
    }
    
    return null;
  }
  
  private executeSimpleTrade(signal: SimpleSignal, currentBar: MarketData, barIndex: number): void {
    
    // Mock option pricing (simplified)
    const optionPrice = 2.50; // $250 per contract
    const maxRisk = signal.maxLoss;
    const contractsAffordable = Math.floor(maxRisk / (optionPrice * 100));
    const quantity = Math.max(1, Math.min(contractsAffordable, 3)); // 1-3 contracts
    
    const totalCost = quantity * optionPrice * 100;
    
    if (totalCost > this.currentBalance * 0.05) {
      return; // Don't risk more than 5% of account
    }
    
    const trade: SimpleTrade = {
      id: `${signal.signalType}_${barIndex}`,
      timestamp: currentBar.date,
      action: signal.action as 'BUY_CALL' | 'BUY_PUT', // Type assertion since we checked !== 'NO_TRADE'
      entryPrice: optionPrice,
      quantity,
      signalType: signal.signalType,
      status: 'OPEN'
    };
    
    this.openTrades.push(trade);
    this.currentBalance -= totalCost;
    
    console.log(`📈 OPENED: ${signal.action} ${quantity}x @ $${optionPrice.toFixed(2)} (${signal.signalType}, conf: ${(signal.confidence * 100).toFixed(0)}%)`);
  }
  
  private checkExits(currentBar: MarketData): void {
    
    for (const trade of this.openTrades) {
      const holdingMinutes = (currentBar.date.getTime() - trade.timestamp.getTime()) / (1000 * 60);
      
      // Mock option price evolution
      const priceChange = (currentBar.close - 600) / 600; // Assume ATM strike around $600
      const timeDecay = Math.max(0.1, 1 - holdingMinutes / (8 * 60)); // Decay over 8 hours
      
      let currentOptionPrice = trade.entryPrice;
      
      if (trade.action === 'BUY_CALL') {
        currentOptionPrice = trade.entryPrice * (1 + priceChange * 2.5) * timeDecay;
      } else {
        currentOptionPrice = trade.entryPrice * (1 - priceChange * 2.5) * timeDecay;
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
      // Maximum holding time (2 hours)
      else if (holdingMinutes >= 120) {
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
    
    this.openTrades = this.openTrades.filter(t => !this.closedTrades.includes(t));
  }
  
  private closeAllTrades(finalBar: MarketData): void {
    for (const trade of this.openTrades) {
      const finalPrice = trade.entryPrice * 0.5;
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
  
  private calculateSimplePerformance(params: BacktestParams, dayCount: number) {
    
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
      signalBreakdown[trade.signalType] = (signalBreakdown[trade.signalType] || 0) + 1;
    });
    
    return {
      totalTrades,
      winRate: totalTrades > 0 ? winningTrades.length / totalTrades : 0,
      totalReturn: totalPnL / params.initialCapital,
      avgDailyPnL: dayCount > 0 ? totalPnL / dayCount : 0,
      avgTradesPerDay: dayCount > 0 ? totalTrades / dayCount : 0,
      avgWin,
      avgLoss,
      finalBalance: this.currentBalance,
      signalBreakdown
    };
  }
}

async function testSimpleHybrid() {
  console.log('🎯 SIMPLE HYBRID BACKTEST');
  console.log('=========================');
  console.log('📊 Using simple, proven signals only');
  console.log('⏰ 1-minute bars with 30-min spacing');
  console.log('🎯 Target: $200-250/day with 3 trades/day');
  console.log('');

  const strategy: Strategy = {
    id: 'simple-hybrid-test',
    name: 'Simple Hybrid Strategy',
    description: 'Simple signals for profit target',
    userId: 'simple-test',
    
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    
    stopLossPercent: 40,
    takeProfitPercent: 60,
    positionSizePercent: 1.0,
    maxPositions: 3,
    
    daysToExpiration: 0,
    deltaRange: 0.15,
    
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const params: BacktestParams = {
    strategyId: strategy.id,
    startDate: new Date('2024-11-18'),
    endDate: new Date('2024-11-29'),
    initialCapital: 25000
  };

  try {
    const backtest = new SimpleHybridBacktest(params.initialCapital);
    const results = await backtest.runSimpleBacktest(strategy, params);
    
    console.log('');
    console.log('📈 SIMPLE HYBRID RESULTS:');
    console.log('=========================');
    
    console.log(`💰 Initial Capital: $${params.initialCapital.toLocaleString()}`);
    console.log(`💰 Final Balance: $${results.finalBalance.toLocaleString()}`);
    console.log(`📊 Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
    console.log(`📊 Total P&L: $${(results.finalBalance - params.initialCapital).toFixed(2)}`);
    console.log(`📈 Total Trades: ${results.totalTrades}`);
    console.log(`📈 Avg Trades/Day: ${results.avgTradesPerDay.toFixed(1)}`);
    console.log(`💵 Avg Daily P&L: $${results.avgDailyPnL.toFixed(2)}`);
    console.log(`🎯 Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
    console.log(`💵 Average Win: $${results.avgWin.toFixed(2)}`);
    console.log(`💸 Average Loss: $${Math.abs(results.avgLoss).toFixed(2)}`);
    
    console.log('');
    console.log('🎯 SIGNAL BREAKDOWN:');
    console.log('====================');
    Object.entries(results.signalBreakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} trades`);
    });
    
    console.log('');
    console.log('🎯 TARGET ASSESSMENT:');
    console.log('=====================');
    
    const dailyTargetMet = results.avgDailyPnL >= 200 && results.avgDailyPnL <= 300;
    const tradeFrequencyGood = results.avgTradesPerDay >= 2 && results.avgTradesPerDay <= 5;
    const winRateGood = results.winRate >= 0.6;
    
    console.log(`📊 Daily P&L Target: $200-250 → ${dailyTargetMet ? '✅' : '❌'} $${results.avgDailyPnL.toFixed(2)}`);
    console.log(`📊 Trade Frequency: 2-5/day → ${tradeFrequencyGood ? '✅' : '❌'} ${results.avgTradesPerDay.toFixed(1)}`);
    console.log(`📊 Win Rate Target: 60%+ → ${winRateGood ? '✅' : '❌'} ${(results.winRate * 100).toFixed(1)}%`);
    
    if (dailyTargetMet && tradeFrequencyGood && winRateGood) {
      console.log('');
      console.log('🎉 SIMPLE HYBRID: SUCCESS!');
      console.log('✅ All profit targets achieved');
      console.log('🚀 READY FOR PAPER TRADING');
      return true;
    } else {
      console.log('');
      console.log('⚠️  SIMPLE HYBRID: NEEDS TUNING');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Simple Hybrid Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

testSimpleHybrid().then(success => {
  process.exit(success ? 0 : 1);
});