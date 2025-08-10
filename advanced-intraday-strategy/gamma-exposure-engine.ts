/**
 * GAMMA EXPOSURE (GEX) ENGINE
 * 
 * Quantifies the structural underpinnings of the options market by measuring
 * the sensitivity of options delta to changes in the underlying asset's price.
 * This estimates the hedging pressure market makers face and influences
 * intraday price dynamics for 0DTE trading.
 * 
 * Key Concepts:
 * - Long Gamma: Market makers stabilize price (sell rallies, buy dips)
 * - Short Gamma: Market makers amplify moves (buy strength, sell weakness)
 * - Gamma Flip Point: Critical level where aggregate gamma transitions
 */

import { OptionsChain, MarketData } from '../lib/types';

export interface GammaExposureData {
  strike: number;
  expiration: Date;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  dollarGamma: number; // $ amount of hedging flow per 1% move
  openInterestCalls: number;
  openInterestPuts: number;
}

export interface GEXSnapshot {
  timestamp: Date;
  underlyingPrice: number;
  totalNetGamma: number;
  totalDollarGamma: number;
  gammaFlipPoint: number | null; // Price where net gamma = 0
  marketMakerPositioning: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL';
  volatilityRegime: 'SUPPRESSING' | 'AMPLIFYING' | 'TRANSITIONAL';
  
  // Strike-level breakdown
  strikeGamma: GammaExposureData[];
  
  // Key levels
  highGammaStrikes: number[]; // Strikes with significant gamma concentration
  supportLevels: number[]; // Strikes likely to act as support
  resistanceLevels: number[]; // Strikes likely to act as resistance
  
  // Risk metrics
  gammaRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  hedgingPressure: number; // Expected $ flow for 1% underlying move
}

export interface GEXConfiguration {
  contractSize: number; // Typically 100 for equity options
  spotPercentMove: number; // Typically 0.01 for 1% moves
  gammaRiskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  significantGammaThreshold: number; // Minimum gamma to be "significant"
  flipPointTolerance: number; // Price tolerance for gamma flip calculation
}

export class GammaExposureEngine {
  
  private static readonly DEFAULT_CONFIG: GEXConfiguration = {
    contractSize: 100,
    spotPercentMove: 0.01,
    gammaRiskThresholds: {
      low: 1000000,    // $1M in gamma exposure
      medium: 5000000, // $5M in gamma exposure
      high: 10000000   // $10M in gamma exposure
    },
    significantGammaThreshold: 100000, // $100k minimum
    flipPointTolerance: 0.50 // $0.50 price tolerance
  };
  
  /**
   * Calculate comprehensive Gamma Exposure snapshot
   */
  static calculateGEX(
    optionsChain: OptionsChain[],
    currentPrice: number,
    config: Partial<GEXConfiguration> = {}
  ): GEXSnapshot {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log(`🎯 GEX CALCULATION: Analyzing ${optionsChain.length} options contracts at $${currentPrice.toFixed(2)}`);
    
    // Group options by strike and expiration
    const strikeData = this.groupOptionsByStrike(optionsChain);
    
    // Calculate gamma exposure for each strike
    const strikeGamma = this.calculateStrikeGamma(strikeData, currentPrice, fullConfig);
    
    // Calculate aggregate metrics
    const totalNetGamma = strikeGamma.reduce((sum, strike) => sum + strike.netGamma, 0);
    const totalDollarGamma = strikeGamma.reduce((sum, strike) => sum + strike.dollarGamma, 0);
    
    // Find gamma flip point
    const gammaFlipPoint = this.calculateGammaFlipPoint(strikeGamma, currentPrice, fullConfig);
    
    // Determine market maker positioning
    const positioning = this.determineMarketMakerPositioning(totalNetGamma, gammaFlipPoint, currentPrice);
    
    // Assess volatility regime
    const volatilityRegime = this.assessVolatilityRegime(positioning, totalDollarGamma, fullConfig);
    
    // Identify key levels
    const highGammaStrikes = this.identifyHighGammaStrikes(strikeGamma, fullConfig);
    const supportLevels = this.identifySupportLevels(strikeGamma, currentPrice);
    const resistanceLevels = this.identifyResistanceLevels(strikeGamma, currentPrice);
    
    // Calculate risk metrics
    const gammaRisk = this.assessGammaRisk(totalDollarGamma, fullConfig);
    const hedgingPressure = Math.abs(totalDollarGamma);
    
    const snapshot: GEXSnapshot = {
      timestamp: new Date(),
      underlyingPrice: currentPrice,
      totalNetGamma,
      totalDollarGamma,
      gammaFlipPoint,
      marketMakerPositioning: positioning,
      volatilityRegime,
      strikeGamma,
      highGammaStrikes,
      supportLevels,
      resistanceLevels,
      gammaRisk,
      hedgingPressure
    };
    
    console.log(`📊 GEX RESULTS:`);
    console.log(`   Net Gamma: ${(totalNetGamma / 1000000).toFixed(1)}M contracts`);
    console.log(`   Dollar Gamma: $${(totalDollarGamma / 1000000).toFixed(1)}M per 1% move`);
    console.log(`   Flip Point: ${gammaFlipPoint ? `$${gammaFlipPoint.toFixed(2)}` : 'Not found'}`);
    console.log(`   Positioning: ${positioning}`);
    console.log(`   Volatility Regime: ${volatilityRegime}`);
    console.log(`   Risk Level: ${gammaRisk}`);
    
    return snapshot;
  }
  
