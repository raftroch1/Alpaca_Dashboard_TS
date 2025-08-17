import { MarketData, TechnicalIndicators, TradeSignal, OptionsChain } from './types';
import { MarketRegimeDetector, MarketRegime } from './market-regime-detector';
import { BullPutSpreadStrategy } from './bull-put-spread-strategy';
import { BearCallSpreadStrategy } from './bear-call-spread-strategy';
import { IronCondorStrategy } from './iron-condor-strategy';
import { TechnicalAnalysis } from './technical-indicators';

export interface StrategySelection {
  selectedStrategy: 'BUY_CALL' | 'BUY_PUT' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR' | 'NO_TRADE';
  marketRegime: MarketRegime;
  signal: TradeSignal | null;
  reasoning: string[];
}

export class AdaptiveStrategySelector {
  
  /**
   * Check volatility conditions for options trading
   */
  private static checkVolatilityConditions(
    optionsChain: OptionsChain[], 
    vixLevel?: number
  ): { acceptable: boolean; reason: string } {
    
    if (optionsChain.length === 0) {
      return { acceptable: false, reason: 'No options data available' };
    }
    
    // Calculate average implied volatility across chain
    const validOptions = optionsChain.filter(opt => opt.impliedVolatility && opt.impliedVolatility > 0);
    if (validOptions.length === 0) {
      return { acceptable: false, reason: 'No valid IV data' };
    }
    
    const avgIV = validOptions.reduce((sum, opt) => sum + (opt.impliedVolatility || 0), 0) / validOptions.length;
    
    // Professional volatility filters for 0-DTE trading
    
    // 1. Extreme volatility conditions (avoid trading)
    if (vixLevel && vixLevel > 35) {
      return { acceptable: false, reason: `VIX too high: ${vixLevel.toFixed(1)} (>35)` };
    }
    
    if (avgIV > 0.6) { // 60% IV is extreme
      return { acceptable: false, reason: `IV too high: ${(avgIV * 100).toFixed(1)}% (>60%)` };
    }
    
    // 2. Very low volatility (options too cheap, insufficient premium)
    if (avgIV < 0.08) { // 8% IV is very low
      return { acceptable: false, reason: `IV too low: ${(avgIV * 100).toFixed(1)}% (<8%)` };
    }
    
    // 3. VIX/IV divergence check
    if (vixLevel && Math.abs(vixLevel / 100 - avgIV) > 0.15) { // 15% divergence
      return { acceptable: false, reason: `VIX/IV divergence: VIX ${vixLevel.toFixed(1)}, IV ${(avgIV * 100).toFixed(1)}%` };
    }
    
    // 4. Acceptable volatility range
    const volDescription = avgIV < 0.15 ? 'Low' : avgIV < 0.25 ? 'Normal' : avgIV < 0.4 ? 'Elevated' : 'High';
    return { 
      acceptable: true, 
      reason: `${volDescription} IV ${(avgIV * 100).toFixed(1)}%${vixLevel ? `, VIX ${vixLevel.toFixed(1)}` : ''}` 
    };
  }
  
  /**
   * Check liquidity conditions for options trading
   */
  private static checkLiquidityConditions(
    optionsChain: OptionsChain[], 
    currentPrice: number
  ): { acceptable: boolean; reason: string } {
    
    if (optionsChain.length < 10) {
      return { acceptable: false, reason: `Insufficient options: ${optionsChain.length} contracts (<10)` };
    }
    
    // Focus on near-the-money options (most liquid)
    const ntmOptions = optionsChain.filter(opt => 
      Math.abs(opt.strike - currentPrice) <= currentPrice * 0.1 // Within 10% of current price
    );
    
    if (ntmOptions.length < 4) {
      return { acceptable: false, reason: `Insufficient NTM options: ${ntmOptions.length} contracts (<4)` };
    }
    
    // Professional liquidity filters
    
    // 1. Bid-ask spread analysis
    const spreadAnalysis = ntmOptions.map(opt => {
      const spread = opt.ask - opt.bid;
      const midPrice = (opt.ask + opt.bid) / 2;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 100;
      return { option: opt, spread, spreadPercent };
    });
    
    const avgSpreadPercent = spreadAnalysis.reduce((sum, item) => sum + item.spreadPercent, 0) / spreadAnalysis.length;
    
    // Reject if spreads too wide (poor liquidity)
    if (avgSpreadPercent > 25) { // 25% average spread is too wide
      return { acceptable: false, reason: `Wide spreads: ${avgSpreadPercent.toFixed(1)}% avg (>25%)` };
    }
    
    // 2. Minimum bid/ask requirements
    const poorPricing = ntmOptions.filter(opt => opt.bid < 0.05 || opt.ask > 50);
    if (poorPricing.length > ntmOptions.length * 0.3) { // More than 30% have poor pricing
      return { acceptable: false, reason: `Poor pricing on ${poorPricing.length}/${ntmOptions.length} NTM options` };
    }
    
    // 3. Volume and open interest (if available)
    const volumeData = ntmOptions.filter(opt => opt.volume !== undefined && opt.openInterest !== undefined);
    if (volumeData.length > 0) {
      const avgVolume = volumeData.reduce((sum, opt) => sum + (opt.volume || 0), 0) / volumeData.length;
      const avgOI = volumeData.reduce((sum, opt) => sum + (opt.openInterest || 0), 0) / volumeData.length;
      
      if (avgVolume < 10 && avgOI < 100) {
        return { acceptable: false, reason: `Low liquidity: Vol ${avgVolume.toFixed(0)}, OI ${avgOI.toFixed(0)}` };
      }
    }
    
    // 4. Delta distribution check (ensure reasonable option coverage)
    const deltaOptions = ntmOptions.filter(opt => opt.delta !== undefined);
    if (deltaOptions.length >= 4) {
      const deltas = deltaOptions.map(opt => Math.abs(opt.delta || 0));
      const deltaRange = Math.max(...deltas) - Math.min(...deltas);
      
      if (deltaRange < 0.3) { // Too narrow delta range
        return { acceptable: false, reason: `Narrow delta range: ${deltaRange.toFixed(2)} (<0.3)` };
      }
    }
    
    // All checks passed
    const liquidityQuality = avgSpreadPercent < 10 ? 'Excellent' : 
                            avgSpreadPercent < 15 ? 'Good' : 
                            avgSpreadPercent < 20 ? 'Fair' : 'Poor';
                            
    return { 
      acceptable: true, 
      reason: `${liquidityQuality} liquidity: ${ntmOptions.length} NTM options, ${avgSpreadPercent.toFixed(1)}% avg spread` 
    };
  }
  
