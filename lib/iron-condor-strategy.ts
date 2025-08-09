import { MarketData, TechnicalIndicators, TradeSignal, Strategy, OptionsChain, IronCondor } from './types';
import { TechnicalAnalysis } from './technical-indicators';

export class IronCondorStrategy {
  
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

    // Professional Iron Condor Entry Conditions:
    // 1. Low volatility environment (narrow BB, RSI 40-60)
    // 2. Sideways/range-bound market
    // 3. Sufficient options data for 4-leg spread
    
    const isLowVolatility = this.isLowVolatilityEnvironment(indicators, marketData);
    const isRangebound = this.isRangeboundMarket(indicators, marketData);
    const hasOptionsData = optionsChain.length > 20; // Need more options for 4-leg spread
    
    console.log(`🦅 IRON CONDOR STRATEGY - RSI: ${indicators.rsi.toFixed(1)}, Options: ${optionsChain.length}, LowVol: ${isLowVolatility}, Rangebound: ${isRangebound}`);
    
    const marketConditionOk = (isLowVolatility || isRangebound) && hasOptionsData; // Only need ONE condition, not both
    
    // Check for neutral market signals
    const neutralSignals = this.getNeutralSignalCount(indicators, marketData);
    const baseConfidence = 40 + (neutralSignals * 10); // 40-80% base confidence
    
    console.log(`🦅 IRON CONDOR DEBUG - Market OK: ${marketConditionOk}, Neutral Signals: ${neutralSignals}/4, Base Confidence: ${baseConfidence}%`);
    
    if (marketConditionOk) {
      const bestCondor = this.findBestIronCondor(optionsChain, currentPrice, indicators);
      
      if (bestCondor) {
        console.log(`🦅 IRON CONDOR DEBUG - Best Condor Found: YES`);
        console.log(`🦅 IRON CONDOR DEBUG - Condor PoP: ${(bestCondor.probability * 100).toFixed(1)}%, Credit: $${bestCondor.netCredit.toFixed(2)}`);
        
        return {
          action: 'IRON_CONDOR',
          confidence: Math.min(95, baseConfidence + (bestCondor.probability * 15)),
          reason: `Iron Condor: ${neutralSignals} neutral signals, ${(bestCondor.probability * 100).toFixed(1)}% PoP`,
          indicators,
          timestamp: new Date(),
          spread: bestCondor
        };
      } else {
        console.log(`🦅 IRON CONDOR DEBUG - Best Condor Found: NO`);
      }
    }
    
