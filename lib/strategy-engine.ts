
import { MarketData, TechnicalIndicators, TradeSignal, Strategy, OptionsChain } from './types';
import { TechnicalAnalysis } from './technical-indicators';

export class StrategyEngine {
  
  static generateSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    strategy: Strategy
  ): TradeSignal | null {
    
    if (marketData.length < 50) { // Need sufficient data
      return null;
    }
    
    const indicators = TechnicalAnalysis.calculateAllIndicators(
      marketData,
      strategy.rsiPeriod,
      strategy.macdFast,
      strategy.macdSlow,
      strategy.macdSignal,
      strategy.bbPeriod,
      strategy.bbStdDev
    );
    
    if (!indicators) return null;
    
    const signals: TradeSignal[] = [];
    
    // RSI-based signals with conservative confidence (targeting 60-65% win rate)
    const rsiOversold = strategy.rsiOversold || 30;
    const rsiOverbought = strategy.rsiOverbought || 70;
    
    if (indicators.rsi < rsiOversold) {
      signals.push({
        action: 'BUY_CALL',
        confidence: Math.min(75, (rsiOversold - indicators.rsi) * 1.5), // More conservative
        reason: `RSI oversold at ${indicators.rsi.toFixed(1)}`,
        indicators,
        timestamp: new Date()
      });
    } else if (indicators.rsi > rsiOverbought) {
      signals.push({
        action: 'BUY_PUT',
        confidence: Math.min(75, (indicators.rsi - rsiOverbought) * 1.5), // More conservative
        reason: `RSI overbought at ${indicators.rsi.toFixed(1)}`,
        indicators,
        timestamp: new Date()
      });
    }
    
    // MACD-based signals (more conservative confirmation required)
    if (indicators.macdHistogram > 0.01 && indicators.macd > indicators.macdSignal) { // Stronger threshold
      signals.push({
        action: 'BUY_CALL',
        confidence: Math.min(70, Math.abs(indicators.macdHistogram) * 80), // More conservative
        reason: `MACD bullish crossover`,
        indicators,
        timestamp: new Date()
      });
    } else if (indicators.macdHistogram < -0.01 && indicators.macd < indicators.macdSignal) { // Stronger threshold
      signals.push({
        action: 'BUY_PUT',
        confidence: Math.min(70, Math.abs(indicators.macdHistogram) * 80), // More conservative
        reason: `MACD bearish crossover`,
        indicators,
        timestamp: new Date()
      });
    }
    
    // Bollinger Bands signals (requiring stronger deviations)
    const currentPrice = marketData[marketData.length - 1].close;
    const bbDistance = Math.abs(indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    
    if (currentPrice < indicators.bbLower && bbDistance > 0.04) { // Only trade on significant BB expansion
      signals.push({
        action: 'BUY_CALL',
        confidence: Math.min(65, ((indicators.bbLower - currentPrice) / currentPrice) * 800), // More conservative
        reason: `Price below BB lower band`,
        indicators,
        timestamp: new Date()
      });
    } else if (currentPrice > indicators.bbUpper && bbDistance > 0.04) { // Only trade on significant BB expansion
      signals.push({
        action: 'BUY_PUT',
        confidence: Math.min(65, ((currentPrice - indicators.bbUpper) / currentPrice) * 800), // More conservative
        reason: `Price above BB upper band`,
        indicators,
        timestamp: new Date()
      });
    }
    
    // Combine signals and return strongest
    if (signals.length === 0) {
      return {
        action: 'HOLD',
        confidence: 50,
        reason: 'No clear signals detected',
        indicators,
        timestamp: new Date()
      };
    }
    
    // Find signals in same direction and combine confidence
    const callSignals = signals.filter(s => s.action === 'BUY_CALL');
    const putSignals = signals.filter(s => s.action === 'BUY_PUT');
    
    // Require multiple confirming signals for higher confidence (targeting 60-65% win rate)
    if (callSignals.length > putSignals.length) {
      const avgConfidence = callSignals.reduce((sum, s) => sum + s.confidence, 0) / callSignals.length;
      const combinedReason = callSignals.map(s => s.reason).join(' + ');
      
      // More conservative confidence calculation
      const confluenceBonus = callSignals.length >= 2 ? 0.05 : 0; // Small bonus for multiple signals
      const finalConfidence = Math.min(80, avgConfidence * (1 + confluenceBonus)); // Cap at 80%
      
      return {
        action: 'BUY_CALL',
        confidence: finalConfidence,
        reason: combinedReason,
        indicators,
        timestamp: new Date()
      };
    } else if (putSignals.length > callSignals.length) {
      const avgConfidence = putSignals.reduce((sum, s) => sum + s.confidence, 0) / putSignals.length;
      const combinedReason = putSignals.map(s => s.reason).join(' + ');
      
      // More conservative confidence calculation
      const confluenceBonus = putSignals.length >= 2 ? 0.05 : 0; // Small bonus for multiple signals
      const finalConfidence = Math.min(80, avgConfidence * (1 + confluenceBonus)); // Cap at 80%
      
      return {
        action: 'BUY_PUT',
        confidence: finalConfidence,
        reason: combinedReason,
        indicators,
        timestamp: new Date()
      };
    }
    
    // Conflicting signals - hold
    return {
      action: 'HOLD',
      confidence: 30,
      reason: 'Conflicting signals detected',
      indicators,
      timestamp: new Date()
    };
  }
  
  static findBestOption(
    optionsChain: OptionsChain[],
    signal: TradeSignal,
    strategy: Strategy,
    currentPrice: number
  ): OptionsChain | null {
    
    const side = signal.action === 'BUY_CALL' ? 'CALL' : 'PUT';
    const candidates = optionsChain.filter(option => 
      option.side === side &&
      Math.abs(option.delta || 0) >= strategy.deltaRange &&
      Math.abs(option.delta || 0) <= 0.7 // Not too deep ITM
    );
    
    if (candidates.length === 0) return null;
    
    // Sort by delta proximity to target range
    candidates.sort((a, b) => {
      const aDeltaDiff = Math.abs((a.delta || 0) - strategy.deltaRange);
      const bDeltaDiff = Math.abs((b.delta || 0) - strategy.deltaRange);
      return aDeltaDiff - bDeltaDiff;
    });
    
    return candidates[0];
  }
  
  static calculatePositionSize(
    accountBalance: number,
    optionPrice: number,
    strategy: Strategy,
    confidence?: number
  ): number {
    
    // Enhanced Kelly Criterion-inspired position sizing
    const basePositionPercent = strategy.positionSizePercent;
    
    // Confidence adjustment (0-100 scale to 0.5-1.5 multiplier)
    const confidenceMultiplier = confidence ? 
      0.5 + (confidence / 100) : 1.0;
    
    // Conservative Kelly fraction (reduce risk)
    const kellyFraction = basePositionPercent * confidenceMultiplier * 0.75; // 75% of full Kelly
    
    const maxPositionValue = accountBalance * Math.min(kellyFraction, basePositionPercent);
    const contractValue = optionPrice * 100; // Options are 100 shares
    const maxContracts = Math.floor(maxPositionValue / contractValue);
    
    return Math.max(1, maxContracts);
  }
  
  static shouldExit(
    currentPrice: number,
    entryPrice: number,
    strategy: Strategy,
    indicators: TechnicalIndicators,
    side: 'CALL' | 'PUT'
  ): { shouldExit: boolean; reason?: string } {
    
    const pnlPercent = (currentPrice - entryPrice) / entryPrice;
    
    // Stop loss check
    if (pnlPercent <= -strategy.stopLossPercent) {
      return { shouldExit: true, reason: 'STOP_LOSS' };
    }
    
    // Take profit check
    if (pnlPercent >= strategy.takeProfitPercent) {
      return { shouldExit: true, reason: 'TAKE_PROFIT' };
    }
    
    // Signal-based exit with fallback defaults
    const isCallPosition = side === 'CALL';
    const rsiOverbought = strategy.rsiOverbought || 70;
    const rsiOversold = strategy.rsiOversold || 30;
    
    const rsiExit = isCallPosition ? 
      indicators.rsi > rsiOverbought : 
      indicators.rsi < rsiOversold;
      
    const macdExit = isCallPosition ?
      indicators.macdHistogram < -0.01 : // More conservative exit threshold
      indicators.macdHistogram > 0.01;  // More conservative exit threshold
    
    if (rsiExit && macdExit) {
      return { shouldExit: true, reason: 'SIGNAL_EXIT' };
    }
    
    return { shouldExit: false };
  }
}
