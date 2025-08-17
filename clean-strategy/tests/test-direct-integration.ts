#!/usr/bin/env node
/**
 * TEST DIRECT INSTITUTIONAL INTEGRATION
 * 
 * Tests our bypass solution that directly uses institutional components
 * without the overly complex Coherent Strategy Framework.
 */

import DirectInstitutionalIntegration from '../core/institutional-strategy/direct-institutional-integration';

// Use the same mock data generation that worked before
function generateMockMarketData(points: number = 50) {
  const data = [];
  const basePrice = 480;
  const now = new Date();
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now.getTime() - (points - i) * 60000); // 1 minute intervals
    const price = basePrice + Math.sin(i * 0.1) * 8 + i * 0.2; // Trending upward with volatility
    
    data.push({
      id: `mock-${i}`,
      symbol: 'SPY',
      date: timestamp,
      open: price - 0.5 + Math.random() * 0.5,
      high: price + 1.0 + Math.random() * 0.5,
      low: price - 1.0 - Math.random() * 0.5,
      close: price + (Math.random() - 0.5) * 0.5,
      volume: BigInt(Math.floor(1000000 + i * 50000 + Math.random() * 500000)),
      createdAt: timestamp
    });
  }
  
  return data;
}

function generateMockOptionsChain(currentPrice: number) {
  const expiration = new Date();
  expiration.setHours(16, 0, 0, 0); // 4 PM today
  
  const options = [];
  
  // Generate calls and puts around current price
  for (let i = -5; i <= 5; i++) {
    const strike = Math.round(currentPrice + i * 5);
    
    // Call option
    const callITM = currentPrice > strike;
    const callDelta = callITM ? 0.5 + (currentPrice - strike) * 0.02 : 0.5 - (strike - currentPrice) * 0.02;
    const callPrice = Math.max(0.05, callITM ? (currentPrice - strike) + 2.0 : 2.0 - (strike - currentPrice) * 0.3);
    
    options.push({
      symbol: 'SPY',
      expiration,
      strike,
      side: 'CALL' as const,
      bid: Math.max(0.05, callPrice - 0.1),
      ask: callPrice + 0.1,
      volume: Math.floor(1000 + Math.random() * 8000),
      openInterest: Math.floor(5000 + Math.random() * 15000),
      impliedVolatility: 0.15 + Math.random() * 0.25,
      delta: Math.max(0.01, Math.min(0.99, callDelta))
    });
    
    // Put option
    const putITM = currentPrice < strike;
    const putDelta = putITM ? -0.5 - (strike - currentPrice) * 0.02 : -0.5 + (currentPrice - strike) * 0.02;
    const putPrice = Math.max(0.05, putITM ? (strike - currentPrice) + 2.0 : 2.0 - (currentPrice - strike) * 0.3);
    
    options.push({
      symbol: 'SPY',
      expiration,
      strike,
      side: 'PUT' as const,
      bid: Math.max(0.05, putPrice - 0.1),
      ask: putPrice + 0.1,
      volume: Math.floor(1000 + Math.random() * 8000),
      openInterest: Math.floor(5000 + Math.random() * 15000),
      impliedVolatility: 0.15 + Math.random() * 0.25,
      delta: Math.max(-0.99, Math.min(-0.01, putDelta))
    });
  }
  
  return options;
}

