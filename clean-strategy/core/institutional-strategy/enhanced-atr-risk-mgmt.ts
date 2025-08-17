/**
 * ENHANCED AVERAGE TRUE RANGE (ATR) FOR VOLATILITY-BASED RISK MANAGEMENT
 * 
 * Advanced ATR implementation for dynamic risk management in 0DTE trading.
 * Provides volatility-adjusted position sizing, stop losses, and risk parameters
 * that adapt to changing market conditions throughout the trading day.
 * 
 * Key Features:
 * - Multi-timeframe ATR analysis
 * - Volatility regime detection
 * - Dynamic position sizing
 * - Adaptive stop losses
 * - Intraday volatility patterns
 */

import { MarketData } from '../../../lib/types';

export interface ATRSnapshot {
  timestamp: Date;
  currentPrice: number;
  timeframe: string;
  
  // Core ATR metrics
  atr: number;
  atrPercent: number; // ATR as percentage of price
  normalizedATR: number; // ATR normalized to 20-day average
  
  // Multi-timeframe analysis
  atr1Min: number;
  atr5Min: number;
  atr15Min: number;
  atrDaily: number;
  
  // Volatility analysis
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  volatilityTrend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
  volatilityPercentile: number; // 0-100 percentile vs historical
  
  // Risk management parameters
  dynamicStopMultiplier: number;
  positionSizeMultiplier: number;
  riskAdjustmentFactor: number;
  
  // Intraday patterns
  timeOfDayVolatility: 'OPENING' | 'MID_SESSION' | 'LUNCH' | 'CLOSING' | 'OVERNIGHT';
  sessionVolatilityProfile: number; // Expected volatility for time of day
  
  // Trading recommendations
  recommendedStopLoss: number;
  recommendedPositionSize: number;
  maxRiskPerTrade: number;
  volatilityWarnings: string[];
}

export interface ATRConfiguration {
  periods: {
    short: number;  // Short-term ATR period
    medium: number; // Medium-term ATR period
    long: number;   // Long-term ATR period
  };
  volatilityThresholds: {
    low: number;     // Low volatility threshold (percentile)
    normal: number;  // Normal volatility threshold
    high: number;    // High volatility threshold
    extreme: number; // Extreme volatility threshold
  };
  riskParameters: {
    baseStopMultiplier: number;    // Base ATR multiplier for stops
    maxStopMultiplier: number;     // Maximum stop multiplier
    minStopMultiplier: number;     // Minimum stop multiplier
    basePositionSize: number;      // Base position size
    maxPositionSize: number;       // Maximum position size
    minPositionSize: number;       // Minimum position size
  };
  timeOfDayAdjustments: {
    opening: number;    // 9:30-10:30 AM volatility multiplier
    midSession: number; // 10:30-12:00 PM volatility multiplier
    lunch: number;      // 12:00-2:00 PM volatility multiplier
    closing: number;    // 2:00-4:00 PM volatility multiplier
  };
}

export class EnhancedATRRiskManager {
  
  private static readonly DEFAULT_CONFIG: ATRConfiguration = {
    periods: {
      short: 7,   // 7-period ATR for short-term
      medium: 14, // 14-period ATR for medium-term (standard)
      long: 21    // 21-period ATR for long-term
    },
    volatilityThresholds: {
      low: 20,     // 20th percentile
      normal: 50,  // 50th percentile
      high: 80,    // 80th percentile
      extreme: 95  // 95th percentile
    },
    riskParameters: {
      baseStopMultiplier: 2.0,     // 2x ATR for base stop
      maxStopMultiplier: 3.0,      // Max 3x ATR stop (tighter for smaller account)
      minStopMultiplier: 1.0,      // Min 1x ATR stop
      basePositionSize: 1.0,       // Base position size multiplier
      maxPositionSize: 1.5,        // Max 1.5x position size (conservative)
      minPositionSize: 0.5         // Min 0.5x position size
    },
    timeOfDayAdjustments: {
      opening: 1.5,    // 50% higher volatility at open
      midSession: 1.0, // Normal volatility mid-session
      lunch: 0.7,      // 30% lower volatility at lunch
      closing: 1.3     // 30% higher volatility at close
    }
  };
  
