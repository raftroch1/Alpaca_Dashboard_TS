#!/usr/bin/env ts-node
/**
 * TEST NAKED OPTIONS WITH INSTITUTIONAL COMPONENTS
 * 
 * This test will check each institutional component individually to see
 * which one is blocking our trade signals for naked calls/puts.
 */

import { MarketData, OptionsChain, Strategy } from '../../../lib/types';
import { GammaExposureEngine } from './gamma-exposure-engine';
import { AnchoredVolumeProfile } from './anchored-volume-profile';
import { AnchoredVWAP } from './anchored-vwap';
import { MicrofractalFibonacci } from './microfractal-fibonacci';
import { EnhancedATRRiskManager } from './enhanced-atr-risk-mgmt';
import { CoherentStrategyFramework } from './coherent-strategy-framework';

// Generate mock market data
function generateMockMarketData(bars: number = 100): MarketData[] {
  const data: MarketData[] = [];
  let price = 550; // SPY around $550
  const startDate = new Date();
  startDate.setHours(9, 30, 0, 0); // Market open
  
  for (let i = 0; i < bars; i++) {
    const date = new Date(startDate.getTime() + i * 60 * 1000); // 1-minute bars
    
    // Create realistic price movement
    const change = (Math.random() - 0.5) * 2; // -1 to +1
    price += change;
    
    const high = price + Math.random() * 0.5;
    const low = price - Math.random() * 0.5;
    const volume = BigInt(Math.floor(1000000 + Math.random() * 500000)); // 1-1.5M volume
    
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

// Generate mock options chain for naked options
function generateMockOptionsChain(currentPrice: number): OptionsChain[] {
  const chain: OptionsChain[] = [];
  const expiration = new Date();
  expiration.setHours(16, 0, 0, 0); // 4 PM today (0-DTE)
  
  // Generate strikes around current price
  for (let i = -5; i <= 5; i++) {
    const strike = Math.round(currentPrice) + i;
    
    // Call option
    chain.push({
      symbol: `SPY${expiration.toISOString().slice(0, 10).replace(/-/g, '')}C${strike.toString().padStart(8, '0')}`,
      strike,
      expiration,
      side: 'CALL' as const,
      bid: 0.5,
      ask: 0.7,
      last: 0.6,
      volume: 1000,
      openInterest: 5000,
      impliedVolatility: 0.25,
      delta: 0.5
    });
    
    // Put option
    chain.push({
      symbol: `SPY${expiration.toISOString().slice(0, 10).replace(/-/g, '')}P${strike.toString().padStart(8, '0')}`,
      strike,
      expiration,
      side: 'PUT' as const,
      bid: 0.5,
      ask: 0.7,
      last: 0.6,
      volume: 1000,
      openInterest: 5000,
      impliedVolatility: 0.25,
      delta: -0.5
    });
  }
  
  return chain;
}

// Create mock strategy
function createMockStrategy(): Strategy {
  return {
    id: 'test-naked-options',
    name: 'Naked Options Test Strategy',
    description: 'Testing naked calls and puts with institutional components',
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
    deltaRange: 0.2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function testInstitutionalComponents() {
  console.log('🧪 TESTING INSTITUTIONAL COMPONENTS FOR NAKED OPTIONS');
  console.log('=====================================================');
  
  // Generate test data
  const marketData = generateMockMarketData(50);
  const currentPrice = marketData[marketData.length - 1].close;
  const optionsChain = generateMockOptionsChain(currentPrice);
  const strategy = createMockStrategy();
  
  console.log(`📊 Generated ${marketData.length} bars of market data`);
  console.log(`💰 Current Price: $${currentPrice.toFixed(2)}`);
  console.log(`📋 Options Chain: ${optionsChain.length} contracts`);
  console.log('');
  
  // TEST 1: GEX Engine
  console.log('🔬 TEST 1: Gamma Exposure Engine');
  console.log('--------------------------------');
  try {
    const gexSnapshot = GammaExposureEngine.calculateGEX(optionsChain, currentPrice);
    console.log(`✅ GEX Analysis Complete:`);
    console.log(`   Volatility Regime: ${gexSnapshot.volatilityRegime}`);
    console.log(`   Gamma Risk: ${gexSnapshot.gammaRisk}`);
    console.log(`   Market Maker Positioning: ${gexSnapshot.marketMakerPositioning}`);
    console.log(`   Total Net Gamma: ${gexSnapshot.totalNetGamma.toFixed(2)}`);
    
    // Check if GEX would block trades
    const gexBlocking = gexSnapshot.gammaRisk === 'EXTREME' || gexSnapshot.volatilityRegime === 'AMPLIFYING';
    console.log(`   🚨 Would GEX block trades? ${gexBlocking ? 'YES' : 'NO'}`);
  } catch (error: any) {
    console.log(`❌ GEX Engine Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 2: Anchored Volume Profile
  console.log('🔬 TEST 2: Anchored Volume Profile');
  console.log('----------------------------------');
  try {
    const sessionStart = 0; // Start of data
    const avpSnapshot = AnchoredVolumeProfile.calculateAVP(marketData, sessionStart, 'Session Open');
    console.log(`✅ AVP Analysis Complete:`);
    console.log(`   Market Structure: ${avpSnapshot.marketStructure}`);
    console.log(`   Price Relative to VA: ${avpSnapshot.priceRelativeToVA}`);
    console.log(`   POC: $${avpSnapshot.valueArea.poc.toFixed(2)}`);
    console.log(`   Liquidity Profile: ${avpSnapshot.liquidityProfile}`);
    
    // Check if AVP would block trades
    const avpBlocking = avpSnapshot.liquidityProfile === 'ILLIQUID' || avpSnapshot.priceRelativeToVA === 'BELOW_VAL';
    console.log(`   🚨 Would AVP block trades? ${avpBlocking ? 'YES' : 'NO'}`);
  } catch (error: any) {
    console.log(`❌ AVP Engine Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 3: Anchored VWAP
  console.log('🔬 TEST 3: Anchored VWAP');
  console.log('------------------------');
  try {
    const sessionStart = 0; // Start of data
    const avwapSnapshot = AnchoredVWAP.calculateAVWAP(marketData, sessionStart, 'Session Open');
    console.log(`✅ AVWAP Analysis Complete:`);
    console.log(`   Trend Direction: ${avwapSnapshot.trendDirection}`);
    console.log(`   Signal Quality: ${avwapSnapshot.signalQuality}`);
    console.log(`   Current AVWAP: $${avwapSnapshot.currentAVWAP.toFixed(2)}`);
    console.log(`   Price Position: ${avwapSnapshot.pricePosition}`);
    
    // Check if AVWAP would block trades
    const avwapBlocking = avwapSnapshot.signalQuality === 'LOW' || avwapSnapshot.trendDirection === 'NEUTRAL';
    console.log(`   🚨 Would AVWAP block trades? ${avwapBlocking ? 'YES' : 'NO'}`);
  } catch (error: any) {
    console.log(`❌ AVWAP Engine Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 4: Microfractal-Fibonacci
  console.log('🔬 TEST 4: Microfractal-Fibonacci');
  console.log('---------------------------------');
  try {
    const fractalSnapshot = MicrofractalFibonacci.analyzeMicrofractals(marketData);
    console.log(`✅ Fractal Analysis Complete:`);
    console.log(`   Market Structure: ${fractalSnapshot.marketStructure}`);
    console.log(`   High-Probability Setups: ${fractalSnapshot.highProbabilitySetups.length}`);
    console.log(`   Immediate Signals: ${fractalSnapshot.immediateSignals.length}`);
    console.log(`   Confirmed Fractals: ${fractalSnapshot.confirmedFractals.length}`);
    
    // Check if Fractals would block trades
    const fractalBlocking = fractalSnapshot.highProbabilitySetups.length === 0 && fractalSnapshot.immediateSignals.length === 0;
    console.log(`   🚨 Would Fractals block trades? ${fractalBlocking ? 'YES' : 'NO'}`);
  } catch (error: any) {
    console.log(`❌ Fractal Engine Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 5: Enhanced ATR Risk Management
  console.log('🔬 TEST 5: Enhanced ATR Risk Management');
  console.log('--------------------------------------');
  try {
    const atrSnapshot = EnhancedATRRiskManager.analyzeATR(marketData, 25000, 1.2);
    console.log(`✅ ATR Analysis Complete:`);
    console.log(`   Volatility Regime: ${atrSnapshot.volatilityRegime}`);
    console.log(`   ATR: ${atrSnapshot.atr.toFixed(2)}`);
    console.log(`   Recommended Position Size: ${atrSnapshot.recommendedPositionSize}`);
    console.log(`   Warnings: ${atrSnapshot.volatilityWarnings.length}`);
    
    // Check if ATR would block trades
    const atrBlocking = atrSnapshot.volatilityRegime === 'EXTREME' || atrSnapshot.volatilityWarnings.length > 2;
    console.log(`   🚨 Would ATR block trades? ${atrBlocking ? 'YES' : 'NO'}`);
  } catch (error: any) {
    console.log(`❌ ATR Engine Error: ${error.message}`);
  }
  console.log('');
  
  // TEST 6: Coherent Strategy Framework (THE BIG TEST)
  console.log('🔬 TEST 6: Coherent Strategy Framework');
  console.log('--------------------------------------');
  try {
    const signal = await CoherentStrategyFramework.generateCoherentSignal(
      marketData, 
      optionsChain, 
      strategy, 
      25000
    );
    
    console.log(`✅ Coherent Framework Complete:`);
    console.log(`   Action: ${signal.action}`);
    console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Quality: ${signal.signalQuality}`);
    console.log(`   Entry Price: $${signal.entryPrice.toFixed(2)}`);
    console.log(`   Stop Loss: $${signal.stopLoss.toFixed(2)}`);
    console.log(`   Position Size: ${signal.positionSize} contracts`);
    console.log(`   Risk Warnings: ${signal.riskWarnings.length}`);
    console.log(`   Market Warnings: ${signal.marketWarnings.length}`);
    
    // This is the final result
    const finalBlocking = signal.action === 'NO_TRADE';
    console.log(`   🚨 Final Result: ${finalBlocking ? 'NO TRADE (BLOCKED)' : 'TRADE GENERATED'}`);
    
    if (finalBlocking) {
      console.log(`   📝 Reasoning:`);
      console.log(`      Market Condition: ${signal.reasoning.marketCondition}`);
      console.log(`      Trend Analysis: ${signal.reasoning.trendAnalysis}`);
      console.log(`      Entry Trigger: ${signal.reasoning.entryTrigger}`);
      console.log(`      Risk Assessment: ${signal.reasoning.riskAssessment}`);
      console.log(`      Final Decision: ${signal.reasoning.finalDecision}`);
    }
    
  } catch (error: any) {
    console.log(`❌ Coherent Framework Error: ${error.message}`);
  }
  console.log('');
  
  console.log('🎯 SUMMARY');
  console.log('==========');
  console.log('Each component has been tested individually.');
  console.log('Check the output above to see which component is blocking trades.');
  console.log('The final Coherent Strategy Framework test shows the combined result.');
}

// Run the test
if (require.main === module) {
  testInstitutionalComponents().catch(console.error);
}

export { testInstitutionalComponents };