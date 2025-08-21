/**
 * DIRECT INSTITUTIONAL INTEGRATION
 * 
 * Bypasses the overly complex Coherent Strategy Framework and directly
 * integrates our working institutional components with the backtest engine.
 * 
 * This approach:
 * 1. Uses each component individually (we know they work)
 * 2. Applies simple scoring instead of complex filtering
 * 3. Generates trades based on confluence, not elimination
 * 4. Focuses on naked options opportunities
 */

import { MarketData, OptionsChain, TradeSignal } from '../../../lib/types';
import GammaExposureEngine, { GEXSnapshot } from './gamma-exposure-engine';
import AnchoredVolumeProfile, { AVPSnapshot } from './anchored-volume-profile';
import AnchoredVWAP, { AVWAPSnapshot } from './anchored-vwap';
import MicrofractalFibonacci, { MicrofractalSnapshot } from './microfractal-fibonacci';
import EnhancedATRRiskManager, { ATRSnapshot } from './enhanced-atr-risk-mgmt';
import { MarketRegimeDetector } from '../../../lib/market-regime-detector';
import { MarketBiasDetector } from './market-bias-detector';

export interface DirectIntegrationConfig {
  // Scoring weights (not filters!)
  gexWeight: number;
  avpWeight: number;
  avwapWeight: number;
  fractalWeight: number;
  atrWeight: number;
  
  // Minimum scores to generate trades
  minimumBullishScore: number;
  minimumBearishScore: number;
  
  // Risk management
  maxPositionSize: number;
  maxRiskPerTrade: number;
  
  // Options selection
  preferredDTE: number;
  deltaRange: [number, number]; // [min, max]
}

export interface DirectSignal {
  action: 'BUY_CALL' | 'BUY_PUT' | 'SELL_CALL' | 'SELL_PUT' | 'NO_TRADE';
  confidence: number; // 0-1
  reasoning: string;
  
  // Component scores
  gexScore: number;
  avpScore: number;
  avwapScore: number;
  fractalScore: number;
  atrScore: number;
  totalScore: number;
  
  // Trade details
  entryPrice: number;
  positionSize: number;
  maxRisk: number;
  stopLoss?: number;
  target?: number;
  
  // Selected option
  selectedOption?: OptionsChain;
  
  // Component analysis
  gexAnalysis: GEXSnapshot;
  avpAnalysis?: AVPSnapshot;
  avwapAnalysis?: AVWAPSnapshot;
  fractalAnalysis?: MicrofractalSnapshot;
  atrAnalysis?: ATRSnapshot;
}

export class DirectInstitutionalIntegration {
  
  private static readonly DEFAULT_CONFIG: DirectIntegrationConfig = {
    gexWeight: 0.0,   // DISABLED - was causing bullish bias
    avpWeight: 0.25,  // Increased weight
    avwapWeight: 0.40, // MAJOR WEIGHT - trend following
    fractalWeight: 0.25, // Increased weight
    atrWeight: 0.10,
    
    minimumBullishScore: 0.35, // Lowered from 0.6 to allow more trades
    minimumBearishScore: 0.35, // Lowered from 0.6 to allow more trades
    
    maxPositionSize: 0.05, // 5% of account
    maxRiskPerTrade: 0.02, // 2% max risk
    
    preferredDTE: 0, // 0-DTE
    deltaRange: [0.15, 0.85] // Wide delta range
  };
  