async function testDirectIntegration() {
  console.log('🧪 TESTING DIRECT INSTITUTIONAL INTEGRATION');
  console.log('=' .repeat(70));
  
  // Test with different data sizes to see minimum requirements
  const testCases = [
    { name: 'Minimal Data (10 points)', points: 10 },
    { name: 'Small Data (25 points)', points: 25 },
    { name: 'Good Data (50 points)', points: 50 },
    { name: 'Rich Data (100 points)', points: 100 }
  ];
  
  let successCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n🎯 Testing: ${testCase.name}`);
    console.log('-' .repeat(50));
    
    try {
      const marketData = generateMockMarketData(testCase.points);
      const currentPrice = marketData[marketData.length - 1].close;
      const optionsChain = generateMockOptionsChain(currentPrice);
      
      console.log(`📊 Test Setup:`);
      console.log(`   Market Data Points: ${marketData.length}`);
      console.log(`   Options Contracts: ${optionsChain.length}`);
      console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
      
      const signal = await DirectInstitutionalIntegration.generateDirectSignal(
        marketData,
        optionsChain,
        25000
      );
      
      console.log(`\n📊 RESULTS:`);
      console.log(`   Action: ${signal.action}`);
      console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   Total Score: ${signal.totalScore.toFixed(2)}`);
      console.log(`   Reasoning: ${signal.reasoning}`);
      
      if (signal.action !== 'NO_TRADE') {
        successCount++;
        console.log(`   ✅ SUCCESS: Generated ${signal.action} signal!`);
        console.log(`   💰 Entry Price: $${signal.entryPrice.toFixed(2)}`);
        console.log(`   📊 Position Size: ${signal.positionSize} contracts`);
        console.log(`   ⚠️  Max Risk: $${signal.maxRisk.toFixed(2)}`);
        
        if (signal.selectedOption) {
          console.log(`   🎯 Selected: ${signal.selectedOption.side} ${signal.selectedOption.strike} @ $${((signal.selectedOption.bid + signal.selectedOption.ask) / 2).toFixed(2)}`);
          console.log(`   📈 Delta: ${signal.selectedOption.delta?.toFixed(2)}`);
          console.log(`   📊 Volume: ${signal.selectedOption.volume?.toLocaleString()}`);
        }
        
        console.log(`\n   🧠 COMPONENT BREAKDOWN:`);
        console.log(`   GEX Score: ${signal.gexScore.toFixed(2)} (${signal.gexAnalysis.volatilityRegime})`);
        console.log(`   AVP Score: ${signal.avpScore.toFixed(2)}`);
        console.log(`   AVWAP Score: ${signal.avwapScore.toFixed(2)}`);
        console.log(`   Fractal Score: ${signal.fractalScore.toFixed(2)}`);
        console.log(`   ATR Score: ${signal.atrScore.toFixed(2)}`);
        
      } else {
        console.log(`   ❌ NO TRADE: ${signal.reasoning}`);
        console.log(`   📊 Score Breakdown:`);
        console.log(`     GEX: ${signal.gexScore.toFixed(2)}`);
        console.log(`     AVP: ${signal.avpScore.toFixed(2)}`);
        console.log(`     AVWAP: ${signal.avwapScore.toFixed(2)}`);
        console.log(`     Fractals: ${signal.fractalScore.toFixed(2)}`);
        console.log(`     ATR: ${signal.atrScore.toFixed(2)}`);
        console.log(`     Total: ${signal.totalScore.toFixed(2)} (need ≥0.6)`);
      }
      
    } catch (error: any) {
      console.error(`   💥 ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🎯 DIRECT INTEGRATION TEST SUMMARY:');
  console.log('=' .repeat(70));
  console.log(`✅ Successful Test Cases: ${successCount}/${testCases.length}`);
  
  if (successCount > 0) {
    console.log('🎉 INTEGRATION SUCCESS: Direct integration is working!');
    console.log('💡 We have successfully bypassed the problematic Coherent Framework');
    console.log('🚀 Ready to integrate with backtest engine');
  } else {
    console.log('❌ INTEGRATION FAILED: Need to adjust scoring thresholds');
    console.log('🔧 Consider lowering minimum score requirements');
  }
  
  return successCount > 0;
}

// Test different configurations
async function testDifferentConfigurations() {
  console.log('\n🧪 TESTING DIFFERENT CONFIGURATIONS');
  console.log('=' .repeat(70));
  
  const marketData = generateMockMarketData(50);
  const currentPrice = marketData[marketData.length - 1].close;
  const optionsChain = generateMockOptionsChain(currentPrice);
  
  const configs = [
    {
      name: 'Conservative',
      config: {
        minimumBullishScore: 0.7,
        minimumBearishScore: 0.7,
        maxRiskPerTrade: 0.01
      }
    },
    {
      name: 'Moderate',
      config: {
        minimumBullishScore: 0.5,
        minimumBearishScore: 0.5,
        maxRiskPerTrade: 0.02
      }
    },
    {
      name: 'Aggressive',
      config: {
        minimumBullishScore: 0.3,
        minimumBearishScore: 0.3,
        maxRiskPerTrade: 0.03,
        gexWeight: 0.4, // Higher weight on GEX for volatility plays
        avpWeight: 0.15,
        avwapWeight: 0.15,
        fractalWeight: 0.15,
        atrWeight: 0.15
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🎯 Testing ${name} Configuration:`);
    console.log('-' .repeat(40));
    
    try {
      const signal = await DirectInstitutionalIntegration.generateDirectSignal(
        marketData,
        optionsChain,
        25000,
        config
      );
      
      console.log(`   Action: ${signal.action}`);
      console.log(`   Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   Score: ${signal.totalScore.toFixed(2)}`);
      
      if (signal.action !== 'NO_TRADE') {
        console.log(`   ✅ ${name} generated trade: ${signal.action}`);
      } else {
        console.log(`   ❌ ${name} returned NO_TRADE`);
      }
      
    } catch (error: any) {
      console.error(`   💥 ${name} failed: ${error.message}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  testDirectIntegration()
    .then(async (success) => {
      if (success) {
        await testDifferentConfigurations();
        console.log('\n✅ Direct integration tests PASSED');
        console.log('🎯 Ready to integrate with backtest engine!');
        process.exit(0);
      } else {
        console.log('\n❌ Direct integration tests FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}

export { testDirectIntegration };