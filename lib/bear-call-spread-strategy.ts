import { MarketData, TechnicalIndicators, TradeSignal, Strategy, OptionsChain, BearCallSpread } from './types';
import { TechnicalAnalysis } from './technical-indicators';

export class BearCallSpreadStrategy {
  
  static generateSpreadSignal(
    marketData: MarketData[],
    optionsChain: OptionsChain[],
    strategy: Strategy
  ): TradeSignal | null {
    
    if (marketData.length < 50) {
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

    const currentPrice = marketData[marketData.length - 1].close;

    // Professional Bear Call Spread Entry Conditions:
    // 1. Market showing bearish momentum (RSI < 75)
    // 2. Not oversold (RSI > 20) - avoid bounce potential
    // 3. Suitable options chain available
    
    const isTradeableMarket = indicators.rsi < 75 && indicators.rsi > 20;
    const volatilityOk = this.isVolatilityFavorable(indicators);
    const hasOptionsData = optionsChain.length > 10;
    
    console.log(`🐻 BEAR CALL STRATEGY - RSI: ${indicators.rsi.toFixed(1)}, Options: ${optionsChain.length}, Tradeable: ${isTradeableMarket}, VolOk: ${volatilityOk}`);
    
    const marketConditionOk = isTradeableMarket && hasOptionsData;
    
    // Check for bearish signals
    const bearishSignals = this.getBearishSignalCount(indicators, marketData);
    const baseConfidence = 45 + (bearishSignals * 8); // 45-77% base confidence
    
    console.log(`🐻 BEAR CALL DEBUG - Market OK: ${marketConditionOk}, Bearish Signals: ${bearishSignals}/4, Base Confidence: ${baseConfidence}%`);
    
    if (marketConditionOk) {
      const bestSpread = this.findBestBearCallSpread(optionsChain, currentPrice, indicators);
      
      if (bestSpread) {
        console.log(`🐻 BEAR CALL DEBUG - Best Spread Found: YES`);
        console.log(`🐻 BEAR CALL DEBUG - Spread PoP: ${(bestSpread.probability * 100).toFixed(1)}%, Credit: $${bestSpread.netCredit.toFixed(2)}`);
        
        return {
          action: 'BEAR_CALL_SPREAD',
          confidence: Math.min(95, baseConfidence + (bestSpread.probability * 15)),
          reason: `Bear Call Spread: ${bearishSignals} bearish signals, ${(bestSpread.probability * 100).toFixed(1)}% PoP`,
          indicators,
          timestamp: new Date(),
          spread: bestSpread
        };
      } else {
        console.log(`🐻 BEAR CALL DEBUG - Best Spread Found: NO`);
      }
    }
    
    return null;
  }

  /**
   * Find the best Bear Call Spread from available options
   * Bear Call Spread: Sell OTM call (collect premium), Buy higher OTM call (limit risk)
   * Profits when price stays below the short call strike
   */
  private static findBestBearCallSpread(
    optionsChain: OptionsChain[],
    currentPrice: number,
    indicators: TechnicalIndicators
  ): BearCallSpread | null {
    
    // Filter for calls only
    const calls = optionsChain.filter(opt => opt.side === 'CALL');
    
    console.log(`🐻 BEAR CALL DEBUG - Total options: ${optionsChain.length}, Filtered calls: ${calls.length}, Current price: $${currentPrice.toFixed(2)}`);
    
    if (calls.length < 4) {
      console.log(`🐻 BEAR CALL DEBUG - Insufficient call options`);
      return null;
    }

    // Sample option for debugging
    if (calls.length > 0) {
      const sample = calls[0];
      console.log(`🐻 SAMPLE CALL - Symbol: ${sample.symbol}, Strike: ${sample.strike}, Side: ${sample.side}, Bid: ${sample.bid}, Ask: ${sample.ask}, Delta: ${sample.delta}`);
    }

    // Filter OTM calls (strikes above current price)
    const otmCalls = calls.filter(call => 
      call.strike > currentPrice && 
      call.bid > 0.01 && 
      call.ask > 0.01 &&
      call.ask < 50 // Reasonable ask price
    );
    
    console.log(`🐻 CALL ANALYSIS - Total calls: ${calls.length}`);
    console.log(`🐻 CALL FILTERING - OTM: ${otmCalls.length}`);

    if (otmCalls.length < 2) {
      console.log(`🐻 BEAR CALL DEBUG - Insufficient OTM calls for spreads`);
      return null;
    }

    // Filter calls suitable for bear call spreads (delta 0.1 to 0.4 for short leg)
    const suitableCalls = otmCalls.filter(call => 
      Math.abs(call.delta || 0) >= 0.1 && 
      Math.abs(call.delta || 0) <= 0.4
    );

    console.log(`🐻 CALL FILTERING - Far OTM: ${suitableCalls.length}, Delta filtered: ${suitableCalls.length}`);

    if (suitableCalls.length < 2) {
      console.log(`🐻 BEAR CALL DEBUG - No suitable calls for spreads`);
      return null;
    }

    // Sample put for debugging
    if (suitableCalls.length > 0) {
      const sample = suitableCalls[0];
      console.log(`🐻 SAMPLE CALL - Strike: ${sample.strike}, Delta: ${sample.delta}, Bid: ${sample.bid}, Ask: ${sample.ask}`);
    }

    // Generate all possible bear call spread combinations
    const spreadCombinations: BearCallSpread[] = [];
    
    for (let i = 0; i < suitableCalls.length; i++) {
      for (let j = i + 1; j < suitableCalls.length; j++) {
        const sellCall = suitableCalls[i]; // Lower strike (sell)
        const buyCall = suitableCalls[j];  // Higher strike (buy)
        
        // Bear call spread: sell lower strike, buy higher strike
        if (sellCall.strike < buyCall.strike) {
          const spreadWidth = buyCall.strike - sellCall.strike;
          
          // Focus on 1-10 point spreads
          if (spreadWidth >= 1 && spreadWidth <= 10) {
            const netCredit = sellCall.bid - buyCall.ask;
            
            // Debug a few credit calculations
            if (spreadCombinations.length < 3) {
              console.log(`🐻 CREDIT DEBUG - Sell ${sellCall.strike} (bid: ${sellCall.bid}) - Buy ${buyCall.strike} (ask: ${buyCall.ask}) = Credit: $${netCredit.toFixed(2)}`);
            }
            
            if (netCredit > 0) { // Must be a credit spread
              const maxProfit = netCredit;
              const maxLoss = spreadWidth - netCredit;
              
              // Risk/reward check - avoid high-risk spreads
              if (maxLoss < maxProfit * 50 || maxProfit === 0) { // More lenient for bear calls
                const probability = this.calculateProbabilityOfProfit(sellCall.strike, currentPrice, indicators);
                
                spreadCombinations.push({
                  sellCall,
                  buyCall,
                  netCredit,
                  maxProfit,
                  maxLoss,
                  probability,
                  breakeven: sellCall.strike + netCredit
                });
              }
            }
          }
        }
      }
    }

    const validCombinations = spreadCombinations.length;
    const validWidth = spreadCombinations.filter(s => (s.buyCall.strike - s.sellCall.strike) >= 1 && (s.buyCall.strike - s.sellCall.strike) <= 10).length;
    const positiveCredit = spreadCombinations.filter(s => s.netCredit > 0).length;
    const passedRiskReward = spreadCombinations.filter(s => s.maxLoss < s.maxProfit * 50 || s.maxProfit === 0).length;

    console.log(`🐻 BEAR CALL DEBUG - Combinations: ${validCombinations}, Valid width: ${validWidth}, Positive credit: ${positiveCredit}, Passed risk/reward: ${passedRiskReward}, Final candidates: ${spreadCombinations.length}`);

    if (spreadCombinations.length === 0) {
      console.log(`🐻 BEAR CALL DEBUG - No valid spreads found`);
      return null;
    }

    // Filter spreads with minimum credit requirement (professional trading)
    const bestSpreads = spreadCombinations.filter(spread => spread.netCredit >= 0.10);
    
    if (bestSpreads.length === 0) {
      console.log(`🐻 BEAR CALL DEBUG - No spreads meet minimum $0.10 credit requirement`);
      return null;
    }

    // PROFESSIONAL MULTI-FACTOR RANKING for Bear Call Spreads
    bestSpreads.forEach(spread => {
      // Factor 1: Credit score (0-100) - Primary factor
      const creditScore = Math.min(100, spread.netCredit * 100);
      
      // Factor 2: Distance score (0-100) - Higher strikes are better for bear calls
      const distanceFromCurrent = spread.sellCall.strike - currentPrice;
      const distanceScore = Math.min(100, (distanceFromCurrent / currentPrice) * 500); // Reward higher strikes
      
      // Factor 3: Risk/reward score (0-100)
      const riskRewardRatio = spread.maxLoss > 0 ? spread.maxProfit / spread.maxLoss : 0;
      const riskRewardScore = Math.min(100, riskRewardRatio * 50);
      
      // Factor 4: PoP score (0-100)
      const popScore = spread.probability * 100;
      
      // WEIGHTED COMPOSITE SCORE
      (spread as any).compositeScore = 
        creditScore * 0.40 +           // 40% weight on credit
        distanceScore * 0.30 +         // 30% weight on distance above current price  
        riskRewardScore * 0.20 +       // 20% weight on risk/reward
        popScore * 0.10;               // 10% weight on PoP
        
      // Debug top candidates
      if (bestSpreads.indexOf(spread) < 3) {
        console.log(`🐻 BEAR CALL RANK - ${spread.sellCall.strike}/${spread.buyCall.strike}: Credit:$${spread.netCredit.toFixed(2)}(${creditScore.toFixed(0)}) Distance:${distanceFromCurrent.toFixed(0)}(${distanceScore.toFixed(0)}) RR:${riskRewardRatio.toFixed(2)}(${riskRewardScore.toFixed(0)}) PoP:${popScore.toFixed(0)}% = Score:${(spread as any).compositeScore.toFixed(1)}`);
      }
    });
    
    // Sort by composite score (highest first)
    bestSpreads.sort((a, b) => (b as any).compositeScore - (a as any).compositeScore);
    
    const topSpread = bestSpreads[0];
    console.log(`🐻 BEAR CALL DEBUG - PROFESSIONAL TOP SPREAD: ${topSpread.sellCall.strike}/${topSpread.buyCall.strike}, Credit: $${topSpread.netCredit.toFixed(2)}, PoP: ${(topSpread.probability * 100).toFixed(1)}%, Score: ${(topSpread as any).compositeScore.toFixed(1)}`);
    
    return topSpread;
  }

  /**
   * Count bearish signals from technical indicators
   */
  private static getBearishSignalCount(indicators: TechnicalIndicators, marketData: MarketData[]): number {
    let bearishSignals = 0;
    
    // RSI bearish (50-75 range ideal for bear call spreads)
    if (indicators.rsi > 50 && indicators.rsi < 75) {
      bearishSignals++;
    }
    
    // MACD bearish
    if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
      bearishSignals++;
    }
    
    // Price action bearish (recent downtrend)
    const recentPrices = marketData.slice(-5).map(d => d.close);
    const isDowntrend = recentPrices[recentPrices.length - 1] < recentPrices[0];
    if (isDowntrend) {
      bearishSignals++;
    }
    
    // Bollinger Band position (near upper band suggests potential pullback)
    const currentPrice = marketData[marketData.length - 1].close;
    const bbPosition = (currentPrice - indicators.bbLower) / (indicators.bbUpper - indicators.bbLower);
    if (bbPosition > 0.7) { // Near upper band
      bearishSignals++;
    }
    
    return bearishSignals;
  }

