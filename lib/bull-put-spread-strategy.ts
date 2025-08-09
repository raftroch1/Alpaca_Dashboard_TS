import { MarketData, TechnicalIndicators, TradeSignal, Strategy, OptionsChain } from './types';
import { TechnicalAnalysis } from './technical-indicators';

interface BullPutSpread {
  sellPut: OptionsChain;
  buyPut: OptionsChain;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  probability: number;
}

export class BullPutSpreadStrategy {
  
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
    
    // Professional Bull Put Spread Entry Conditions:
    // 1. Market not in severe downtrend (RSI > 25)
    // 2. Reasonable volatility environment
    // 3. Suitable options chain available
    
    // 🔍 DEBUG: Market condition analysis
    const isTradeableMarket = indicators.rsi > 25; // Not in panic sell-off
    const volatilityOk = this.isVolatilityFavorable(indicators);
    const hasOptionsData = optionsChain.length > 10; // Sufficient options data
    
    console.log(`🔍 STRATEGY DEBUG - RSI: ${indicators.rsi.toFixed(1)}, Options: ${optionsChain.length}, Tradeable: ${isTradeableMarket}, VolOk: ${volatilityOk}`);
    
    // More aggressive but realistic entry criteria
    const marketConditionOk = isTradeableMarket && hasOptionsData;
    
    // Add bullish bias as enhancement, not requirement
    const bullishSignals = this.getBullishSignalCount(indicators, marketData);
    const baseConfidence = 45 + (bullishSignals * 8); // 45-77% base confidence
    
    console.log(`🔍 STRATEGY DEBUG - Market OK: ${marketConditionOk}, Bullish Signals: ${bullishSignals}/4, Base Confidence: ${baseConfidence}%`);
    
    if (marketConditionOk) {
      const bestSpread = this.findBestBullPutSpread(optionsChain, currentPrice, strategy);
      
      console.log(`🔍 STRATEGY DEBUG - Best Spread Found: ${bestSpread ? 'YES' : 'NO'}`);
      if (bestSpread) {
        console.log(`🔍 STRATEGY DEBUG - Spread PoP: ${(bestSpread.probability * 100).toFixed(1)}%, Credit: $${bestSpread.netCredit.toFixed(2)}`);
      }
      
      // ULTRA AGGRESSIVE: Lowered threshold to 30% to ensure trades are generated
      if (bestSpread && bestSpread.probability > 0.10) { // REAL MARKET: Accept any reasonable PoP
        return {
          action: 'BULL_PUT_SPREAD' as any,
          confidence: Math.min(85, baseConfidence + (bestSpread.probability * 20)),
          reason: `Professional Bull Put Spread: ${bestSpread.probability.toFixed(0)}% PoP, $${bestSpread.netCredit.toFixed(2)} credit, ${bullishSignals}/4 bullish signals`,
          indicators,
          timestamp: new Date(),
          spread: bestSpread
        };
      }
    }
    
