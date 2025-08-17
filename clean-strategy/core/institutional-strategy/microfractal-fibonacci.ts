/**
 * MICROFRACTAL ANALYSIS WITH FIBONACCI RETRACEMENTS
 * 
 * Identifies potential market turning points using fractal patterns on short timeframes
 * combined with Fibonacci retracement levels for high-probability reversal zones.
 * Essential for precise entry timing in 0DTE trading.
 * 
 * Key Concepts:
 * - Fractal: 5-bar pattern where middle bar is highest high or lowest low
 * - Microfractals: Fractals on very short timeframes (1-5 minutes)
 * - Fibonacci confluence: Fractal + Fib level = high-probability setup
 * - Pattern recognition: Systematic identification of reversal patterns
 */

import { MarketData } from '../../../lib/types';

export interface FractalPattern {
  type: 'BULLISH' | 'BEARISH';
  index: number;
  price: number;
  timestamp: Date;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  confirmed: boolean; // Requires 2 bars after formation to confirm
  volume: number;
  volumeStrength: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface FibonacciRetracement {
  swingHigh: number;
  swingLow: number;
  swingDirection: 'UP' | 'DOWN';
  levels: {
    level0: number;     // 0% (swing extreme)
    level236: number;   // 23.6%
    level382: number;   // 38.2%
    level500: number;   // 50%
    level618: number;   // 61.8% (golden ratio)
    level786: number;   // 78.6%
    level100: number;   // 100% (opposite swing extreme)
  };
  extensions: {
    level1272: number;  // 127.2%
    level1618: number;  // 161.8%
    level2618: number;  // 261.8%
  };
}

export interface FractalFibConfluence {
  fractal: FractalPattern;
  fibLevel: number;
  fibPercentage: string;
  confluence: number; // 0-1 confidence score
  priceDistance: number; // Distance between fractal and fib level
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  setupType: 'REVERSAL' | 'CONTINUATION' | 'BREAKOUT';
}

export interface MicrofractalSnapshot {
  timestamp: Date;
  currentPrice: number;
  timeframe: string;
  
  // Fractal analysis
  confirmedFractals: FractalPattern[];
  pendingFractals: FractalPattern[];
  recentFractals: FractalPattern[]; // Last 10 fractals
  
  // Fibonacci analysis
  activeFibRetracements: FibonacciRetracement[];
  keyFibLevels: Array<{ level: number; percentage: string; type: 'SUPPORT' | 'RESISTANCE' }>;
  
  // Confluence analysis
  highProbabilitySetups: FractalFibConfluence[];
  nearbyConfluence: FractalFibConfluence[];
  
  // Market structure
  marketStructure: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGE_BOUND' | 'BREAKOUT';
  swingStructure: 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'SIDEWAYS';
  
  // Trading signals
  immediateSignals: Array<{
    type: 'BUY' | 'SELL' | 'WAIT';
    confidence: number;
    entry: number;
    stopLoss: number;
    target: number;
    reason: string;
  }>;
}

export interface MicrofractalConfiguration {
  fractalLookback: number; // Bars on each side for fractal validation
  minFractalStrength: number; // Minimum price movement for valid fractal
  volumeThreshold: number; // Minimum volume ratio for fractal validation
  fibTolerance: number; // Price tolerance for fib level confluence (%)
  confluenceRadius: number; // Price range to search for confluence
  minConfluenceScore: number; // Minimum score for valid confluence
  maxFibAge: number; // Maximum bars old for fib retracement validity
}

export class MicrofractalFibonacci {
  
  private static readonly DEFAULT_CONFIG: MicrofractalConfiguration = {
    fractalLookback: 2, // 2 bars on each side (5-bar pattern)
    minFractalStrength: 0.25, // $0.25 minimum movement
    volumeThreshold: 0.8, // 80% of average volume
    fibTolerance: 0.5, // 0.5% tolerance for fib levels
    confluenceRadius: 1.0, // $1.00 search radius
    minConfluenceScore: 0.6, // 60% minimum confidence
    maxFibAge: 50 // 50 bars maximum age
  };
  
