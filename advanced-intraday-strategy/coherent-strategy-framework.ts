/**
 * COHERENT STRATEGY FRAMEWORK
 * 
 * Integrates all advanced indicators into a systematic, multi-step decision-making
 * process for 0DTE options trading. Creates a chain of logic that "stacks the odds"
 * by ensuring each indicator serves a distinct purpose in the trading decision.
 * 
 * Integration Hierarchy:
 * 1. GEX → Market condition and dealer positioning assessment
 * 2. AVP → Key liquidity zones and support/resistance identification
 * 3. AVWAP → Intraday trend and dynamic levels
 * 4. Microfractals + Fibonacci → Precise entry triggers
 * 5. Enhanced ATR → Dynamic risk management
 */

import { MarketData, OptionsChain, TradeSignal, Strategy } from '../lib/types';
import GammaExposureEngine, { GEXSnapshot } from './gamma-exposure-engine';
import AnchoredVolumeProfile, { AVPSnapshot } from './anchored-volume-profile';
import AnchoredVWAP, { AVWAPSnapshot } from './anchored-vwap';
import MicrofractalFibonacci, { MicrofractalSnapshot } from './microfractal-fibonacci';
import EnhancedATRRiskManager, { ATRSnapshot } from './enhanced-atr-risk-mgmt';

export interface StrategyFrameworkConfig {
  // Market condition filters
  minimumGexConfidence: number;
  requiredVolatilityRegime: string[];
  liquidityThresholds: {
    minHVNCount: number;
    maxLVNRatio: number;
  };
  
  // Trend filters
  avwapConfidenceThreshold: number;
  trendAlignmentRequired: boolean;
  
  // Entry triggers
  fractalConfidenceThreshold: number;
  fibonacciTolerancePercent: number;
  confluenceMinimumScore: number;
  
  // Risk management
  maxATRMultiplier: number;
  volatilityRegimeFilters: string[];
  dynamicSizingEnabled: boolean;
  
  // Integration weights
  weights: {
    gex: number;
    avp: number;
    avwap: number;
    fractals: number;
    atr: number;
  };
}

export interface StrategySignal {
  // Overall signal
  action: 'BUY' | 'SELL' | 'NO_TRADE';
  confidence: number; // 0-1 composite confidence
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  
  // Component analysis
  gexAnalysis: GEXSnapshot;
  avpAnalysis: AVPSnapshot;
  avwapAnalysis: AVWAPSnapshot;
  fractalAnalysis: MicrofractalSnapshot;
  atrAnalysis: ATRSnapshot;
  
  // Trade parameters
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  positionSize: number;
  maxRisk: number;
  
  // Confluence zones
  confluenceZones: Array<{
    priceLevel: number;
    supportingIndicators: string[];
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    confidence: number;
  }>;
  
  // Risk warnings
  riskWarnings: string[];
  marketWarnings: string[];
  
  // Reasoning chain
  reasoning: {
    marketCondition: string;
    trendAnalysis: string;
    entryTrigger: string;
    riskAssessment: string;
    finalDecision: string;
  };
}

export class CoherentStrategyFramework {
  
  private static readonly DEFAULT_CONFIG: StrategyFrameworkConfig = {
    minimumGexConfidence: 0.6,
    requiredVolatilityRegime: ['SUPPRESSING', 'TRANSITIONAL'],
    liquidityThresholds: {
      minHVNCount: 3,
      maxLVNRatio: 0.4
    },
    avwapConfidenceThreshold: 0.7,
    trendAlignmentRequired: true,
    fractalConfidenceThreshold: 0.6,
    fibonacciTolerancePercent: 0.5,
    confluenceMinimumScore: 0.7,
    maxATRMultiplier: 3.0,
    volatilityRegimeFilters: ['EXTREME'],
    dynamicSizingEnabled: true,
    weights: {
      gex: 0.25,
      avp: 0.20,
      avwap: 0.20,
      fractals: 0.20,
      atr: 0.15
    }
  };
  
