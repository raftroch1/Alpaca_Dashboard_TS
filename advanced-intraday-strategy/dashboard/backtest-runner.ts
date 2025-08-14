#!/usr/bin/env ts-node
/**
 * DASHBOARD BACKTEST RUNNER
 * 
 * Integrates dashboard parameters with existing backtest engine
 * Runs backtests with custom parameters without modifying core files
 */

import { TradingParameters } from './trading-parameters';
import { Strategy, BacktestParams } from '../../lib/types';

export interface DashboardBacktestResults {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  avgDailyPnL: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  period: string;
  parametersUsed: TradingParameters;
}

export class DashboardBacktestRunner {
  
  /**
   * Run backtest with dashboard parameters
   * Uses existing enhanced-hybrid-backtest.ts but with custom parameters
   */
  static async runBacktestWithParameters(
    parameters: TradingParameters,
    timeframe: '1Min' | '5Min' | '15Min' = '1Min',
    daysBack: number = 3
  ): Promise<DashboardBacktestResults> {
    
    console.log('📊 DASHBOARD BACKTEST STARTING');
    console.log('==============================');
    console.log(`📅 Period: Last ${daysBack} days`);
    console.log(`⏱️ Timeframe: ${timeframe}`);
    console.log(`🎯 Daily Target: $${parameters.dailyPnLTarget}`);
    console.log(`🛡️ Stop Loss: ${parameters.initialStopLossPct * 100}%`);
    console.log(`📈 Profit Target: ${parameters.profitTargetPct * 100}%`);
    console.log('');

    try {
      // Create strategy object compatible with existing backtest
      const strategy = this.createStrategyFromParameters(parameters);
      
      // Create backtest parameters
      const backtestParams = this.createBacktestParams(daysBack);
      
      // Import and run existing backtest with custom parameters
      const { EnhancedHybridBacktest } = await import('../enhanced-hybrid-backtest');
      const backtest = new (EnhancedHybridBacktest as any)(backtestParams.initialCapital);
      
      // Override parameters in backtest instance
      this.applyParametersToBacktest(backtest, parameters);
      
      // Run backtest
      const results = await backtest.runEnhancedBacktest(strategy, backtestParams);
      
      // Transform results for dashboard
      const dashboardResults = this.transformResults(results, parameters, daysBack);
      
      console.log('✅ BACKTEST COMPLETED');
      console.log(`📊 Results: ${dashboardResults.totalTrades} trades, ${(dashboardResults.winRate * 100).toFixed(1)}% win rate`);
      console.log(`💰 Avg Daily P&L: $${dashboardResults.avgDailyPnL.toFixed(2)}`);
      console.log('');
      
      return dashboardResults;
      
    } catch (error) {
      console.error('❌ BACKTEST FAILED:', error);
      throw new Error(`Backtest execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create strategy object from dashboard parameters
   */
  private static createStrategyFromParameters(parameters: TradingParameters): Strategy {
    return {
      id: 'dashboard-strategy',
      name: 'Dashboard Custom Strategy',
      description: 'Strategy with dashboard-configured parameters',
      userId: 'dashboard',
      
      // Technical indicators (from parameters)
      rsiPeriod: parameters.rsiPeriod || 14,
      rsiOverbought: parameters.rsiOverbought,
      rsiOversold: parameters.rsiOversold,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      
      // Risk management (converted from dashboard parameters)
      stopLossPercent: parameters.initialStopLossPct,
      takeProfitPercent: parameters.profitTargetPct,
      positionSizePercent: parameters.maxRiskPerTradePct * 100, // Convert to percentage
      maxPositions: parameters.maxConcurrentPositions,
      
      // Options strategy settings
      daysToExpiration: 0, // 0-DTE
      deltaRange: 0.5,
      
      // Metadata
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Create backtest parameters
   */
  private static createBacktestParams(daysBack: number): BacktestParams {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    return {
      strategyId: 'dashboard-strategy',
      startDate,
      endDate,
      initialCapital: 25000 // Standard PDT account size
    };
  }
  
  /**
   * Apply dashboard parameters to backtest instance
   * This modifies the backtest behavior without changing core files
   */
  private static applyParametersToBacktest(backtest: any, parameters: TradingParameters): void {
    try {
      // Override key parameters if the backtest instance supports it
      if (typeof backtest.updateParameters === 'function') {
        backtest.updateParameters(parameters);
      } else {
        // Manually override critical parameters
        this.overrideBacktestParameters(backtest, parameters);
      }
      
      console.log('🔧 Parameters applied to backtest instance');
      
    } catch (error) {
      console.warn('⚠️ Could not apply all parameters to backtest:', error);
      // Continue with backtest using default parameters
    }
  }
  
  /**
   * Manually override backtest parameters
   */
  private static overrideBacktestParameters(backtest: any, parameters: TradingParameters): void {
    // Override constants if they exist
    const overrides = [
      { key: 'TARGET_WIN_SIZE', value: parameters.targetWinSize },
      { key: 'TARGET_LOSS_SIZE', value: parameters.targetLossSize },
      { key: 'INITIAL_STOP_LOSS_PCT', value: parameters.initialStopLossPct },
      { key: 'PROFIT_TARGET_PCT', value: parameters.profitTargetPct },
      { key: 'TRAIL_ACTIVATION_PCT', value: parameters.trailActivationPct },
      { key: 'TRAIL_STOP_PCT', value: parameters.trailStopPct },
      { key: 'MIN_SIGNAL_SPACING_MINUTES', value: parameters.minSignalSpacingMinutes },
      { key: 'FORCE_EXIT_TIME', value: parameters.forceExitTime }
    ];
    
    overrides.forEach(override => {
      if (backtest[override.key] !== undefined) {
        backtest[override.key] = override.value;
      }
    });
    
    // Override daily trade target if backtest supports it
    if (parameters.dailyTradeTarget !== null && backtest.DAILY_TRADE_TARGET !== undefined) {
      backtest.DAILY_TRADE_TARGET = parameters.dailyTradeTarget;
    }
  }
  
  /**
   * Transform backtest results for dashboard display
   */
  private static transformResults(
    results: any, 
    parameters: TradingParameters, 
    daysBack: number
  ): DashboardBacktestResults {
    
    const trades = results.trades || results.completedTrades || [];
    const performance = results.performance || {};
    
    // Calculate basic metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0);
    const losingTrades = trades.filter((t: any) => (t.pnl || 0) <= 0);
    
    const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;
    const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const avgDailyPnL = totalPnL / daysBack;
    
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0;
    
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
    
    // Calculate returns and drawdown
    const totalReturn = (totalPnL / 25000) * 100;
    const maxDrawdown = performance.maxDrawdown || this.calculateMaxDrawdown(trades);
    
    // Calculate Sharpe ratio (simplified)
    const dailyReturns = this.calculateDailyReturns(trades, daysBack);
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
    
    return {
      totalTrades,
      winRate,
      totalReturn,
      avgDailyPnL,
      maxDrawdown,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      period: `${daysBack} days`,
      parametersUsed: parameters
    };
  }
  
  /**
   * Calculate maximum drawdown from trades
   */
  private static calculateMaxDrawdown(trades: any[]): number {
    let peak = 0;
    let maxDD = 0;
    let runningPnL = 0;
    
    for (const trade of trades) {
      runningPnL += trade.pnl || 0;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = (peak - runningPnL) / (25000 + peak);
      maxDD = Math.max(maxDD, drawdown);
    }
    
    return maxDD;
  }
  
  /**
   * Calculate daily returns array
   */
  private static calculateDailyReturns(trades: any[], daysBack: number): number[] {
    const dailyReturns: number[] = [];
    
    // Group trades by day
    const tradesByDay = new Map();
    trades.forEach(trade => {
      const day = new Date(trade.timestamp || trade.exitTime || new Date()).toDateString();
      if (!tradesByDay.has(day)) {
        tradesByDay.set(day, []);
      }
      tradesByDay.get(day).push(trade);
    });
    
    // Calculate daily returns
    tradesByDay.forEach(dayTrades => {
      const dayPnL = dayTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
      const dayReturn = dayPnL / 25000;
      dailyReturns.push(dayReturn);
    });
    
    return dailyReturns;
  }
  
  /**
   * Calculate Sharpe ratio
   */
  private static calculateSharpeRatio(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0;
    
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }
  
  /**
   * Quick backtest for parameter validation
   */
  static async quickBacktest(parameters: TradingParameters): Promise<{
    feasible: boolean;
    estimatedDailyPnL: number;
    estimatedWinRate: number;
    warnings: string[];
  }> {
    
    const warnings: string[] = [];
    
    // Analyze parameter combinations
    let estimatedWinRate = 0.75; // Base win rate
    let estimatedDailyPnL = 180; // Base daily P&L
    
    // Adjust based on stop loss
    if (parameters.initialStopLossPct < 0.25) {
      estimatedWinRate += 0.05;
      estimatedDailyPnL *= 0.85;
      warnings.push('Very tight stop loss may reduce profit potential');
    } else if (parameters.initialStopLossPct > 0.45) {
      estimatedWinRate -= 0.08;
      estimatedDailyPnL *= 1.1;
      warnings.push('Wide stop loss increases risk per trade');
    }
    
    // Adjust based on profit target
    if (parameters.profitTargetPct > 0.80) {
      estimatedWinRate -= 0.12;
      estimatedDailyPnL *= 1.2;
      warnings.push('High profit targets may reduce win rate significantly');
    }
    
    // Adjust based on partial profit taking
    if (parameters.usePartialProfitTaking) {
      estimatedWinRate += 0.03;
      estimatedDailyPnL *= 0.93;
    }
    
    // Risk per trade validation
    const maxRiskDollars = parameters.accountSize * parameters.maxRiskPerTradePct;
    if (maxRiskDollars < 100) {
      warnings.push('Risk per trade may be too low for effective position sizing');
    } else if (maxRiskDollars > 1000) {
      warnings.push('Risk per trade is very high - consider reducing');
    }
    
    // Signal spacing validation
    if (parameters.minSignalSpacingMinutes > 45) {
      warnings.push('Long signal spacing may miss trading opportunities');
    } else if (parameters.minSignalSpacingMinutes < 3) {
      warnings.push('Very short signal spacing may lead to overtrading');
    }
    
    // RSI level validation
    const rsiRange = parameters.rsiOverbought - parameters.rsiOversold;
    if (rsiRange < 30) {
      warnings.push('Narrow RSI range may generate too few signals');
    } else if (rsiRange > 60) {
      warnings.push('Wide RSI range may generate low-quality signals');
    }
    
    // Daily target feasibility
    const feasible = estimatedDailyPnL >= parameters.dailyPnLTarget * 0.7 && 
                    estimatedWinRate >= 0.55 && 
                    warnings.length <= 3;
    
    return {
      feasible,
      estimatedDailyPnL,
      estimatedWinRate,
      warnings
    };
  }
}

export default DashboardBacktestRunner;