  /**
   * Group options by strike price for analysis
   */
  private static groupOptionsByStrike(optionsChain: OptionsChain[]): Map<number, {
    calls: OptionsChain[];
    puts: OptionsChain[];
  }> {
    
    const strikeMap = new Map<number, { calls: OptionsChain[]; puts: OptionsChain[] }>();
    
    for (const option of optionsChain) {
      if (!strikeMap.has(option.strike)) {
        strikeMap.set(option.strike, { calls: [], puts: [] });
      }
      
      const strikeData = strikeMap.get(option.strike)!;
      if (option.side === 'CALL') {
        strikeData.calls.push(option);
      } else {
        strikeData.puts.push(option);
      }
    }
    
    return strikeMap;
  }
  
  /**
   * Calculate gamma exposure for each strike
   */
  private static calculateStrikeGamma(
    strikeData: Map<number, { calls: OptionsChain[]; puts: OptionsChain[] }>,
    currentPrice: number,
    config: GEXConfiguration
  ): GammaExposureData[] {
    
    const results: GammaExposureData[] = [];
    
    for (const [strike, options] of Array.from(strikeData)) {
      
      // Calculate gamma for calls and puts
      const callGamma = this.calculateCallGamma(options.calls, currentPrice, strike);
      const putGamma = this.calculatePutGamma(options.puts, currentPrice, strike);
      
      // Net gamma (assuming market makers are short customer flow)
      // Customers typically buy calls and puts, so MMs are short both
      const netGamma = callGamma - Math.abs(putGamma); // Puts contribute negative gamma to MMs
      
      // Dollar gamma calculation: Spot × Gamma × OI × Contract Size × Spot × 0.01
      const totalCallOI = options.calls.reduce((sum, opt) => sum + (opt.openInterest || 0), 0);
      const totalPutOI = options.puts.reduce((sum, opt) => sum + (opt.openInterest || 0), 0);
      
      const dollarGamma = currentPrice * netGamma * config.contractSize * currentPrice * config.spotPercentMove;
      
      const gammaData: GammaExposureData = {
        strike,
        expiration: options.calls[0]?.expiration || options.puts[0]?.expiration || new Date(),
        callGamma,
        putGamma,
        netGamma,
        dollarGamma,
        openInterestCalls: totalCallOI,
        openInterestPuts: totalPutOI
      };
      
      results.push(gammaData);
    }
    
    return results.sort((a, b) => a.strike - b.strike);
  }
  
  /**
   * Calculate gamma for call options at a strike
   */
  private static calculateCallGamma(
    calls: OptionsChain[],
    currentPrice: number,
    strike: number
  ): number {
    
    if (calls.length === 0) return 0;
    
    // Use the option with highest open interest as representative
    const primaryCall = calls.reduce((max, call) => 
      (call.openInterest || 0) > (max.openInterest || 0) ? call : max
    );
    
    // Simplified gamma calculation - in production, use Black-Scholes
    // Gamma is highest ATM and decreases as options move ITM/OTM
    const moneyness = currentPrice / strike;
    const timeToExpiration = this.getTimeToExpiration(primaryCall.expiration);
    
    // Simplified gamma approximation
    const gammaApprox = this.approximateGamma(moneyness, timeToExpiration, 'CALL');
    
    return gammaApprox * (primaryCall.openInterest || 0);
  }
  