  /**
   * Generate comprehensive trading signal using all indicators
   */
  static async generateCoherentSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    strategy: Strategy,
    accountBalance: number = 25000,
    config: Partial<StrategyFrameworkConfig> = {}
  ): Promise<StrategySignal> {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const currentPrice = marketData[marketData.length - 1].close;
    
    console.log(`🎯 COHERENT STRATEGY ANALYSIS: Multi-indicator framework`);
    console.log(`   Market Data: ${marketData.length} bars`);
    console.log(`   Options Chain: ${optionsChain.length} contracts`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    
    // Step 1: Market Condition Assessment (GEX + AVP)
    const marketCondition = await this.assessMarketCondition(
      marketData, optionsChain, currentPrice, fullConfig
    );
    
    if (!marketCondition.acceptable) {
      return this.createNoTradeSignal(marketCondition.reason, marketData, optionsChain, accountBalance);
    }
    
    // Step 2: Trend Analysis (AVWAP + AVP confluence)
    const trendAnalysis = await this.analyzeTrend(
      marketData, marketCondition.avpAnalysis, fullConfig
    );
    
    if (!trendAnalysis.acceptable) {
      return this.createNoTradeSignal(trendAnalysis.reason, marketData, optionsChain, accountBalance);
    }
    
    // Step 3: Entry Trigger Analysis (Fractals + Fibonacci)
    const entryTrigger = await this.analyzeEntryTrigger(
      marketData, trendAnalysis.avwapAnalysis, fullConfig
    );
    
    if (!entryTrigger.acceptable) {
      return this.createNoTradeSignal(entryTrigger.reason, marketData, optionsChain, accountBalance);
    }
    
    // Step 4: Risk Assessment (ATR + Portfolio considerations)
    const riskAssessment = await this.assessRisk(
      marketData, accountBalance, strategy, fullConfig
    );
    
    if (!riskAssessment.acceptable) {
      return this.createNoTradeSignal(riskAssessment.reason, marketData, optionsChain, accountBalance);
    }
    
    // Step 5: Confluence Analysis
    const confluenceAnalysis = this.analyzeConfluence(
      marketCondition, trendAnalysis, entryTrigger, riskAssessment, currentPrice, fullConfig
    );
    
    // Step 6: Final Signal Generation
    const finalSignal = this.generateFinalSignal(
      marketCondition, trendAnalysis, entryTrigger, riskAssessment, 
      confluenceAnalysis, currentPrice, accountBalance, fullConfig
    );
    
    console.log(`📊 STRATEGY RESULTS:`);
    console.log(`   Final Action: ${finalSignal.action}`);
    console.log(`   Confidence: ${(finalSignal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Quality: ${finalSignal.signalQuality}`);
    console.log(`   Confluence Zones: ${finalSignal.confluenceZones.length}`);
    
    return finalSignal;
  }
  
  /**
   * Step 1: Assess market condition using GEX and initial AVP
   */
  private static async assessMarketCondition(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    currentPrice: number,
    config: StrategyFrameworkConfig
  ): Promise<{
    acceptable: boolean;
    reason: string;
    gexAnalysis: GEXSnapshot;
    avpAnalysis: AVPSnapshot;
  }> {
    
    console.log(`📈 Step 1: Market Condition Assessment`);
    
    // Calculate GEX
    const gexAnalysis = GammaExposureEngine.calculateGEX(optionsChain, currentPrice);
    
    // Check GEX acceptability
    if (!config.requiredVolatilityRegime.includes(gexAnalysis.volatilityRegime)) {
      return {
        acceptable: false,
        reason: `Unfavorable volatility regime: ${gexAnalysis.volatilityRegime}`,
        gexAnalysis,
        avpAnalysis: {} as AVPSnapshot
      };
    }
    
    if (gexAnalysis.gammaRisk === 'EXTREME') {
      return {
        acceptable: false,
        reason: 'Extreme gamma risk detected',
        gexAnalysis,
        avpAnalysis: {} as AVPSnapshot
      };
    }
    
    // Calculate AVP from session open
    const sessionAnchor = 0; // Session open
    const avpAnalysis = AnchoredVolumeProfile.calculateAVP(
      marketData, sessionAnchor, 'Session Open'
    );
    
    // Check AVP liquidity conditions
    const hvnCount = avpAnalysis.volumeNodes.filter(node => node.classification === 'HVN').length;
    const lvnCount = avpAnalysis.volumeNodes.filter(node => node.classification === 'LVN').length;
    const lvnRatio = lvnCount / avpAnalysis.volumeNodes.length;
    
    if (hvnCount < config.liquidityThresholds.minHVNCount) {
      return {
        acceptable: false,
        reason: `Insufficient liquidity zones: ${hvnCount} HVNs (need ${config.liquidityThresholds.minHVNCount})`,
        gexAnalysis,
        avpAnalysis
      };
    }
    
    if (lvnRatio > config.liquidityThresholds.maxLVNRatio) {
      return {
        acceptable: false,
        reason: `Too many low volume zones: ${(lvnRatio * 100).toFixed(1)}% LVNs`,
        gexAnalysis,
        avpAnalysis
      };
    }
    
    console.log(`   ✅ Market condition acceptable`);
    console.log(`   GEX: ${gexAnalysis.volatilityRegime}, Risk: ${gexAnalysis.gammaRisk}`);
    console.log(`   AVP: ${hvnCount} HVNs, ${(lvnRatio * 100).toFixed(1)}% LVNs`);
    
    return {
      acceptable: true,
      reason: 'Market conditions favorable',
      gexAnalysis,
      avpAnalysis
    };
  }
  
  /**
   * Step 2: Analyze trend using AVWAP and AVP confluence
   */
  private static async analyzeTrend(
    marketData: MarketData[],
    avpAnalysis: AVPSnapshot,
    config: StrategyFrameworkConfig
  ): Promise<{
    acceptable: boolean;
    reason: string;
    avwapAnalysis: AVWAPSnapshot;
    trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }> {
    
    console.log(`📊 Step 2: Trend Analysis`);
    
    // Calculate AVWAP from session open
    const sessionAnchor = 0;
    const avwapAnalysis = AnchoredVWAP.calculateAVWAP(
      marketData, sessionAnchor, 'Session Open'
    );
    
    // Check AVWAP signal quality
    if (avwapAnalysis.signalQuality === 'LOW') {
      return {
        acceptable: false,
        reason: 'Low AVWAP signal quality',
        avwapAnalysis,
        trendDirection: 'NEUTRAL'
      };
    }
    
    if (avwapAnalysis.confluenceLevel < config.avwapConfidenceThreshold) {
      return {
        acceptable: false,
        reason: `AVWAP confidence too low: ${(avwapAnalysis.confluenceLevel * 100).toFixed(1)}%`,
        avwapAnalysis,
        trendDirection: 'NEUTRAL'
      };
    }
    
    // Check trend alignment with AVP structure
    const currentPrice = marketData[marketData.length - 1].close;
    const priceVsPOC = currentPrice > avpAnalysis.valueArea.poc ? 'ABOVE' : 'BELOW';
    const priceVsAVWAP = avwapAnalysis.pricePosition;
    
    let trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    
    if (priceVsAVWAP === 'ABOVE' && priceVsPOC === 'ABOVE' && avwapAnalysis.trendDirection === 'BULLISH') {
      trendDirection = 'BULLISH';
    } else if (priceVsAVWAP === 'BELOW' && priceVsPOC === 'BELOW' && avwapAnalysis.trendDirection === 'BEARISH') {
      trendDirection = 'BEARISH';
    } else if (!config.trendAlignmentRequired) {
      trendDirection = avwapAnalysis.trendDirection;
    }
    
    if (config.trendAlignmentRequired && trendDirection === 'NEUTRAL') {
      return {
        acceptable: false,
        reason: 'No clear trend alignment between AVWAP and AVP',
        avwapAnalysis,
        trendDirection
      };
    }
    
    console.log(`   ✅ Trend analysis acceptable`);
    console.log(`   Direction: ${trendDirection}`);
    console.log(`   AVWAP Quality: ${avwapAnalysis.signalQuality}`);
    console.log(`   Price vs POC: ${priceVsPOC}, vs AVWAP: ${priceVsAVWAP}`);
    
    return {
      acceptable: true,
      reason: 'Trend conditions favorable',
      avwapAnalysis,
      trendDirection
    };
  }
  
  /**
   * Step 3: Analyze entry trigger using fractals and Fibonacci
   */
  private static async analyzeEntryTrigger(
    marketData: MarketData[],
    avwapAnalysis: AVWAPSnapshot,
    config: StrategyFrameworkConfig
  ): Promise<{
    acceptable: boolean;
    reason: string;
    fractalAnalysis: MicrofractalSnapshot;
    entryLevel: number | null;
  }> {
    
    console.log(`🔍 Step 3: Entry Trigger Analysis`);
    
    // Calculate microfractal analysis
    const fractalAnalysis = MicrofractalFibonacci.analyzeMicrofractals(marketData);
    
    // Check for high-probability setups
    const excellentSetups = fractalAnalysis.highProbabilitySetups;
    
    if (excellentSetups.length === 0) {
      return {
        acceptable: false,
        reason: 'No excellent fractal-Fibonacci setups available',
        fractalAnalysis,
        entryLevel: null
      };
    }
    
    // Check confluence with AVWAP
    const currentPrice = marketData[marketData.length - 1].close;
    const avwapLevel = avwapAnalysis.currentAVWAP;
    
    let bestSetup = null;
    let bestScore = 0;
    
    for (const setup of excellentSetups) {
      // Calculate distance from AVWAP (closer is better for confluence)
      const distanceFromAVWAP = Math.abs(setup.fibLevel - avwapLevel) / avwapLevel;
      
      // Setup is better if:
      // 1. High fractal-fib confluence
      // 2. Close to AVWAP level
      // 3. Close to current price for immediate action
      const setupScore = setup.confluence * 
                        (1 - Math.min(1, distanceFromAVWAP * 10)) *
                        (1 - Math.min(1, Math.abs(setup.fibLevel - currentPrice) / currentPrice * 20));
      
      if (setupScore > bestScore) {
        bestScore = setupScore;
        bestSetup = setup;
      }
    }
    
    if (!bestSetup || bestScore < config.confluenceMinimumScore) {
      return {
        acceptable: false,
        reason: `No high-confidence setup found (best score: ${bestScore.toFixed(2)})`,
        fractalAnalysis,
        entryLevel: null
      };
    }
    
    console.log(`   ✅ Entry trigger acceptable`);
    console.log(`   Best Setup: ${bestSetup.fractal.type} fractal + ${bestSetup.fibPercentage} Fib`);
    console.log(`   Entry Level: $${bestSetup.fibLevel.toFixed(2)}`);
    console.log(`   Setup Score: ${bestScore.toFixed(2)}`);
    
    return {
      acceptable: true,
      reason: 'High-probability entry setup identified',
      fractalAnalysis,
      entryLevel: bestSetup.fibLevel
    };
  }
  
  /**
   * Step 4: Assess risk using enhanced ATR analysis
   */
  private static async assessRisk(
    marketData: MarketData[],
    accountBalance: number,
    strategy: Strategy,
    config: StrategyFrameworkConfig
  ): Promise<{
    acceptable: boolean;
    reason: string;
    atrAnalysis: ATRSnapshot;
    recommendedPositionSize: number;
  }> {
    
    console.log(`⚠️  Step 4: Risk Assessment`);
    
    // Calculate enhanced ATR analysis
    const atrAnalysis = EnhancedATRRiskManager.analyzeATR(
      marketData, accountBalance, 2.0
    );
    
    // Check volatility regime filters
    if (config.volatilityRegimeFilters.includes(atrAnalysis.volatilityRegime)) {
      return {
        acceptable: false,
        reason: `Filtered volatility regime: ${atrAnalysis.volatilityRegime}`,
        atrAnalysis,
        recommendedPositionSize: 0
      };
    }
    
    // Check ATR multiplier limits
    if (atrAnalysis.dynamicStopMultiplier > config.maxATRMultiplier) {
      return {
        acceptable: false,
        reason: `ATR stop multiplier too high: ${atrAnalysis.dynamicStopMultiplier.toFixed(1)}x`,
        atrAnalysis,
        recommendedPositionSize: 0
      };
    }
    
    // Check for critical warnings
    const criticalWarnings = atrAnalysis.volatilityWarnings.filter(warning => 
      warning.includes('EXTREME') || warning.includes('MAJOR')
    );
    
    if (criticalWarnings.length > 0) {
      return {
        acceptable: false,
        reason: `Critical volatility warnings: ${criticalWarnings[0]}`,
        atrAnalysis,
        recommendedPositionSize: 0
      };
    }
    
    console.log(`   ✅ Risk assessment acceptable`);
    console.log(`   Volatility Regime: ${atrAnalysis.volatilityRegime}`);
    console.log(`   ATR Stop Multiplier: ${atrAnalysis.dynamicStopMultiplier.toFixed(1)}x`);
    console.log(`   Recommended Size: ${atrAnalysis.recommendedPositionSize} contracts`);
    
    return {
      acceptable: true,
      reason: 'Risk parameters within acceptable limits',
      atrAnalysis,
      recommendedPositionSize: atrAnalysis.recommendedPositionSize
    };
  }
  
  /**
   * Analyze confluence between all indicators
   */
  private static analyzeConfluence(
    marketCondition: any,
    trendAnalysis: any,
    entryTrigger: any,
    riskAssessment: any,
    currentPrice: number,
    config: StrategyFrameworkConfig
  ): Array<{
    priceLevel: number;
    supportingIndicators: string[];
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    confidence: number;
  }> {
    
    const confluenceZones: Array<{
      priceLevel: number;
      supportingIndicators: string[];
      strength: 'STRONG' | 'MODERATE' | 'WEAK';
      confidence: number;
    }> = [];
    
    // Collect key levels from all indicators
    const keyLevels: Array<{ level: number; source: string; weight: number }> = [];
    
    // GEX levels
    for (const level of marketCondition.gexAnalysis.supportLevels) {
      keyLevels.push({ level, source: 'GEX_SUPPORT', weight: config.weights.gex });
    }
    for (const level of marketCondition.gexAnalysis.resistanceLevels) {
      keyLevels.push({ level, source: 'GEX_RESISTANCE', weight: config.weights.gex });
    }
    
    // AVP levels
    keyLevels.push({ 
      level: marketCondition.avpAnalysis.valueArea.poc, 
      source: 'AVP_POC', 
      weight: config.weights.avp * 1.2 
    });
    keyLevels.push({ 
      level: marketCondition.avpAnalysis.valueArea.high, 
      source: 'AVP_VAH', 
      weight: config.weights.avp 
    });
    keyLevels.push({ 
      level: marketCondition.avpAnalysis.valueArea.low, 
      source: 'AVP_VAL', 
      weight: config.weights.avp 
    });
    
    // AVWAP levels
    keyLevels.push({ 
      level: trendAnalysis.avwapAnalysis.currentAVWAP, 
      source: 'AVWAP', 
      weight: config.weights.avwap 
    });
    for (const zone of trendAnalysis.avwapAnalysis.entryZones) {
      keyLevels.push({ level: zone, source: 'AVWAP_ENTRY', weight: config.weights.avwap * 0.8 });
    }
    
    // Fractal-Fibonacci levels
    if (entryTrigger.entryLevel) {
      keyLevels.push({ 
        level: entryTrigger.entryLevel, 
        source: 'FRACTAL_FIB', 
        weight: config.weights.fractals 
      });
    }
    
    // Find confluence (levels within 0.5% of each other)
    const tolerancePercent = 0.005; // 0.5%
    
    for (let i = 0; i < keyLevels.length; i++) {
      const baseLevel = keyLevels[i];
      const confluentLevels = [baseLevel];
      
      for (let j = i + 1; j < keyLevels.length; j++) {
        const compareLevel = keyLevels[j];
        const deviation = Math.abs(baseLevel.level - compareLevel.level) / baseLevel.level;
        
        if (deviation <= tolerancePercent) {
          confluentLevels.push(compareLevel);
        }
      }
      
      if (confluentLevels.length >= 2) {
        const avgLevel = confluentLevels.reduce((sum, level) => sum + level.level, 0) / confluentLevels.length;
        const totalWeight = confluentLevels.reduce((sum, level) => sum + level.weight, 0);
        const supportingIndicators = confluentLevels.map(level => level.source);
        
        let strength: 'STRONG' | 'MODERATE' | 'WEAK';
        if (confluentLevels.length >= 4 || totalWeight >= 0.8) {
          strength = 'STRONG';
        } else if (confluentLevels.length >= 3 || totalWeight >= 0.6) {
          strength = 'MODERATE';
        } else {
          strength = 'WEAK';
        }
        
        confluenceZones.push({
          priceLevel: avgLevel,
          supportingIndicators,
          strength,
          confidence: Math.min(1, totalWeight)
        });
      }
    }
    
    // Remove duplicates and sort by confidence
    const uniqueZones = confluenceZones
      .filter((zone, index, array) => 
        array.findIndex(z => Math.abs(z.priceLevel - zone.priceLevel) < currentPrice * 0.005) === index
      )
      .sort((a, b) => b.confidence - a.confidence);
    
    return uniqueZones.slice(0, 5); // Top 5 confluence zones
  }
  
  /**
   * Generate final trading signal
   */
  private static generateFinalSignal(
    marketCondition: any,
    trendAnalysis: any,
    entryTrigger: any,
    riskAssessment: any,
    confluenceAnalysis: any,
    currentPrice: number,
    accountBalance: number,
    config: StrategyFrameworkConfig
  ): StrategySignal {
    
    const weights = config.weights;
    
    // Calculate composite confidence
    let compositeConfidence = 0;
    compositeConfidence += (marketCondition.gexAnalysis.gammaRisk === 'LOW' ? 1 : 
                           marketCondition.gexAnalysis.gammaRisk === 'MEDIUM' ? 0.7 : 0.4) * weights.gex;
    compositeConfidence += (trendAnalysis.avwapAnalysis.confluenceLevel) * weights.avwap;
    compositeConfidence += (marketCondition.avpAnalysis.liquidityProfile === 'LIQUID' ? 1 : 
                           marketCondition.avpAnalysis.liquidityProfile === 'MODERATE' ? 0.7 : 0.4) * weights.avp;
    compositeConfidence += (entryTrigger.fractalAnalysis.highProbabilitySetups.length > 0 ? 1 : 0.5) * weights.fractals;
    compositeConfidence += (riskAssessment.atrAnalysis.volatilityRegime === 'NORMAL' ? 1 : 
                           riskAssessment.atrAnalysis.volatilityRegime === 'LOW' ? 0.9 : 0.6) * weights.atr;
    
    // Determine action based on trend and entry trigger
    let action: 'BUY' | 'SELL' | 'NO_TRADE' = 'NO_TRADE';
    if (entryTrigger.entryLevel && trendAnalysis.trendDirection !== 'NEUTRAL') {
      action = trendAnalysis.trendDirection === 'BULLISH' ? 'BUY' : 'SELL';
    }
    
    // Determine signal quality
    let signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (compositeConfidence > 0.85 && confluenceAnalysis.length >= 2) {
      signalQuality = 'EXCELLENT';
    } else if (compositeConfidence > 0.7) {
      signalQuality = 'GOOD';
    } else if (compositeConfidence > 0.6) {
      signalQuality = 'FAIR';
    } else {
      signalQuality = 'POOR';
    }
    
    // Calculate trade parameters
    const entryPrice = entryTrigger.entryLevel || currentPrice;
    const atr = riskAssessment.atrAnalysis.atr;
    const stopLoss = action === 'BUY' ? 
      entryPrice - (atr * riskAssessment.atrAnalysis.dynamicStopMultiplier) :
      entryPrice + (atr * riskAssessment.atrAnalysis.dynamicStopMultiplier);
    
    const target1 = action === 'BUY' ?
      entryPrice + (atr * 2) :
      entryPrice - (atr * 2);
    
    const target2 = action === 'BUY' ?
      entryPrice + (atr * 3.5) :
      entryPrice - (atr * 3.5);
    
    const positionSize = riskAssessment.recommendedPositionSize;
    const maxRisk = riskAssessment.atrAnalysis.maxRiskPerTrade;
    
    // Collect warnings
    const riskWarnings = riskAssessment.atrAnalysis.volatilityWarnings;
    const marketWarnings: string[] = [];
    
    if (marketCondition.gexAnalysis.gammaRisk === 'HIGH') {
      marketWarnings.push('High gamma risk environment');
    }
    if (confluenceAnalysis.length === 0) {
      marketWarnings.push('No significant confluence zones identified');
    }
    
    // Build reasoning chain
    const reasoning = {
      marketCondition: `GEX: ${marketCondition.gexAnalysis.volatilityRegime} regime, ` +
                      `AVP: ${marketCondition.avpAnalysis.liquidityProfile} liquidity`,
      trendAnalysis: `AVWAP: ${trendAnalysis.trendDirection} trend, ` +
                    `Quality: ${trendAnalysis.avwapAnalysis.signalQuality}`,
      entryTrigger: entryTrigger.entryLevel ? 
                   `Fractal-Fibonacci confluence at $${entryTrigger.entryLevel.toFixed(2)}` :
                   'No clear entry trigger identified',
      riskAssessment: `ATR: ${riskAssessment.atrAnalysis.volatilityRegime} volatility, ` +
                     `${riskAssessment.atrAnalysis.dynamicStopMultiplier.toFixed(1)}x stop multiplier`,
      finalDecision: action === 'NO_TRADE' ? 'Insufficient confidence for trade entry' :
                    `${action} signal with ${signalQuality} quality`
    };
    
    return {
      action,
      confidence: compositeConfidence,
      signalQuality,
      
      // Component analysis
      gexAnalysis: marketCondition.gexAnalysis,
      avpAnalysis: marketCondition.avpAnalysis,
      avwapAnalysis: trendAnalysis.avwapAnalysis,
      fractalAnalysis: entryTrigger.fractalAnalysis,
      atrAnalysis: riskAssessment.atrAnalysis,
      
      // Trade parameters
      entryPrice,
      stopLoss,
      target1,
      target2,
      positionSize,
      maxRisk,
      
      confluenceZones: confluenceAnalysis,
      riskWarnings,
      marketWarnings,
      reasoning
    };
  }
  
  /**
   * Create a no-trade signal with analysis
   */
  private static createNoTradeSignal(
    reason: string,
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    accountBalance: number
  ): StrategySignal {
    
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Still calculate all components for analysis
    const gexAnalysis = GammaExposureEngine.calculateGEX(optionsChain, currentPrice);
    const avpAnalysis = AnchoredVolumeProfile.calculateAVP(marketData, 0, 'Session Open');
    const avwapAnalysis = AnchoredVWAP.calculateAVWAP(marketData, 0, 'Session Open');
    const fractalAnalysis = MicrofractalFibonacci.analyzeMicrofractals(marketData);
    const atrAnalysis = EnhancedATRRiskManager.analyzeATR(marketData, accountBalance);
    
    return {
      action: 'NO_TRADE',
      confidence: 0,
      signalQuality: 'POOR',
      
      gexAnalysis,
      avpAnalysis,
      avwapAnalysis,
      fractalAnalysis,
      atrAnalysis,
      
      entryPrice: currentPrice,
      stopLoss: currentPrice,
      target1: currentPrice,
      target2: currentPrice,
      positionSize: 0,
      maxRisk: 0,
      
      confluenceZones: [],
      riskWarnings: [reason],
      marketWarnings: [],
      
      reasoning: {
        marketCondition: 'Analysis incomplete',
        trendAnalysis: 'Analysis incomplete',
        entryTrigger: 'Analysis incomplete',
        riskAssessment: 'Analysis incomplete',
        finalDecision: `NO TRADE: ${reason}`
      }
    };
  }
}

export default CoherentStrategyFramework;