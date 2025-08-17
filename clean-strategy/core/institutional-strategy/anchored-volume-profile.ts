/**
 * ANCHORED VOLUME PROFILE (AVP) ENGINE
 * 
 * Provides granular view of trading activity distribution from a specific
 * anchor point, identifying zones of high and low liquidity critical for
 * 0DTE options trading entries and exits.
 * 
 * Key Concepts:
 * - Point of Control (POC): Price level with highest traded volume
 * - Value Area (VA): Range containing 70% of traded volume
 * - High Volume Nodes (HVN): Strong support/resistance areas
 * - Low Volume Nodes (LVN): Areas where price moves quickly
 */

import { MarketData } from '../../../lib/types';

export interface VolumeNode {
  priceLevel: number;
  volume: number;
  trades: number;
  percentage: number; // Percentage of total volume
  classification: 'HVN' | 'LVN' | 'NORMAL'; // High/Low/Normal Volume Node
}

export interface ValueArea {
  high: number;   // Value Area High (VAH)
  low: number;    // Value Area Low (VAL)
  poc: number;    // Point of Control
  volumeInVA: number; // Total volume in value area
  vaPercentage: number; // Typically ~70%
}

export interface LiquidityZone {
  priceLevel: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  type: 'SUPPORT' | 'RESISTANCE' | 'MAGNET';
  volume: number;
  confidence: number; // 0-1 confidence score
}

export interface AVPSnapshot {
  timestamp: Date;
  anchorTime: Date;
  anchorReason: string;
  currentPrice: number;
  timeframe: string;
  
  // Core volume profile data
  volumeNodes: VolumeNode[];
  valueArea: ValueArea;
  totalVolume: number;
  totalTrades: number;
  
  // Analysis results
  liquidityZones: LiquidityZone[];
  marketStructure: 'BALANCED' | 'SKEWED_HIGH' | 'SKEWED_LOW' | 'DOUBLE_DISTRIBUTION';
  
  // Trading signals
  priceRelativeToVA: 'ABOVE_VAH' | 'IN_VA' | 'BELOW_VAL' | 'AT_POC';
  volumeQuality: 'HIGH_VOLUME' | 'AVERAGE_VOLUME' | 'LOW_VOLUME';
  liquidityProfile: 'LIQUID' | 'MODERATE' | 'ILLIQUID';
  
  // Key levels for trading
  nearestSupport: number | null;
  nearestResistance: number | null;
  breakoutTargets: number[];
  meanReversionTargets: number[];
}

export interface AVPConfiguration {
  tickSize: number; // Price increment for volume buckets
  volumeThreshold: number; // Minimum volume for HVN classification
  vaPercentage: number; // Value area percentage (typically 70%)
  hvnMultiplier: number; // Multiplier of average volume to classify HVN
  lvnThreshold: number; // Maximum volume for LVN classification
  minDataPoints: number; // Minimum bars required for analysis
}

export type AnchorType = 
  | 'SESSION_OPEN'
  | 'MAJOR_HIGH'
  | 'MAJOR_LOW'
  | 'VOLUME_SPIKE'
  | 'NEWS_EVENT'
  | 'CUSTOM';

export class AnchoredVolumeProfile {
  
  private static readonly DEFAULT_CONFIG: AVPConfiguration = {
    tickSize: 0.25, // $0.25 increments for SPY
    volumeThreshold: 1000,
    vaPercentage: 0.70,
    hvnMultiplier: 2.0,
    lvnThreshold: 0.3,
    minDataPoints: 20
  };
  
