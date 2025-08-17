#!/usr/bin/env node
/**
 * SIMPLE RELAXED INTEGRATION TEST
 * 
 * Tests the Coherent Strategy Framework with relaxed configurations
 * using the same mock data that worked in our previous tests.
 */

import { CoherentStrategyFramework } from '../core/institutional-strategy/coherent-strategy-framework';
import { TRADING_CONFIGS } from '../core/institutional-strategy/relaxed-coherent-config';

// Use the same mock data generation from our successful test
function generateMockMarketData() {
  const data = [];
  const basePrice = 480;
  const now = new Date();
  
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(now.getTime() - (10 - i) * 60000); // 1 minute intervals
    const price = basePrice + Math.sin(i * 0.5) * 5 + i * 0.5; // Trending upward with volatility
    
    data.push({
      id: `mock-${i}`,
      symbol: 'SPY',
      date: timestamp,
      open: price - 0.5,
      high: price + 1.0,
      low: price - 1.0,
      close: price,
      volume: BigInt(1000000 + i * 100000),
      createdAt: timestamp
    });
  }
  
  return data;
}

function generateMockOptionsChain() {
  const currentPrice = 485;
  const expiration = new Date();
  expiration.setHours(16, 0, 0, 0); // 4 PM today
  
  const options = [];
  
  // Generate calls and puts around current price
  for (let i = -2; i <= 2; i++) {
    const strike = currentPrice + i * 5;
    
    // Call option
    options.push({
      symbol: 'SPY',
      expiration,
      strike,
      side: 'CALL' as const,
      bid: Math.max(0.05, (currentPrice - strike) + 2.0 + Math.random()),
      ask: Math.max(0.10, (currentPrice - strike) + 2.2 + Math.random()),
      volume: Math.floor(1000 + Math.random() * 5000),
      openInterest: Math.floor(5000 + Math.random() * 10000),
      impliedVolatility: 0.20 + Math.random() * 0.15,
      delta: Math.max(0.05, Math.min(0.95, 0.5 + (currentPrice - strike) * 0.02))
    });
    
    // Put option
    options.push({
      symbol: 'SPY',
      expiration,
      strike,
      side: 'PUT' as const,
      bid: Math.max(0.05, (strike - currentPrice) + 2.0 + Math.random()),
      ask: Math.max(0.10, (strike - currentPrice) + 2.2 + Math.random()),
      volume: Math.floor(1000 + Math.random() * 5000),
      openInterest: Math.floor(5000 + Math.random() * 10000),
      impliedVolatility: 0.20 + Math.random() * 0.15,
      delta: -Math.max(0.05, Math.min(0.95, 0.5 - (currentPrice - strike) * 0.02))
    });
  }
  
  return options;
}

function generateMockStrategy() {
  return {
    id: 'test-strategy-1',
    name: 'Relaxed Coherent 0-DTE',
    userId: 'test-user',
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.04,
    positionSizePercent: 0.1,
    maxPositions: 3,
    daysToExpiration: 0,
    deltaRange: 0.3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function testSimpleRelaxedIntegration() {
  console.log('🧪 SIMPLE RELAXED INTEGRATION TEST');
  console.log('=' .repeat(60));
  
  const marketData = generateMockMarketData();
  const optionsChain = generateMockOptionsChain();
  const strategy = generateMockStrategy();
  
  console.log(`📊 Test Data Generated:`);
  console.log(`   Market Data Points: ${marketData.length}`);
  console.log(`   Options Contracts: ${optionsChain.length}`);
  console.log(`   Current Price: $${marketData[marketData.length - 1].close.toFixed(2)}`);
  
  const configs = [
    { name: 'RELAXED', config: TRADING_CONFIGS.RELAXED },
    { name: 'AGGRESSIVE', config: TRADING_CONFIGS.AGGRESSIVE },
    { name: 'EXTREME_GAMMA', config: TRADING_CONFIGS.EXTREME_GAMMA }
  ];
  
  let successCount = 0;
  
  for (const { name, config } of configs) {
    console.log(`\n🎯 Testing ${name} Configuration:`);
    console.log('-' .repeat(40));
    
    try {
      const signal = await CoherentStrategyFramework.generateCoherentSignal(
        marketData,
        optionsChain,
        strategy,
        25000,
        config
      );
      
      console.log(`📊 RESULTS for ${name}:`);
      console.log(`   Action: ${signal.action}`);
      console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   Signal Quality: ${signal.signalQuality}`);
      
      if (signal.action !== 'NO_TRADE') {
        successCount++;
        console.log(`   ✅ SUCCESS: ${name} config generated a ${signal.action} signal!`);
        console.log(`   📈 Entry: $${signal.entryPrice.toFixed(2)}`);
        console.log(`   🎯 Target 1: $${signal.target1.toFixed(2)}`);
        console.log(`   🎯 Target 2: $${signal.target2.toFixed(2)}`);
        console.log(`   🛑 Stop Loss: $${signal.stopLoss.toFixed(2)}`);
        console.log(`   💰 Position Size: ${signal.positionSize}`);
        console.log(`   ⚠️  Max Risk: $${signal.maxRisk.toFixed(2)}`);
        console.log(`   🎯 Confluence Zones: ${signal.confluenceZones.length}`);
        
        console.log(`\n   🧠 REASONING:`);
        console.log(`   Market: ${signal.reasoning.marketCondition}`);
        console.log(`   Trend: ${signal.reasoning.trendAnalysis}`);
        console.log(`   Entry: ${signal.reasoning.entryTrigger}`);
        console.log(`   Risk: ${signal.reasoning.riskAssessment}`);
        console.log(`   Decision: ${signal.reasoning.finalDecision}`);
      } else {
        console.log(`   ❌ FAILED: ${name} config returned NO_TRADE`);
        console.log(`   Reason: ${signal.reasoning.finalDecision}`);
        
        // Show which step failed
        if (signal.reasoning.marketCondition.includes('Unfavorable') || 
            signal.reasoning.marketCondition.includes('Extreme')) {
          console.log(`   🔍 Failed at: Market Condition Assessment`);
        } else if (signal.reasoning.trendAnalysis.includes('insufficient')) {
          console.log(`   🔍 Failed at: Trend Analysis`);
        } else if (signal.reasoning.entryTrigger.includes('No valid')) {
          console.log(`   🔍 Failed at: Entry Trigger Analysis`);
        } else if (signal.reasoning.riskAssessment.includes('Risk')) {
          console.log(`   🔍 Failed at: Risk Assessment`);
        } else {
          console.log(`   🔍 Failed at: Final Signal Generation`);
        }
      }
      
    } catch (error: any) {
      console.error(`   💥 ERROR in ${name}:`, error.message);
    }
  }
  
  console.log('\n🎯 INTEGRATION TEST SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`✅ Successful Configurations: ${successCount}/${configs.length}`);
  
  if (successCount > 0) {
    console.log('🎉 INTEGRATION SUCCESS: At least one configuration generated trades!');
    console.log('💡 The relaxed configurations are working - the integration is fixed!');
  } else {
    console.log('❌ INTEGRATION STILL BLOCKED: All configurations returned NO_TRADE');
    console.log('🔍 Need to investigate further or create bypass solution');
  }
  
  return successCount > 0;
}

// CLI interface
if (require.main === module) {
  testSimpleRelaxedIntegration()
    .then(success => {
      if (success) {
        console.log('\n✅ Simple relaxed integration test PASSED');
        process.exit(0);
      } else {
        console.log('\n❌ Simple relaxed integration test FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}

export { testSimpleRelaxedIntegration };