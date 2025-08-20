/**
 * MARKET BIAS DETECTOR
 * 
 * Professional market internals analysis to determine directional bias
 * Uses multiple sophisticated filters to automatically detect bull/bear conditions
 */

import { MarketData, OptionsChain } from '../../../lib/types';

export interface MarketBias {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  strength: number; // 0-1 (for position sizing)
  reasoning: string[];
  internals: {
    vixSignal: string;
    volumeSignal: string;
    momentumSignal: string;
    breadthSignal: string;
    sectorRotation: string;
  };
}

export class MarketBiasDetector {
  
  /**
   * Detect market bias using professional market internals
   */
  static detectBias(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    vixLevel?: number,
    dashboardParams?: any
  ): MarketBias {
    
    if (marketData.length < 50) {
      return this.getDefaultBias('Insufficient data for bias detection');
    }
    
    const currentPrice = marketData[marketData.length - 1].close;
    const reasoning: string[] = [];
    let bullishSignals = 0;
    let bearishSignals = 0;
    let confidence = 0;
    
    // 1. 📊 VIX TERM STRUCTURE ANALYSIS
    const vixSignal = this.analyzeVIXStructure(reasoning, vixLevel);
    if (vixSignal === 'BULLISH') bullishSignals++;
    if (vixSignal === 'BEARISH') bearishSignals++;
    
    // 2. 📈 MULTI-TIMEFRAME MOMENTUM
    const momentumSignal = this.analyzeMomentumAlignment(marketData, reasoning);
    if (momentumSignal === 'BULLISH') bullishSignals++;
    if (momentumSignal === 'BEARISH') bearishSignals++;
    
    // 3. 📊 VOLUME INTERNALS
    const volumeSignal = this.analyzeVolumeInternals(marketData, reasoning);
    if (volumeSignal === 'BULLISH') bullishSignals++;
    if (volumeSignal === 'BEARISH') bearishSignals++;
    
    // 4. 🎯 OPTIONS FLOW ANALYSIS
    const breadthSignal = this.analyzeOptionsFlow(optionsChain, currentPrice, reasoning);
    if (breadthSignal === 'BULLISH') bullishSignals++;
    if (breadthSignal === 'BEARISH') bearishSignals++;
    
    // 5. 🔄 PRICE ACTION INTERNALS
    const sectorRotation = this.analyzePriceInternals(marketData, reasoning);
    if (sectorRotation === 'BULLISH') bullishSignals++;
    if (sectorRotation === 'BEARISH') bearishSignals++;
    
    // DETERMINE FINAL BIAS
    const totalSignals = bullishSignals + bearishSignals;
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    
    if (bullishSignals >= 3 && bullishSignals > bearishSignals) {
      bias = 'BULLISH';
      confidence = Math.min(95, (bullishSignals / totalSignals) * 100);
    } else if (bearishSignals >= 3 && bearishSignals > bullishSignals) {
      bias = 'BEARISH';
      confidence = Math.min(95, (bearishSignals / totalSignals) * 100);
    } else {
      bias = 'NEUTRAL';
      confidence = 40; // Low confidence in mixed signals
      reasoning.push('Mixed signals - no clear directional bias');
    }
    
    const strength = confidence / 100;
    
    console.log(`🎯 MARKET BIAS DETECTION:`);
    console.log(`   📊 Bullish Signals: ${bullishSignals}/5`);
    console.log(`   📊 Bearish Signals: ${bearishSignals}/5`);
    console.log(`   🎯 Final Bias: ${bias} (${confidence}% confidence)`);
    
    return {
      bias,
      confidence,
      strength,
      reasoning,
      internals: {
        vixSignal,
        volumeSignal,
        momentumSignal,
        breadthSignal,
        sectorRotation
      }
    };
  }
  
  /**
   * Analyze VIX term structure for fear/greed bias
   */
  private static analyzeVIXStructure(reasoning: string[], vixLevel?: number): string {
    if (!vixLevel) {
      reasoning.push('VIX: No data available');
      return 'NEUTRAL';
    }
    
    // Use dashboard VIX thresholds if available, otherwise professional defaults
    const vixHigh = 25; // Could be dashboardParams?.vixHighThreshold || 25
    const vixLow = 15;  // Could be dashboardParams?.vixLowThreshold || 15
    
    if (vixLevel > vixHigh) {
      reasoning.push(`VIX: High fear (${vixLevel.toFixed(1)} > ${vixHigh}) = BEARISH`);
      return 'BEARISH';
    } else if (vixLevel < vixLow) {
      reasoning.push(`VIX: Low fear (${vixLevel.toFixed(1)} < ${vixLow}) = BULLISH`);
      return 'BULLISH';
    } else {
      reasoning.push(`VIX: Neutral (${vixLevel.toFixed(1)})`);
      return 'NEUTRAL';
    }
  }
  
  /**
   * Multi-timeframe momentum alignment
   */
  private static analyzeMomentumAlignment(marketData: MarketData[], reasoning: string[]): string {
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Calculate momentum across multiple timeframes
    const momentum5 = this.calculateMomentum(marketData, 5);   // 5-bar momentum
    const momentum20 = this.calculateMomentum(marketData, 20); // 20-bar momentum
    const momentum50 = this.calculateMomentum(marketData, 50); // 50-bar momentum
    
    const bullishMomentum = [momentum5, momentum20, momentum50].filter(m => m > 0.2).length;
    const bearishMomentum = [momentum5, momentum20, momentum50].filter(m => m < -0.2).length;
    
    if (bullishMomentum >= 2) {
      reasoning.push(`Momentum: Multi-timeframe bullish alignment (${bullishMomentum}/3)`);
      return 'BULLISH';
    } else if (bearishMomentum >= 2) {
      reasoning.push(`Momentum: Multi-timeframe bearish alignment (${bearishMomentum}/3)`);
      return 'BEARISH';
    } else {
      reasoning.push(`Momentum: Mixed timeframe signals`);
      return 'NEUTRAL';
    }
  }
  
