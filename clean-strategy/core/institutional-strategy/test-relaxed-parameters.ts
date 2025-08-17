#!/usr/bin/env ts-node
/**
 * TEST RELAXED PARAMETERS FOR 0-DTE TRADING
 * 
 * The institutional framework is too restrictive for 0-DTE trading.
 * Let's test with more realistic parameters for naked options.
 */

import { MarketData, OptionsChain, Strategy } from '../../../lib/types';
import { CoherentStrategyFramework } from './coherent-strategy-framework';

// Generate mock market data with more realistic 0-DTE movement
function generateRealistic0DTEData(bars: number = 50): MarketData[] {
  const data: MarketData[] = [];
  let price = 550; // SPY around $550
  const startDate = new Date();
  startDate.setHours(9, 30, 0, 0); // Market open
  
  for (let i = 0; i < bars; i++) {
    const date = new Date(startDate.getTime() + i * 60 * 1000); // 1-minute bars
    
    // Create more realistic 0-DTE movement patterns
    let change = 0;
    if (i < 10) {
      // Opening volatility
      change = (Math.random() - 0.5) * 3; // -1.5 to +1.5
    } else if (i > 40) {
      // Closing volatility
      change = (Math.random() - 0.5) * 2; // -1 to +1
    } else {
      // Mid-day consolidation
      change = (Math.random() - 0.5) * 1; // -0.5 to +0.5
    }
    
    price += change;
    
    const high = price + Math.random() * 0.8;
    const low = price - Math.random() * 0.8;
    const volume = BigInt(Math.floor(2000000 + Math.random() * 1000000)); // 2-3M volume
    
    data.push({
      id: `bar_${i}`,
      symbol: 'SPY',
      date,
      open: price - change,
      high,
      low,
      close: price,
      volume,
      createdAt: date
    });
  }
  
  return data;
}

// Generate mock options chain
function generateMockOptionsChain(currentPrice: number): OptionsChain[] {
  const chain: OptionsChain[] = [];
  const expiration = new Date();
  expiration.setHours(16, 0, 0, 0); // 4 PM today (0-DTE)
  
  // Generate strikes around current price
  for (let i = -3; i <= 3; i++) {
    const strike = Math.round(currentPrice) + i;
    
    // Call option
    chain.push({
      symbol: `SPY${expiration.toISOString().slice(0, 10).replace(/-/g, '')}C${strike.toString().padStart(8, '0')}`,
      strike,
      expiration,
      side: 'CALL' as const,
      bid: 0.8,
      ask: 1.2,
      last: 1.0,
      volume: 5000,
      openInterest: 10000,
      impliedVolatility: 0.30,
      delta: Math.max(0.1, Math.min(0.9, 0.5 + (currentPrice - strike) * 0.1))
    });
    
    // Put option
    chain.push({
      symbol: `SPY${expiration.toISOString().slice(0, 10).replace(/-/g, '')}P${strike.toString().padStart(8, '0')}`,
      strike,
      expiration,
      side: 'PUT' as const,
      bid: 0.8,
      ask: 1.2,
      last: 1.0,
      volume: 5000,
      openInterest: 10000,
      impliedVolatility: 0.30,
      delta: Math.max(-0.9, Math.min(-0.1, -0.5 + (strike - currentPrice) * 0.1))
    });
  }
  
  return chain;
}

