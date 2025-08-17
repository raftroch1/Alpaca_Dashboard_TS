#!/usr/bin/env ts-node
/**
 * TEST INSTITUTIONAL COMPONENTS WITH REAL ALPACA DATA
 * 
 * This test uses actual market data from Alpaca to test each institutional
 * component and see which ones are blocking naked options trades.
 */

import { alpacaClient } from '../../../../lib/alpaca';
import { MarketData, OptionsChain, Strategy } from '../../../lib/types';
import { GammaExposureEngine } from './gamma-exposure-engine';
import { AnchoredVolumeProfile } from './anchored-volume-profile';
import { AnchoredVWAP } from './anchored-vwap';
import { MicrofractalFibonacci } from './microfractal-fibonacci';
import { EnhancedATRRiskManager } from './enhanced-atr-risk-mgmt';
import { CoherentStrategyFramework } from './coherent-strategy-framework';

async function testWithRealData() {
  console.log('🔍 TESTING INSTITUTIONAL COMPONENTS WITH REAL ALPACA DATA');
  console.log('=' .repeat(60));
  
  try {
    // Get real SPY data from Alpaca
    console.log('📊 Fetching real SPY market data from Alpaca...');
    const marketData = await alpacaClient.getMarketData('SPY', 100); // Last 100 bars
    
    if (!marketData || marketData.length === 0) {
      console.log('❌ No market data received from Alpaca');
      return;
    }
    
    console.log(`✅ Received ${marketData.length} bars of real market data`);
    console.log(`   Latest price: $${marketData[marketData.length - 1].close}`);
    console.log(`   Date range: ${marketData[0].date} to ${marketData[marketData.length - 1].date}`);
    
    // Create mock options chain for testing
    const currentPrice = marketData[marketData.length - 1].close;
    const optionsChain: OptionsChain[] = [
      {
        symbol: 'SPY',
        strike: Math.round(currentPrice),
        side: 'CALL' as const,
        bid: 2.50,
        ask: 2.60,
        expiration: new Date(),
        delta: 0.5,
        volume: 1000,
        openInterest: 5000
      },
      {
        symbol: 'SPY',
        strike: Math.round(currentPrice),
        side: 'PUT' as const,
        bid: 2.40,
        ask: 2.50,
        expiration: new Date(),
        delta: -0.5,
        volume: 800,
        openInterest: 4500
      }
    ];
    
    // Mock strategy for testing
    const strategy: Strategy = {
      id: 'test-real-data',
      userId: 'test',
      name: 'Real Data Test',
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      momentumThreshold: 0.5,
      volumeThreshold: 1.2,
      maxPositions: 3,
      riskPerTrade: 0.02,
      createdAt: new Date(),
      updatedAt: new Date(),
      deltaRange: 0.2,
      isActive: true
    };
    
    console.log('\n🧪 TESTING INDIVIDUAL COMPONENTS WITH REAL DATA:');
    console.log('-'.repeat(50));
    
    // Test 1: GEX Engine
    console.log('\n1️⃣ GAMMA EXPOSURE ENGINE:');
    const gexSnapshot = GammaExposureEngine.calculateGEX(marketData, optionsChain);
    console.log(`   Net GEX: ${gexSnapshot.netGEX.toFixed(2)}`);
    console.log(`   Risk Level: ${gexSnapshot.riskLevel}`);
    console.log(`   Market Positioning: ${gexSnapshot.marketPositioning}`);
    const gexBlocking = gexSnapshot.riskLevel === 'EXTREME';
    console.log(`   🎯 Would GEX block trades? ${gexBlocking ? '❌ YES' : '✅ NO'}`);
    
    // Test 2: Anchored Volume Profile
    console.log('\n2️⃣ ANCHORED VOLUME PROFILE:');
    const avpSnapshot = AnchoredVolumeProfile.calculateAVP(marketData, '09:30');
    console.log(`   Price Relative to VA: ${avpSnapshot.priceRelativeToVA}`);
    console.log(`   POC: $${avpSnapshot.valueArea.poc.toFixed(2)}`);
    console.log(`   Liquidity Profile: ${avpSnapshot.liquidityProfile}`);
    console.log(`   HVN Count: ${avpSnapshot.hvnCount}`);
    const avpBlocking = avpSnapshot.liquidityProfile === 'ILLIQUID';
    console.log(`   🎯 Would AVP block trades? ${avpBlocking ? '❌ YES' : '✅ NO'}`);
    
    // Test 3: Anchored VWAP
    console.log('\n3️⃣ ANCHORED VWAP:');
    const avwapSnapshot = AnchoredVWAP.calculateAVWAP(marketData, '09:30');
    console.log(`   Current AVWAP: $${avwapSnapshot.currentAVWAP.toFixed(2)}`);
    console.log(`   Price vs AVWAP: ${avwapSnapshot.priceVsAVWAP}`);
    console.log(`   Signal Quality: ${avwapSnapshot.signalQuality}`);
    const avwapBlocking = avwapSnapshot.signalQuality === 'LOW';
    console.log(`   🎯 Would AVWAP block trades? ${avwapBlocking ? '❌ YES' : '✅ NO'}`);
    
    // Test 4: Microfractal Fibonacci
    console.log('\n4️⃣ MICROFRACTAL FIBONACCI:');
    const fractalSnapshot = MicrofractalFibonacci.analyzeMicrofractals(marketData);
    console.log(`   High-Probability Setups: ${fractalSnapshot.highProbabilitySetups}`);
    console.log(`   Confluence Zones: ${fractalSnapshot.confluenceZones.length}`);
    console.log(`   Signal Strength: ${fractalSnapshot.signalStrength}`);
    const fractalBlocking = fractalSnapshot.highProbabilitySetups < 5;
    console.log(`   🎯 Would Fractals block trades? ${fractalBlocking ? '❌ YES' : '✅ NO'}`);
    
    // Test 5: Enhanced ATR Risk Manager
    console.log('\n5️⃣ ENHANCED ATR RISK MANAGER:');
    const atrSnapshot = EnhancedATRRiskManager.calculateATRRisk(marketData, strategy);
    console.log(`   Volatility Regime: ${atrSnapshot.volatilityRegime}`);
    console.log(`   Risk Level: ${atrSnapshot.riskLevel}`);
    console.log(`   Position Size Multiplier: ${atrSnapshot.positionSizeMultiplier.toFixed(2)}`);
    const atrBlocking = atrSnapshot.volatilityRegime === 'EXTREME';
    console.log(`   🎯 Would ATR block trades? ${atrBlocking ? '❌ YES' : '✅ NO'}`);
    
    // Test 6: Coherent Strategy Framework (Final Decision)
    console.log('\n6️⃣ COHERENT STRATEGY FRAMEWORK:');
    const coherentFramework = new CoherentStrategyFramework({
      minConfluenceScore: 0.3,  // Relaxed from default
      minHVNCount: 2,           // Relaxed from 3
      maxVolatilityRegime: 'HIGH' // Allow HIGH volatility
    });
    
    const finalDecision = coherentFramework.generateCoherentSignal(marketData, optionsChain, strategy);
    console.log(`   Final Decision: ${finalDecision.action}`);
    console.log(`   Confidence: ${(finalDecision.confidence * 100).toFixed(1)}%`);
    if (finalDecision.action === 'NO_TRADE') {
      console.log(`   Reason: ${finalDecision.reason}`);
    }
    
    console.log('\n📊 SUMMARY WITH REAL DATA:');
    console.log('=' .repeat(40));
    console.log(`GEX Blocking: ${gexBlocking ? '❌' : '✅'}`);
    console.log(`AVP Blocking: ${avpBlocking ? '❌' : '✅'}`);
    console.log(`AVWAP Blocking: ${avwapBlocking ? '❌' : '✅'}`);
    console.log(`Fractals Blocking: ${fractalBlocking ? '❌' : '✅'}`);
    console.log(`ATR Blocking: ${atrBlocking ? '❌' : '✅'}`);
    console.log(`Final Result: ${finalDecision.action === 'NO_TRADE' ? '❌ NO TRADE' : '✅ TRADE SIGNAL'}`);
    
  } catch (error) {
    console.error('❌ Error testing with real data:', error);
  }
}

// Run the test
testWithRealData();