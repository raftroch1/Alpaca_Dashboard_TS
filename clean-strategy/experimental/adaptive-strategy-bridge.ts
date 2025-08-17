/**
 * ADAPTIVE STRATEGY BRIDGE
 * 
 * This bridges the advanced indicator framework with the existing lib/adaptive-strategy-selector.ts
 * It enhances signal generation while maintaining full compatibility with lib/backtest-engine.ts
 */

import { MarketData, OptionsChain, Strategy, TradeSignal } from '../lib/types';
import { AdaptiveStrategySelector as BaseSelector } from '../lib/adaptive-strategy-selector';
import { CoherentStrategyFramework } from './coherent-strategy-framework';
import { GammaExposureEngine } from './gamma-exposure-engine';
import { AnchoredVolumeProfile } from './anchored-volume-profile';
import { AnchoredVWAP } from './anchored-vwap';
import { MicrofractalFibonacci } from './microfractal-fibonacci';
import { EnhancedATRRiskManager } from './enhanced-atr-risk-mgmt';

export class EnhancedAdaptiveStrategySelector {
  
  /**
   * Enhanced signal generation that combines:
   * 1. Original lib/adaptive-strategy-selector.ts logic (for compatibility)
   * 2. Advanced multi-indicator framework (GEX, AVP, AVWAP, Microfractal, ATR)
   * 
   * This ensures full compatibility with lib/backtest-engine.ts while adding sophistication
   */
  static async generateEnhancedAdaptiveSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    strategy: Strategy,
    vixLevel?: number
  ): Promise<{
    selectedStrategy: 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR' | 'NO_TRADE';
    signal: TradeSignal | null;
    confidence: number;
    reasoning: string[];
    advancedAnalysis: {
      gex: any;
      avp: any;
      avwap: any;
      microfractal: any;
      atr: any;
    };
  }> {
    
    console.log('🧠 ENHANCED ADAPTIVE STRATEGY - Multi-Indicator Analysis');
    
    const currentPrice = marketData[marketData.length - 1].close;
    const reasoning: string[] = [];
    let enhancedConfidence = 0;
    
    try {
      // 1. RUN ORIGINAL lib/adaptive-strategy-selector.ts (for base compatibility)
      const baseSelection = BaseSelector.generateAdaptiveSignal(
        marketData, 
        optionsChain, 
        strategy, 
        vixLevel
      );
      
      reasoning.push(`Base strategy: ${baseSelection.selectedStrategy} (${baseSelection.marketRegime.confidence}% confidence)`);
      
      // If base selector says NO_TRADE, we respect that (conservative approach)
      if (baseSelection.selectedStrategy === 'NO_TRADE') {
        return {
          selectedStrategy: 'NO_TRADE',
          signal: null,
          confidence: 0,
          reasoning: [...reasoning, 'Base selector rejected trade'],
          advancedAnalysis: {
            gex: null,
            avp: null, 
            avwap: null,
            microfractal: null,
            atr: null
          }
        };
      }
      
      // 2. RUN ADVANCED INDICATOR ANALYSIS
      console.log('📊 Running advanced indicator analysis...');
      
      // GEX Analysis
      const gexAnalysis = GammaExposureEngine.calculateGEX(
        optionsChain,
        currentPrice,
        { 
          spotPrice: currentPrice,
          riskFreeRate: 0.05,
          excludeExpirationsBeforeDays: 0,
          includeExpirationsAfterDays: 1
        }
      );
      
      // AVP Analysis  
      const sessionStart = new Date(marketData[marketData.length - 1].date);
      sessionStart.setHours(9, 30, 0, 0); // Market open
      
      const avpAnalysis = AnchoredVolumeProfile.calculateAVP(
        marketData.slice(-100), // Last 100 bars
        sessionStart,
        {
          bucketSize: 0.50,
          valueAreaPercentage: 70,
          sessionType: 'RTH'
        }
      );
      
      // AVWAP Analysis
      const avwapAnalysis = AnchoredVWAP.calculateAVWAP(
        marketData.slice(-100),
        sessionStart,
        {
          volumeWeighted: true,
          calculateDeviationBands: true,
          standardDeviations: [1, 2]
        }
      );
      
      // Microfractal Analysis
      const microfractalAnalysis = MicrofractalFibonacci.analyze(
        marketData.slice(-50), // Last 50 bars for fractals
        {
          fractalPeriod: 5,
          fibonacciLevels: [0.236, 0.382, 0.5, 0.618, 0.786],
          lookbackPeriod: 20,
          confidenceThreshold: 0.6
        }
      );
      
      // Enhanced ATR Analysis
      const atrAnalysis = EnhancedATRRiskManager.analyzeATR(
        marketData.slice(-20), // Last 20 bars for ATR
        25000, // $25K account
        1.2    // 1.2% risk per trade
      );
      
      // 3. SYNTHESIZE ADVANCED SIGNALS
      let advancedSignalStrength = 0;
      let confluenceFactors = 0;
      
      // GEX Confluence
      if (gexAnalysis.gammaRisk === 'LOW' || gexAnalysis.gammaRisk === 'MEDIUM') {
        advancedSignalStrength += 0.15;
        confluenceFactors += 1;
        reasoning.push(`✅ GEX: ${gexAnalysis.gammaRisk} gamma risk environment`);
      } else {
        reasoning.push(`⚠️ GEX: ${gexAnalysis.gammaRisk} gamma risk - caution advised`);
      }
      
      // AVP Confluence
      if (avpAnalysis.pricePosition === 'AT_POC' || avpAnalysis.pricePosition === 'IN_VA') {
        advancedSignalStrength += 0.2;
        confluenceFactors += 1;
        reasoning.push(`✅ AVP: Price at POC/Value Area - good liquidity`);
      } else {
        reasoning.push(`⚠️ AVP: Price ${avpAnalysis.pricePosition} - lower liquidity zone`);
      }
      
      // AVWAP Confluence  
      if (avwapAnalysis.signalQuality === 'HIGH' || avwapAnalysis.signalQuality === 'MEDIUM') {
        advancedSignalStrength += 0.2;
        confluenceFactors += 1;
        reasoning.push(`✅ AVWAP: ${avwapAnalysis.trendDirection} trend (${avwapAnalysis.signalQuality} quality)`);
      } else {
        reasoning.push(`⚠️ AVWAP: ${avwapAnalysis.signalQuality} signal quality`);
      }
      
      // Microfractal Confluence
      if (microfractalAnalysis.immediateSignals >= 2) {
        advancedSignalStrength += 0.25;
        confluenceFactors += 1;
        reasoning.push(`✅ Microfractal: ${microfractalAnalysis.immediateSignals} high-probability setups`);
      } else {
        reasoning.push(`⚠️ Microfractal: Only ${microfractalAnalysis.immediateSignals} immediate signals`);
      }
      
      // ATR Confluence
      if (atrAnalysis.volatilityRegime !== 'EXTREME' && atrAnalysis.warnings.length <= 1) {
        advancedSignalStrength += 0.2;
        confluenceFactors += 1;
        reasoning.push(`✅ ATR: ${atrAnalysis.volatilityRegime} volatility regime`);
      } else {
        reasoning.push(`⚠️ ATR: ${atrAnalysis.volatilityRegime} volatility with ${atrAnalysis.warnings.length} warnings`);
      }
      
      // 4. FINAL SIGNAL SYNTHESIS
      const baseConfidence = baseSelection.signal?.confidence || 0;
      enhancedConfidence = Math.min(100, (baseConfidence * 0.5) + (advancedSignalStrength * 100 * 0.5));
      
      reasoning.push(`Advanced confluence: ${confluenceFactors}/5 factors aligned`);
      reasoning.push(`Final confidence: ${enhancedConfidence.toFixed(1)}% (base: ${baseConfidence.toFixed(1)}%, advanced: ${(advancedSignalStrength * 100).toFixed(1)}%)`);
      
      // Enhanced signal if confidence is sufficient
      let enhancedSignal: TradeSignal | null = null;
      
      if (enhancedConfidence >= 60 && confluenceFactors >= 3) {
        enhancedSignal = {
          action: baseSelection.signal?.action || 'HOLD',
          confidence: enhancedConfidence / 100,
          reason: `Enhanced multi-indicator signal: ${confluenceFactors}/5 confluence`,
          indicators: baseSelection.signal?.indicators || {
            rsi: 50, macd: 0, macdSignal: 0, macdHistogram: 0,
            bbUpper: currentPrice * 1.02, bbMiddle: currentPrice, bbLower: currentPrice * 0.98
          },
          timestamp: new Date(),
          spread: baseSelection.signal?.spread
        };
      }
      
      console.log(`🎯 Enhanced signal: ${enhancedConfidence.toFixed(1)}% confidence with ${confluenceFactors}/5 confluence`);
      
      return {
        selectedStrategy: enhancedConfidence >= 60 ? baseSelection.selectedStrategy : 'NO_TRADE',
        signal: enhancedSignal,
        confidence: enhancedConfidence,
        reasoning,
        advancedAnalysis: {
          gex: gexAnalysis,
          avp: avpAnalysis,
          avwap: avwapAnalysis,
          microfractal: microfractalAnalysis,
          atr: atrAnalysis
        }
      };
      
    } catch (error: any) {
      console.error('⚠️ Enhanced analysis failed, falling back to base selector:', error.message);
      
      // Graceful fallback to base selector
      const baseSelection = BaseSelector.generateAdaptiveSignal(marketData, optionsChain, strategy, vixLevel);
      
      return {
        selectedStrategy: baseSelection.selectedStrategy,
        signal: baseSelection.signal,
        confidence: baseSelection.signal?.confidence || 0,
        reasoning: [...reasoning, `Fallback to base selector due to error: ${error.message}`],
        advancedAnalysis: {
          gex: null,
          avp: null,
          avwap: null, 
          microfractal: null,
          atr: null
        }
      };
    }
  }
  
  /**
   * Backward compatibility wrapper - maintains the exact same interface as lib/adaptive-strategy-selector.ts
   * This allows the enhanced selector to be used as a drop-in replacement
   */
  static generateAdaptiveSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[], 
    strategy: any,
    vixLevel?: number
  ) {
    // For synchronous compatibility, we use the base selector directly
    // The enhanced version is available via generateEnhancedAdaptiveSignal()
    return BaseSelector.generateAdaptiveSignal(marketData, optionsChain, strategy, vixLevel);
  }
}

export default EnhancedAdaptiveStrategySelector;