    return null;
  }

  /**
   * Find the best Iron Condor from available options
   * Iron Condor: Bull Put Spread + Bear Call Spread
   * - Sell OTM put + Buy further OTM put (bull put spread)
   * - Sell OTM call + Buy further OTM call (bear call spread)
   * Profits when price stays between the short strikes
   */
  private static findBestIronCondor(
    optionsChain: OptionsChain[],
    currentPrice: number,
    indicators: TechnicalIndicators
  ): IronCondor | null {
    
    const calls = optionsChain.filter(opt => opt.side === 'CALL');
    const puts = optionsChain.filter(opt => opt.side === 'PUT');
    
    console.log(`🦅 IRON CONDOR DEBUG - Total options: ${optionsChain.length}, Calls: ${calls.length}, Puts: ${puts.length}, Current price: $${currentPrice.toFixed(2)}`);
    
    if (calls.length < 4 || puts.length < 4) {
      console.log(`🦅 IRON CONDOR DEBUG - Insufficient options for 4-leg spread`);
      return null;
    }

    // Filter OTM options with reasonable bid/ask
    const otmCalls = calls.filter(call => 
      call.strike > currentPrice && 
      call.bid > 0.01 && 
      call.ask > 0.01 &&
      call.ask < 50 &&
      Math.abs(call.delta || 0) >= 0.05 && 
      Math.abs(call.delta || 0) <= 0.35
    );
    
    const otmPuts = puts.filter(put => 
      put.strike < currentPrice && 
      put.bid > 0.01 && 
      put.ask > 0.01 &&
      put.ask < 50 &&
      Math.abs(put.delta || 0) >= 0.05 && 
      Math.abs(put.delta || 0) <= 0.35
    );

    console.log(`🦅 IRON CONDOR FILTERING - OTM Calls: ${otmCalls.length}, OTM Puts: ${otmPuts.length}`);

    if (otmCalls.length < 2 || otmPuts.length < 2) {
      console.log(`🦅 IRON CONDOR DEBUG - Insufficient OTM options for condor`);
      return null;
    }

    // Generate Iron Condor combinations
    const condorCombinations: IronCondor[] = [];
    
    // Try different wing widths (5-15 points typically)
    const targetWingWidths = [5, 10, 15];
    
    for (const wingWidth of targetWingWidths) {
      // Find put spread (bull put spread)
      for (let i = 0; i < otmPuts.length - 1; i++) {
        for (let j = i + 1; j < otmPuts.length; j++) {
          const sellPut = otmPuts[j]; // Higher strike (sell)
          const buyPut = otmPuts[i];  // Lower strike (buy)
          
          if (sellPut.strike > buyPut.strike && 
              Math.abs(sellPut.strike - buyPut.strike - wingWidth) < 2) {
            
            // Find call spread (bear call spread)
            for (let k = 0; k < otmCalls.length - 1; k++) {
              for (let l = k + 1; l < otmCalls.length; l++) {
                const sellCall = otmCalls[k]; // Lower strike (sell)
                const buyCall = otmCalls[l];  // Higher strike (buy)
                
                if (sellCall.strike < buyCall.strike && 
                    Math.abs(buyCall.strike - sellCall.strike - wingWidth) < 2) {
                  
                  // Check if condor is balanced (similar distance from current price)
                  const putDistance = currentPrice - sellPut.strike;
                  const callDistance = sellCall.strike - currentPrice;
                  
                  if (Math.abs(putDistance - callDistance) < currentPrice * 0.05) { // Within 5%
                    
                    const putSpreadCredit = sellPut.bid - buyPut.ask;
                    const callSpreadCredit = sellCall.bid - buyCall.ask;
                    const netCredit = putSpreadCredit + callSpreadCredit;
                    
                    // Debug first few combinations
                    if (condorCombinations.length < 3) {
                      console.log(`🦅 CONDOR DEBUG - Put: ${sellPut.strike}/${buyPut.strike} (${putSpreadCredit.toFixed(2)}) + Call: ${sellCall.strike}/${buyCall.strike} (${callSpreadCredit.toFixed(2)}) = Net: $${netCredit.toFixed(2)}`);
                    }
                    
                    if (netCredit > 0.10) { // Minimum net credit for condor
                      const maxProfit = netCredit;
                      const maxLoss = wingWidth - netCredit;
                      const probability = this.calculateCondorProbabilityOfProfit(
                        sellPut.strike, 
                        sellCall.strike, 
                        currentPrice, 
                        indicators
                      );
                      
                      condorCombinations.push({
                        sellPut,
                        buyPut,
                        sellCall,
                        buyCall,
                        netCredit,
                        maxProfit,
                        maxLoss,
                        probability,
                        profitZone: {
                          lower: sellPut.strike,
                          upper: sellCall.strike
                        },
                        breakevens: {
                          lower: sellPut.strike - netCredit,
                          upper: sellCall.strike + netCredit
                        }
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`🦅 IRON CONDOR DEBUG - Generated ${condorCombinations.length} condor combinations`);

    if (condorCombinations.length === 0) {
      console.log(`🦅 IRON CONDOR DEBUG - No valid condors found`);
      return null;
    }

    // Filter condors with good risk/reward
    const bestCondors = condorCombinations.filter(condor => 
      condor.netCredit >= 0.10 && 
      condor.maxLoss < condor.maxProfit * 8 // Reasonable risk/reward
    );
    
    if (bestCondors.length === 0) {
      console.log(`🦅 IRON CONDOR DEBUG - No condors meet risk/reward criteria`);
      return null;
    }

    // PROFESSIONAL MULTI-FACTOR RANKING for Iron Condors
    bestCondors.forEach(condor => {
      // Factor 1: Credit score (0-100) - Primary factor
      const creditScore = Math.min(100, condor.netCredit * 50); // $2.00 credit = 100 points
      
      // Factor 2: Balance score (0-100) - How centered the condor is
      const putDistance = currentPrice - condor.sellPut.strike;
      const callDistance = condor.sellCall.strike - currentPrice;
      const balanceRatio = Math.min(putDistance, callDistance) / Math.max(putDistance, callDistance);
      const balanceScore = balanceRatio * 100;
      
      // Factor 3: Risk/reward score (0-100)
      const riskRewardRatio = condor.maxLoss > 0 ? condor.maxProfit / condor.maxLoss : 0;
      const riskRewardScore = Math.min(100, riskRewardRatio * 25);
      
      // Factor 4: PoP score (0-100)
      const popScore = condor.probability * 100;
      
      // WEIGHTED COMPOSITE SCORE
      (condor as any).compositeScore = 
        creditScore * 0.35 +           // 35% weight on credit
        balanceScore * 0.30 +          // 30% weight on balance
        riskRewardScore * 0.20 +       // 20% weight on risk/reward
        popScore * 0.15;               // 15% weight on PoP
        
      // Debug top candidates
      if (bestCondors.indexOf(condor) < 3) {
        console.log(`🦅 CONDOR RANK - ${condor.sellPut.strike}/${condor.sellCall.strike}: Credit:$${condor.netCredit.toFixed(2)}(${creditScore.toFixed(0)}) Balance:${balanceScore.toFixed(0)} RR:${riskRewardRatio.toFixed(2)}(${riskRewardScore.toFixed(0)}) PoP:${popScore.toFixed(0)}% = Score:${(condor as any).compositeScore.toFixed(1)}`);
      }
    });
    
    // Sort by composite score (highest first)
    bestCondors.sort((a, b) => (b as any).compositeScore - (a as any).compositeScore);
    
    const topCondor = bestCondors[0];
    console.log(`🦅 IRON CONDOR DEBUG - PROFESSIONAL TOP CONDOR: ${topCondor.sellPut.strike}/${topCondor.sellCall.strike}, Credit: $${topCondor.netCredit.toFixed(2)}, PoP: ${(topCondor.probability * 100).toFixed(1)}%, Score: ${(topCondor as any).compositeScore.toFixed(1)}`);
    
    return topCondor;
  }

  /**
   * Check if current environment is low volatility
   */
  private static isLowVolatilityEnvironment(indicators: TechnicalIndicators, marketData: MarketData[]): boolean {
    // Bollinger Band width as volatility proxy
    const bbWidth = (indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    
    // Recent price volatility
    const recentPrices = marketData.slice(-10).map(d => d.close);
    const returns = [];
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push(Math.abs((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1]));
    }
    const avgDailyMove = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Low volatility: BB width < 4% AND average daily move < 1.5%
    return bbWidth < 0.04 && avgDailyMove < 0.015;
  }

  /**
   * Check if market is range-bound (sideways)
   */
  private static isRangeboundMarket(indicators: TechnicalIndicators, marketData: MarketData[]): boolean {
    // RSI in neutral range (40-60)
    const rsiNeutral = indicators.rsi > 40 && indicators.rsi < 60;
    
    // MACD near zero (low momentum)
    const macdNeutral = Math.abs(indicators.macd) < 0.5 && Math.abs(indicators.macdHistogram) < 0.2;
    
    // Price within Bollinger Bands (not trending strongly)
    const currentPrice = marketData[marketData.length - 1].close;
    const bbPosition = (currentPrice - indicators.bbLower) / (indicators.bbUpper - indicators.bbLower);
    const inBBRange = bbPosition > 0.2 && bbPosition < 0.8;
    
    return rsiNeutral && macdNeutral && inBBRange;
  }

  /**
   * Count neutral market signals
   */
  private static getNeutralSignalCount(indicators: TechnicalIndicators, marketData: MarketData[]): number {
    let neutralSignals = 0;
    
    // RSI in neutral zone (45-55)
    if (indicators.rsi > 45 && indicators.rsi < 55) {
      neutralSignals++;
    }
    
    // MACD near zero (sideways momentum)
    if (Math.abs(indicators.macd) < 0.3 && Math.abs(indicators.macdHistogram) < 0.1) {
      neutralSignals++;
    }
    
    // Low recent volatility
    const recentPrices = marketData.slice(-5).map(d => d.close);
    const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
    const currentPrice = marketData[marketData.length - 1].close;
    if (priceRange / currentPrice < 0.02) { // Less than 2% range
      neutralSignals++;
    }
    
    // Bollinger Band squeeze (low volatility)
    const bbWidth = (indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    if (bbWidth < 0.04) {
      neutralSignals++;
    }
    
    return neutralSignals;
  }

  /**
   * Calculate probability of profit for Iron Condor
   * (Probability that price stays between short strikes)
   */
  private static calculateCondorProbabilityOfProfit(
    shortPutStrike: number,
    shortCallStrike: number,
    currentPrice: number,
    indicators: TechnicalIndicators
  ): number {
    
    // Width of profit zone
    const profitZoneWidth = shortCallStrike - shortPutStrike;
    const profitZoneRatio = profitZoneWidth / currentPrice;
    
    // Base probability from zone width (wider = higher PoP)
    let baseProb = Math.min(0.8, 0.3 + (profitZoneRatio * 5));
    
    // Adjust for low volatility (better for condors)
    const bbWidth = (indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    if (bbWidth < 0.03) {
      baseProb += 0.15;
    }
    
    // Adjust for neutral RSI
    if (indicators.rsi > 45 && indicators.rsi < 55) {
      baseProb += 0.1;
    }
    
    // Penalty for being too close to strikes
    const distanceToCall = Math.abs(currentPrice - shortCallStrike) / currentPrice;
    const distanceToPut = Math.abs(currentPrice - shortPutStrike) / currentPrice;
    const minDistance = Math.min(distanceToCall, distanceToPut);
    
    if (minDistance < 0.02) { // Too close to strike
      baseProb -= 0.2;
    }
    
    return Math.max(0.1, Math.min(0.85, baseProb));
  }

  /**
   * Calculate position size for Iron Condor
   */
  static calculateSpreadPositionSize(
    accountBalance: number,
    maxLoss: number,
    strategy: Strategy
  ): number {
    
    // Risk 1-2% of account per trade (conservative for 4-leg spread)
    const riskAmount = accountBalance * 0.012; // 1.2% risk
    
    if (maxLoss <= 0) return 0;
    
    const maxContracts = Math.floor(riskAmount / (maxLoss * 100));
    
    // Cap at reasonable size (condors can be complex to manage)
    return Math.max(1, Math.min(maxContracts, 5));
  }
}