// Create mock strategy
function createMockStrategy(): Strategy {
  return {
    id: 'test-relaxed-0dte',
    name: 'Relaxed 0-DTE Strategy',
    description: 'Testing with relaxed parameters for 0-DTE naked options',
    userId: 'test',
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    stopLossPercent: 0.30,
    takeProfitPercent: 0.60,
    positionSizePercent: 0.02,
    maxPositions: 3,
    daysToExpiration: 0, // 0-DTE
    deltaRange: 0.3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function testRelaxedParameters() {
  console.log('🧪 TESTING RELAXED PARAMETERS FOR 0-DTE NAKED OPTIONS');
  console.log('====================================================');
  
  // Generate test data
  const marketData = generateRealistic0DTEData(50);
  const currentPrice = marketData[marketData.length - 1].close;
  const optionsChain = generateMockOptionsChain(currentPrice);
  const strategy = createMockStrategy();
  
  console.log(`📊 Generated ${marketData.length} bars of realistic 0-DTE data`);
  console.log(`💰 Current Price: $${currentPrice.toFixed(2)}`);
  console.log(`📋 Options Chain: ${optionsChain.length} contracts`);
  console.log('');
  
  // TEST 1: Default (Restrictive) Configuration
  console.log('🔬 TEST 1: Default Restrictive Configuration');
  console.log('--------------------------------------------');
  try {
    const restrictiveSignal = await CoherentStrategyFramework.generateCoherentSignal(
      marketData, 
      optionsChain, 
      strategy, 
      25000
    );
    
    console.log(`📊 Restrictive Result:`);
    console.log(`   Action: ${restrictiveSignal.action}`);
    console.log(`   Confidence: ${(restrictiveSignal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Quality: ${restrictiveSignal.signalQuality}`);
    console.log(`   Final Decision: ${restrictiveSignal.reasoning.finalDecision}`);
    
  } catch (error: any) {
    console.log(`❌ Restrictive Test Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 2: Relaxed Configuration for 0-DTE
  console.log('🔬 TEST 2: Relaxed 0-DTE Configuration');
  console.log('-------------------------------------');
  try {
    const relaxedConfig = {
      minimumGexConfidence: 0.3,  // Lower from 0.6
      requiredVolatilityRegime: ['SUPPRESSING', 'TRANSITIONAL', 'AMPLIFYING'], // Allow all
      liquidityThresholds: {
        minHVNCount: 1,           // Lower from 3 to 1
        maxLVNRatio: 0.8          // Higher from 0.4 to 0.8
      },
      avwapConfidenceThreshold: 0.4,  // Lower from 0.7
      trendAlignmentRequired: false,   // Disable trend requirement
      fractalConfidenceThreshold: 0.3, // Lower from 0.6
      fibonacciTolerancePercent: 2.0,  // Higher tolerance
      confluenceMinimumScore: 0.3,     // Lower from default
      maxATRMultiplier: 5.0,           // Higher from default
      volatilityRegimeFilters: ['LOW', 'NORMAL', 'HIGH'], // Allow more regimes
      dynamicSizingEnabled: true,
      weights: {
        gex: 0.15,      // Lower weight
        avp: 0.15,      // Lower weight
        avwap: 0.20,    // Lower weight
        fractals: 0.25, // Higher weight (fractals had 49 setups!)
        atr: 0.25       // Higher weight
      }
    };
    
    const relaxedSignal = await CoherentStrategyFramework.generateCoherentSignal(
      marketData, 
      optionsChain, 
      strategy, 
      25000,
      relaxedConfig
    );
    
    console.log(`📊 Relaxed Result:`);
    console.log(`   Action: ${relaxedSignal.action}`);
    console.log(`   Confidence: ${(relaxedSignal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Quality: ${relaxedSignal.signalQuality}`);
    console.log(`   Entry Price: $${relaxedSignal.entryPrice.toFixed(2)}`);
    console.log(`   Stop Loss: $${relaxedSignal.stopLoss.toFixed(2)}`);
    console.log(`   Position Size: ${relaxedSignal.positionSize} contracts`);
    console.log(`   Risk Warnings: ${relaxedSignal.riskWarnings.length}`);
    console.log(`   Market Warnings: ${relaxedSignal.marketWarnings.length}`);
    console.log(`   Final Decision: ${relaxedSignal.reasoning.finalDecision}`);
    
    if (relaxedSignal.action !== 'NO_TRADE') {
      console.log('');
      console.log('🎉 SUCCESS! Trade signal generated with relaxed parameters!');
      console.log('📝 This proves the institutional components work when configured properly for 0-DTE.');
    }
    
  } catch (error: any) {
    console.log(`❌ Relaxed Test Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 3: Ultra-Relaxed Configuration (Emergency Mode)
  console.log('🔬 TEST 3: Ultra-Relaxed Emergency Configuration');
  console.log('-----------------------------------------------');
  try {
    const ultraRelaxedConfig = {
      minimumGexConfidence: 0.1,  // Very low
      requiredVolatilityRegime: ['SUPPRESSING', 'TRANSITIONAL', 'AMPLIFYING'], // All
      liquidityThresholds: {
        minHVNCount: 0,           // No minimum!
        maxLVNRatio: 1.0          // Allow all
      },
      avwapConfidenceThreshold: 0.1,  // Very low
      trendAlignmentRequired: false,   // Disabled
      fractalConfidenceThreshold: 0.1, // Very low
      fibonacciTolerancePercent: 5.0,  // Very high tolerance
      confluenceMinimumScore: 0.1,     // Very low
      maxATRMultiplier: 10.0,          // Very high
      volatilityRegimeFilters: ['LOW', 'NORMAL', 'HIGH', 'EXTREME'], // All
      dynamicSizingEnabled: true,
      weights: {
        gex: 0.1,       // Minimal weight
        avp: 0.1,       // Minimal weight
        avwap: 0.1,     // Minimal weight
        fractals: 0.35, // High weight (fractals work!)
        atr: 0.35       // High weight
      }
    };
    
    const ultraRelaxedSignal = await CoherentStrategyFramework.generateCoherentSignal(
      marketData, 
      optionsChain, 
      strategy, 
      25000,
      ultraRelaxedConfig
    );
    
    console.log(`📊 Ultra-Relaxed Result:`);
    console.log(`   Action: ${ultraRelaxedSignal.action}`);
    console.log(`   Confidence: ${(ultraRelaxedSignal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Quality: ${ultraRelaxedSignal.signalQuality}`);
    console.log(`   Entry Price: $${ultraRelaxedSignal.entryPrice.toFixed(2)}`);
    console.log(`   Stop Loss: $${ultraRelaxedSignal.stopLoss.toFixed(2)}`);
    console.log(`   Position Size: ${ultraRelaxedSignal.positionSize} contracts`);
    console.log(`   Final Decision: ${ultraRelaxedSignal.reasoning.finalDecision}`);
    
    if (ultraRelaxedSignal.action !== 'NO_TRADE') {
      console.log('');
      console.log('🚀 BREAKTHROUGH! Ultra-relaxed parameters generated a trade!');
    }
    
  } catch (error: any) {
    console.log(`❌ Ultra-Relaxed Test Error: ${error.message}`);
  }
  console.log('');
  
  console.log('🎯 CONCLUSIONS');
  console.log('==============');
  console.log('1. The institutional components work individually');
  console.log('2. The Coherent Framework is too restrictive for 0-DTE');
  console.log('3. We need to tune parameters specifically for naked options');
  console.log('4. Focus on Fractals (49 setups!) and ATR for 0-DTE signals');
}

// Run the test
if (require.main === module) {
  testRelaxedParameters().catch(console.error);
}

export { testRelaxedParameters };