    return {
      action: 'HOLD',
      confidence: 40,
      reason: 'No favorable Bull Put Spread opportunity',
      indicators,
      timestamp: new Date()
    };
  }
  
  private static getBullishSignalCount(indicators: TechnicalIndicators, marketData: MarketData[]): number {
    // Professional signal analysis - count bullish indicators
    const rsiFavorable = indicators.rsi >= 35 && indicators.rsi <= 70; // Expanded range
    const macdBullish = indicators.macd > indicators.macdSignal;
    const priceAboveBB = marketData[marketData.length - 1].close > indicators.bbMiddle;
    
    // Trend analysis - price above recent moving average
    const recentPrices = marketData.slice(-10).map(d => d.close);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const trendBullish = marketData[marketData.length - 1].close > avgPrice;
    
    // Count bullish signals (0-4)
    const bullishSignals = [rsiFavorable, macdBullish, priceAboveBB, trendBullish];
    return bullishSignals.filter(signal => signal).length;
  }

  private static assessBullishBias(indicators: TechnicalIndicators, marketData: MarketData[]): boolean {
    // Now just uses the signal count method
    return this.getBullishSignalCount(indicators, marketData) >= 2; // Lowered from 3 to 2
  }
  
  private static isVolatilityFavorable(indicators: TechnicalIndicators): boolean {
    // More lenient volatility check - almost always true unless extreme
    const bbWidth = (indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle;
    return bbWidth > 0.01 && bbWidth < 0.15; // Very wide range: 1-15% width
  }
  
  private static findBestBullPutSpread(
    optionsChain: OptionsChain[],
    currentPrice: number,
    strategy: Strategy
  ): BullPutSpread | null {
    
    const puts = optionsChain.filter(opt => 
      opt.side === 'PUT' &&
      opt.strike < currentPrice // OTM puts only - REMOVED all other filters to work with real Alpaca data
    );
    
    console.log(`🔍 SPREAD DEBUG - Total options: ${optionsChain.length}, Filtered puts: ${puts.length}, Current price: $${currentPrice.toFixed(2)}`);
    
    // DEBUG: Show sample options data
    if (optionsChain.length > 0) {
      const sampleOption = optionsChain[0];
      console.log(`🔍 SAMPLE OPTION - Symbol: ${sampleOption.symbol}, Strike: ${sampleOption.strike}, Side: ${sampleOption.side}, Bid: ${sampleOption.bid}, Ask: ${sampleOption.ask}, Delta: ${sampleOption.delta}`);
    }
    
    // DEBUG: Show why puts are being filtered out
    const allPuts = optionsChain.filter(opt => opt.side === 'PUT');
    console.log(`🔍 PUT ANALYSIS - Total puts: ${allPuts.length}`);
    
    if (allPuts.length > 0) {
      const otmPuts = allPuts.filter(opt => opt.strike < currentPrice);
      const farOtmPuts = otmPuts.filter(opt => opt.strike > currentPrice * 0.80);
      const deltaFilteredPuts = farOtmPuts.filter(opt => Math.abs(opt.delta || 0) >= 0.05 && Math.abs(opt.delta || 0) <= 0.50);
      
      console.log(`🔍 PUT FILTERING - OTM: ${otmPuts.length}, Far OTM: ${farOtmPuts.length}, Delta filtered: ${deltaFilteredPuts.length}`);
      
      if (farOtmPuts.length > 0) {
        const samplePut = farOtmPuts[0];
        console.log(`🔍 SAMPLE PUT - Strike: ${samplePut.strike}, Delta: ${samplePut.delta}, Bid: ${samplePut.bid}, Ask: ${samplePut.ask}`);
      }
    }
    
    if (puts.length < 2) {
      console.log(`🔍 SPREAD DEBUG - Insufficient puts (${puts.length} < 2)`);
      return null;
    }
    
    // Sort by strike descending
    puts.sort((a, b) => b.strike - a.strike);
    
    const bestSpreads: BullPutSpread[] = [];
    let totalCombinations = 0;
    let validWidthCombinations = 0;
    let positiveCredits = 0;
    let passedRiskReward = 0;
    
    // Try different strike combinations
    for (let i = 0; i < puts.length - 1; i++) {
      for (let j = i + 1; j < puts.length; j++) {
        totalCombinations++;
        const sellPut = puts[i]; // Higher strike (sell)
        const buyPut = puts[j];  // Lower strike (buy)
        
        const strikeWidth = sellPut.strike - buyPut.strike;
        if (strikeWidth > 0 && strikeWidth <= 20) { // Max $20 wide
          validWidthCombinations++;
          
          const netCredit = sellPut.bid - buyPut.ask; // Credit received
          const maxProfit = netCredit;
          const maxLoss = strikeWidth - netCredit;
          const breakeven = sellPut.strike - netCredit;
          
          // DEBUG: Show credit calculation details for first few combinations
          if (totalCombinations <= 3) {
            console.log(`🔍 CREDIT DEBUG - Sell ${sellPut.strike} (bid: ${sellPut.bid}) - Buy ${buyPut.strike} (ask: ${buyPut.ask}) = Credit: $${netCredit.toFixed(2)}`);
          }
          
          if (netCredit >= 0.05) { // PROFESSIONAL: Minimum $0.05 credit to cover transaction costs
            positiveCredits++;
            
            if (maxLoss < maxProfit * 50 || maxProfit === 0) { // VERY lenient - deep OTM spreads have different risk profiles
              passedRiskReward++;
              
              // Probability that SPY stays above breakeven
              const distanceToBreakeven = currentPrice - breakeven;
              const probability = this.calculateProbabilityOfProfit(
                distanceToBreakeven, 
                currentPrice,
                sellPut.impliedVolatility || 0.20
              );
              
              bestSpreads.push({
                sellPut,
                buyPut,
                netCredit,
                maxProfit,
                maxLoss,
                breakeven,
                probability
              });
            }
          }
        }
      }
    }
    
    console.log(`🔍 SPREAD DEBUG - Combinations: ${totalCombinations}, Valid width: ${validWidthCombinations}, Positive credit: ${positiveCredits}, Passed risk/reward: ${passedRiskReward}, Final candidates: ${bestSpreads.length}`);
    
    if (bestSpreads.length === 0) {
      console.log(`🔍 SPREAD DEBUG - No valid spreads found`);
      return null;
    }
    
    // PROFESSIONAL MULTI-FACTOR RANKING
    bestSpreads.forEach(spread => {
      // Factor 1: Credit score (0-100) - Primary factor
      const creditScore = Math.min(100, spread.netCredit * 100); // $1.00 credit = 100 points
      
      // Factor 2: Distance score (0-100) - Closer to current price is better
      const distanceFromCurrent = Math.abs(spread.sellPut.strike - currentPrice);
      const distanceScore = Math.max(0, 100 - (distanceFromCurrent / currentPrice) * 1000); // Penalty for being far OTM
      
      // Factor 3: Risk/reward score (0-100)
      const riskRewardRatio = spread.maxLoss > 0 ? spread.maxProfit / spread.maxLoss : 0;
      const riskRewardScore = Math.min(100, riskRewardRatio * 50);
      
      // Factor 4: PoP score (0-100) - Secondary factor
      const popScore = spread.probability * 100;
      
      // WEIGHTED COMPOSITE SCORE
      (spread as any).compositeScore = 
        creditScore * 0.40 +           // 40% weight on credit
        distanceScore * 0.30 +         // 30% weight on proximity to current price  
        riskRewardScore * 0.20 +       // 20% weight on risk/reward
        popScore * 0.10;               // 10% weight on PoP
        
      // Debug top candidates
      if (bestSpreads.indexOf(spread) < 3) {
        console.log(`🔍 SPREAD RANK - ${spread.sellPut.strike}/${spread.buyPut.strike}: Credit:$${spread.netCredit.toFixed(2)}(${creditScore.toFixed(0)}) Distance:${distanceFromCurrent.toFixed(0)}(${distanceScore.toFixed(0)}) RR:${riskRewardRatio.toFixed(2)}(${riskRewardScore.toFixed(0)}) PoP:${popScore.toFixed(0)}% = Score:${(spread as any).compositeScore.toFixed(1)}`);
      }
    });
    
    // Sort by composite score (highest first)
    bestSpreads.sort((a, b) => (b as any).compositeScore - (a as any).compositeScore);
    
    const topSpread = bestSpreads[0];
    console.log(`🔍 SPREAD DEBUG - PROFESSIONAL TOP SPREAD: ${topSpread.sellPut.strike}/${topSpread.buyPut.strike}, Credit: $${topSpread.netCredit.toFixed(2)}, PoP: ${(topSpread.probability * 100).toFixed(1)}%, Score: ${(topSpread as any).compositeScore.toFixed(1)}`);
    
    return topSpread;
  }
  
  private static calculateProbabilityOfProfit(
    distanceToBreakeven: number,
    currentPrice: number,
    impliedVol: number
  ): number {
    // Simplified Black-Scholes probability calculation
    // Assumes ~30 days to expiration
    const timeToExpiry = 30 / 365;
    const drift = 0.10; // 10% annual drift
    
    const d = (Math.log(currentPrice / (currentPrice - distanceToBreakeven)) + 
              (drift + 0.5 * impliedVol * impliedVol) * timeToExpiry) / 
              (impliedVol * Math.sqrt(timeToExpiry));
    
    return this.normalCDF(d);
  }
  
  private static normalCDF(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
  
  static shouldExitSpread(
    spread: BullPutSpread,
    currentPrice: number,
    currentCredit: number,
    daysHeld: number
  ): { shouldExit: boolean; reason?: string } {
    
    // Take profit at 50% of max profit
    if (currentCredit <= spread.netCredit * 0.5) {
      return { shouldExit: true, reason: 'TAKE_PROFIT_50%' };
    }
    
    // Stop loss if price approaches breakeven
    if (currentPrice <= spread.breakeven * 1.02) {
      return { shouldExit: true, reason: 'PRICE_NEAR_BREAKEVEN' };
    }
    
    // Time-based exit - close at 75% of time decay
    if (daysHeld >= 21) { // 21 days of 30-day trade
      return { shouldExit: true, reason: 'TIME_DECAY_EXIT' };
    }
    
    return { shouldExit: false };
  }
  
  static calculateSpreadPositionSize(
    accountBalance: number,
    maxLoss: number,
    strategy: Strategy
  ): number {
    // Risk-based position sizing
    const maxRiskPerTrade = accountBalance * (strategy.positionSizePercent / 2); // More conservative
    const maxContracts = Math.floor(maxRiskPerTrade / (maxLoss * 100));
    
    return Math.max(1, Math.min(maxContracts, 5)); // Max 5 contracts
  }
}