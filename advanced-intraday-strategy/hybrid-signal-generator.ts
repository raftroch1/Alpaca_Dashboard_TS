#!/usr/bin/env ts-node
/**
 * HYBRID SIGNAL GENERATOR FOR $200-250/DAY TARGET
 * 
 * Combines:
 * ✅ Sophisticated framework for high-quality setups
 * ✅ Simple momentum/breakout signals for frequency
 * ✅ Time-based signal generation for consistency
 * ✅ 1-minute precision with realistic targets
 */

import { MarketData, OptionsChain, Strategy, TechnicalIndicators } from '../lib/types';
import CoherentStrategyFramework, { StrategySignal } from './coherent-strategy-framework';
import { TechnicalAnalysis } from '../lib/technical-indicators';

export interface HybridSignal {
  // Basic signal info
  action: 'BUY_CALL' | 'BUY_PUT' | 'NO_TRADE';
  confidence: number;
  reasoning: string[];
  
  // Target options
  targetOptions: OptionsChain[];
  
  // Hybrid-specific metadata
  signalType: 'SOPHISTICATED' | 'MOMENTUM' | 'BREAKOUT' | 'TIME_BASED' | 'RSI_EXTREME';
  originalConfidence: number;
  hybridConfidence: number;
  targetProfit: number;
  maxLoss: number;
  expectedHoldMinutes: number;
  
  // Risk management
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  
  // Confluence factors
  confluenceFactors: string[];
  estimatedHoldTime: number;
  
  // Greeks requirements (optional)
  greeksRequirements?: {
    minDelta: number;
    maxGamma: number;
    maxTheta: number;
  };
}

export class HybridSignalGenerator {
  
  private sophisticatedFramework: CoherentStrategyFramework;
  private technicalAnalysis: TechnicalAnalysis;
  
  // Daily tracking
  private dailyTradesGenerated = 0;
  private currentDay = '';
  private lastSignalTime = 0;
  
  // Target metrics for $200-250/day
  private readonly DAILY_TRADE_TARGET = 3;
  private readonly TARGET_WIN_SIZE = 150;
  private readonly TARGET_LOSS_SIZE = 100;
  private readonly MIN_SIGNAL_SPACING_MINUTES = 30; // Space out signals

  constructor() {
    this.sophisticatedFramework = new CoherentStrategyFramework();
    this.technicalAnalysis = new TechnicalAnalysis();
    
    console.log('🚀 HYBRID SIGNAL GENERATOR INITIALIZED');
    console.log(`   🎯 Target: ${this.DAILY_TRADE_TARGET} signals/day`);
    console.log(`   💰 Profit targets: $${this.TARGET_WIN_SIZE} wins, $${this.TARGET_LOSS_SIZE} losses`);
    console.log(`   ⏰ Signal spacing: ${this.MIN_SIGNAL_SPACING_MINUTES} minutes`);
  }