  /**
   * Generate trading signal using direct integration of institutional components
   */
  static async generateDirectSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    accountBalance: number = 25000,
    config: Partial<DirectIntegrationConfig> = {},
    dashboardParams?: any // Accept dashboard parameters
  ): Promise<DirectSignal> {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // 🎛️ RESPECT DASHBOARD GEX SETTINGS (allow user control)
    // Only force other weights, let user control GEX via dashboard
    fullConfig.avwapWeight = 0.40; // Increase AVWAP for trend following
    fullConfig.avpWeight = 0.25;   // Increase AVP
    fullConfig.fractalWeight = 0.25; // Increase fractals
    
    const gexStatus = fullConfig.gexWeight > 0 ? `ENABLED(${fullConfig.gexWeight})` : 'DISABLED(0.0)';
    console.log(`🎛️ GEX USER CONTROLLED: ${gexStatus} - Using weights: AVWAP(0.40), AVP(0.25), Fractals(0.25)`);
    const currentPrice = marketData[marketData.length - 1].close;
    
    console.log(`🎯 DIRECT INSTITUTIONAL INTEGRATION`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`   Account Balance: $${accountBalance.toLocaleString()}`);
    console.log(`   Options Available: ${optionsChain.length}`);
    
    // Initialize scores
    let gexScore = 0;
    let avpScore = 0;
    let avwapScore = 0;
    let fractalScore = 0;
    let atrScore = 0;
    
    let gexAnalysis: GEXSnapshot;
    let avpAnalysis: AVPSnapshot | undefined;
    let avwapAnalysis: AVWAPSnapshot | undefined;
    let fractalAnalysis: MicrofractalSnapshot | undefined;
    let atrAnalysis: ATRSnapshot | undefined;
    
    // 1. GEX Analysis (DISABLED - was causing bullish bias)
    try {
      gexAnalysis = GammaExposureEngine.calculateGEX(optionsChain, currentPrice);
      
      // 🎛️ RESPECT USER GEX SETTINGS from dashboard
      if (fullConfig.gexWeight === 0) {
        gexScore = 0;
        console.log(`   📊 GEX Score: 0.00 (USER DISABLED via dashboard)`);
      } else {
        gexScore = this.scoreGEX(gexAnalysis, currentPrice);
        console.log(`   📊 GEX Score: ${gexScore.toFixed(2)} (USER ENABLED - ${gexAnalysis.volatilityRegime}, ${gexAnalysis.gammaRisk})`);
      }
    } catch (error: any) {
      console.log(`   ❌ GEX Analysis failed: ${error.message}`);
      gexAnalysis = {} as GEXSnapshot;
      gexScore = 0;
    }
    
    // 2. AVP Analysis (if enough data)
    try {
      if (marketData.length >= 20) {
        avpAnalysis = AnchoredVolumeProfile.calculateAVP(marketData, 0, 'Session Open');
        avpScore = this.scoreAVP(avpAnalysis, currentPrice);
        console.log(`   📊 AVP Score: ${avpScore.toFixed(2)} (${avpAnalysis.volumeNodes.length} zones)`);
      } else {
        console.log(`   ⚠️  AVP skipped: Need 20+ data points, have ${marketData.length}`);
      }
    } catch (error: any) {
      console.log(`   ❌ AVP Analysis failed: ${error.message}`);
    }
    
    // 3. AVWAP Analysis (if enough data)
    try {
      if (marketData.length >= 10) {
        avwapAnalysis = AnchoredVWAP.calculateAVWAP(marketData, 0, 'Session Open');
        avwapScore = this.scoreAVWAP(avwapAnalysis, currentPrice);
        console.log(`   📊 AVWAP Score: ${avwapScore.toFixed(2)} (${avwapAnalysis.trendDirection})`);
      } else {
        console.log(`   ⚠️  AVWAP skipped: Need 10+ data points, have ${marketData.length}`);
      }
    } catch (error: any) {
      console.log(`   ❌ AVWAP Analysis failed: ${error.message}`);
    }
    
    // 4. Fractal Analysis (if enough data)
    try {
      if (marketData.length >= 15) {
        fractalAnalysis = MicrofractalFibonacci.analyzeMicrofractals(marketData);
        fractalScore = this.scoreFractals(fractalAnalysis);
        console.log(`   📊 Fractal Score: ${fractalScore.toFixed(2)} (${fractalAnalysis.confirmedFractals.length} fractals)`);
      } else {
        console.log(`   ⚠️  Fractals skipped: Need 15+ data points, have ${marketData.length}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fractal Analysis failed: ${error.message}`);
    }
    
    // 5. ATR Analysis (if enough data)
    try {
      if (marketData.length >= 30) {
        atrAnalysis = EnhancedATRRiskManager.analyzeATR(marketData, accountBalance);
        atrScore = this.scoreATR(atrAnalysis);
        console.log(`   📊 ATR Score: ${atrScore.toFixed(2)} (${atrAnalysis.volatilityRegime})`);
      } else {
        console.log(`   ⚠️  ATR skipped: Need 30+ data points, have ${marketData.length}`);
      }
    } catch (error: any) {
      console.log(`   ❌ ATR Analysis failed: ${error.message}`);
    }
    
    // Calculate weighted total score (RESPECT USER GEX SETTINGS)
    const totalScore = (
      gexScore * fullConfig.gexWeight +      // USER CONTROLLED - can be 0.0 or enabled weight
      avpScore * fullConfig.avpWeight +
      avwapScore * fullConfig.avwapWeight +
      fractalScore * fullConfig.fractalWeight +
      atrScore * fullConfig.atrWeight
    );
    
    const gexCalc = fullConfig.gexWeight > 0 ? `GEX(${gexScore.toFixed(2)}×${fullConfig.gexWeight}) + ` : '';
    console.log(`🎛️ USER CONTROLLED - Calculation: ${gexCalc}AVP(${avpScore.toFixed(2)}×${fullConfig.avpWeight}) + AVWAP(${avwapScore.toFixed(2)}×${fullConfig.avwapWeight}) + Fractals(${fractalScore.toFixed(2)}×${fullConfig.fractalWeight}) + ATR(${atrScore.toFixed(2)}×${fullConfig.atrWeight}) = ${totalScore.toFixed(2)}`);
    
    // 🏛️ PROFESSIONAL MARKET BIAS DETECTION - Advanced Market Internals
    const marketBias = MarketBiasDetector.detectBias(marketData, optionsChain, undefined, dashboardParams);
    
    console.log(`🏛️ MARKET BIAS: ${marketBias.bias} (${marketBias.confidence}% confidence, ${marketBias.strength.toFixed(2)} strength)`);
    console.log(`📊 INTERNALS: VIX(${marketBias.internals.vixSignal}) | Volume(${marketBias.internals.volumeSignal}) | Momentum(${marketBias.internals.momentumSignal}) | Options(${marketBias.internals.breadthSignal}) | Price(${marketBias.internals.sectorRotation})`);
    
    // Use institutional scores for signal QUALITY, market bias for DIRECTION
    let finalScore = totalScore;
    let action: DirectSignal['action'] = 'NO_TRADE';
    let reasoning = 'Insufficient confluence for trade';
    
    // 🎯 TIERED CONFIDENCE SYSTEM - Works in ANY market condition
    const institutionalStrength = Math.abs(totalScore);
    const biasStrength = marketBias.strength;
    
    console.log(`🎯 TIERED ANALYSIS: Bias(${marketBias.confidence}%) + Institutional(${institutionalStrength.toFixed(2)})`);
    
    if (marketBias.confidence >= 70) {
      // TIER 1: Strong bias confidence - use bias direction
      const combinedStrength = (institutionalStrength + biasStrength) / 2;
      if (combinedStrength >= 0.3) {
        switch (marketBias.bias) {
          case 'BULLISH':
            action = 'BUY_CALL';
            finalScore = combinedStrength;
            reasoning = `STRONG bias (${marketBias.confidence}%) + institutional confluence`;
            console.log(`🟢 TIER 1 - STRONG BIAS: BULLISH → BUY_CALL`);
            break;
          case 'BEARISH':
            action = 'BUY_PUT';
            finalScore = -combinedStrength;
            reasoning = `STRONG bias (${marketBias.confidence}%) + institutional confluence`;
            console.log(`🔴 TIER 1 - STRONG BIAS: BEARISH → BUY_PUT`);
            break;
        }
      }
    } else if (marketBias.confidence >= 40 && institutionalStrength >= 0.2) {
      // TIER 2: Moderate bias + good institutional - RESPECT AVWAP DIRECTION
      
      // 🚨 CRITICAL FIX: Check AVWAP direction first when it's strongly bearish/bullish
      const avwapDeviation = avwapAnalysis ? ((currentPrice - (avwapAnalysis as any).currentAVWAP) / (avwapAnalysis as any).currentAVWAP) * 100 : 0;
      
      if (avwapScore <= -0.3 && avwapDeviation < -0.2) {
        // Bearish AVWAP overrides positive institutional scores (RELAXED THRESHOLDS)
        action = 'BUY_PUT';
        finalScore = Math.abs(avwapScore);
        reasoning = `Bearish AVWAP signal overrides institutional confluence (AVWAP: ${avwapDeviation.toFixed(2)}%)`;
        console.log(`🔴 TIER 2 - AVWAP OVERRIDE: Bearish AVWAP → BUY_PUT`);
      } else if (avwapScore >= 0.3 && avwapDeviation > 0.2) {
        // Bullish AVWAP overrides negative institutional scores (RELAXED THRESHOLDS)
        action = 'BUY_CALL';
        finalScore = avwapScore;
        reasoning = `Bullish AVWAP signal overrides institutional confluence (AVWAP: +${avwapDeviation.toFixed(2)}%)`;
        console.log(`🟢 TIER 2 - AVWAP OVERRIDE: Bullish AVWAP → BUY_CALL`);
      } else if (totalScore > 0.2) {
        action = 'BUY_CALL';
        finalScore = institutionalStrength;
        reasoning = `Moderate bias + BULLISH institutional confluence (${totalScore.toFixed(2)})`;
        console.log(`🟢 TIER 2 - INSTITUTIONAL: BULLISH confluence → BUY_CALL`);
      } else if (totalScore < -0.2) {
        action = 'BUY_PUT';
        finalScore = -institutionalStrength;
        reasoning = `Moderate bias + BEARISH institutional confluence (${totalScore.toFixed(2)})`;
        console.log(`🔴 TIER 2 - INSTITUTIONAL: BEARISH confluence → BUY_PUT`);
      }
    } else if (institutionalStrength >= 0.15) {
      // TIER 3: Weak bias but decent institutional - use AVWAP position
      const avwapDeviation = avwapAnalysis ? ((currentPrice - (avwapAnalysis as any).currentAVWAP) / (avwapAnalysis as any).currentAVWAP) * 100 : 0;
      
      if (avwapDeviation > 0.2) {
        action = 'BUY_CALL';
        finalScore = 0.4;
        reasoning = `AVWAP position: +${avwapDeviation.toFixed(2)}% above AVWAP`;
        console.log(`🟢 TIER 3 - AVWAP: Above AVWAP → BUY_CALL`);
      } else if (avwapDeviation < -0.2) {
        action = 'BUY_PUT';
        finalScore = -0.4;
        reasoning = `AVWAP position: ${avwapDeviation.toFixed(2)}% below AVWAP`;
        console.log(`🔴 TIER 3 - AVWAP: Below AVWAP → BUY_PUT`);
      }
    }
    
    if (action === 'NO_TRADE') {
      reasoning = `No clear directional signal: Bias(${marketBias.confidence}%), Institutional(${institutionalStrength.toFixed(2)})`;
      console.log(`⚪ NO SIGNAL: Insufficient conviction across all tiers`);
    }
    
    console.log(`\n📊 SCORING RESULTS:`);
    const gexDisplay = fullConfig.gexWeight > 0 ? 
      `${gexScore.toFixed(2)} (weight: ${fullConfig.gexWeight}) - USER ENABLED` : 
      '0.00 (USER DISABLED via dashboard)';
    console.log(`   GEX: ${gexDisplay}`);
    console.log(`   AVP: ${avpScore.toFixed(2)} (weight: ${fullConfig.avpWeight})`);
    console.log(`   AVWAP: ${avwapScore.toFixed(2)} (weight: ${fullConfig.avwapWeight})`);
    console.log(`   Fractals: ${fractalScore.toFixed(2)} (weight: ${fullConfig.fractalWeight})`);
    console.log(`   ATR: ${atrScore.toFixed(2)} (weight: ${fullConfig.atrWeight})`);
    console.log(`   TOTAL: ${finalScore.toFixed(2)} (REGIME-BASED DIRECTION)`);
    
    // Action is now determined by market regime detection above
    
    // Select best option and calculate position sizing
    let selectedOption: OptionsChain | undefined;
    let entryPrice = currentPrice;
    let positionSize = 0;
    let maxRisk = 0;
    
    if (action !== 'NO_TRADE') {
      selectedOption = this.selectBestOption(optionsChain, action, fullConfig);
      if (selectedOption) {
        entryPrice = (selectedOption.bid + selectedOption.ask) / 2;
        const riskAmount = accountBalance * fullConfig.maxRiskPerTrade;
        positionSize = Math.floor(riskAmount / (entryPrice * 100)); // Options are 100 shares
        
        // SAFETY CAPS: Never exceed reasonable position limits
        const maxPositionValue = accountBalance * 0.05; // 5% of account max
        const maxContracts = Math.floor(maxPositionValue / (entryPrice * 100));
        positionSize = Math.min(positionSize, maxContracts);
        
        // Absolute bounds: 1-10 contracts maximum
        positionSize = Math.max(1, Math.min(positionSize, 10));
        
        maxRisk = positionSize * entryPrice * 100;
      }
    }
    
    console.log(`\n🎯 FINAL DECISION:`);
    console.log(`   Action: ${action}`);
    console.log(`   Confidence: ${Math.abs(totalScore).toFixed(2)}`);
    console.log(`   Reasoning: ${reasoning}`);
    
    if (selectedOption) {
      console.log(`   Selected Option: ${selectedOption.side} ${selectedOption.strike}`);
      console.log(`   Entry Price: $${entryPrice.toFixed(2)}`);
      console.log(`   Position Size: ${positionSize} contracts`);
      console.log(`   Max Risk: $${maxRisk.toFixed(2)}`);
    }
    
    return {
      action,
      confidence: Math.abs(finalScore),
      reasoning,
      gexScore,
      avpScore,
      avwapScore,
      fractalScore,
      atrScore,
      totalScore: finalScore,
      entryPrice,
      positionSize,
      maxRisk,
      selectedOption,
      gexAnalysis,
      avpAnalysis,
      avwapAnalysis,
      fractalAnalysis,
      atrAnalysis
    };
  }
  
  private static scoreGEX(gex: GEXSnapshot, currentPrice: number): number {
    if (!gex.volatilityRegime) return 0;
    
    // FIXED: Make GEX scoring truly directional based on flip point
    let score = 0;
    
    // Determine directional bias based on flip point (CORE FIX)
    const isAboveFlip = gex.gammaFlipPoint ? currentPrice > gex.gammaFlipPoint : true;
    
    console.log(`   🎯 GEX Directional: Price $${currentPrice.toFixed(2)} ${isAboveFlip ? 'ABOVE' : 'BELOW'} flip $${gex.gammaFlipPoint?.toFixed(2) || 'N/A'}`);
    
    // Base directional score from positioning and flip point
    if (isAboveFlip) {
      // Above flip point = bullish bias
      switch (gex.volatilityRegime) {
        case 'SUPPRESSING':
          score = 0.8; // Strong bullish when suppressing above flip
          break;
        case 'AMPLIFYING':
          score = 0.6; // Moderate bullish when amplifying above flip
          break;
        case 'TRANSITIONAL':
          score = 0.4; // Weak bullish when transitional above flip
          break;
      }
    } else {
      // Below flip point = bearish bias (CRITICAL FIX)
      switch (gex.volatilityRegime) {
        case 'SUPPRESSING':
          score = -0.8; // Strong BEARISH when suppressing below flip
          break;
        case 'AMPLIFYING':
          score = -0.6; // Moderate BEARISH when amplifying below flip
          break;
        case 'TRANSITIONAL':
          score = -0.4; // Weak BEARISH when transitional below flip
          break;
      }
    }
    
    // Extreme gamma modifier (increases magnitude)
    if (gex.gammaRisk === 'EXTREME') {
      score = score * 1.2; // Amplify the directional signal
    }
    
    const finalScore = Math.max(-1.0, Math.min(1.0, score));
    
    console.log(`   📊 GEX Final: ${finalScore > 0 ? 'BULLISH' : 'BEARISH'} ${finalScore.toFixed(2)}`);
    
    return finalScore;
  }
  
  private static scoreAVP(avp: AVPSnapshot, currentPrice: number): number {
    if (!avp.volumeNodes || avp.volumeNodes.length === 0) {
      // Give small base score if we have volume profile data but no clear nodes
      return avp.valueArea.poc ? 0.1 : 0;
    }
    
    // Find nearest HVN (High Volume Node) for support/resistance
    const hvns = avp.volumeNodes.filter(node => node.classification === 'HVN');
    
    if (hvns.length === 0) {
      // No HVNs found, but check position relative to POC and Value Area
      let score = 0.1; // Base score for having volume profile data
      
      if (avp.valueArea.poc) {
        const pocDistance = Math.abs(avp.valueArea.poc - currentPrice) / currentPrice;
        if (pocDistance < 0.002) score += 0.2; // Near POC
      }
      
      if (avp.valueArea.high && avp.valueArea.low) {
        if (currentPrice >= avp.valueArea.low && currentPrice <= avp.valueArea.high) {
          score += 0.2; // Inside value area
        }
      }
      
      return Math.min(score, 0.4);
    }
    
    const nearestHVN = hvns.reduce((closest, node) => 
      Math.abs(node.priceLevel - currentPrice) < Math.abs(closest.priceLevel - currentPrice) 
        ? node : closest
    );
    
    const distance = Math.abs(nearestHVN.priceLevel - currentPrice);
    const relativeDistance = distance / currentPrice;
    
    // Score based on proximity to HVN (closer = higher score)
    return Math.max(0, 0.8 - relativeDistance * 100);
  }
  
  private static scoreAVWAP(avwap: AVWAPSnapshot, currentPrice: number): number {
    if (!avwap.currentAVWAP) return 0;
    
    // 🎯 ENHANCED 0-DTE AVWAP SCORING - Prioritize POSITION over SLOPE
    const avwapPrice = avwap.currentAVWAP;
    const deviation = ((currentPrice - avwapPrice) / avwapPrice) * 100; // Percentage deviation
    
    console.log(`   📊 AVWAP POSITION: Price $${currentPrice.toFixed(2)} vs AVWAP $${avwapPrice.toFixed(2)} = ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`);
    
    let score = 0;
    
    // Position-based scoring for 0-DTE (more important than slope for intraday)
    if (deviation > 0.3) {
      score = 0.6; // Strong BULLISH - price well above AVWAP
      console.log(`   🜵 AVWAP BULLISH: +${deviation.toFixed(2)}% above AVWAP`);
    } else if (deviation < -0.3) {
      score = -0.6; // Strong BEARISH - price well below AVWAP  
      console.log(`   🔴 AVWAP BEARISH: ${deviation.toFixed(2)}% below AVWAP`);
    } else if (Math.abs(deviation) > 0.1) {
      // Moderate deviation
      score = deviation > 0 ? 0.3 : -0.3;
      console.log(`   🟡 AVWAP MODERATE: ${deviation > 0 ? 'Above' : 'Below'} AVWAP by ${Math.abs(deviation).toFixed(2)}%`);
    } else {
      // Very close to AVWAP
      score = 0.1; // Slight positive for being near institutional level
      console.log(`   ⚪ AVWAP NEUTRAL: Near AVWAP (${deviation.toFixed(2)}%)`);
    }
    
    return score;
  }
  
  private static scoreFractals(fractals: MicrofractalSnapshot): number {
    if (!fractals.confirmedFractals || fractals.confirmedFractals.length === 0) return 0;
    
    // More fractals = more confluence opportunities
    const fractalCount = fractals.confirmedFractals.length;
    const baseScore = Math.min(0.8, fractalCount * 0.1);
    
    // 🚨 CRITICAL FIX: Make fractal score directional based on market structure
    switch (fractals.marketStructure) {
      case 'TRENDING_DOWN':
        console.log(`   🔴 FRACTAL DIRECTIONAL: TRENDING_DOWN → Negative score (-${baseScore.toFixed(2)})`);
        return -baseScore; // Negative for bearish market structure
      case 'TRENDING_UP':
        console.log(`   🟢 FRACTAL DIRECTIONAL: TRENDING_UP → Positive score (+${baseScore.toFixed(2)})`);
        return baseScore;  // Positive for bullish market structure
      case 'RANGE_BOUND':
        console.log(`   ⚪ FRACTAL DIRECTIONAL: RANGE_BOUND → Neutral score (${(baseScore * 0.3).toFixed(2)})`);
        return baseScore * 0.3; // Reduced influence in ranging markets
      case 'BREAKOUT':
        console.log(`   🟡 FRACTAL DIRECTIONAL: BREAKOUT → Moderate score (${(baseScore * 0.6).toFixed(2)})`);
        return baseScore * 0.6; // Moderate influence during breakouts
      default:
        console.log(`   ⚪ FRACTAL DIRECTIONAL: UNKNOWN → Neutral score (${(baseScore * 0.5).toFixed(2)})`);
        return baseScore * 0.5; // Default neutral influence
    }
  }
  
  private static scoreATR(atr: ATRSnapshot): number {
    if (!atr.volatilityRegime) return 0;
    
    // Higher volatility = more options opportunities
    switch (atr.volatilityRegime) {
      case 'EXTREME':
        return 0.8;
      case 'HIGH':
        return 0.6;
      case 'NORMAL':
        return 0.4;
      case 'LOW':
        return 0.2;
      default:
        return 0;
    }
  }
  
  private static determineBullishAction(gex: GEXSnapshot, score: number): DirectSignal['action'] {
    // For extreme gamma situations, prefer selling premium
    if (gex.gammaRisk === 'EXTREME') {
      return 'SELL_PUT'; // Sell puts in extreme gamma (collect premium)
    }
    
    // Otherwise buy calls
    return 'BUY_CALL';
  }
  
  private static determineBearishAction(gex: GEXSnapshot, score: number): DirectSignal['action'] {
    // For extreme gamma situations, prefer selling premium
    if (gex.gammaRisk === 'EXTREME') {
      return 'SELL_CALL'; // Sell calls in extreme gamma
    }
    
    // Otherwise buy puts
    return 'BUY_PUT';
  }
  
  private static selectBestOption(
    optionsChain: OptionsChain[], 
    action: DirectSignal['action'], 
    config: DirectIntegrationConfig
  ): OptionsChain | undefined {
    
    // Filter by action type
    const relevantOptions = optionsChain.filter(option => {
      if (action.includes('CALL')) return option.side === 'CALL';
      if (action.includes('PUT')) return option.side === 'PUT';
      return false;
    });
    
    if (relevantOptions.length === 0) return undefined;
    
    // Filter by delta range
    const deltaFiltered = relevantOptions.filter(option => {
      const absDelta = Math.abs(option.delta || 0);
      return absDelta >= config.deltaRange[0] && absDelta <= config.deltaRange[1];
    });
    
    if (deltaFiltered.length === 0) return relevantOptions[0]; // Fallback
    
    // Select highest volume option (most liquid)
    return deltaFiltered.reduce((best, option) => 
      (option.volume || 0) > (best.volume || 0) ? option : best
    );
  }
}

export default DirectInstitutionalIntegration;