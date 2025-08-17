#!/usr/bin/env node
/**
 * TEST RELAXED COHERENT FRAMEWORK
 * 
 * Tests the Coherent Strategy Framework with relaxed configurations
 * that should actually generate trades instead of blocking everything.
 */

import { MarketData, OptionsChain, Strategy } from '../../lib/types';
import { CoherentStrategyFramework } from '../core/institutional-strategy/coherent-strategy-framework';
import { TRADING_CONFIGS } from '../core/institutional-strategy/relaxed-coherent-config';

// Mock market data that should trigger trades
const mockMarketData: MarketData[] = [
  { id: '1', symbol: 'SPY', date: new Date('2024-01-15T09:30:00Z'), open: 480, high: 485, low: 478, close: 482, volume: BigInt(1000000) },
  { id: '2', symbol: 'SPY', date: new Date('2024-01-15T09:31:00Z'), open: 482, high: 487, low: 481, close: 485, volume: BigInt(1200000) },
  { id: '3', symbol: 'SPY', date: new Date('2024-01-15T09:32:00Z'), open: 485, high: 488, low: 483, close: 486, volume: BigInt(1100000) },
  { id: '4', symbol: 'SPY', date: new Date('2024-01-15T09:33:00Z'), open: 486, high: 490, low: 485, close: 488, volume: BigInt(1300000) },
  { id: '5', symbol: 'SPY', date: new Date('2024-01-15T09:34:00Z'), open: 488, high: 492, low: 487, close: 490, volume: BigInt(1400000) }
];

// Mock options chain with various strikes
const mockOptionsChain: OptionsChain[] = [
  {
    symbol: 'SPY',
    expiration: new Date('2024-01-15T16:00:00Z'),
    strike: 485,
    side: 'CALL',
    bid: 2.50,
    ask: 2.70,
    volume: 5000,
    openInterest: 10000,
    impliedVolatility: 0.25,
    delta: 0.55
  },
  {
    symbol: 'SPY',
    expiration: new Date('2024-01-15T16:00:00Z'),
    strike: 490,
    side: 'CALL',
    bid: 1.20,
    ask: 1.40,
    volume: 8000,
    openInterest: 15000,
    impliedVolatility: 0.28,
    delta: 0.35
  },
  {
    symbol: 'SPY',
    expiration: new Date('2024-01-15T16:00:00Z'),
    strike: 480,
    side: 'PUT',
    bid: 1.80,
    ask: 2.00,
    volume: 6000,
    openInterest: 12000,
    impliedVolatility: 0.26,
    delta: -0.45
  }
];

const mockStrategy: Strategy = {
  name: 'Relaxed Coherent 0-DTE',
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  maxPositions: 3
};

async function testRelaxedCoherentFramework() {
  console.log('🧪 TESTING RELAXED COHERENT FRAMEWORK');
  console.log('=' .repeat(60));
  
  const configs = [
    { name: 'RELAXED', config: TRADING_CONFIGS.RELAXED },
    { name: 'AGGRESSIVE', config: TRADING_CONFIGS.AGGRESSIVE },
    { name: 'EXTREME_GAMMA', config: TRADING_CONFIGS.EXTREME_GAMMA }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🎯 Testing ${name} Configuration:`);
    console.log('-' .repeat(40));
    
    try {
      const signal = await CoherentStrategyFramework.generateCoherentSignal(
        mockMarketData,
        mockOptionsChain,
        mockStrategy,
        25000,
        config
      );
      
      console.log(`📊 RESULTS for ${name}:`);
      console.log(`   Action: ${signal.action}`);
      console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   Signal Quality: ${signal.signalQuality}`);
      console.log(`   Entry Price: $${signal.entryPrice.toFixed(2)}`);
      console.log(`   Position Size: ${signal.positionSize}`);
      console.log(`   Max Risk: $${signal.maxRisk.toFixed(2)}`);
      console.log(`   Confluence Zones: ${signal.confluenceZones.length}`);
      console.log(`   Risk Warnings: ${signal.riskWarnings.length}`);
      
      if (signal.action !== 'NO_TRADE') {
        console.log(`   ✅ SUCCESS: ${name} config generated a trade!`);
        console.log(`   📈 Entry: $${signal.entryPrice.toFixed(2)}`);
        console.log(`   🎯 Target 1: $${signal.target1.toFixed(2)}`);
        console.log(`   🎯 Target 2: $${signal.target2.toFixed(2)}`);
        console.log(`   🛑 Stop Loss: $${signal.stopLoss.toFixed(2)}`);
        
        console.log(`\n   🧠 REASONING:`);
        console.log(`   Market: ${signal.reasoning.marketCondition}`);
        console.log(`   Trend: ${signal.reasoning.trendAnalysis}`);
        console.log(`   Entry: ${signal.reasoning.entryTrigger}`);
        console.log(`   Risk: ${signal.reasoning.riskAssessment}`);
        console.log(`   Decision: ${signal.reasoning.finalDecision}`);
      } else {
        console.log(`   ❌ FAILED: ${name} config still returned NO_TRADE`);
        console.log(`   Reason: ${signal.reasoning.finalDecision}`);
      }
      
    } catch (error: any) {
      console.error(`   💥 ERROR in ${name}:`, error.message);
    }
  }
  
  console.log('\n🎯 INTEGRATION TEST SUMMARY:');
  console.log('=' .repeat(60));
  console.log('If any configuration generated trades, the integration is working!');
  console.log('If all returned NO_TRADE, we need to investigate further.');
}

// CLI interface
if (require.main === module) {
  testRelaxedCoherentFramework()
    .then(() => {
      console.log('\n✅ Relaxed Coherent Framework test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testRelaxedCoherentFramework };