  /**
   * Generate hybrid signals combining sophisticated + simple approaches
   */
  async generateHybridSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    strategy: Strategy
  ): Promise<HybridSignal | null> {
    
    if (marketData.length < 20) return null;
    
    const currentTime = marketData[marketData.length - 1].date;
    const currentDay = currentTime.toDateString();
    
    // Reset daily counter if new day
    if (this.currentDay !== currentDay) {
      this.currentDay = currentDay;
      this.dailyTradesGenerated = 0;
      console.log(`📅 NEW DAY: ${currentDay} - Resetting signal count`);
    }
    
    // Check signal spacing (avoid overtrading)
    const currentTimeMs = currentTime.getTime();
    const minutesSinceLastSignal = (currentTimeMs - this.lastSignalTime) / (1000 * 60);
    
    if (minutesSinceLastSignal < this.MIN_SIGNAL_SPACING_MINUTES && this.lastSignalTime > 0) {
      return null; // Too soon for next signal
    }
    
    // PRIORITY 1: Try sophisticated framework first (high quality)
    try {
      const sophisticatedSignal = await this.sophisticatedFramework.generateCoherentSignal(
        marketData, optionsChain, strategy
      );
      
      if (sophisticatedSignal && sophisticatedSignal.confidence >= 0.75) {
        this.dailyTradesGenerated++;
        this.lastSignalTime = currentTimeMs;
        
        return this.convertSophisticatedSignal(sophisticatedSignal, optionsChain, currentTime);
      }
    } catch (error) {
      console.log('⚠️  Sophisticated framework error, using simple signals only');
    }
    
    // PRIORITY 2: If we need more signals, use simple approaches
    const remainingTargetSignals = this.DAILY_TRADE_TARGET - this.dailyTradesGenerated;
    const hoursRemainingInDay = this.getHoursRemainingInTradingDay(currentTime);
    
    if (remainingTargetSignals > 0) {
      
      console.log(`🎯 HYBRID MODE: Need ${remainingTargetSignals} more signals, ${hoursRemainingInDay.toFixed(1)}h remaining`);
      
      // Try simple signal generators in order of preference
      const simpleSignal = 
        this.generateRSIExtremeSignal(marketData, optionsChain, currentTime) ||
        this.generateMomentumSignal(marketData, optionsChain, currentTime) ||
        this.generateBreakoutSignal(marketData, optionsChain, currentTime) ||
        this.generateTimeBasedSignal(marketData, optionsChain, currentTime);
      
      if (simpleSignal) {
        this.dailyTradesGenerated++;
        this.lastSignalTime = currentTimeMs;
        return simpleSignal;
      }
    }
    
    return null;
  }
  
  /**
   * Convert sophisticated signal to hybrid format
   */
  private convertSophisticatedSignal(
    sophisticatedSignal: StrategySignal,
    optionsChain: OptionsChain[],
    currentTime: Date
  ): HybridSignal {
    
    // Convert BUY/SELL to options actions
    const action = sophisticatedSignal.action === 'BUY' ? 'BUY_CALL' : 
                  sophisticatedSignal.action === 'SELL' ? 'BUY_PUT' : 'NO_TRADE';
    
    return {
      action,
      confidence: sophisticatedSignal.confidence,
      reasoning: [
        'Sophisticated framework signal',
        `Quality: ${sophisticatedSignal.signalQuality}`,
        `Confluence zones: ${sophisticatedSignal.confluenceZones.length}`
      ],
      targetOptions: optionsChain.slice(0, 3),
      signalType: 'SOPHISTICATED',
      originalConfidence: sophisticatedSignal.confidence,
      hybridConfidence: sophisticatedSignal.confidence,
      targetProfit: this.TARGET_WIN_SIZE,
      maxLoss: this.TARGET_LOSS_SIZE,
      expectedHoldMinutes: 120,
      riskLevel: 'MODERATE',
      quality: sophisticatedSignal.signalQuality,
      confluenceFactors: sophisticatedSignal.confluenceZones.map(z => z.supportingIndicators).flat(),
      estimatedHoldTime: 120
    };
  }
  
  /**
   * RSI extreme signals (RSI > 70 or < 30)
   */
  private generateRSIExtremeSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    currentTime: Date
  ): HybridSignal | null {
    
    if (marketData.length < 14) return null;
    
    const technicals = this.technicalAnalysis.calculateIndicators(marketData.slice(-14));
    
    if (technicals.rsi <= 30) {
      // Oversold - Buy Call
      return {
        action: 'BUY_CALL',
        confidence: 0.65,
        reasoning: [`RSI oversold: ${technicals.rsi.toFixed(1)}`, 'Mean reversion expected'],
        targetOptions: optionsChain.slice(0, 3),
        signalType: 'RSI_EXTREME',
        originalConfidence: 0.65,
        hybridConfidence: 0.65,
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE,
        expectedHoldMinutes: 90,
        riskLevel: 'MODERATE',
        quality: 'GOOD',
        confluenceFactors: ['RSI_OVERSOLD'],
        estimatedHoldTime: 90,
        greeksRequirements: {
          minDelta: 0.3,
          maxGamma: 0.15,
          maxTheta: -0.2
        }
      };
    }
    
    if (technicals.rsi >= 70) {
      // Overbought - Buy Put
      return {
        action: 'BUY_PUT',
        confidence: 0.65,
        reasoning: [`RSI overbought: ${technicals.rsi.toFixed(1)}`, 'Mean reversion expected'],
        targetOptions: optionsChain.slice(0, 3),
        signalType: 'RSI_EXTREME',
        originalConfidence: 0.65,
        hybridConfidence: 0.65,
        targetProfit: this.TARGET_WIN_SIZE,
        maxLoss: this.TARGET_LOSS_SIZE,
        expectedHoldMinutes: 90,
        riskLevel: 'MODERATE',
        quality: 'GOOD',
        confluenceFactors: ['RSI_OVERBOUGHT'],
        estimatedHoldTime: 90,
        greeksRequirements: {
          minDelta: 0.3,
          maxGamma: 0.15,
          maxTheta: -0.2
        }
      };
    }
    
    return null;
  }
  
  /**
   * Momentum signals (price movement with volume)
   */
  private generateMomentumSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    currentTime: Date
  ): HybridSignal | null {
    
    if (marketData.length < 5) return null;
    
    const recent = marketData.slice(-3);
    const currentPrice = recent[2].close;
    const previousPrice = recent[0].close;
    const priceMovePct = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Check volume confirmation
    const currentVolume = recent[2].volume || 0;
    const avgVolume = marketData.slice(-10).reduce((sum, bar) => sum + (bar.volume || 0), 0) / 10;
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;
    
    // LOWERED THRESHOLD: 0.08% price move with 1.2x volume
    if (Math.abs(priceMovePct) >= 0.08 && volumeRatio >= 1.2) {
      
      const action = priceMovePct > 0 ? 'BUY_CALL' : 'BUY_PUT';
      const confidence = Math.min(0.72, 0.55 + Math.abs(priceMovePct) * 8 + (volumeRatio - 1) * 0.1);
      
      const baseSignal: StrategySignal = {
        action,
        confidence,
        reasoning: [
          `Momentum: ${priceMovePct.toFixed(3)}%`,
          `Volume: ${volumeRatio.toFixed(1)}x average`
        ],
        targetOptions: optionsChain.slice(0, 3),
        riskLevel: 'MODERATE',
        quality: confidence >= 0.65 ? 'GOOD' : 'FAIR',
        confluenceFactors: ['MOMENTUM', 'VOLUME_CONFIRMATION'],
        estimatedHoldTime: 75,
        greeksRequirements: {
          minDelta: 0.35,
          maxGamma: 0.14,
          maxTheta: -0.18
        }
      };
      
      return this.createHybridSignal(baseSignal, 'MOMENTUM', confidence, confidence, currentTime);
    }
    
    return null;
  }
  
  /**
   * Breakout signals (price breaking recent highs/lows)
   */
  private generateBreakoutSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    currentTime: Date
  ): HybridSignal | null {
    
    if (marketData.length < 20) return null;
    
    const currentPrice = marketData[marketData.length - 1].close;
    const recent20 = marketData.slice(-20, -1); // Exclude current bar
    
    const highestHigh = Math.max(...recent20.map(bar => bar.high));
    const lowestLow = Math.min(...recent20.map(bar => bar.low));
    
    // Check for breakouts
    if (currentPrice > highestHigh) {
      // Upside breakout
      const breakoutPct = ((currentPrice - highestHigh) / highestHigh) * 100;
      
      if (breakoutPct >= 0.05) { // 0.05% breakout threshold
        const confidence = Math.min(0.68, 0.58 + breakoutPct * 10);
        
        const baseSignal: StrategySignal = {
          action: 'BUY_CALL',
          confidence,
          reasoning: [
            `Upside breakout: +${breakoutPct.toFixed(3)}%`,
            `Above 20-bar high: $${highestHigh.toFixed(2)}`
          ],
          targetOptions: optionsChain.slice(0, 3),
          riskLevel: 'MODERATE',
          quality: confidence >= 0.62 ? 'GOOD' : 'FAIR',
          confluenceFactors: ['BREAKOUT_UPSIDE'],
          estimatedHoldTime: 120,
          greeksRequirements: {
            minDelta: 0.4,
            maxGamma: 0.12,
            maxTheta: -0.15
          }
        };
        
        return this.createHybridSignal(baseSignal, 'BREAKOUT', confidence, confidence, currentTime);
      }
    }
    
    if (currentPrice < lowestLow) {
      // Downside breakout
      const breakoutPct = ((lowestLow - currentPrice) / lowestLow) * 100;
      
      if (breakoutPct >= 0.05) { // 0.05% breakout threshold
        const confidence = Math.min(0.68, 0.58 + breakoutPct * 10);
        
        const baseSignal: StrategySignal = {
          action: 'BUY_PUT',
          confidence,
          reasoning: [
            `Downside breakout: -${breakoutPct.toFixed(3)}%`,
            `Below 20-bar low: $${lowestLow.toFixed(2)}`
          ],
          targetOptions: optionsChain.slice(0, 3),
          riskLevel: 'MODERATE',
          quality: confidence >= 0.62 ? 'GOOD' : 'FAIR',
          confluenceFactors: ['BREAKOUT_DOWNSIDE'],
          estimatedHoldTime: 120,
          greeksRequirements: {
            minDelta: 0.4,
            maxGamma: 0.12,
            maxTheta: -0.15
          }
        };
        
        return this.createHybridSignal(baseSignal, 'BREAKOUT', confidence, confidence, currentTime);
      }
    }
    
    return null;
  }
  
  /**
   * Time-based signals for consistent daily activity
   */
  private generateTimeBasedSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    currentTime: Date
  ): HybridSignal | null {
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Only generate time-based signals if we're behind target
    const remainingSignals = this.DAILY_TRADE_TARGET - this.dailyTradesGenerated;
    const hoursRemaining = this.getHoursRemainingInTradingDay(currentTime);
    
    if (remainingSignals <= 0 || hoursRemaining <= 0.5) return null;
    
    // Morning session signals (10:30-11:30 AM)
    if ((hour === 10 && minute >= 30) || (hour === 11 && minute <= 30)) {
      // Check recent price action for direction
      const recent5 = marketData.slice(-5);
      const trendBias = recent5[4].close > recent5[0].close ? 'BUY_CALL' : 'BUY_PUT';
      
      const baseSignal: StrategySignal = {
        action: trendBias,
        confidence: 0.58,
        reasoning: ['Morning momentum window', 'Time-based signal for daily target'],
        targetOptions: optionsChain.slice(0, 3),
        riskLevel: 'MODERATE',
        quality: 'FAIR',
        confluenceFactors: ['TIME_OF_DAY', 'DAILY_TARGET'],
        estimatedHoldTime: 120,
        greeksRequirements: {
          minDelta: 0.3,
          maxGamma: 0.15,
          maxTheta: -0.2
        }
      };
      
      return this.createHybridSignal(baseSignal, 'TIME_BASED', 0.58, 0.58, currentTime);
    }
    
    // Afternoon signals (2:00-3:30 PM) - more aggressive if behind target
    if ((hour === 14 && minute >= 0) || (hour === 15 && minute <= 30)) {
      if (remainingSignals >= 1 && hoursRemaining <= 2) {
        
        // Slight bearish bias for afternoon (profit-taking time)
        const action = Math.random() > 0.35 ? 'BUY_PUT' : 'BUY_CALL';
        
        const baseSignal: StrategySignal = {
          action,
          confidence: 0.60,
          reasoning: ['Afternoon positioning', 'Time-based signal for daily target'],
          targetOptions: optionsChain.slice(0, 3),
          riskLevel: 'MODERATE',
          quality: 'FAIR',
          confluenceFactors: ['TIME_OF_DAY', 'EOD_POSITIONING'],
          estimatedHoldTime: 90,
          greeksRequirements: {
            minDelta: 0.35,
            maxGamma: 0.12,
            maxTheta: -0.25
          }
        };
        
        return this.createHybridSignal(baseSignal, 'TIME_BASED', 0.60, 0.60, currentTime);
      }
    }
    
    return null;
  }
  
  /**
   * Create hybrid signal with enhanced metadata
   */
  private createHybridSignal(
    baseSignal: StrategySignal,
    signalType: 'SOPHISTICATED' | 'MOMENTUM' | 'BREAKOUT' | 'TIME_BASED' | 'RSI_EXTREME',
    originalConfidence: number,
    hybridConfidence: number,
    currentTime: Date
  ): HybridSignal {
    
    return {
      ...baseSignal,
      signalType,
      originalConfidence,
      hybridConfidence,
      confidence: hybridConfidence,
      targetProfit: this.TARGET_WIN_SIZE,
      maxLoss: this.TARGET_LOSS_SIZE,
      expectedHoldMinutes: baseSignal.estimatedHoldTime || 90
    };
  }
  
  /**
   * Utility methods
   */
  private getHoursRemainingInTradingDay(currentTime: Date): number {
    const closingTime = new Date(currentTime);
    closingTime.setHours(16, 0, 0, 0); // 4 PM ET close
    
    const msRemaining = closingTime.getTime() - currentTime.getTime();
    return Math.max(0, msRemaining / (1000 * 60 * 60));
  }
  
  /**
   * Get daily statistics
   */
  getDailyStats(): { 
    generated: number; 
    target: number; 
    remaining: number;
    lastSignalMinutesAgo: number;
  } {
    const minutesAgo = this.lastSignalTime > 0 ? 
      (Date.now() - this.lastSignalTime) / (1000 * 60) : -1;
    
    return {
      generated: this.dailyTradesGenerated,
      target: this.DAILY_TRADE_TARGET,
      remaining: Math.max(0, this.DAILY_TRADE_TARGET - this.dailyTradesGenerated),
      lastSignalMinutesAgo: Math.floor(minutesAgo)
    };
  }
}

export default HybridSignalGenerator;