import { MarketData, TechnicalIndicators } from './types';
import { TechnicalAnalysis } from './technical-indicators';

export interface MarketRegime {
  regime: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  signals: {
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    momentum: 'STRONG' | 'WEAK' | 'MIXED';
  };
  reasoning: string[];
}

export class MarketRegimeDetector {
  
  static detectRegime(
    marketData: MarketData[], 
    optionsChain: any[] = [],
    vixLevel?: number
  ): MarketRegime {
    if (marketData.length < 50) {
      return this.getDefaultRegime('Insufficient data for regime detection');
    }

    const indicators = TechnicalAnalysis.calculateAllIndicators(marketData, 14, 12, 26, 9, 20, 2);
    if (!indicators) {
      return this.getDefaultRegime('Technical indicators unavailable');
    }

    const reasoning: string[] = [];
    
    // SIMPLIFIED REGIME DETECTION FOR NOW
    // TODO: Implement full trend/volatility/momentum analysis
    
    const currentPrice = marketData[marketData.length - 1].close;
    const sma20 = this.calculateSMA(marketData, 20);
    
    // Simple trend detection
    if (indicators.rsi > 60 && currentPrice > sma20) {
      reasoning.push('RSI > 60 and price above SMA20 = BULLISH');
      return {
        regime: 'BULLISH',
        confidence: 75,
        signals: { trend: 'UP', volatility: 'MEDIUM', momentum: 'STRONG' },
        reasoning
      };
    } else if (indicators.rsi < 40 && currentPrice < sma20) {
      reasoning.push('RSI < 40 and price below SMA20 = BEARISH');
      return {
        regime: 'BEARISH',
        confidence: 75,
        signals: { trend: 'DOWN', volatility: 'HIGH', momentum: 'STRONG' },
        reasoning
      };
    } else {
      reasoning.push('Mixed signals = NEUTRAL');
      return {
        regime: 'NEUTRAL',
        confidence: 65,
        signals: { trend: 'SIDEWAYS', volatility: 'LOW', momentum: 'MIXED' },
        reasoning
      };
    }
  }

  private static calculateSMA(marketData: MarketData[], period: number): number {
    if (marketData.length < period) return marketData[marketData.length - 1].close;
    
    const recentPrices = marketData.slice(-period).map(d => d.close);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private static getDefaultRegime(reason: string): MarketRegime {
    return {
      regime: 'NEUTRAL',
      confidence: 30,
      signals: { trend: 'SIDEWAYS', volatility: 'MEDIUM', momentum: 'MIXED' },
      reasoning: [reason]
    };
  }
}