  /**
   * Volume internals analysis
   */
  private static analyzeVolumeInternals(marketData: MarketData[], reasoning: string[]): string {
    if (marketData.length < 20) return 'NEUTRAL';
    
    // Analyze volume patterns for institutional activity
    const recentVolume = marketData.slice(-10).reduce((sum, bar) => sum + Number(bar.volume || 0), 0) / 10;
    const avgVolume = marketData.slice(-50, -10).reduce((sum, bar) => sum + Number(bar.volume || 0), 0) / 40;
    
    const volumeRatio = recentVolume / avgVolume;
    
    // Check if high volume coincides with price direction
    const priceChange = this.calculateMomentum(marketData, 10);
    
    if (volumeRatio > 1.3 && priceChange > 0.2) {
      reasoning.push(`Volume: High volume uptrend (${volumeRatio.toFixed(2)}x avg) = BULLISH`);
      return 'BULLISH';
    } else if (volumeRatio > 1.3 && priceChange < -0.2) {
      reasoning.push(`Volume: High volume downtrend (${volumeRatio.toFixed(2)}x avg) = BEARISH`);
      return 'BEARISH';
    } else {
      reasoning.push(`Volume: Normal activity (${volumeRatio.toFixed(2)}x avg)`);
      return 'NEUTRAL';
    }
  }
  
  /**
   * Options flow analysis for institutional positioning
   */
  private static analyzeOptionsFlow(optionsChain: OptionsChain[], currentPrice: number, reasoning: string[]): string {
    if (optionsChain.length < 10) {
      reasoning.push('Options: Insufficient data');
      return 'NEUTRAL';
    }
    
    // Calculate Put/Call volume ratio
    const calls = optionsChain.filter(opt => opt.side === 'CALL');
    const puts = optionsChain.filter(opt => opt.side === 'PUT');
    
    const callVolume = calls.reduce((sum, opt) => sum + (opt.volume || 0), 0);
    const putVolume = puts.reduce((sum, opt) => sum + (opt.volume || 0), 0);
    
    if (callVolume === 0 && putVolume === 0) {
      reasoning.push('Options: No volume data');
      return 'NEUTRAL';
    }
    
    const putCallRatio = putVolume / (callVolume + putVolume);
    
    if (putCallRatio > 0.65) { // High put activity
      reasoning.push(`Options: High put activity (${(putCallRatio * 100).toFixed(1)}%) = BEARISH`);
      return 'BEARISH';
    } else if (putCallRatio < 0.35) { // High call activity
      reasoning.push(`Options: High call activity (${((1 - putCallRatio) * 100).toFixed(1)}%) = BULLISH`);
      return 'BULLISH';
    } else {
      reasoning.push(`Options: Balanced flow (${(putCallRatio * 100).toFixed(1)}% puts)`);
      return 'NEUTRAL';
    }
  }
  
  /**
   * Price action internals
   */
  private static analyzePriceInternals(marketData: MarketData[], reasoning: string[]): string {
    if (marketData.length < 30) return 'NEUTRAL';
    
    // Analyze higher highs/lower lows pattern
    const recent10 = marketData.slice(-10);
    const previous10 = marketData.slice(-20, -10);
    
    const recentHigh = Math.max(...recent10.map(bar => bar.high));
    const recentLow = Math.min(...recent10.map(bar => bar.low));
    const previousHigh = Math.max(...previous10.map(bar => bar.high));
    const previousLow = Math.min(...previous10.map(bar => bar.low));
    
    const higherHigh = recentHigh > previousHigh;
    const higherLow = recentLow > previousLow;
    const lowerHigh = recentHigh < previousHigh;
    const lowerLow = recentLow < previousLow;
    
    if (higherHigh && higherLow) {
      reasoning.push('Price: Higher highs & higher lows = BULLISH');
      return 'BULLISH';
    } else if (lowerHigh && lowerLow) {
      reasoning.push('Price: Lower highs & lower lows = BEARISH');
      return 'BEARISH';
    } else {
      reasoning.push('Price: Mixed price action');
      return 'NEUTRAL';
    }
  }
  
  /**
   * Calculate price momentum over specified periods
   */
  private static calculateMomentum(marketData: MarketData[], periods: number): number {
    if (marketData.length < periods + 1) return 0;
    
    const startPrice = marketData[marketData.length - periods - 1].close;
    const endPrice = marketData[marketData.length - 1].close;
    
    return ((endPrice - startPrice) / startPrice) * 100; // Percentage change
  }
  
  /**
   * Default bias for error conditions
   */
  private static getDefaultBias(reason: string): MarketBias {
    return {
      bias: 'NEUTRAL',
      confidence: 0,
      strength: 0,
      reasoning: [reason],
      internals: {
        vixSignal: 'NEUTRAL',
        volumeSignal: 'NEUTRAL', 
        momentumSignal: 'NEUTRAL',
        breadthSignal: 'NEUTRAL',
        sectorRotation: 'NEUTRAL'
      }
    };
  }
}