  /**
   * Calculate Anchored Volume Profile from specified anchor point
   */
  static calculateAVP(
    marketData: MarketData[],
    anchorIndex: number,
    anchorReason: string = 'SESSION_OPEN',
    config: Partial<AVPConfiguration> = {}
  ): AVPSnapshot {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Validate inputs
    if (anchorIndex < 0 || anchorIndex >= marketData.length) {
      throw new Error('Invalid anchor index');
    }
    
    if (marketData.length - anchorIndex < fullConfig.minDataPoints) {
      throw new Error('Insufficient data points for reliable AVP calculation');
    }
    
    const relevantData = marketData.slice(anchorIndex);
    const anchorTime = relevantData[0].date;
    const currentPrice = relevantData[relevantData.length - 1].close;
    
    console.log(`📊 AVP CALCULATION: Analyzing ${relevantData.length} bars from ${anchorReason} anchor`);
    console.log(`   Anchor Time: ${anchorTime.toLocaleTimeString()}`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    
    // Build volume profile
    const volumeNodes = this.buildVolumeProfile(relevantData, fullConfig);
    
    // Calculate value area
    const valueArea = this.calculateValueArea(volumeNodes, fullConfig);
    
    // Identify liquidity zones
    const liquidityZones = this.identifyLiquidityZones(volumeNodes, currentPrice, fullConfig);
    
    // Analyze market structure
    const marketStructure = this.analyzeMarketStructure(volumeNodes, valueArea);
    
    // Calculate trading metrics
    const totalVolume = relevantData.reduce((sum, bar) => sum + Number(bar.volume), 0);
    const totalTrades = relevantData.length; // Approximation
    
    // Determine price position relative to value area
    const priceRelativeToVA = this.getPriceRelativeToVA(currentPrice, valueArea);
    
    // Assess volume quality
    const volumeQuality = this.assessVolumeQuality(relevantData);
    
    // Assess liquidity profile
    const liquidityProfile = this.assessLiquidityProfile(volumeNodes, fullConfig);
    
    // Find key levels
    const nearestSupport = this.findNearestSupport(volumeNodes, currentPrice);
    const nearestResistance = this.findNearestResistance(volumeNodes, currentPrice);
    const breakoutTargets = this.identifyBreakoutTargets(volumeNodes, currentPrice);
    const meanReversionTargets = this.identifyMeanReversionTargets(valueArea, currentPrice);
    
    const snapshot: AVPSnapshot = {
      timestamp: new Date(),
      anchorTime,
      anchorReason,
      currentPrice,
      timeframe: '1Min', // Could be parameterized
      volumeNodes,
      valueArea,
      totalVolume,
      totalTrades,
      liquidityZones,
      marketStructure,
      priceRelativeToVA,
      volumeQuality,
      liquidityProfile,
      nearestSupport,
      nearestResistance,
      breakoutTargets,
      meanReversionTargets
    };
    
    console.log(`📈 AVP RESULTS:`);
    console.log(`   POC: $${valueArea.poc.toFixed(2)}`);
    console.log(`   Value Area: $${valueArea.low.toFixed(2)} - $${valueArea.high.toFixed(2)}`);
    console.log(`   Price Position: ${priceRelativeToVA}`);
    console.log(`   Market Structure: ${marketStructure}`);
    console.log(`   Liquidity Zones: ${liquidityZones.length} identified`);
    
    return snapshot;
  }
  
  /**
   * Build volume profile by aggregating volume at price levels
   */
  private static buildVolumeProfile(
    marketData: MarketData[],
    config: AVPConfiguration
  ): VolumeNode[] {
    
    // Find price range
    const prices = marketData.flatMap(bar => [bar.high, bar.low, bar.open, bar.close]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Create price buckets
    const buckets = new Map<number, { volume: number; trades: number }>();
    
    // Aggregate volume at each price level
    for (const bar of marketData) {
      // Distribute volume across the bar's price range
      const priceRange = bar.high - bar.low;
      const volumePerTick = Number(bar.volume);
      
      if (priceRange === 0) {
        // All volume at one price
        const priceLevel = this.roundToTick(bar.close, config.tickSize);
        const existing = buckets.get(priceLevel) || { volume: 0, trades: 0 };
        buckets.set(priceLevel, {
          volume: existing.volume + volumePerTick,
          trades: existing.trades + 1
        });
      } else {
        // Distribute volume proportionally
        // Simple model: uniform distribution across the range
        const ticks = Math.ceil(priceRange / config.tickSize);
        const volumePerLevel = volumePerTick / ticks;
        
        for (let i = 0; i <= ticks; i++) {
          const priceLevel = this.roundToTick(bar.low + (i * config.tickSize), config.tickSize);
          if (priceLevel <= bar.high) {
            const existing = buckets.get(priceLevel) || { volume: 0, trades: 0 };
            buckets.set(priceLevel, {
              volume: existing.volume + volumePerLevel,
              trades: existing.trades + (1 / ticks)
            });
          }
        }
      }
    }
    
    // Convert to volume nodes
    const totalVolume = Array.from(buckets.values()).reduce((sum, bucket) => sum + bucket.volume, 0);
    const averageVolume = totalVolume / buckets.size;
    
    const volumeNodes: VolumeNode[] = [];
    for (const [priceLevel, data] of Array.from(buckets)) {
      const percentage = (data.volume / totalVolume) * 100;
      
      // Classify volume node
      let classification: 'HVN' | 'LVN' | 'NORMAL';
      if (data.volume >= averageVolume * config.hvnMultiplier) {
        classification = 'HVN';
      } else if (data.volume <= averageVolume * config.lvnThreshold) {
        classification = 'LVN';
      } else {
        classification = 'NORMAL';
      }
      
      volumeNodes.push({
        priceLevel,
        volume: data.volume,
        trades: Math.round(data.trades),
        percentage,
        classification
      });
    }
    
    return volumeNodes.sort((a, b) => a.priceLevel - b.priceLevel);
  }
  
  /**
   * Calculate value area containing specified percentage of volume
   */
  private static calculateValueArea(
    volumeNodes: VolumeNode[],
    config: AVPConfiguration
  ): ValueArea {
    
    // Find Point of Control (highest volume)
    const poc = volumeNodes.reduce((max, node) => 
      node.volume > max.volume ? node : max
    );
    
    const totalVolume = volumeNodes.reduce((sum, node) => sum + node.volume, 0);
    const targetVolume = totalVolume * config.vaPercentage;
    
    // Expand from POC until we capture target volume
    let vaVolume = poc.volume;
    let pocIndex = volumeNodes.findIndex(node => node.priceLevel === poc.priceLevel);
    let lowIndex = pocIndex;
    let highIndex = pocIndex;
    
    while (vaVolume < targetVolume && (lowIndex > 0 || highIndex < volumeNodes.length - 1)) {
      const lowCandidate = lowIndex > 0 ? volumeNodes[lowIndex - 1] : null;
      const highCandidate = highIndex < volumeNodes.length - 1 ? volumeNodes[highIndex + 1] : null;
      
      // Choose side with higher volume
      if (!lowCandidate) {
        vaVolume += highCandidate!.volume;
        highIndex++;
      } else if (!highCandidate) {
        vaVolume += lowCandidate.volume;
        lowIndex--;
      } else if (lowCandidate.volume >= highCandidate.volume) {
        vaVolume += lowCandidate.volume;
        lowIndex--;
      } else {
        vaVolume += highCandidate.volume;
        highIndex++;
      }
    }
    
    return {
      high: volumeNodes[highIndex].priceLevel,
      low: volumeNodes[lowIndex].priceLevel,
      poc: poc.priceLevel,
      volumeInVA: vaVolume,
      vaPercentage: (vaVolume / totalVolume) * 100
    };
  }
  
  /**
   * Identify significant liquidity zones
   */
  private static identifyLiquidityZones(
    volumeNodes: VolumeNode[],
    currentPrice: number,
    config: AVPConfiguration
  ): LiquidityZone[] {
    
    const zones: LiquidityZone[] = [];
    
    // Identify HVNs as liquidity zones
    for (const node of volumeNodes) {
      if (node.classification === 'HVN') {
        const strength = node.percentage > 5 ? 'STRONG' : 
                        node.percentage > 2 ? 'MODERATE' : 'WEAK';
        
        const type = node.priceLevel < currentPrice ? 'SUPPORT' : 
                    node.priceLevel > currentPrice ? 'RESISTANCE' : 'MAGNET';
        
        const confidence = Math.min(1, node.percentage / 10); // Cap at 10% for max confidence
        
        zones.push({
          priceLevel: node.priceLevel,
          strength,
          type,
          volume: node.volume,
          confidence
        });
      }
    }
    
    return zones.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Analyze overall market structure
   */
  private static analyzeMarketStructure(
    volumeNodes: VolumeNode[],
    valueArea: ValueArea
  ): 'BALANCED' | 'SKEWED_HIGH' | 'SKEWED_LOW' | 'DOUBLE_DISTRIBUTION' {
    
    const pocIndex = volumeNodes.findIndex(node => node.priceLevel === valueArea.poc);
    const totalNodes = volumeNodes.length;
    
    // Calculate volume distribution
    const volumeAbovePOC = volumeNodes.slice(pocIndex + 1).reduce((sum, node) => sum + node.volume, 0);
    const volumeBelowPOC = volumeNodes.slice(0, pocIndex).reduce((sum, node) => sum + node.volume, 0);
    const totalVolume = volumeAbovePOC + volumeBelowPOC + volumeNodes[pocIndex].volume;
    
    const upperPercentage = volumeAbovePOC / totalVolume;
    const lowerPercentage = volumeBelowPOC / totalVolume;
    
    // Check for double distribution (two peaks)
    const hvnNodes = volumeNodes.filter(node => node.classification === 'HVN');
    if (hvnNodes.length >= 2) {
      const sortedHVNs = hvnNodes.sort((a, b) => b.volume - a.volume);
      const primaryPeak = sortedHVNs[0];
      const secondaryPeak = sortedHVNs[1];
      
      // If secondary peak is significant and far from primary
      if (secondaryPeak.volume > primaryPeak.volume * 0.6 && 
          Math.abs(secondaryPeak.priceLevel - primaryPeak.priceLevel) > (valueArea.high - valueArea.low) * 0.5) {
        return 'DOUBLE_DISTRIBUTION';
      }
    }
    
    // Determine skew
    if (Math.abs(upperPercentage - lowerPercentage) < 0.15) {
      return 'BALANCED';
    } else if (upperPercentage > lowerPercentage + 0.15) {
      return 'SKEWED_HIGH';
    } else {
      return 'SKEWED_LOW';
    }
  }
  
  /**
   * Determine price position relative to value area
   */
  private static getPriceRelativeToVA(
    currentPrice: number,
    valueArea: ValueArea
  ): 'ABOVE_VAH' | 'IN_VA' | 'BELOW_VAL' | 'AT_POC' {
    
    const pocTolerance = 0.50; // $0.50 tolerance for POC
    
    if (Math.abs(currentPrice - valueArea.poc) <= pocTolerance) {
      return 'AT_POC';
    } else if (currentPrice > valueArea.high) {
      return 'ABOVE_VAH';
    } else if (currentPrice < valueArea.low) {
      return 'BELOW_VAL';
    } else {
      return 'IN_VA';
    }
  }
  
  /**
   * Assess volume quality
   */
  private static assessVolumeQuality(marketData: MarketData[]): 'HIGH_VOLUME' | 'AVERAGE_VOLUME' | 'LOW_VOLUME' {
    const recentVolume = marketData.slice(-10); // Last 10 bars
    const avgVolume = recentVolume.reduce((sum, bar) => sum + Number(bar.volume), 0) / recentVolume.length;
    
    // Compare to session average (simplified)
    const sessionAvg = marketData.reduce((sum, bar) => sum + Number(bar.volume), 0) / marketData.length;
    
    if (avgVolume > sessionAvg * 1.5) {
      return 'HIGH_VOLUME';
    } else if (avgVolume < sessionAvg * 0.7) {
      return 'LOW_VOLUME';
    } else {
      return 'AVERAGE_VOLUME';
    }
  }
  
  /**
   * Assess overall liquidity profile
   */
  private static assessLiquidityProfile(
    volumeNodes: VolumeNode[],
    config: AVPConfiguration
  ): 'LIQUID' | 'MODERATE' | 'ILLIQUID' {
    
    const hvnCount = volumeNodes.filter(node => node.classification === 'HVN').length;
    const lvnCount = volumeNodes.filter(node => node.classification === 'LVN').length;
    const totalNodes = volumeNodes.length;
    
    const hvnRatio = hvnCount / totalNodes;
    const lvnRatio = lvnCount / totalNodes;
    
    if (hvnRatio > 0.2 && lvnRatio < 0.3) {
      return 'LIQUID';
    } else if (hvnRatio < 0.1 || lvnRatio > 0.5) {
      return 'ILLIQUID';
    } else {
      return 'MODERATE';
    }
  }
  
  /**
   * Find nearest support level below current price
   */
  private static findNearestSupport(volumeNodes: VolumeNode[], currentPrice: number): number | null {
    const supportNodes = volumeNodes
      .filter(node => node.priceLevel < currentPrice && node.classification === 'HVN')
      .sort((a, b) => b.priceLevel - a.priceLevel); // Closest first
    
    return supportNodes.length > 0 ? supportNodes[0].priceLevel : null;
  }
  
  /**
   * Find nearest resistance level above current price
   */
  private static findNearestResistance(volumeNodes: VolumeNode[], currentPrice: number): number | null {
    const resistanceNodes = volumeNodes
      .filter(node => node.priceLevel > currentPrice && node.classification === 'HVN')
      .sort((a, b) => a.priceLevel - b.priceLevel); // Closest first
    
    return resistanceNodes.length > 0 ? resistanceNodes[0].priceLevel : null;
  }
  
  /**
   * Identify breakout targets (LVNs beyond resistance/support)
   */
  private static identifyBreakoutTargets(volumeNodes: VolumeNode[], currentPrice: number): number[] {
    const lvnNodes = volumeNodes.filter(node => node.classification === 'LVN');
    
    // Find LVNs that could be breakout targets
    const targets = lvnNodes
      .filter(node => Math.abs(node.priceLevel - currentPrice) > 2) // At least $2 away
      .map(node => node.priceLevel)
      .sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice))
      .slice(0, 3); // Top 3 targets
    
    return targets;
  }
  
  /**
   * Identify mean reversion targets within value area
   */
  private static identifyMeanReversionTargets(valueArea: ValueArea, currentPrice: number): number[] {
    const targets: number[] = [];
    
    // Always include POC as primary target
    targets.push(valueArea.poc);
    
    // Add VAH or VAL depending on current position
    if (currentPrice > valueArea.poc) {
      targets.push(valueArea.low); // Target VAL from above
    } else {
      targets.push(valueArea.high); // Target VAH from below
    }
    
    return targets;
  }
  
  /**
   * Round price to nearest tick size
   */
  private static roundToTick(price: number, tickSize: number): number {
    return Math.round(price / tickSize) * tickSize;
  }
  
  /**
   * Automatically detect anchor points based on market data
   */
  static detectAutoAnchor(
    marketData: MarketData[],
    anchorType: AnchorType
  ): { index: number; reason: string } | null {
    
    switch (anchorType) {
      case 'SESSION_OPEN':
        return { index: 0, reason: 'Session Open' };
        
      case 'MAJOR_HIGH':
        return this.findMajorHigh(marketData);
        
      case 'MAJOR_LOW':
        return this.findMajorLow(marketData);
        
      case 'VOLUME_SPIKE':
        return this.findVolumeSpike(marketData);
        
      default:
        return null;
    }
  }
  
  /**
   * Find major high in recent data
   */
  private static findMajorHigh(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 10) return null;
    
    let maxHigh = 0;
    let maxIndex = 0;
    
    // Look for highest high in recent 20 bars
    const lookback = Math.min(20, marketData.length);
    for (let i = marketData.length - lookback; i < marketData.length; i++) {
      if (marketData[i].high > maxHigh) {
        maxHigh = marketData[i].high;
        maxIndex = i;
      }
    }
    
    return {
      index: maxIndex,
      reason: `Major High at $${maxHigh.toFixed(2)}`
    };
  }
  
