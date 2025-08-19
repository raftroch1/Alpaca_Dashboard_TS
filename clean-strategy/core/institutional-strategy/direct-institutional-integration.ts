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
    config: Partial<DirectIntegrationConfig> = {}
  ): Promise<DirectSignal> {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // FORCE GEX DISABLED to fix bullish bias (override any dashboard settings)
    fullConfig.gexWeight = 0.0;
    fullConfig.avwapWeight = 0.40; // Increase AVWAP for trend following
    fullConfig.avpWeight = 0.25;   // Increase AVP
    fullConfig.fractalWeight = 0.25; // Increase fractals
    
    console.log(`🚫 GEX FORCE DISABLED - Using trend-following weights: AVWAP(0.40), AVP(0.25), Fractals(0.25)`);
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
      
      // FORCE GEX DISABLED regardless of config
      if (fullConfig.gexWeight === 0) {
        gexScore = 0;
        console.log(`   📊 GEX Score: 0.00 (DISABLED - was causing bullish bias)`);
      } else {
        gexScore = this.scoreGEX(gexAnalysis, currentPrice);
        console.log(`   📊 GEX Score: ${gexScore.toFixed(2)} (${gexAnalysis.volatilityRegime}, ${gexAnalysis.gammaRisk})`);
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
    
    // Calculate weighted total score (FORCE GEX TO 0)
    const totalScore = (
      0 * fullConfig.gexWeight +  // FORCE GEX TO 0 regardless of weight
      avpScore * fullConfig.avpWeight +
      avwapScore * fullConfig.avwapWeight +
      fractalScore * fullConfig.fractalWeight +
      atrScore * fullConfig.atrWeight
    );
    
    console.log(`🚫 FORCED GEX TO 0 - Calculation: AVP(${avpScore.toFixed(2)}×${fullConfig.avpWeight}) + AVWAP(${avwapScore.toFixed(2)}×${fullConfig.avwapWeight}) + Fractals(${fractalScore.toFixed(2)}×${fullConfig.fractalWeight}) + ATR(${atrScore.toFixed(2)}×${fullConfig.atrWeight}) = ${totalScore.toFixed(2)}`);
    
    console.log(`\n📊 SCORING RESULTS:`);
    console.log(`   GEX: 0.00 (DISABLED - was causing bullish bias)`);
    console.log(`   AVP: ${avpScore.toFixed(2)} (weight: ${fullConfig.avpWeight})`);
    console.log(`   AVWAP: ${avwapScore.toFixed(2)} (weight: ${fullConfig.avwapWeight})`);
    console.log(`   Fractals: ${fractalScore.toFixed(2)} (weight: ${fullConfig.fractalWeight})`);
    console.log(`   ATR: ${atrScore.toFixed(2)} (weight: ${fullConfig.atrWeight})`);
    console.log(`   TOTAL: ${totalScore.toFixed(2)}`);
    
    // Determine action based on score
    let action: DirectSignal['action'] = 'NO_TRADE';
    let reasoning = 'Insufficient confluence for trade';
    
    if (totalScore >= fullConfig.minimumBullishScore) {
      action = this.determineBullishAction(gexAnalysis, totalScore);
      reasoning = `Bullish confluence detected (score: ${totalScore.toFixed(2)})`;
    } else if (totalScore <= -fullConfig.minimumBearishScore) {
      action = this.determineBearishAction(gexAnalysis, totalScore);
      reasoning = `Bearish confluence detected (score: ${Math.abs(totalScore).toFixed(2)})`;
    }
    
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
      confidence: Math.abs(totalScore),
      reasoning,
      gexScore,
      avpScore,
      avwapScore,
      fractalScore,
      atrScore,
      totalScore,
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
    if (!avwap.trendDirection) return 0;
    
    let score = 0;
    
    // More sensitive trend direction scoring
    const trendStr = avwap.trendDirection.toString();
    if (trendStr.includes('BULLISH')) {
      score = 0.6;
    } else if (trendStr.includes('BEARISH')) {
      score = -0.6;
    } else if (trendStr.includes('NEUTRAL')) {
      // Give some credit for neutral positioning near VWAP
      if (trendStr.includes('WEAK')) {
        score = 0.2; // Small positive score for weak neutral (potential breakout)
      } else {
        score = 0.1; // Minimal score for pure neutral
      }
    }
    
    return score;
  }
  
  private static scoreFractals(fractals: MicrofractalSnapshot): number {
    if (!fractals.confirmedFractals || fractals.confirmedFractals.length === 0) return 0;
    
    // More fractals = more confluence opportunities
    const fractalCount = fractals.confirmedFractals.length;
    return Math.min(0.8, fractalCount * 0.1);
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