#!/usr/bin/env ts-node
/**
 * TEST HYBRID SIGNAL GENERATOR WITH REAL DATA
 * 
 * This will test the hybrid signal generator with actual market data
 * to see if it generates proper naked call/put signals.
 */

import { alpacaClient } from '../../lib/alpaca';
import { MarketData, OptionsChain, Strategy } from '../../lib/types';
import { HybridSignalGenerator } from '../working/hybrid-signal-generator';

async function testHybridSignals() {
  console.log('🔍 TESTING HYBRID SIGNAL GENERATOR WITH REAL DATA');
  console.log('='.repeat(60));
  
  try {
    // Get real SPY data from Alpaca
    console.log('📊 Fetching real SPY market data...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const marketData = await alpacaClient.getMarketData('SPY', startDate, endDate, '1Min');
    
    if (!marketData || marketData.length === 0) {
      console.log('❌ No market data received');
      return;
    }
    
    console.log(`✅ Received ${marketData.length} bars of real market data`);
    console.log(`   Latest price: $${marketData[marketData.length - 1].close}`);
    
    // Create mock options chain (since we don't have real options data)
    const mockOptionsChain: OptionsChain[] = [
      {
        symbol: 'SPY241220C00550000',
        strike: 550,
        side: 'CALL' as const,
        bid: 2.50,
        ask: 2.55,
        expiration: new Date('2024-12-20'),
        delta: 0.5,
        volume: 1000,
        openInterest: 5000
      },
      {
        symbol: 'SPY241220P00550000', 
        strike: 550,
        side: 'PUT' as const,
        bid: 2.45,
        ask: 2.50,
        expiration: new Date('2024-12-20'),
        delta: -0.5,
        volume: 800,
        openInterest: 4500
      }
    ];
    
    // Create mock strategy
    const strategy: Strategy = {
      id: 'test-hybrid',
      userId: 'test',
      name: 'Test Hybrid Strategy',
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.2,
      positionSizePercent: 0.02,
      maxPositions: 3,
      daysToExpiration: 0,
      deltaRange: 0.2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Test the hybrid signal generator
    console.log('\n🎯 Testing Hybrid Signal Generator...');
    const hybridGenerator = new HybridSignalGenerator();
    
    const signal = await hybridGenerator.generateHybridSignal(
      marketData,
      mockOptionsChain,
      strategy
    );
    
    if (!signal) {
      console.log('❌ No signal generated');
      return;
    }
    
    console.log('\n📊 HYBRID SIGNAL RESULTS:');
    console.log(`   Action: ${signal.action}`);
    console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Signal Type: ${signal.signalType}`);
    console.log(`   Target Options: ${signal.targetOptions.length}`);
    console.log(`   Risk Level: ${signal.riskLevel}`);
    
    if (signal.reasoning.length > 0) {
      console.log('\n💭 Reasoning:');
      signal.reasoning.forEach((reason: string, i: number) => {
        console.log(`   ${i + 1}. ${reason}`);
      });
    }
    
    if (signal.action !== 'NO_TRADE') {
      console.log('\n✅ TRADE SIGNAL GENERATED!');
      console.log(`   Target Profit: $${signal.targetProfit.toFixed(2)}`);
      console.log(`   Max Loss: $${signal.maxLoss.toFixed(2)}`);
      console.log(`   Expected Hold: ${signal.expectedHoldMinutes} minutes`);
    } else {
      console.log('\n❌ NO TRADE SIGNAL');
    }
    
  } catch (error) {
    console.error('❌ Error testing hybrid signals:', error);
  }
}

// Run the test
testHybridSignals().catch(console.error);