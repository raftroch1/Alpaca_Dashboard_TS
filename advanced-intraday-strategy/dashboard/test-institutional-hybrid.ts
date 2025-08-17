#!/usr/bin/env ts-node
/**
 * TEST INSTITUTIONAL HYBRID ENGINE
 * 
 * Tests the new engine that combines:
 * - Proven hybrid strategy (77.8% win rate)
 * - REALISTIC thresholds (RSI 30/70, not 20/80)
 * - $300/day target with unlimited trades
 * - Institutional risk management
 */

import { InstitutionalHybridEngine } from './institutional-hybrid-engine';
import { TradingParameters, ParameterPresets } from './trading-parameters';

async function testInstitutionalHybrid() {
  console.log('🏛️ TESTING INSTITUTIONAL HYBRID ENGINE');
  console.log('   💰 Target: $300/day with UNLIMITED trades');
  console.log('   🎯 RSI: 30/70 (REALISTIC, not 20/80)');
  console.log('   🎯 Momentum: 0.08% (ACHIEVABLE, not 0.5%)');
  console.log('='.repeat(60));
  
  try {
    // Create hybrid engine
    const hybridEngine = new InstitutionalHybridEngine();
    
    // Create mock market data (simulate realistic conditions)
    const mockMarketData = [];
    const basePrice = 630;
    const now = new Date();
    
    // Generate 100 bars of realistic market data
    for (let i = 0; i < 100; i++) {
      const time = new Date(now.getTime() - (100 - i) * 60000); // 1-minute bars
      const price = basePrice + Math.sin(i / 10) * 2 + (Math.random() - 0.5) * 0.5;
      
      mockMarketData.push({
        id: `spy-${i}`,
        symbol: 'SPY',
        date: time,
        open: price - 0.1,
        high: price + 0.2,
        low: price - 0.2,
        close: price,
        volume: BigInt(Math.floor(1000000 + Math.random() * 500000)),
        createdAt: time
      });
    }
    
    // Create mock options chain
    const mockOptionsChain = [];
    for (let strike = 620; strike <= 640; strike += 1) {
      mockOptionsChain.push({
        symbol: `SPY${strike}C`,
        strike,
        side: 'CALL' as const,
        bid: 2.5,
        ask: 2.7,
        expiration: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        delta: 0.5,
        volume: 1000,
        openInterest: 5000
      });
    }
    
    // Create strategy from BALANCED parameters (more realistic than CONSERVATIVE)
    const strategy = {
      id: 'test-hybrid',
      userId: 'test',
      name: 'Institutional Hybrid Test',
      rsiPeriod: 14,
      rsiOverbought: 70,  // REALISTIC
      rsiOversold: 30,    // REALISTIC
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      daysToExpiration: 0,
      maxPositions: 5,
      positionSizePercent: 2,
      stopLossPercent: 35,
      takeProfitPercent: 15,
      enableBreakoutSignals: true,
      enableTimeBasedSignals: true,
      deltaRange: 0.2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📊 TESTING SIGNAL GENERATION...');
    console.log(`   Market Data: ${mockMarketData.length} bars`);
    console.log(`   Options Chain: ${mockOptionsChain.length} contracts`);
    console.log(`   Current Price: $${mockMarketData[mockMarketData.length - 1].close.toFixed(2)}`);
    console.log('');
    
    // Test signal generation
    const signal = await hybridEngine.generateInstitutionalHybridSignal(
      mockMarketData,
      mockOptionsChain,
      strategy
    );
    
    if (signal) {
      console.log('✅ INSTITUTIONAL HYBRID SIGNAL GENERATED!');
      console.log(`   Action: ${signal.action}`);
      console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   Signal Type: ${signal.signalType}`);
      console.log(`   Target Profit: $${signal.targetProfit}`);
      console.log(`   Max Loss: $${signal.maxLoss}`);
      console.log(`   Quality: ${signal.quality}`);
      console.log(`   Reasoning: ${signal.reasoning.join(', ')}`);
      console.log('');
      console.log('🏛️ INSTITUTIONAL FEATURES:');
      console.log(`   GEX Analysis: ${signal.institutionalFeatures.gexAnalysis ? 'Active' : 'N/A'}`);
      console.log(`   Volume Profile: ${signal.institutionalFeatures.volumeProfile ? 'Active' : 'N/A'}`);
      console.log(`   AVWAP: ${signal.institutionalFeatures.avwapAnalysis ? 'Active' : 'N/A'}`);
      console.log(`   Fractals: ${signal.institutionalFeatures.fractalAnalysis ? 'Active' : 'N/A'}`);
      console.log(`   ATR Risk: ${signal.institutionalFeatures.atrRisk ? 'Active' : 'N/A'}`);
      console.log('');
      console.log('🎯 GREEKS REQUIREMENTS:');
      console.log(`   Min Delta: ${signal.greeksRequirements.minDelta}`);
      console.log(`   Max Gamma: ${signal.greeksRequirements.maxGamma}`);
      console.log(`   Max Theta: ${signal.greeksRequirements.maxTheta}`);
      
    } else {
      console.log('❌ NO SIGNAL GENERATED');
      console.log('   This might indicate thresholds are still too restrictive');
    }
    
    console.log('');
    console.log('🎉 INSTITUTIONAL HYBRID TEST COMPLETED');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  }
}

testInstitutionalHybrid();