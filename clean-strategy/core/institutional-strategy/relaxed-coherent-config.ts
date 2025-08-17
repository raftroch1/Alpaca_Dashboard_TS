/**
 * RELAXED COHERENT STRATEGY CONFIGURATION
 * 
 * This configuration is designed to actually generate trades by:
 * 1. Treating EXTREME gamma risk as an opportunity, not a blocker
 * 2. Allowing all volatility regimes (including high-volatility opportunities)
 * 3. Reducing overly restrictive thresholds
 * 4. Focusing on confluence rather than elimination
 */

import { StrategyFrameworkConfig } from './coherent-strategy-framework';

export const RELAXED_TRADING_CONFIG: StrategyFrameworkConfig = {
  // Market condition filters - RELAXED
  minimumGexConfidence: 0.4,  // Reduced from 0.6
  requiredVolatilityRegime: ['SUPPRESSING', 'TRANSITIONAL', 'AMPLIFYING', 'EXTREME'], // ALL regimes allowed
  liquidityThresholds: {
    minHVNCount: 2,           // Reduced from 3
    maxLVNRatio: 0.6          // Increased from 0.4
  },
  
  // Trend filters - RELAXED
  avwapConfidenceThreshold: 0.5,  // Reduced from 0.7
  trendAlignmentRequired: false,   // Don't require perfect alignment
  
  // Entry triggers - RELAXED
  fractalConfidenceThreshold: 0.4, // Reduced from 0.6
  fibonacciTolerancePercent: 1.0,  // Increased from 0.5
  confluenceMinimumScore: 0.5,     // Reduced from 0.7
  
  // Risk management - ENHANCED but not blocking
  maxATRMultiplier: 4.0,           // Increased from 3.0
  volatilityRegimeFilters: [],     // NO volatility regime filters (was ['EXTREME'])
  dynamicSizingEnabled: true,
  
  // Integration weights - BALANCED
  weights: {
    gex: 0.25,
    avp: 0.20,
    avwap: 0.20,
    fractals: 0.20,
    atr: 0.15
  }
};

export const AGGRESSIVE_TRADING_CONFIG: StrategyFrameworkConfig = {
  // Market condition filters - VERY RELAXED
  minimumGexConfidence: 0.3,
  requiredVolatilityRegime: ['SUPPRESSING', 'TRANSITIONAL', 'AMPLIFYING', 'EXTREME'],
  liquidityThresholds: {
    minHVNCount: 1,           // Very low requirement
    maxLVNRatio: 0.8          // Very high tolerance
  },
  
  // Trend filters - VERY RELAXED
  avwapConfidenceThreshold: 0.3,
  trendAlignmentRequired: false,
  
  // Entry triggers - VERY RELAXED
  fractalConfidenceThreshold: 0.3,
  fibonacciTolerancePercent: 1.5,
  confluenceMinimumScore: 0.4,
  
  // Risk management - ENHANCED
  maxATRMultiplier: 5.0,
  volatilityRegimeFilters: [],     // NO filters
  dynamicSizingEnabled: true,
  
  // Integration weights
  weights: {
    gex: 0.30,    // Higher weight on GEX for volatility opportunities
    avp: 0.20,
    avwap: 0.15,
    fractals: 0.20,
    atr: 0.15
  }
};

/**
 * EXTREME GAMMA OPPORTUNITY CONFIG
 * 
 * Specifically designed to capitalize on EXTREME gamma risk situations
 * which are often the most profitable 0-DTE opportunities
 */
export const EXTREME_GAMMA_CONFIG: StrategyFrameworkConfig = {
  minimumGexConfidence: 0.5,
  requiredVolatilityRegime: ['EXTREME', 'AMPLIFYING'], // ONLY high-volatility regimes
  liquidityThresholds: {
    minHVNCount: 1,
    maxLVNRatio: 0.9          // Very high tolerance for extreme conditions
  },
  
  avwapConfidenceThreshold: 0.4,
  trendAlignmentRequired: false,   // Trend doesn't matter in extreme gamma
  
  fractalConfidenceThreshold: 0.4,
  fibonacciTolerancePercent: 2.0,  // Wide tolerance for extreme moves
  confluenceMinimumScore: 0.4,
  
  maxATRMultiplier: 6.0,           // Higher risk for higher reward
  volatilityRegimeFilters: [],
  dynamicSizingEnabled: true,
  
  weights: {
    gex: 0.40,    // HEAVY weight on GEX for extreme gamma plays
    avp: 0.15,
    avwap: 0.10,
    fractals: 0.25,
    atr: 0.10
  }
};

export const TRADING_CONFIGS = {
  RELAXED: RELAXED_TRADING_CONFIG,
  AGGRESSIVE: AGGRESSIVE_TRADING_CONFIG,
  EXTREME_GAMMA: EXTREME_GAMMA_CONFIG
};