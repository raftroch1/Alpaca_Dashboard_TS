import { MarketData, BacktestTrade, PerformanceMetrics } from './types';
import { BacktestEngine } from './backtest-engine';

export interface MonteCarloParams {
  simulations: number; // Number of random scenarios (e.g., 1000)
  volatilityRange: [number, number]; // Min/max volatility multipliers [0.5, 2.0]
  driftRange: [number, number]; // Min/max return drift [-0.3, 0.3]
  shockProbability: number; // Probability of black swan events (0.05 = 5%)
  shockMagnitude: [number, number]; // Shock size range [-0.2, 0.2] (20% moves)
}

export interface MonteCarloResult {
  scenarios: MonteCarloScenario[];
  summary: {
    meanReturn: number;
    medianReturn: number;
    worstCase: number;
    bestCase: number;
    var95: number; // Value at Risk (95th percentile)
    var99: number; // Value at Risk (99th percentile)
    maxDrawdown: {
      mean: number;
      worst: number;
    };
    winRate: {
      mean: number;
      range: [number, number];
    };
  };
}

export interface MonteCarloScenario {
  id: number;
  marketData: MarketData[];
  trades: BacktestTrade[];
  performance: PerformanceMetrics;
  parameters: {
    volatilityMultiplier: number;
    driftAdjustment: number;
    shockEvents: Array<{ date: Date; magnitude: number }>;
  };
}

export class MonteCarloEngine {
  
  /**
   * Run Monte Carlo simulation to stress test strategy across thousands of scenarios
   */
  static async runSimulation(
    baseMarketData: MarketData[],
    strategy: any,
    params: MonteCarloParams
  ): Promise<MonteCarloResult> {
    
    console.log(`🎰 MONTE CARLO: Starting ${params.simulations} simulations...`);
    const scenarios: MonteCarloScenario[] = [];
    
    for (let i = 0; i < params.simulations; i++) {
      if (i % 100 === 0) {
        console.log(`🎰 Progress: ${i}/${params.simulations} scenarios (${(i/params.simulations*100).toFixed(1)}%)`);
      }
      
      // Generate randomized market scenario
      const scenario = await this.generateRandomScenario(baseMarketData, params, i, strategy);
      scenarios.push(scenario);
    }
    
    // Calculate summary statistics
    const summary = this.calculateSummaryStats(scenarios);
    
    console.log(`✅ MONTE CARLO COMPLETE:`);
    console.log(`📊 Mean Return: ${summary.meanReturn.toFixed(2)}%`);
    console.log(`📉 VaR 95%: ${summary.var95.toFixed(2)}% (worst 5% of outcomes)`);
    console.log(`💀 Worst Case: ${summary.worstCase.toFixed(2)}%`);
    console.log(`🚀 Best Case: ${summary.bestCase.toFixed(2)}%`);
    
    return { scenarios, summary };
  }
  
  /**
   * Generate a single randomized market scenario
   */
  private static async generateRandomScenario(
    baseData: MarketData[],
    params: MonteCarloParams,
    scenarioId: number,
    strategy: any
  ): Promise<MonteCarloScenario> {
    
    // Random parameters for this scenario
    const volatilityMultiplier = this.randomBetween(params.volatilityRange[0], params.volatilityRange[1]);
    const driftAdjustment = this.randomBetween(params.driftRange[0], params.driftRange[1]);
    
    // Generate shock events
    const shockEvents: Array<{ date: Date; magnitude: number }> = [];
    for (let i = 0; i < baseData.length; i++) {
      if (Math.random() < params.shockProbability / 252) { // Daily shock probability
        const magnitude = this.randomBetween(params.shockMagnitude[0], params.shockMagnitude[1]);
        shockEvents.push({
          date: baseData[i].date,
          magnitude
        });
      }
    }
    
    // Create modified market data
    const modifiedData = this.applyRandomization(
      baseData, 
      volatilityMultiplier, 
      driftAdjustment, 
      shockEvents
    );
    
    // Run backtest on this scenario
    try {
      const backtestResult = await BacktestEngine.runBacktest(strategy, {
        startDate: modifiedData[0].date,
        endDate: modifiedData[modifiedData.length - 1].date,
        initialCapital: 10000
      });
      
      return {
        id: scenarioId,
        marketData: modifiedData,
        trades: backtestResult.trades,
        performance: backtestResult.performance,
        parameters: {
          volatilityMultiplier,
          driftAdjustment,
          shockEvents
        }
      };
      
    } catch (error) {
      // Return empty scenario if backtest fails
      return {
        id: scenarioId,
        marketData: modifiedData,
        trades: [],
        performance: {
          totalReturn: -100,
          totalReturnPercent: -100,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          maxDrawdown: 100,
          sharpeRatio: -999,
          profitFactor: 0
        },
        parameters: {
          volatilityMultiplier,
          driftAdjustment,
          shockEvents
        }
      };
    }
  }
  
  /**
   * Apply randomization to market data
   */
  private static applyRandomization(
    baseData: MarketData[],
    volMultiplier: number,
    driftAdjustment: number,
    shockEvents: Array<{ date: Date; magnitude: number }>
  ): MarketData[] {
    
    const modified: MarketData[] = [];
    
    for (let i = 0; i < baseData.length; i++) {
      const base = baseData[i];
      let price = base.close;
      
      if (i > 0) {
        // Calculate normal daily return
        const baseReturn = (base.close - baseData[i-1].close) / baseData[i-1].close;
        
        // Apply volatility scaling and drift adjustment
        const scaledReturn = (baseReturn * volMultiplier) + (driftAdjustment / 252);
        
        // Check for shock events
        const shock = shockEvents.find(s => 
          Math.abs(s.date.getTime() - base.date.getTime()) < 24 * 60 * 60 * 1000
        );
        
        const finalReturn = shock ? scaledReturn + shock.magnitude : scaledReturn;
        price = modified[i-1].close * (1 + finalReturn);
      }
      
      // Create modified data point
      modified.push({
        ...base,
        open: price * (base.open / base.close),
        high: price * (base.high / base.close),
        low: price * (base.low / base.close),
        close: price
      });
    }
    
    return modified;
  }
  
  /**
   * Calculate summary statistics from all scenarios
   */
  private static calculateSummaryStats(scenarios: MonteCarloScenario[]): MonteCarloResult['summary'] {
    
    const returns = scenarios.map(s => s.performance.totalReturnPercent).sort((a, b) => a - b);
    const drawdowns = scenarios.map(s => s.performance.maxDrawdown);
    const winRates = scenarios.map(s => s.performance.winRate);
    
    return {
      meanReturn: returns.reduce((sum, r) => sum + r, 0) / returns.length,
      medianReturn: returns[Math.floor(returns.length / 2)],
      worstCase: Math.min(...returns),
      bestCase: Math.max(...returns),
      var95: returns[Math.floor(returns.length * 0.05)], // 5th percentile
      var99: returns[Math.floor(returns.length * 0.01)], // 1st percentile
      maxDrawdown: {
        mean: drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length,
        worst: Math.max(...drawdowns)
      },
      winRate: {
        mean: winRates.reduce((sum, w) => sum + w, 0) / winRates.length,
        range: [Math.min(...winRates), Math.max(...winRates)]
      }
    };
  }
  
  /**
   * Generate random number between min and max
   */
  private static randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}