  /**
   * Calculate gamma for put options at a strike
   */
  private static calculatePutGamma(
    puts: OptionsChain[],
    currentPrice: number,
    strike: number
  ): number {
    
    if (puts.length === 0) return 0;
    
    // Use the option with highest open interest as representative
    const primaryPut = puts.reduce((max, put) => 
      (put.openInterest || 0) > (max.openInterest || 0) ? put : max
    );
    
    const moneyness = currentPrice / strike;
    const timeToExpiration = this.getTimeToExpiration(primaryPut.expiration);
    
    // Simplified gamma approximation
    const gammaApprox = this.approximateGamma(moneyness, timeToExpiration, 'PUT');
    
    return gammaApprox * (primaryPut.openInterest || 0);
  }
  
  /**
   * Simplified gamma approximation for quick calculation
   */
  private static approximateGamma(
    moneyness: number,
    timeToExpiration: number,
    type: 'CALL' | 'PUT'
  ): number {
    
    // Peak gamma occurs at ATM
    const atmFactor = Math.exp(-Math.pow((moneyness - 1) * 5, 2));
    
    // Gamma increases as expiration approaches
    const timeFactor = Math.max(0.1, Math.sqrt(timeToExpiration));
    
    // Base gamma estimate
    const baseGamma = 0.05; // Typical gamma for ATM options
    
    return baseGamma * atmFactor / timeFactor;
  }
  
  /**
   * Calculate gamma flip point where net gamma = 0
   */
  private static calculateGammaFlipPoint(
    strikeGamma: GammaExposureData[],
    currentPrice: number,
    config: GEXConfiguration
  ): number | null {
    
    // Find strikes above and below current price with opposite gamma signs
    for (let i = 0; i < strikeGamma.length - 1; i++) {
      const current = strikeGamma[i];
      const next = strikeGamma[i + 1];
      
      // Check if gamma flips sign between these strikes
      if ((current.netGamma > 0 && next.netGamma < 0) || 
          (current.netGamma < 0 && next.netGamma > 0)) {
        
        // Linear interpolation to find flip point
        const weightNext = Math.abs(current.netGamma) / (Math.abs(current.netGamma) + Math.abs(next.netGamma));
        const flipPoint = current.strike + (next.strike - current.strike) * weightNext;
        
        return flipPoint;
      }
    }
    
    return null; // No flip point found
  }
  
  /**
   * Determine market maker positioning based on gamma
   */
  private static determineMarketMakerPositioning(
    totalNetGamma: number,
    gammaFlipPoint: number | null,
    currentPrice: number
  ): 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL' {
    
    const gammaThreshold = 1000; // Minimum gamma to be considered significant
    
    if (Math.abs(totalNetGamma) < gammaThreshold) {
      return 'NEUTRAL';
    }
    
    // If we have a flip point, use current price relative to it
    if (gammaFlipPoint !== null) {
      if (currentPrice > gammaFlipPoint) {
        return totalNetGamma > 0 ? 'LONG_GAMMA' : 'SHORT_GAMMA';
      } else {
        return totalNetGamma > 0 ? 'SHORT_GAMMA' : 'LONG_GAMMA';
      }
    }
    