  /**
   * Comprehensive ATR and volatility analysis
   */
  static analyzeATR(
    marketData: MarketData[],
    accountBalance: number = 25000,
    maxRiskPercent: number = 1.2,
    config: Partial<ATRConfiguration> = {}
  ): ATRSnapshot {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (marketData.length < 30) {
      throw new Error('Insufficient data for ATR analysis (minimum 30 bars required)');
    }
    
    const currentPrice = marketData[marketData.length - 1].close;
    const currentTime = marketData[marketData.length - 1].date;
    
    console.log(`📊 ENHANCED ATR ANALYSIS: ${marketData.length} bars at $${currentPrice.toFixed(2)}`);
    
    // Calculate multi-period ATR
    const atrShort = this.calculateATR(marketData, fullConfig.periods.short);
    const atrMedium = this.calculateATR(marketData, fullConfig.periods.medium);
    const atrLong = this.calculateATR(marketData, fullConfig.periods.long);
    
    // Use medium-term ATR as primary
    const atr = atrMedium;
    const atrPercent = (atr / currentPrice) * 100;
    
    // Calculate normalized ATR (vs long-term average)
    const historicalATRs = this.calculateHistoricalATRs(marketData, fullConfig.periods.medium);
    const avgHistoricalATR = historicalATRs.reduce((sum, val) => sum + val, 0) / historicalATRs.length;
    const normalizedATR = avgHistoricalATR > 0 ? atr / avgHistoricalATR : 1.0;
    
    // Analyze volatility regime and trends
    const volatilityAnalysis = this.analyzeVolatilityRegime(historicalATRs, atr, fullConfig);
    
    // Calculate time-of-day adjustments
    const timeOfDayAnalysis = this.analyzeTimeOfDay(currentTime, fullConfig);
    
    // Calculate risk management parameters
    const riskParameters = this.calculateRiskParameters(
      atr, atrPercent, normalizedATR, volatilityAnalysis, timeOfDayAnalysis, 
      accountBalance, maxRiskPercent, fullConfig
    );
    
    // Generate volatility warnings
    const warnings = this.generateVolatilityWarnings(
      volatilityAnalysis, normalizedATR, atrPercent, timeOfDayAnalysis
    );
    
    const snapshot: ATRSnapshot = {
      timestamp: new Date(),
      currentPrice,
      timeframe: '1Min',
      
      // Core ATR metrics
      atr,
      atrPercent,
      normalizedATR,
      
      // Multi-timeframe (simplified for demonstration)
      atr1Min: atrShort,
      atr5Min: atrMedium,
      atr15Min: atrLong,
      atrDaily: atrLong, // Simplified - would need daily data
      
      // Volatility analysis
      volatilityRegime: volatilityAnalysis.regime,
      volatilityTrend: volatilityAnalysis.trend,
      volatilityPercentile: volatilityAnalysis.percentile,
      
      // Risk management
      dynamicStopMultiplier: riskParameters.stopMultiplier,
      positionSizeMultiplier: riskParameters.positionMultiplier,
      riskAdjustmentFactor: riskParameters.riskAdjustment,
      
      // Time of day
      timeOfDayVolatility: timeOfDayAnalysis.period,
      sessionVolatilityProfile: timeOfDayAnalysis.multiplier,
      
      // Recommendations
      recommendedStopLoss: riskParameters.stopLoss,
      recommendedPositionSize: riskParameters.positionSize,
      maxRiskPerTrade: riskParameters.maxRisk,
      volatilityWarnings: warnings
    };
    
    console.log(`📈 ATR RESULTS:`);
    console.log(`   ATR: $${atr.toFixed(2)} (${atrPercent.toFixed(2)}%)`);
    console.log(`   Volatility Regime: ${volatilityAnalysis.regime}`);
    console.log(`   Recommended Stop: $${riskParameters.stopLoss.toFixed(2)}`);
    console.log(`   Position Size: ${riskParameters.positionSize} contracts`);
    console.log(`   Warnings: ${warnings.length}`);
    
    return snapshot;
  }
  
