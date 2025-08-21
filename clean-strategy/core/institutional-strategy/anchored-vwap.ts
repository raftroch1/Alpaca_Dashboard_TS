/**
 * ANCHORED VOLUME WEIGHTED AVERAGE PRICE (AVWAP) ENGINE
 * 
 * Provides dynamic, volume-weighted trend reference from a specific anchor point.
 * More adaptive than traditional moving averages as it incorporates volume and
 * uses a user-defined starting point for 0DTE intraday analysis.
 * 
 * Key Concepts:
 * - Price above AVWAP: Average participant profitable (bullish trend)
 * - Price below AVWAP: Average participant at loss (bearish trend)
 * - AVWAP acts as dynamic support/resistance
 * - Multiple AVWAP convergence creates powerful confluence zones
 */

import { MarketData } from '../../../lib/types';

export interface AVWAPData {
  timestamp: Date;
  price: number;
  avwap: number;
  volume: number;
  cumulativeVolume: number;
  cumulativePV: number; // Price × Volume
  deviation: number; // Current price deviation from AVWAP
  deviationPercent: number;
}

export interface AVWAPSnapshot {
  anchorTime: Date;
  anchorReason: string;
  currentPrice: number;
  currentAVWAP: number;
  
  // Trend analysis
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  pricePosition: 'ABOVE' | 'BELOW' | 'AT_AVWAP';
  
  // Statistical measures
  deviation: number;
  deviationPercent: number;
  averageDeviation: number;
  maxDeviation: number;
  minDeviation: number;
  
  // Volume analysis
  totalVolume: number;
  volumeWeightedPeriods: number;
  volumeProfile: 'INCREASING' | 'DECREASING' | 'STABLE';
  
  // Support/Resistance analysis
  dynamicSupport: number | null;
  dynamicResistance: number | null;
  avwapSlope: 'RISING' | 'FALLING' | 'FLAT';
  slopeStrength: number; // Rate of AVWAP change
  
  // Trading signals
  signalQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  confluenceLevel: number; // 0-1 based on multiple factors
  entryZones: number[]; // Potential entry levels
  exitTargets: number[]; // Potential exit levels
}

export interface AVWAPConfiguration {
  deviationThresholds: {
    weak: number;     // % deviation for weak signals
    moderate: number; // % deviation for moderate signals  
    strong: number;   // % deviation for strong signals
  };
  volumeFilterEnabled: boolean;
  minimumVolumeRatio: number; // Minimum volume vs average for valid signals
  slopeThreshold: number; // Minimum slope to consider trending
  confluenceFactors: {
    volumeWeight: number;
    deviationWeight: number;
    slopeWeight: number;
    durationWeight: number;
  };
}

export type AVWAPAnchorType = 
  | 'SESSION_OPEN'
  | 'PREVIOUS_CLOSE'
  | 'MAJOR_HIGH'
  | 'MAJOR_LOW'
  | 'VOLUME_SPIKE'
  | 'CUSTOM_TIME';

export class AnchoredVWAP {
  
  private static readonly DEFAULT_CONFIG: AVWAPConfiguration = {
    deviationThresholds: {
      weak: 1.0,     // 1.0% deviation (0DTE-calibrated for volatility)
      moderate: 2.5, // 2.5% deviation (0DTE-calibrated for volatility)
      strong: 5.0    // 5.0% deviation (0DTE-calibrated for volatility)
    },
    volumeFilterEnabled: true,
    minimumVolumeRatio: 0.8, // 80% of average volume
    slopeThreshold: 0.01,    // 1.0% slope change (0DTE-calibrated for noise reduction)
    confluenceFactors: {
      volumeWeight: 0.3,
      deviationWeight: 0.3,
      slopeWeight: 0.2,
      durationWeight: 0.2
    }
  };
  