  /**
   * Find major low in recent data
   */
  private static findMajorLow(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 10) return null;
    
    let minLow = Infinity;
    let minIndex = 0;
    
    // Look for lowest low in recent 20 bars
    const lookback = Math.min(20, marketData.length);
    for (let i = marketData.length - lookback; i < marketData.length; i++) {
      if (marketData[i].low < minLow) {
        minLow = marketData[i].low;
        minIndex = i;
      }
    }
    
    return {
      index: minIndex,
      reason: `Major Low at $${minLow.toFixed(2)}`
    };
  }
  
  /**
   * Find volume spike in recent data
   */
  private static findVolumeSpike(marketData: MarketData[]): { index: number; reason: string } | null {
    if (marketData.length < 20) return null;
    
    // Calculate average volume
    const avgVolume = marketData.reduce((sum, bar) => sum + Number(bar.volume), 0) / marketData.length;
    
    // Find bars with volume > 2x average
    const spikes = marketData
      .map((bar, index) => ({ index, volume: Number(bar.volume), ratio: Number(bar.volume) / avgVolume }))
      .filter(item => item.ratio > 2)
      .sort((a, b) => b.ratio - a.ratio);
    
    if (spikes.length === 0) return null;
    
    const spike = spikes[0];
    return {
      index: spike.index,
      reason: `Volume Spike (${spike.ratio.toFixed(1)}x avg)`
    };
  }
}

export default AnchoredVolumeProfile;