  /**
   * Calculate Average True Range for specified period
   */
  private static calculateATR(marketData: MarketData[], period: number): number {
    if (marketData.length < period + 1) {
      throw new Error(`Insufficient data for ${period}-period ATR calculation`);
    }
    
    const trueRanges: number[] = [];
    
    // Calculate True Range for each bar
    for (let i = 1; i < marketData.length; i++) {
      const current = marketData[i];
      const previous = marketData[i - 1];
      
      const tr1 = current.high - current.low;                    // High - Low
      const tr2 = Math.abs(current.high - previous.close);      // |High - Previous Close|
      const tr3 = Math.abs(current.low - previous.close);       // |Low - Previous Close|
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Calculate Simple Moving Average of True Ranges for initial ATR
    if (trueRanges.length < period) {
      throw new Error('Insufficient True Range data for ATR calculation');
    }
    
    // Use Simple Moving Average for ATR (could also use Exponential Moving Average)
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
    
    return atr;
  }
  
  /**
   * Calculate historical ATR values for trend analysis
   */
  private static calculateHistoricalATRs(marketData: MarketData[], period: number): number[] {
    const atrValues: number[] = [];
    
    // Calculate ATR for each possible window
    for (let i = period + 1; i <= marketData.length; i++) {
      const windowData = marketData.slice(0, i);
      try {
        const atr = this.calculateATR(windowData, period);
        atrValues.push(atr);
      } catch (error) {
        // Skip windows with insufficient data
        continue;
      }
    }
    
    return atrValues;
  }
  
  /**
   * Analyze volatility regime and trends
   */
  private static analyzeVolatilityRegime(
    historicalATRs: number[],
    currentATR: number,
    config: ATRConfiguration
  ): {
    regime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    trend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
    percentile: number;
  } {
    
    if (historicalATRs.length < 10) {
      return { regime: 'NORMAL', trend: 'STABLE', percentile: 50 };
    }
    
    // Calculate percentile of current ATR vs historical
    const sortedATRs = [...historicalATRs].sort((a, b) => a - b);
    const currentIndex = sortedATRs.findIndex(atr => atr >= currentATR);
    const percentile = currentIndex >= 0 ? (currentIndex / sortedATRs.length) * 100 : 100;
    
    // Determine regime
    let regime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    if (percentile <= config.volatilityThresholds.low) {
      regime = 'LOW';
    } else if (percentile <= config.volatilityThresholds.normal) {
      regime = 'NORMAL';
    } else if (percentile <= config.volatilityThresholds.high) {
      regime = 'HIGH';
    } else {
      regime = 'EXTREME';
    }
    
    // Analyze trend (compare recent vs older ATR values)
    const recentATRs = historicalATRs.slice(-5);
    const olderATRs = historicalATRs.slice(-15, -5);
    
    if (recentATRs.length >= 5 && olderATRs.length >= 10) {
      const recentAvg = recentATRs.reduce((sum, atr) => sum + atr, 0) / recentATRs.length;
      const olderAvg = olderATRs.reduce((sum, atr) => sum + atr, 0) / olderATRs.length;
      
      const change = (recentAvg - olderAvg) / olderAvg;
      
      let trend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
      if (change > 0.1) {
        trend = 'EXPANDING';
      } else if (change < -0.1) {
        trend = 'CONTRACTING';
      } else {
        trend = 'STABLE';
      }
      
      return { regime, trend, percentile };
    }
    
    return { regime, trend: 'STABLE', percentile };
  }
  
  /**
   * Analyze time-of-day volatility patterns
   */
  private static analyzeTimeOfDay(
    currentTime: Date,
    config: ATRConfiguration
  ): {
    period: 'OPENING' | 'MID_SESSION' | 'LUNCH' | 'CLOSING' | 'OVERNIGHT';
    multiplier: number;
  } {
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours in minutes from midnight (EST)
    const marketOpen = 9 * 60 + 30;    // 9:30 AM
    const marketClose = 16 * 60;       // 4:00 PM
    const lunchStart = 12 * 60;        // 12:00 PM
    const lunchEnd = 14 * 60;          // 2:00 PM
    
    if (timeInMinutes < marketOpen || timeInMinutes >= marketClose) {
      return { period: 'OVERNIGHT', multiplier: 0.5 }; // Low overnight volatility
    } else if (timeInMinutes < marketOpen + 60) { // First hour
      return { period: 'OPENING', multiplier: config.timeOfDayAdjustments.opening };
    } else if (timeInMinutes >= lunchStart && timeInMinutes < lunchEnd) {
      return { period: 'LUNCH', multiplier: config.timeOfDayAdjustments.lunch };
    } else if (timeInMinutes >= marketClose - 120) { // Last 2 hours
      return { period: 'CLOSING', multiplier: config.timeOfDayAdjustments.closing };
    } else {
      return { period: 'MID_SESSION', multiplier: config.timeOfDayAdjustments.midSession };
    }
  }
  
  /**
   * Calculate dynamic risk management parameters
   */
  private static calculateRiskParameters(
    atr: number,
    atrPercent: number,
    normalizedATR: number,
    volatilityAnalysis: any,
    timeOfDayAnalysis: any,
    accountBalance: number,
    maxRiskPercent: number,
    config: ATRConfiguration
  ): {
    stopMultiplier: number;
    positionMultiplier: number;
    riskAdjustment: number;
    stopLoss: number;
    positionSize: number;
    maxRisk: number;
  } {
    
    // Base stop multiplier adjusted for volatility regime
    let stopMultiplier = config.riskParameters.baseStopMultiplier;
    
    switch (volatilityAnalysis.regime) {
      case 'LOW':
        stopMultiplier *= 0.8; // Tighter stops in low volatility
        break;
      case 'HIGH':
        stopMultiplier *= 1.3; // Wider stops in high volatility
        break;
      case 'EXTREME':
        stopMultiplier *= 1.6; // Much wider stops in extreme volatility
        break;
    }
    
    // Adjust for normalized ATR
    stopMultiplier *= Math.min(2.0, Math.max(0.5, normalizedATR));
    
    // Adjust for time of day
    stopMultiplier *= timeOfDayAnalysis.multiplier;
    
    // Clamp to configured limits
    stopMultiplier = Math.max(
      config.riskParameters.minStopMultiplier,
      Math.min(config.riskParameters.maxStopMultiplier, stopMultiplier)
    );
    
    // Calculate position size adjustment (inverse of volatility)
    let positionMultiplier = config.riskParameters.basePositionSize;
    
    switch (volatilityAnalysis.regime) {
      case 'LOW':
        positionMultiplier *= 1.2; // Larger positions in low volatility
        break;
      case 'HIGH':
        positionMultiplier *= 0.7; // Smaller positions in high volatility
        break;
      case 'EXTREME':
        positionMultiplier *= 0.4; // Much smaller positions in extreme volatility
        break;
    }
    
    // Adjust for volatility trend
    if (volatilityAnalysis.trend === 'EXPANDING') {
      positionMultiplier *= 0.8; // Reduce size when volatility expanding
    } else if (volatilityAnalysis.trend === 'CONTRACTING') {
      positionMultiplier *= 1.1; // Increase size when volatility contracting
    }
    
    // Clamp position multiplier
    positionMultiplier = Math.max(
      config.riskParameters.minPositionSize,
      Math.min(config.riskParameters.maxPositionSize, positionMultiplier)
    );
    
    // Calculate risk adjustment factor
    const riskAdjustment = (stopMultiplier / config.riskParameters.baseStopMultiplier) * 
                          (config.riskParameters.basePositionSize / positionMultiplier);
    
    // Calculate absolute values optimized for $300 position targets
    const stopLoss = atr * stopMultiplier;
    const targetPositionValue = 300; // Target $300 per position
    const maxRisk = accountBalance * (maxRiskPercent / 100);
    
    // Calculate position size based on target position value and risk limits
    const basePositionValue = Math.min(targetPositionValue, maxRisk / 0.3); // Assume max 30% loss
    const positionSize = Math.floor((basePositionValue / 2.5) * positionMultiplier); // Assume ~$2.50 avg option price
    
    return {
      stopMultiplier,
      positionMultiplier,
      riskAdjustment,
      stopLoss,
      positionSize: Math.max(1, positionSize), // Minimum 1 contract
      maxRisk
    };
  }
  
  /**
   * Generate volatility warnings
   */
  private static generateVolatilityWarnings(
    volatilityAnalysis: any,
    normalizedATR: number,
    atrPercent: number,
    timeOfDayAnalysis: any
  ): string[] {
    
    const warnings: string[] = [];
    
    // Extreme volatility warnings
    if (volatilityAnalysis.regime === 'EXTREME') {
      warnings.push('EXTREME VOLATILITY: Consider reducing position sizes or avoiding new trades');
    }
    
    // High volatility with expanding trend
    if (volatilityAnalysis.regime === 'HIGH' && volatilityAnalysis.trend === 'EXPANDING') {
      warnings.push('EXPANDING HIGH VOLATILITY: Volatility increasing rapidly');
    }
    
    // Normalized ATR warnings
    if (normalizedATR > 2.0) {
      warnings.push(`ELEVATED ATR: Current ATR is ${(normalizedATR * 100 - 100).toFixed(0)}% above normal`);
    }
    
    // High percentage ATR
    if (atrPercent > 3.0) {
      warnings.push(`HIGH INTRADAY RANGE: ATR represents ${atrPercent.toFixed(1)}% of stock price`);
    }
    
    // Time-specific warnings
    if (timeOfDayAnalysis.period === 'OPENING') {
      warnings.push('OPENING HOUR: Expect higher volatility and wider spreads');
    } else if (timeOfDayAnalysis.period === 'CLOSING') {
      warnings.push('CLOSING PERIOD: Volatility may increase due to position adjustments');
    }
    
    // Low volatility warnings
    if (volatilityAnalysis.regime === 'LOW' && volatilityAnalysis.trend === 'CONTRACTING') {
      warnings.push('LOW VOLATILITY: Market may be setting up for breakout');
    }
    
    return warnings;
  }
  
  /**
   * Calculate position size for specific strategy with ATR adjustment
   */
  static calculateATRPositionSize(
    basePositionSize: number,
    atrSnapshot: ATRSnapshot,
    strategyType: 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE' = 'MODERATE'
  ): number {
    
    let adjustmentFactor = atrSnapshot.positionSizeMultiplier;
    
    // Strategy-specific adjustments
    switch (strategyType) {
      case 'AGGRESSIVE':
        adjustmentFactor *= 1.2;
        break;
      case 'CONSERVATIVE':
        adjustmentFactor *= 0.8;
        break;
    }
    
    // Additional adjustments for extreme conditions
    if (atrSnapshot.volatilityRegime === 'EXTREME') {
      adjustmentFactor *= 0.5; // Halve position size in extreme volatility
    }
    
    const adjustedSize = Math.floor(basePositionSize * adjustmentFactor);
    return Math.max(1, adjustedSize); // Minimum 1 contract
  }
  
  /**
   * Calculate dynamic stop loss using ATR
   */
  static calculateATRStopLoss(
    entryPrice: number,
    side: 'LONG' | 'SHORT',
    atrSnapshot: ATRSnapshot,
    customMultiplier?: number
  ): number {
    
    const multiplier = customMultiplier || atrSnapshot.dynamicStopMultiplier;
    const stopDistance = atrSnapshot.atr * multiplier;
    
    if (side === 'LONG') {
      return entryPrice - stopDistance;
    } else {
      return entryPrice + stopDistance;
    }
  }
  
  /**
   * Monitor ATR changes for adaptive risk management
   */
  static monitorATRChanges(
    previousSnapshot: ATRSnapshot,
    currentSnapshot: ATRSnapshot
  ): {
    significantChange: boolean;
    changePercent: number;
    recommendations: string[];
  } {
    
    const changePercent = ((currentSnapshot.atr - previousSnapshot.atr) / previousSnapshot.atr) * 100;
    const significantChange = Math.abs(changePercent) > 20; // 20% change threshold
    
    const recommendations: string[] = [];
    
    if (significantChange) {
      if (changePercent > 0) {
        recommendations.push('ATR increased significantly - consider wider stops and smaller positions');
        
        if (changePercent > 50) {
          recommendations.push('MAJOR VOLATILITY SPIKE - consider halting new trades');
        }
      } else {
        recommendations.push('ATR decreased significantly - can tighten stops and consider larger positions');
      }
    }
    
    // Regime change recommendations
    if (previousSnapshot.volatilityRegime !== currentSnapshot.volatilityRegime) {
      recommendations.push(`Volatility regime changed: ${previousSnapshot.volatilityRegime} → ${currentSnapshot.volatilityRegime}`);
    }
    
    return {
      significantChange,
      changePercent,
      recommendations
    };
  }
}

export default EnhancedATRRiskManager;