  /**
   * Calculate Anchored VWAP from specified anchor point
   */
  static calculateAVWAP(
    marketData: MarketData[],
    anchorIndex: number,
    anchorReason: string = 'SESSION_OPEN',
    config: Partial<AVWAPConfiguration> = {}
  ): AVWAPSnapshot {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Validate inputs
    if (anchorIndex < 0 || anchorIndex >= marketData.length) {
      throw new Error('Invalid anchor index');
    }
    
    if (marketData.length - anchorIndex < 2) {
      throw new Error('Insufficient data points for AVWAP calculation');
    }
    
    const relevantData = marketData.slice(anchorIndex);
    const anchorTime = relevantData[0].date;
    const currentPrice = relevantData[relevantData.length - 1].close;
    
    console.log(`📈 AVWAP CALCULATION: Analyzing ${relevantData.length} bars from ${anchorReason} anchor`);
    console.log(`   Anchor Time: ${anchorTime.toLocaleTimeString()}`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    
    // Calculate AVWAP data series
    const avwapSeries = this.calculateAVWAPSeries(relevantData);
    const currentAVWAP = avwapSeries[avwapSeries.length - 1].avwap;
    
    // Analyze trend
    const trendAnalysis = this.analyzeTrend(avwapSeries, currentPrice, fullConfig);
    
    // Calculate statistical measures
    const statistics = this.calculateStatistics(avwapSeries, currentPrice);
    
    // Analyze volume profile
    const volumeProfile = this.analyzeVolumeProfile(avwapSeries);
    
    // Determine support/resistance levels
    const supportResistance = this.calculateSupportResistance(avwapSeries, currentPrice);
    
    // Calculate confluence and signal quality
    const confluence = this.calculateConfluence(avwapSeries, trendAnalysis, statistics, fullConfig);
    
    // Identify trading zones
    const tradingZones = this.identifyTradingZones(currentAVWAP, currentPrice, statistics, fullConfig);
    
    const snapshot: AVWAPSnapshot = {
      anchorTime,
      anchorReason,
      currentPrice,
      currentAVWAP,
      
      // Trend analysis
      trendDirection: trendAnalysis.direction,
      trendStrength: trendAnalysis.strength,
      pricePosition: currentPrice > currentAVWAP ? 'ABOVE' : 
                    currentPrice < currentAVWAP ? 'BELOW' : 'AT_AVWAP',
      
      // Statistical measures
      deviation: statistics.currentDeviation,
      deviationPercent: statistics.currentDeviationPercent,
      averageDeviation: statistics.averageDeviation,
      maxDeviation: statistics.maxDeviation,
      minDeviation: statistics.minDeviation,
      
      // Volume analysis
      totalVolume: statistics.totalVolume,
      volumeWeightedPeriods: avwapSeries.length,
      volumeProfile,
      
      // Support/Resistance
      dynamicSupport: supportResistance.support,
      dynamicResistance: supportResistance.resistance,
      avwapSlope: supportResistance.slope,
      slopeStrength: supportResistance.slopeStrength,
      
      // Trading signals
      signalQuality: confluence.quality,
      confluenceLevel: confluence.level,
      entryZones: tradingZones.entryZones,
      exitTargets: tradingZones.exitTargets
    };
    
    console.log(`📊 AVWAP RESULTS:`);
    console.log(`   Current AVWAP: $${currentAVWAP.toFixed(2)}`);
    console.log(`   Price Position: ${snapshot.pricePosition}`);
    console.log(`   Trend: ${trendAnalysis.direction} (${trendAnalysis.strength})`);
    console.log(`   Deviation: ${statistics.currentDeviationPercent.toFixed(2)}%`);
    console.log(`   Signal Quality: ${confluence.quality}`);
    
    return snapshot;
  }
  
  /**
   * Calculate AVWAP series from market data
   */
  private static calculateAVWAPSeries(marketData: MarketData[]): AVWAPData[] {
    const series: AVWAPData[] = [];
    let cumulativePV = 0;
    let cumulativeVolume = 0;
    
    for (const bar of marketData) {
      // Use typical price (HLC/3) for VWAP calculation
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      const volume = Number(bar.volume);
      
      cumulativePV += typicalPrice * volume;
      cumulativeVolume += volume;
      
      const avwap = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : typicalPrice;
      const deviation = bar.close - avwap;
      const deviationPercent = avwap > 0 ? (deviation / avwap) * 100 : 0;
      
      series.push({
        timestamp: bar.date,
        price: bar.close,
        avwap,
        volume,
        cumulativeVolume,
        cumulativePV,
        deviation,
        deviationPercent
      });
    }
    
    return series;
  }
  
  /**
   * Analyze trend direction and strength
   */
  private static analyzeTrend(
    avwapSeries: AVWAPData[],
    currentPrice: number,
    config: AVWAPConfiguration
  ): { direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: 'STRONG' | 'MODERATE' | 'WEAK' } {
    
    if (avwapSeries.length < 5) {
      return { direction: 'NEUTRAL', strength: 'WEAK' };
    }
    
    const recent = avwapSeries.slice(-5);
    const currentAVWAP = recent[recent.length - 1].avwap;
    const previousAVWAP = recent[0].avwap;
    
    // Calculate AVWAP slope
    const avwapChange = (currentAVWAP - previousAVWAP) / previousAVWAP * 100;
    
    // Price position relative to AVWAP
    const priceAbove = currentPrice > currentAVWAP;
    const deviation = Math.abs((currentPrice - currentAVWAP) / currentAVWAP * 100);
    
    // Determine direction
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (priceAbove && avwapChange > config.slopeThreshold) {
      direction = 'BULLISH';
    } else if (!priceAbove && avwapChange < -config.slopeThreshold) {
      direction = 'BEARISH';
    } else {
      direction = 'NEUTRAL';
    }
    
    // Determine strength based on deviation and consistency
    let strength: 'STRONG' | 'MODERATE' | 'WEAK';
    if (deviation > config.deviationThresholds.strong) {
      strength = 'STRONG';
    } else if (deviation > config.deviationThresholds.moderate) {
      strength = 'MODERATE';
    } else {
      strength = 'WEAK';
    }
    
    return { direction, strength };
  }
  
  /**
   * Calculate statistical measures
   */
  private static calculateStatistics(
    avwapSeries: AVWAPData[],
    currentPrice: number
  ): {
    currentDeviation: number;
    currentDeviationPercent: number;
    averageDeviation: number;
    maxDeviation: number;
    minDeviation: number;
    totalVolume: number;
  } {
    
    const currentAVWAP = avwapSeries[avwapSeries.length - 1].avwap;
    const currentDeviation = currentPrice - currentAVWAP;
    const currentDeviationPercent = currentAVWAP > 0 ? (currentDeviation / currentAVWAP) * 100 : 0;
    
    const deviations = avwapSeries.map(data => Math.abs(data.deviation));
    const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    const minDeviation = Math.min(...deviations);
    
    const totalVolume = avwapSeries.reduce((sum, data) => sum + data.volume, 0);
    
    return {
      currentDeviation,
      currentDeviationPercent,
      averageDeviation,
      maxDeviation,
      minDeviation,
      totalVolume
    };
  }
  
  /**
   * Analyze volume profile over the period
   */
  private static analyzeVolumeProfile(avwapSeries: AVWAPData[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (avwapSeries.length < 10) return 'STABLE';
    
    const firstHalf = avwapSeries.slice(0, Math.floor(avwapSeries.length / 2));
    const secondHalf = avwapSeries.slice(Math.floor(avwapSeries.length / 2));
    
    const firstHalfAvgVol = firstHalf.reduce((sum, data) => sum + data.volume, 0) / firstHalf.length;
    const secondHalfAvgVol = secondHalf.reduce((sum, data) => sum + data.volume, 0) / secondHalf.length;
    
    const volumeChange = (secondHalfAvgVol - firstHalfAvgVol) / firstHalfAvgVol;
    
    if (volumeChange > 0.2) return 'INCREASING';
    if (volumeChange < -0.2) return 'DECREASING';
    return 'STABLE';
  }
  
  /**
   * Calculate dynamic support and resistance levels
   */
  private static calculateSupportResistance(
    avwapSeries: AVWAPData[],
    currentPrice: number
  ): {
    support: number | null;
    resistance: number | null;
    slope: 'RISING' | 'FALLING' | 'FLAT';
    slopeStrength: number;
  } {
    
    if (avwapSeries.length < 10) {
      return { support: null, resistance: null, slope: 'FLAT', slopeStrength: 0 };
    }
    
    const recent = avwapSeries.slice(-10);
    const currentAVWAP = recent[recent.length - 1].avwap;
    const oldAVWAP = recent[0].avwap;
    
    // Calculate slope
    const slopeStrength = (currentAVWAP - oldAVWAP) / oldAVWAP * 100;
    let slope: 'RISING' | 'FALLING' | 'FLAT';
    
    if (slopeStrength > 0.1) {
      slope = 'RISING';
    } else if (slopeStrength < -0.1) {
      slope = 'FALLING';
    } else {
      slope = 'FLAT';
    }
    
    // Determine support/resistance based on price position and slope
    let support: number | null = null;
    let resistance: number | null = null;
    
    if (currentPrice > currentAVWAP) {
      // Price above AVWAP - AVWAP acts as support
      support = currentAVWAP;
      
      // Look for resistance above current price
      const maxPrice = Math.max(...recent.map(data => data.price));
      if (maxPrice > currentPrice) {
        resistance = maxPrice;
      }
    } else {
      // Price below AVWAP - AVWAP acts as resistance
      resistance = currentAVWAP;
      
      // Look for support below current price
      const minPrice = Math.min(...recent.map(data => data.price));
      if (minPrice < currentPrice) {
        support = minPrice;
      }
    }
    
    return { support, resistance, slope, slopeStrength };
  }
  
  /**
   * Calculate confluence level and signal quality
   */
  private static calculateConfluence(
    avwapSeries: AVWAPData[],
    trendAnalysis: any,
    statistics: any,
    config: AVWAPConfiguration
  ): { level: number; quality: 'HIGH' | 'MEDIUM' | 'LOW' } {
    
    const weights = config.confluenceFactors;
    let confluenceScore = 0;
    
    // Volume factor (0-1)
    const recentVolume = avwapSeries.slice(-5).reduce((sum, data) => sum + data.volume, 0) / 5;
    const averageVolume = statistics.totalVolume / avwapSeries.length;
    const volumeFactor = Math.min(1, recentVolume / averageVolume);
    confluenceScore += volumeFactor * weights.volumeWeight;
    
    // Deviation factor (0-1) - higher for moderate deviations
    const absDeviationPercent = Math.abs(statistics.currentDeviationPercent);
    const deviationFactor = absDeviationPercent > 0.5 && absDeviationPercent < 3.0 ? 
      Math.min(1, absDeviationPercent / 2) : 0.3;
    confluenceScore += deviationFactor * weights.deviationWeight;
    
    // Slope factor (0-1)
    const slopeFactor = trendAnalysis.strength === 'STRONG' ? 1 : 
                      trendAnalysis.strength === 'MODERATE' ? 0.7 : 0.3;
    confluenceScore += slopeFactor * weights.slopeWeight;
    
    // Duration factor (0-1) - more confidence with more data
    const durationFactor = Math.min(1, avwapSeries.length / 50);
    confluenceScore += durationFactor * weights.durationWeight;
    
    // Determine quality
    let quality: 'HIGH' | 'MEDIUM' | 'LOW';
    if (confluenceScore > 0.75) {
      quality = 'HIGH';
    } else if (confluenceScore > 0.5) {
      quality = 'MEDIUM';
    } else {
      quality = 'LOW';
    }
    
    return { level: confluenceScore, quality };
  }
  
  /**
   * Identify potential entry and exit zones
   */
  private static identifyTradingZones(
    currentAVWAP: number,
    currentPrice: number,
    statistics: any,
    config: AVWAPConfiguration
  ): { entryZones: number[]; exitTargets: number[] } {
    
    const entryZones: number[] = [];
    const exitTargets: number[] = [];
    
    // Primary entry zone: AVWAP level
    entryZones.push(currentAVWAP);
    
    // Secondary entry zones based on standard deviations
    const avgDev = statistics.averageDeviation;
    
    if (currentPrice > currentAVWAP) {
      // In uptrend - look for pullback entry zones
      entryZones.push(currentAVWAP - avgDev * 0.5);
      entryZones.push(currentAVWAP - avgDev);
      
      // Exit targets above current price
      exitTargets.push(currentPrice + avgDev);
      exitTargets.push(currentPrice + avgDev * 2);
    } else {
      // In downtrend - look for bounce entry zones
      entryZones.push(currentAVWAP + avgDev * 0.5);
      entryZones.push(currentAVWAP + avgDev);
      
      // Exit targets below current price
      exitTargets.push(currentPrice - avgDev);
      exitTargets.push(currentPrice - avgDev * 2);
    }
    
    // Filter out unrealistic levels
    const validEntryZones = entryZones.filter(zone => 
      Math.abs(zone - currentPrice) / currentPrice < 0.1 && zone > 0
    );
    
    const validExitTargets = exitTargets.filter(target => 
      Math.abs(target - currentPrice) / currentPrice < 0.15 && target > 0
    );
    
    return {
      entryZones: validEntryZones.sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice)),
      exitTargets: validExitTargets.sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice))
    };
  }
  
  /**
   * Create multiple AVWAP lines for confluence analysis
   */
  static calculateMultipleAVWAPs(
    marketData: MarketData[],
    anchors: Array<{ index: number; reason: string }>,
    config: Partial<AVWAPConfiguration> = {}
  ): Array<{ anchor: string; snapshot: AVWAPSnapshot }> {
    
    const results: Array<{ anchor: string; snapshot: AVWAPSnapshot }> = [];
    
    for (const anchor of anchors) {
      try {
        const snapshot = this.calculateAVWAP(marketData, anchor.index, anchor.reason, config);
        results.push({
          anchor: anchor.reason,
          snapshot
        });
      } catch (error) {
        console.warn(`Could not calculate AVWAP for anchor ${anchor.reason}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Find confluence zones where multiple AVWAPs converge
   */
  static findConfluenceZones(
    avwapResults: Array<{ anchor: string; snapshot: AVWAPSnapshot }>,
    tolerancePercent: number = 0.5
  ): Array<{
    priceLevel: number;
    confluenceCount: number;
    anchors: string[];
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
  }> {
    
    if (avwapResults.length < 2) return [];
    
    const confluenceZones: Array<{
      priceLevel: number;
      confluenceCount: number;
      anchors: string[];
      strength: 'STRONG' | 'MODERATE' | 'WEAK';
    }> = [];
    
    // Compare each AVWAP with others
    for (let i = 0; i < avwapResults.length; i++) {
      const baseAVWAP = avwapResults[i];
      const basePrice = baseAVWAP.snapshot.currentAVWAP;
      const confluentAnchors = [baseAVWAP.anchor];
      
      for (let j = i + 1; j < avwapResults.length; j++) {
        const compareAVWAP = avwapResults[j];
        const comparePrice = compareAVWAP.snapshot.currentAVWAP;
        
        // Check if prices are within tolerance
        const deviation = Math.abs(basePrice - comparePrice) / basePrice * 100;
        if (deviation <= tolerancePercent) {
          confluentAnchors.push(compareAVWAP.anchor);
        }
      }
      
      // Only add if we have confluence (2+ AVWAPs)
      if (confluentAnchors.length >= 2) {
        const strength = confluentAnchors.length >= 4 ? 'STRONG' : 
                        confluentAnchors.length >= 3 ? 'MODERATE' : 'WEAK';
        
        confluenceZones.push({
          priceLevel: basePrice,
          confluenceCount: confluentAnchors.length,
          anchors: confluentAnchors,
          strength
        });
      }
    }
    
    // Remove duplicates and sort by confluence strength
    const uniqueZones = confluenceZones
      .filter((zone, index, array) => 
        array.findIndex(z => Math.abs(z.priceLevel - zone.priceLevel) < 0.25) === index
      )
      .sort((a, b) => b.confluenceCount - a.confluenceCount);
    
    return uniqueZones;
  }
  
  /**
   * Auto-detect optimal anchor points for multiple AVWAP analysis
   */
  static detectOptimalAnchors(
    marketData: MarketData[],
    maxAnchors: number = 4
  ): Array<{ index: number; reason: string }> {
    
    const anchors: Array<{ index: number; reason: string }> = [];
    
    // Always include session open
    anchors.push({ index: 0, reason: 'Session Open' });
    
    if (marketData.length > 10) {
      // Add major high/low
      const highPoint = this.findSignificantHigh(marketData);
      const lowPoint = this.findSignificantLow(marketData);
      
      if (highPoint) anchors.push(highPoint);
      if (lowPoint) anchors.push(lowPoint);
      
      // Add volume spike if space allows
      if (anchors.length < maxAnchors) {
        const volumeSpike = this.findVolumeSpike(marketData);
        if (volumeSpike) anchors.push(volumeSpike);
      }
    }
    
    return anchors.slice(0, maxAnchors);
  }
  
  /**
   * Find significant high in the data
   */
  private static findSignificantHigh(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 20) return null;
    
    let maxHigh = 0;
    let maxIndex = 0;
    
    for (let i = 0; i < marketData.length; i++) {
      if (marketData[i].high > maxHigh) {
        maxHigh = marketData[i].high;
        maxIndex = i;
      }
    }
    
    // Only use if it's not too recent (need some data after it)
    if (marketData.length - maxIndex > 5) {
      return {
        index: maxIndex,
        reason: `Significant High ($${maxHigh.toFixed(2)})`
      };
    }
    
    return null;
  }
  
  /**
   * Find significant low in the data
   */
  private static findSignificantLow(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 20) return null;
    
    let minLow = Infinity;
    let minIndex = 0;
    
    for (let i = 0; i < marketData.length; i++) {
      if (marketData[i].low < minLow) {
        minLow = marketData[i].low;
        minIndex = i;
      }
    }
    
    // Only use if it's not too recent
    if (marketData.length - minIndex > 5) {
      return {
        index: minIndex,
        reason: `Significant Low ($${minLow.toFixed(2)})`
      };
    }
    
    return null;
  }
  
  /**
   * Find volume spike in the data
   */
  private static findVolumeSpike(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 20) return null;
    
    const avgVolume = marketData.reduce((sum, bar) => sum + Number(bar.volume), 0) / marketData.length;
    
    let maxRatio = 0;
    let spikeIndex = 0;
    
    for (let i = 0; i < marketData.length - 5; i++) { // Leave some data after spike
      const ratio = Number(marketData[i].volume) / avgVolume;
      if (ratio > maxRatio && ratio > 2) { // At least 2x average
        maxRatio = ratio;
        spikeIndex = i;
      }
    }
    
    if (maxRatio > 2) {
      return {
        index: spikeIndex,
        reason: `Volume Spike (${maxRatio.toFixed(1)}x)`
      };
    }
    
    return null;
  }
}

export default AnchoredVWAP;