  /**
   * Comprehensive microfractal and Fibonacci analysis
   */
  static analyzeMicrofractals(
    marketData: MarketData[],
    config: Partial<MicrofractalConfiguration> = {}
  ): MicrofractalSnapshot {
    
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (marketData.length < 20) {
      throw new Error('Insufficient data for microfractal analysis');
    }
    
    const currentPrice = marketData[marketData.length - 1].close;
    
    console.log(`🔍 MICROFRACTAL ANALYSIS: Analyzing ${marketData.length} bars`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    
    // Identify fractal patterns
    const fractals = this.identifyFractals(marketData, fullConfig);
    const confirmedFractals = fractals.filter(f => f.confirmed);
    const pendingFractals = fractals.filter(f => !f.confirmed);
    const recentFractals = confirmedFractals.slice(-10);
    
    // Calculate Fibonacci retracements
    const fibRetracements = this.calculateFibonacciRetracements(confirmedFractals, fullConfig);
    
    // Identify key Fibonacci levels near current price
    const keyFibLevels = this.identifyKeyFibLevels(fibRetracements, currentPrice, fullConfig);
    
    // Find fractal-Fibonacci confluence
    const confluenceSetups = this.findFractalFibConfluence(
      fractals, fibRetracements, currentPrice, fullConfig
    );
    
    // Analyze market structure
    const marketStructure = this.analyzeMarketStructure(confirmedFractals, marketData);
    const swingStructure = this.analyzeSwingStructure(confirmedFractals);
    
    // Generate trading signals
    const immediateSignals = this.generateTradingSignals(
      confluenceSetups, keyFibLevels, currentPrice, marketStructure, fullConfig
    );
    
    const snapshot: MicrofractalSnapshot = {
      timestamp: new Date(),
      currentPrice,
      timeframe: '1Min',
      
      // Fractal analysis
      confirmedFractals,
      pendingFractals,
      recentFractals,
      
      // Fibonacci analysis
      activeFibRetracements: fibRetracements,
      keyFibLevels,
      
      // Confluence analysis
      highProbabilitySetups: confluenceSetups.filter(setup => setup.signalQuality === 'EXCELLENT'),
      nearbyConfluence: confluenceSetups.filter(setup => 
        Math.abs(setup.fibLevel - currentPrice) / currentPrice < 0.02
      ),
      
      // Market structure
      marketStructure,
      swingStructure,
      
      // Trading signals
      immediateSignals
    };
    
    console.log(`📊 MICROFRACTAL RESULTS:`);
    console.log(`   Confirmed Fractals: ${confirmedFractals.length}`);
    console.log(`   Active Fib Retracements: ${fibRetracements.length}`);
    console.log(`   High-Probability Setups: ${snapshot.highProbabilitySetups.length}`);
    console.log(`   Market Structure: ${marketStructure}`);
    console.log(`   Immediate Signals: ${immediateSignals.length}`);
    
    return snapshot;
  }
  
  /**
   * Identify fractal patterns in market data
   */
  private static identifyFractals(
    marketData: MarketData[],
    config: MicrofractalConfiguration
  ): FractalPattern[] {
    
    const fractals: FractalPattern[] = [];
    const lookback = config.fractalLookback;
    
    // Calculate average volume for strength assessment
    const avgVolume = marketData.reduce((sum, bar) => sum + Number(bar.volume), 0) / marketData.length;
    
    // Scan for fractal patterns
    for (let i = lookback; i < marketData.length - lookback; i++) {
      const centerBar = marketData[i];
      
      // Check for bearish fractal (high)
      let isBearishFractal = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && marketData[j].high >= centerBar.high) {
          isBearishFractal = false;
          break;
        }
      }
      
      // Check for bullish fractal (low)
      let isBullishFractal = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && marketData[j].low <= centerBar.low) {
          isBullishFractal = false;
          break;
        }
      }
      