  /**
   * Check if volatility environment is favorable for bear call spreads
   */
  private static isVolatilityFavorable(indicators: TechnicalIndicators): boolean {
    // Bollinger Band width as volatility proxy
    const bbWidth = (indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    
    // Bear call spreads work better in moderate to high volatility
    return bbWidth > 0.02 && bbWidth < 0.15; // 2-15% width
  }

  /**
   * Calculate probability of profit for bear call spread
   * (Probability that price stays below short call strike)
   */
  private static calculateProbabilityOfProfit(
    shortCallStrike: number,
    currentPrice: number,
    indicators: TechnicalIndicators
  ): number {
    
    // Distance of short call from current price
    const distanceRatio = (shortCallStrike - currentPrice) / currentPrice;
    
    // Base probability from distance (further = higher PoP)
    let baseProb = Math.min(0.85, 0.3 + (distanceRatio * 2));
    
    // Adjust for RSI (higher RSI = more likely to fall)
    if (indicators.rsi > 60) {
      baseProb += 0.1;
    }
    
    // Adjust for MACD bearish momentum
    if (indicators.macd < indicators.macdSignal) {
      baseProb += 0.05;
    }
    
    return Math.max(0.1, Math.min(0.9, baseProb));
  }

  /**
   * ENHANCED: Determine if Bear Call Spread should be exited with Greeks analysis
   */
  static shouldExitSpread(
    spread: BearCallSpread,
    currentPrice: number,
    currentCredit: number,
    daysHeld: number,
    currentGreeks?: any // Optional Greeks snapshot for enhanced analysis
  ): { shouldExit: boolean; reason: string } {
    
    // Professional Bear Call Spread exit conditions:
    
    // 1. Price breach: Exit if underlying moves significantly above short call
    if (currentPrice >= spread.sellCall.strike * 1.02) { // 2% buffer above short strike
      return { shouldExit: true, reason: 'PRICE_BREACH' };
    }
    
    // 2. Profit target: 25-50% of max profit
    if (currentCredit <= spread.netCredit * 0.4) { // 60% profit (40% of credit remaining)
      return { shouldExit: true, reason: 'TAKE_PROFIT' };
    }
    
    // 3. Loss limit: 250% of credit received (more conservative)
    if (currentCredit >= spread.netCredit * 2.5) {
      return { shouldExit: true, reason: 'STOP_LOSS' };
    }
    
    // 4. Greeks-based exits (if Greeks data available)
    if (currentGreeks) {
      // High delta means directional risk increasing
      if (Math.abs(currentGreeks.delta) > 0.7) {
        return { shouldExit: true, reason: 'HIGH_DELTA_RISK' };
      }
      
      // High gamma means position becoming too sensitive
      if (Math.abs(currentGreeks.gamma) > 0.12) {
        return { shouldExit: true, reason: 'HIGH_GAMMA_RISK' };
      }
      
      // Extreme theta for short-dated positions
      if (currentGreeks.theta < -80 && currentGreeks.timeToExpiration < 0.008) {
        return { shouldExit: true, reason: 'EXTREME_THETA_DECAY' };
      }
    }
    
    // 5. Time-based exit: Close at 1-2 DTE or after 18 days
    if (daysHeld >= 18) { // Earlier exit for Bear Call Spreads (more aggressive)
      return { shouldExit: true, reason: 'TIME_LIMIT' };
    }
    
    // 6. Early profit capture for 0-DTE (same day expiration)
    if (daysHeld === 0 && currentCredit <= spread.netCredit * 0.6) { // 40% profit same day
      return { shouldExit: true, reason: '0DTE_PROFIT_CAPTURE' };
    }
    
    return { shouldExit: false, reason: 'HOLD' };
  }

  /**
   * Calculate position size for bear call spread
   */
  static calculateSpreadPositionSize(
    accountBalance: number,
    maxLoss: number,
    strategy: Strategy
  ): number {
    
    // Risk 1-2% of account per trade (conservative)
    const riskAmount = accountBalance * 0.015; // 1.5% risk
    
    if (maxLoss <= 0) return 0;
    
    const maxContracts = Math.floor(riskAmount / (maxLoss * 100));
    
    // Cap at reasonable size
    return Math.max(1, Math.min(maxContracts, 10));
  }
}