  static generateAdaptiveSignal(
    marketData: MarketData[], 
    optionsChain: OptionsChain[], 
    strategy: any, // Strategy object needed for parameters
    vixLevel?: number
  ): StrategySelection {
    
    const currentPrice = marketData[marketData.length - 1].close;
    
    console.log(`🎯 ADAPTIVE STRATEGY - Analyzing market for strategy selection...`);
    console.log(`📊 Data: ${marketData.length} bars, ${optionsChain.length} options, SPY: $${currentPrice.toFixed(2)}`);
    
    // 1. DETECT MARKET REGIME
    const marketRegime = MarketRegimeDetector.detectRegime(marketData, optionsChain, vixLevel);
    
    console.log(`🌍 REGIME DETECTED: ${marketRegime.regime} (${marketRegime.confidence}% confidence)`);
    
    const reasoning: string[] = [
      `Market regime: ${marketRegime.regime} (${marketRegime.confidence}% confidence)`,
      ...marketRegime.reasoning
    ];
    
    // 2. STRATEGY SELECTION BASED ON REGIME
    let selectedStrategy: 'BUY_CALL' | 'BUY_PUT' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR' | 'NO_TRADE';
    let signal: TradeSignal | null = null;
    
    // Minimum confidence threshold
    if (marketRegime.confidence < 40) {
      reasoning.push('Regime confidence too low - NO TRADE');
      return {
        selectedStrategy: 'NO_TRADE',
        marketRegime,
        signal: null,
        reasoning
      };
    }
    
    // ENHANCED: Volatility and Liquidity Filters
    const volatilityFilters = this.checkVolatilityConditions(optionsChain, vixLevel);
    const liquidityFilters = this.checkLiquidityConditions(optionsChain, currentPrice);
    
    if (!volatilityFilters.acceptable) {
      reasoning.push(`Volatility filter failed: ${volatilityFilters.reason}`);
      return {
        selectedStrategy: 'NO_TRADE',
        marketRegime,
        signal: null,
        reasoning
      };
    }
    
    if (!liquidityFilters.acceptable) {
      reasoning.push(`Liquidity filter failed: ${liquidityFilters.reason}`);
      return {
        selectedStrategy: 'NO_TRADE',
        marketRegime,
        signal: null,
        reasoning
      };
    }
    
    reasoning.push(`✅ Volatility: ${volatilityFilters.reason}`);
    reasoning.push(`✅ Liquidity: ${liquidityFilters.reason}`);
    
    // 🚀 NAKED OPTIONS IMPLEMENTATION (as requested by user)
    // Use simple naked calls/puts instead of complex spreads
    
    // Calculate technical indicators for naked option signals
    const indicators = TechnicalAnalysis.calculateAllIndicators(
      marketData,
      strategy.rsiPeriod || 14,
      strategy.macdFast || 12,
      strategy.macdSlow || 26,
      strategy.macdSignal || 9,
      strategy.bbPeriod || 20,
      strategy.bbStdDev || 2
    );
    
    if (!indicators) {
      selectedStrategy = 'NO_TRADE';
      reasoning.push('Technical indicators calculation failed');
      signal = null;
    } else {
      switch (marketRegime.regime) {
        case 'BULLISH':
          selectedStrategy = 'BUY_CALL';
          reasoning.push('BULLISH regime → Buy Call (naked option)');
          signal = this.generateNakedCallSignal(indicators, marketData, strategy);
          break;
          
        case 'BEARISH':
          selectedStrategy = 'BUY_PUT';
          reasoning.push('BEARISH regime → Buy Put (naked option)');
          signal = this.generateNakedPutSignal(indicators, marketData, strategy);
          break;
          
        case 'NEUTRAL':
          // In neutral markets, look for RSI extremes
          if (indicators.rsi < (strategy.rsiOversold || 30)) {
            selectedStrategy = 'BUY_CALL';
            reasoning.push('NEUTRAL regime + RSI oversold → Buy Call');
            signal = this.generateNakedCallSignal(indicators, marketData, strategy);
          } else if (indicators.rsi > (strategy.rsiOverbought || 70)) {
            selectedStrategy = 'BUY_PUT';
            reasoning.push('NEUTRAL regime + RSI overbought → Buy Put');
            signal = this.generateNakedPutSignal(indicators, marketData, strategy);
          } else {
            selectedStrategy = 'NO_TRADE';
            reasoning.push('NEUTRAL regime - no RSI extreme');
            signal = null;
          }
          break;
          
        default:
          selectedStrategy = 'NO_TRADE';
          reasoning.push('Unknown regime - NO TRADE');
          signal = null;
          break;
      }
    }
    
    console.log(`🎯 STRATEGY SELECTED: ${selectedStrategy}`);
    if (signal) {
      console.log(`✅ SIGNAL GENERATED: ${signal.action} with ${signal.confidence}% confidence`);
    } else {
      console.log(`❌ NO SIGNAL: Strategy not implemented or conditions not met`);
    }
    
    return {
      selectedStrategy,
      marketRegime,
      signal,
      reasoning
    };
  }
  