      // Create fractal if pattern found
      if (isBearishFractal || isBullishFractal) {
        const type = isBearishFractal ? 'BEARISH' : 'BULLISH';
        const price = isBearishFractal ? centerBar.high : centerBar.low;
        
        // Calculate fractal strength
        const strength = this.calculateFractalStrength(marketData, i, type, config);
        
        // Assess volume strength
        const volumeRatio = Number(centerBar.volume) / avgVolume;
        const volumeStrength = volumeRatio > 1.5 ? 'HIGH' : 
                             volumeRatio > 0.8 ? 'NORMAL' : 'LOW';
        
        // Fractal is confirmed if we have enough bars after it
        const confirmed = i < marketData.length - lookback;
        
        fractals.push({
          type,
          index: i,
          price,
          timestamp: centerBar.date,
          strength,
          confirmed,
          volume: Number(centerBar.volume),
          volumeStrength
        });
      }
    }
    
    return fractals;
  }
  
  /**
   * Calculate fractal strength based on price movement
   */
  private static calculateFractalStrength(
    marketData: MarketData[],
    fractalIndex: number,
    type: 'BULLISH' | 'BEARISH',
    config: MicrofractalConfiguration
  ): 'WEAK' | 'MODERATE' | 'STRONG' {
    
    const lookback = config.fractalLookback;
    const centerBar = marketData[fractalIndex];
    
    // Calculate price range around fractal
    let maxHigh = 0;
    let minLow = Infinity;
    
    for (let i = fractalIndex - lookback; i <= fractalIndex + lookback; i++) {
      if (i >= 0 && i < marketData.length) {
        maxHigh = Math.max(maxHigh, marketData[i].high);
        minLow = Math.min(minLow, marketData[i].low);
      }
    }
    
    const priceRange = maxHigh - minLow;
    const fractalExtreme = type === 'BEARISH' ? maxHigh : minLow;
    
    // Calculate strength based on range and position
    if (priceRange > config.minFractalStrength * 4) {
      return 'STRONG';
    } else if (priceRange > config.minFractalStrength * 2) {
      return 'MODERATE';
    } else {
      return 'WEAK';
    }
  }
  
  /**
   * Calculate Fibonacci retracements from swing highs and lows
   */
  private static calculateFibonacciRetracements(
    fractals: FractalPattern[],
    config: MicrofractalConfiguration
  ): FibonacciRetracement[] {
    
    const retracements: FibonacciRetracement[] = [];
    const confirmedFractals = fractals.filter(f => f.confirmed);
    
    // Find swing high/low pairs for retracements
    for (let i = 0; i < confirmedFractals.length - 1; i++) {
      for (let j = i + 1; j < confirmedFractals.length; j++) {
        const fractal1 = confirmedFractals[i];
        const fractal2 = confirmedFractals[j];
        
        // Check if we have a valid swing (high to low or low to high)
        if (fractal1.type !== fractal2.type) {
          const swingHigh = fractal1.type === 'BEARISH' ? fractal1.price : fractal2.price;
          const swingLow = fractal1.type === 'BULLISH' ? fractal1.price : fractal2.price;
          const swingDirection = fractal1.type === 'BULLISH' ? 'UP' : 'DOWN';
          
          // Only use if swing is significant
          const swingRange = swingHigh - swingLow;
          if (swingRange > config.minFractalStrength * 2) {
            
            const retracement = this.calculateFibLevels(swingHigh, swingLow, swingDirection);
            retracements.push(retracement);
          }
        }
      }
    }
    
    // Return most recent retracements
    return retracements.slice(-5);
  }
  
  /**
   * Calculate Fibonacci levels for a swing
   */
  private static calculateFibLevels(
    swingHigh: number,
    swingLow: number,
    direction: 'UP' | 'DOWN'
  ): FibonacciRetracement {
    
    const range = swingHigh - swingLow;
    
    // Standard Fibonacci ratios
    const fibRatios = {
      level0: direction === 'UP' ? swingLow : swingHigh,
      level236: direction === 'UP' ? swingHigh - (range * 0.236) : swingLow + (range * 0.236),
      level382: direction === 'UP' ? swingHigh - (range * 0.382) : swingLow + (range * 0.382),
      level500: direction === 'UP' ? swingHigh - (range * 0.5) : swingLow + (range * 0.5),
      level618: direction === 'UP' ? swingHigh - (range * 0.618) : swingLow + (range * 0.618),
      level786: direction === 'UP' ? swingHigh - (range * 0.786) : swingLow + (range * 0.786),
      level100: direction === 'UP' ? swingHigh : swingLow
    };
    
    // Fibonacci extensions
    const extensions = {
      level1272: direction === 'UP' ? swingLow - (range * 0.272) : swingHigh + (range * 0.272),
      level1618: direction === 'UP' ? swingLow - (range * 0.618) : swingHigh + (range * 0.618),
      level2618: direction === 'UP' ? swingLow - (range * 1.618) : swingHigh + (range * 1.618)
    };
    
    return {
      swingHigh,
      swingLow,
      swingDirection: direction,
      levels: fibRatios,
      extensions
    };
  }
  
  /**
   * Identify key Fibonacci levels near current price
   */
  private static identifyKeyFibLevels(
    retracements: FibonacciRetracement[],
    currentPrice: number,
    config: MicrofractalConfiguration
  ): Array<{ level: number; percentage: string; type: 'SUPPORT' | 'RESISTANCE' }> {
    
    const keyLevels: Array<{ level: number; percentage: string; type: 'SUPPORT' | 'RESISTANCE' }> = [];
    const tolerance = currentPrice * (config.fibTolerance / 100);
    
    for (const retracement of retracements) {
      const levels = [
        { value: retracement.levels.level236, name: '23.6%' },
        { value: retracement.levels.level382, name: '38.2%' },
        { value: retracement.levels.level500, name: '50.0%' },
        { value: retracement.levels.level618, name: '61.8%' },
        { value: retracement.levels.level786, name: '78.6%' }
      ];
      
      for (const level of levels) {
        const distance = Math.abs(level.value - currentPrice);
        if (distance <= config.confluenceRadius) {
          const type = level.value > currentPrice ? 'RESISTANCE' : 'SUPPORT';
          keyLevels.push({
            level: level.value,
            percentage: level.name,
            type
          });
        }
      }
    }
    
    // Remove duplicates and sort by proximity
    const uniqueLevels = keyLevels
      .filter((level, index, array) => 
        array.findIndex(l => Math.abs(l.level - level.level) < tolerance) === index
      )
      .sort((a, b) => Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice));
    
    return uniqueLevels.slice(0, 5); // Top 5 closest levels
  }
  
  /**
   * Find confluence between fractals and Fibonacci levels
   */
  private static findFractalFibConfluence(
    fractals: FractalPattern[],
    retracements: FibonacciRetracement[],
    currentPrice: number,
    config: MicrofractalConfiguration
  ): FractalFibConfluence[] {
    
    const confluences: FractalFibConfluence[] = [];
    
    for (const fractal of fractals) {
      for (const retracement of retracements) {
        const levels = Object.values(retracement.levels);
        
        for (const fibLevel of levels) {
          const distance = Math.abs(fractal.price - fibLevel);
          const toleranceAmount = fibLevel * (config.fibTolerance / 100);
          
          if (distance <= toleranceAmount) {
            // Calculate confluence score
            const confluence = this.calculateConfluenceScore(fractal, fibLevel, distance, config);
            
            if (confluence >= config.minConfluenceScore) {
              const fibPercentage = this.getFibPercentageName(retracement, fibLevel);
              const signalQuality = this.assessSignalQuality(confluence, fractal, distance);
              const setupType = this.determineSetupType(fractal, fibLevel, currentPrice);
              
              confluences.push({
                fractal,
                fibLevel,
                fibPercentage,
                confluence,
                priceDistance: distance,
                signalQuality,
                setupType
              });
            }
          }
        }
      }
    }
    
    return confluences.sort((a, b) => b.confluence - a.confluence);
  }
  
  /**
   * Calculate confluence score between fractal and Fibonacci level
   */
  private static calculateConfluenceScore(
    fractal: FractalPattern,
    fibLevel: number,
    distance: number,
    config: MicrofractalConfiguration
  ): number {
    
    let score = 0;
    
    // Distance factor (closer = better)
    const maxDistance = fibLevel * (config.fibTolerance / 100);
    const distanceFactor = 1 - (distance / maxDistance);
    score += distanceFactor * 0.4;
    
    // Fractal strength factor
    const strengthFactor = fractal.strength === 'STRONG' ? 1 : 
                          fractal.strength === 'MODERATE' ? 0.7 : 0.4;
    score += strengthFactor * 0.3;
    
    // Volume factor
    const volumeFactor = fractal.volumeStrength === 'HIGH' ? 1 : 
                        fractal.volumeStrength === 'NORMAL' ? 0.7 : 0.4;
    score += volumeFactor * 0.2;
    
    // Confirmation factor
    const confirmationFactor = fractal.confirmed ? 1 : 0.5;
    score += confirmationFactor * 0.1;
    
    return Math.min(1, score);
  }
  
  /**
   * Get Fibonacci percentage name for a level
   */
  private static getFibPercentageName(retracement: FibonacciRetracement, level: number): string {
    const tolerance = 0.01;
    
    if (Math.abs(level - retracement.levels.level236) < tolerance) return '23.6%';
    if (Math.abs(level - retracement.levels.level382) < tolerance) return '38.2%';
    if (Math.abs(level - retracement.levels.level500) < tolerance) return '50.0%';
    if (Math.abs(level - retracement.levels.level618) < tolerance) return '61.8%';
    if (Math.abs(level - retracement.levels.level786) < tolerance) return '78.6%';
    
    return 'Custom';
  }
  
  /**
   * Assess signal quality based on confluence factors
   */
  private static assessSignalQuality(
    confluence: number,
    fractal: FractalPattern,
    distance: number
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    
    if (confluence > 0.85 && fractal.strength === 'STRONG' && distance < 0.25) {
      return 'EXCELLENT';
    } else if (confluence > 0.7 && fractal.strength !== 'WEAK') {
      return 'GOOD';
    } else if (confluence > 0.6) {
      return 'FAIR';
    } else {
      return 'POOR';
    }
  }
  
  /**
   * Determine setup type based on fractal and price context
   */
  private static determineSetupType(
    fractal: FractalPattern,
    fibLevel: number,
    currentPrice: number
  ): 'REVERSAL' | 'CONTINUATION' | 'BREAKOUT' {
    
    const distanceFromCurrent = Math.abs(fibLevel - currentPrice) / currentPrice;
    
    if (distanceFromCurrent < 0.005) { // Very close to current price
      return 'REVERSAL';
    } else if (distanceFromCurrent < 0.02) { // Moderately close
      return 'CONTINUATION';
    } else {
      return 'BREAKOUT';
    }
  }
  
  /**
   * Analyze overall market structure
   */
  private static analyzeMarketStructure(
    fractals: FractalPattern[],
    marketData: MarketData[]
  ): 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGE_BOUND' | 'BREAKOUT' {
    
    if (fractals.length < 4) return 'RANGE_BOUND';
    
    const recentFractals = fractals.slice(-6);
    const highs = recentFractals.filter(f => f.type === 'BEARISH');
    const lows = recentFractals.filter(f => f.type === 'BULLISH');
    
    // Analyze trend in highs and lows
    const isHighsRising = highs.length >= 2 && 
      highs[highs.length - 1].price > highs[highs.length - 2].price;
    const isLowsRising = lows.length >= 2 && 
      lows[lows.length - 1].price > lows[lows.length - 2].price;
    
    const isHighsFalling = highs.length >= 2 && 
      highs[highs.length - 1].price < highs[highs.length - 2].price;
    const isLowsFalling = lows.length >= 2 && 
      lows[lows.length - 1].price < lows[lows.length - 2].price;
    
    if (isHighsRising && isLowsRising) {
      return 'TRENDING_UP';
    } else if (isHighsFalling && isLowsFalling) {
      return 'TRENDING_DOWN';
    } else {
      // Check for breakout
      const recentRange = Math.max(...marketData.slice(-10).map(b => b.high)) - 
                         Math.min(...marketData.slice(-10).map(b => b.low));
      const currentPrice = marketData[marketData.length - 1].close;
      
      // Simple breakout detection
      if (recentRange > 0 && Math.abs(currentPrice - marketData[marketData.length - 5].close) > recentRange * 0.5) {
        return 'BREAKOUT';
      }
      
      return 'RANGE_BOUND';
    }
  }
  
  /**
   * Analyze swing structure
   */
  private static analyzeSwingStructure(fractals: FractalPattern[]): 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'SIDEWAYS' {
    if (fractals.length < 4) return 'SIDEWAYS';
    
    const recentFractals = fractals.slice(-4);
    const highs = recentFractals.filter(f => f.type === 'BEARISH').map(f => f.price);
    const lows = recentFractals.filter(f => f.type === 'BULLISH').map(f => f.price);
    
    const isHigherHighs = highs.length >= 2 && highs[highs.length - 1] > highs[highs.length - 2];
    const isHigherLows = lows.length >= 2 && lows[lows.length - 1] > lows[lows.length - 2];
    const isLowerHighs = highs.length >= 2 && highs[highs.length - 1] < highs[highs.length - 2];
    const isLowerLows = lows.length >= 2 && lows[lows.length - 1] < lows[lows.length - 2];
    
    if (isHigherHighs && isHigherLows) {
      return 'HIGHER_HIGHS';
    } else if (isLowerHighs && isLowerLows) {
      return 'LOWER_LOWS';
    } else {
      return 'SIDEWAYS';
    }
  }
  
  /**
   * Generate immediate trading signals
   */
  private static generateTradingSignals(
    confluenceSetups: FractalFibConfluence[],
    keyFibLevels: Array<{ level: number; percentage: string; type: 'SUPPORT' | 'RESISTANCE' }>,
    currentPrice: number,
    marketStructure: string,
    config: MicrofractalConfiguration
  ): Array<{
    type: 'BUY' | 'SELL' | 'WAIT';
    confidence: number;
    entry: number;
    stopLoss: number;
    target: number;
    reason: string;
  }> {
    
    const signals: Array<{
      type: 'BUY' | 'SELL' | 'WAIT';
      confidence: number;
      entry: number;
      stopLoss: number;
      target: number;
      reason: string;
    }> = [];
    
    // High-quality confluence setups
    const excellentSetups = confluenceSetups.filter(setup => setup.signalQuality === 'EXCELLENT');
    
    for (const setup of excellentSetups) {
      const distance = Math.abs(setup.fibLevel - currentPrice);
      const toleranceAmount = currentPrice * 0.01; // 1% tolerance
      
      if (distance <= toleranceAmount) {
        const fractal = setup.fractal;
        const isNearSetup = distance <= currentPrice * 0.005; // 0.5% very close
        
        if (isNearSetup) {
          const signalType = fractal.type === 'BULLISH' ? 'BUY' : 'SELL';
          const entry = setup.fibLevel;
          
          // Calculate stop loss and target
          const atr = this.estimateATR(currentPrice); // Simplified ATR estimate
          const stopLoss = signalType === 'BUY' ? 
            entry - (atr * 1.5) : entry + (atr * 1.5);
          const target = signalType === 'BUY' ? 
            entry + (atr * 2.5) : entry - (atr * 2.5);
          
          signals.push({
            type: signalType,
            confidence: setup.confluence,
            entry,
            stopLoss,
            target,
            reason: `${fractal.type} fractal + ${setup.fibPercentage} Fib confluence`
          });
        }
      }
    }
    
    // If no immediate signals, suggest wait
    if (signals.length === 0) {
      signals.push({
        type: 'WAIT',
        confidence: 0.5,
        entry: currentPrice,
        stopLoss: currentPrice,
        target: currentPrice,
        reason: 'No high-probability setups currently available'
      });
    }
    
    return signals.slice(0, 3); // Limit to top 3 signals
  }
  
  /**
   * Simple ATR estimation for stop loss calculation
   */
  private static estimateATR(price: number): number {
    // Simplified ATR estimate - in production, use actual ATR calculation
    return price * 0.01; // 1% of price as rough ATR estimate
  }
}

export default MicrofractalFibonacci;