    // No flip point - use aggregate gamma
    return totalNetGamma > 0 ? 'LONG_GAMMA' : 'SHORT_GAMMA';
  }
  
  /**
   * Assess volatility regime based on gamma positioning
   */
  private static assessVolatilityRegime(
    positioning: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL',
    totalDollarGamma: number,
    config: GEXConfiguration
  ): 'SUPPRESSING' | 'AMPLIFYING' | 'TRANSITIONAL' {
    
    const highGammaThreshold = config.gammaRiskThresholds.medium;
    
    if (Math.abs(totalDollarGamma) < highGammaThreshold) {
      return 'TRANSITIONAL';
    }
    
    switch (positioning) {
      case 'LONG_GAMMA':
        return 'SUPPRESSING'; // MMs will dampen volatility
      case 'SHORT_GAMMA':
        return 'AMPLIFYING'; // MMs will amplify volatility
      default:
        return 'TRANSITIONAL';
    }
  }
  
  /**
   * Identify strikes with significant gamma concentration
   */
  private static identifyHighGammaStrikes(
    strikeGamma: GammaExposureData[],
    config: GEXConfiguration
  ): number[] {
    
    return strikeGamma
      .filter(data => Math.abs(data.dollarGamma) > config.significantGammaThreshold)
      .map(data => data.strike)
      .sort((a, b) => a - b);
  }
  
  /**
   * Identify potential support levels based on gamma
   */
  private static identifySupportLevels(
    strikeGamma: GammaExposureData[],
    currentPrice: number
  ): number[] {
    
    return strikeGamma
      .filter(data => data.strike < currentPrice && data.netGamma > 0)
      .sort((a, b) => Math.abs(b.dollarGamma) - Math.abs(a.dollarGamma))
      .slice(0, 3) // Top 3 support levels
      .map(data => data.strike);
  }
  
  /**
   * Identify potential resistance levels based on gamma
   */
  private static identifyResistanceLevels(
    strikeGamma: GammaExposureData[],
    currentPrice: number
  ): number[] {
    
    return strikeGamma
      .filter(data => data.strike > currentPrice && data.netGamma > 0)
      .sort((a, b) => Math.abs(b.dollarGamma) - Math.abs(a.dollarGamma))
      .slice(0, 3) // Top 3 resistance levels
      .map(data => data.strike);
  }
  
  /**
   * Assess overall gamma risk level
   */
  private static assessGammaRisk(
    totalDollarGamma: number,
    config: GEXConfiguration
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    
    const absGamma = Math.abs(totalDollarGamma);
    
    if (absGamma < config.gammaRiskThresholds.low) {
      return 'LOW';
    } else if (absGamma < config.gammaRiskThresholds.medium) {
      return 'MEDIUM';
    } else if (absGamma < config.gammaRiskThresholds.high) {
      return 'HIGH';
    } else {
      return 'EXTREME';
    }
  }
  
  /**
   * Calculate time to expiration in years
   */
  private static getTimeToExpiration(expiration: Date): number {
    const now = new Date();
    const timeMs = expiration.getTime() - now.getTime();
    const timeYears = Math.max(0.001, timeMs / (1000 * 60 * 60 * 24 * 365));
    return timeYears;
  }
  
  /**
   * Monitor gamma changes over time for trend analysis
   */
  static trackGammaEvolution(
    gammaHistory: GEXSnapshot[],
    lookbackPeriods: number = 10
  ): {
    gammaTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    flipPointStability: 'STABLE' | 'VOLATILE';
    riskTrend: 'ESCALATING' | 'DIMINISHING' | 'STABLE';
  } {
    
    if (gammaHistory.length < 2) {
      return {
        gammaTrend: 'STABLE',
        flipPointStability: 'STABLE',
        riskTrend: 'STABLE'
      };
    }
    
    const recent = gammaHistory.slice(-lookbackPeriods);
    
    // Analyze gamma trend
    const gammaValues = recent.map(snap => snap.totalDollarGamma);
    const gammaTrend = this.analyzeTrend(gammaValues);
    
    // Analyze flip point stability
    const flipPoints = recent
      .map(snap => snap.gammaFlipPoint)
      .filter(point => point !== null) as number[];
    
    const flipPointStability = flipPoints.length < 2 ? 'STABLE' : 
      this.calculateVolatility(flipPoints) > 5.0 ? 'VOLATILE' : 'STABLE';
    
    // Analyze risk trend
    const riskValues = recent.map(snap => {
      switch (snap.gammaRisk) {
        case 'LOW': return 1;
        case 'MEDIUM': return 2;
        case 'HIGH': return 3;
        case 'EXTREME': return 4;
      }
    });
    
    const riskTrend = this.analyzeTrend(riskValues);
    
    return {
      gammaTrend,
      flipPointStability,
      riskTrend: riskTrend === 'INCREASING' ? 'ESCALATING' : 
                riskTrend === 'DECREASING' ? 'DIMINISHING' : 'STABLE'
    };
  }
  
  /**
   * Analyze trend in a series of values
   */
  private static analyzeTrend(values: number[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (values.length < 2) return 'STABLE';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / Math.abs(first);
    
    if (change > 0.1) return 'INCREASING';
    if (change < -0.1) return 'DECREASING';
    return 'STABLE';
  }
  
  /**
   * Calculate volatility (standard deviation) of a series
   */
  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
}

export default GammaExposureEngine;