  /**
   * Generate naked call signal (bullish)
   */
  private static generateNakedCallSignal(
    indicators: any,
    marketData: MarketData[],
    strategy: any
  ): TradeSignal | null {
    
    const currentPrice = marketData[marketData.length - 1].close;
    let confidence = 50;
    let reason = 'Naked Call: ';
    
    // RSI oversold boost
    if (indicators.rsi < 30) {
      confidence += 15;
      reason += `RSI oversold (${indicators.rsi.toFixed(1)}), `;
    }
    
    // MACD bullish
    if (indicators.macd > indicators.macdSignal) {
      confidence += 10;
      reason += 'MACD bullish, ';
    }
    
    // Price below BB lower band (oversold)
    if (currentPrice < indicators.bbLower) {
      confidence += 10;
      reason += 'Price below BB lower, ';
    }
    
    // Volume confirmation (if available)
    const currentVolume = Number(marketData[marketData.length - 1].volume || 0);
    const avgVolume = marketData.slice(-20).reduce((sum, bar) => sum + Number(bar.volume || 0), 0) / 20;
    if (currentVolume > avgVolume * 1.2) {
      confidence += 5;
      reason += 'High volume, ';
    }
    
    reason = reason.slice(0, -2); // Remove trailing comma
    
    return {
      action: 'BUY_CALL',
      confidence: Math.min(85, confidence),
      reason,
      indicators,
      timestamp: new Date()
    };
  }
  
  /**
   * Generate naked put signal (bearish)
   */
  private static generateNakedPutSignal(
    indicators: any,
    marketData: MarketData[],
    strategy: any
  ): TradeSignal | null {
    
    const currentPrice = marketData[marketData.length - 1].close;
    let confidence = 50;
    let reason = 'Naked Put: ';
    
    // RSI overbought boost
    if (indicators.rsi > 70) {
      confidence += 15;
      reason += `RSI overbought (${indicators.rsi.toFixed(1)}), `;
    }
    
    // MACD bearish
    if (indicators.macd < indicators.macdSignal) {
      confidence += 10;
      reason += 'MACD bearish, ';
    }
    
    // Price above BB upper band (overbought)
    if (currentPrice > indicators.bbUpper) {
      confidence += 10;
      reason += 'Price above BB upper, ';
    }
    
    // Volume confirmation (if available)
    const currentVolume = Number(marketData[marketData.length - 1].volume || 0);
    const avgVolume = marketData.slice(-20).reduce((sum, bar) => sum + Number(bar.volume || 0), 0) / 20;
    if (currentVolume > avgVolume * 1.2) {
      confidence += 5;
      reason += 'High volume, ';
    }
    
    reason = reason.slice(0, -2); // Remove trailing comma
    
    return {
      action: 'BUY_PUT',
      confidence: Math.min(85, confidence),
      reason,
      indicators,
      timestamp: new Date()
    };
  }
}