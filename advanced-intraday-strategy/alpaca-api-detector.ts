#!/usr/bin/env ts-node
/**
 * ALPACA API TYPE DETECTOR & FIXER
 * 
 * Detects whether you have Trading API or Broker API keys
 * and configures the correct authentication method
 */

// Load environment variables from project root .env file
const path = require('path');
const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

async function detectAlpacaApiType() {
  
  console.log('🔍 ALPACA API TYPE DETECTOR');
  console.log('===========================');
  
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ No API credentials found in .env file');
    return;
  }
  
  console.log(`✅ Found credentials: ${apiKey.substring(0, 8)}...`);
  console.log('');
  
  // Test 1: Try Trading API (Standard approach)
  console.log('📝 TEST 1: Trading API Authentication');
  console.log('=====================================');
  
  try {
    const Alpaca = require('@alpacahq/alpaca-trade-api');
    
    const tradingAlpaca = new Alpaca({
      key: apiKey,
      secret: apiSecret,
      paper: true,
      baseUrl: 'https://paper-api.alpaca.markets'
    });
    
    console.log('🔗 Testing Trading API endpoint...');
    const account = await tradingAlpaca.getAccount();
    
    console.log('✅ SUCCESS: Trading API works!');
    console.log('📊 Account Info:');
    console.log(`   💰 Portfolio Value: $${parseFloat(account.portfolio_value).toLocaleString()}`);
    console.log(`   💳 Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);
    console.log(`   📈 Day Trade Count: ${account.daytrade_count}/3`);
    console.log(`   🔄 Account Status: ${account.status}`);
    console.log('');
    console.log('🎯 RECOMMENDATION: Use Trading API for options trading');
    console.log('   ✅ Your current setup is correct for paper trading');
    console.log('   🚀 You can start trading immediately');
    
    return 'TRADING_API';
    
  } catch (tradingError: any) {
    console.log('❌ Trading API failed:', tradingError.message);
    console.log('');
  }
  
  // Test 2: Try Broker API (Different authentication)
  console.log('📝 TEST 2: Broker API Authentication');
  console.log('====================================');
  
  try {
    const axios = require('axios');
    
    // Broker API uses HTTP Basic Auth (base64 encoded key:secret)
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    console.log('🔗 Testing Broker API endpoint...');
    const response = await axios.get('https://broker-api.sandbox.alpaca.markets/v1/assets', {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS: Broker API works!');
    console.log(`📊 Found ${response.data.length} assets available`);
    console.log('');
    console.log('🎯 RECOMMENDATION: Switch to Broker API setup');
    console.log('   ⚠️  Your keys are for Broker API, not Trading API');
    console.log('   🔧 Need different integration approach');
    
    return 'BROKER_API';
    
  } catch (brokerError: any) {
    console.log('❌ Broker API failed:', brokerError.message);
    console.log('');
  }
  
  // Test 3: Check if keys are for live trading
  console.log('📝 TEST 3: Live Trading API Check');
  console.log('=================================');
  
  try {
    const Alpaca = require('@alpacahq/alpaca-trade-api');
    
    const liveAlpaca = new Alpaca({
      key: apiKey,
      secret: apiSecret,
      paper: false, // Live trading
      baseUrl: 'https://api.alpaca.markets'
    });
    
    console.log('🔗 Testing Live API endpoint...');
    const account = await liveAlpaca.getAccount();
    
    console.log('⚠️  SUCCESS: Live Trading API works!');
    console.log('🚨 WARNING: These are LIVE TRADING credentials!');
    console.log('');
    console.log('🎯 RECOMMENDATION: Get Paper Trading keys');
    console.log('   ❌ Do NOT use live keys for testing');
    console.log('   📋 Get paper keys from: https://app.alpaca.markets/paper/dashboard/overview');
    
    return 'LIVE_TRADING_API';
    
  } catch (liveError: any) {
    console.log('❌ Live Trading API failed:', liveError.message);
    console.log('');
  }
  
  // All tests failed
  console.log('❌ ALL TESTS FAILED');
  console.log('===================');
  console.log('🔧 Possible issues:');
  console.log('   1. Invalid API credentials');
  console.log('   2. Expired or revoked keys');
  console.log('   3. Network connectivity issues');
  console.log('   4. Keys are for different environment');
  console.log('');
  console.log('💡 SOLUTION STEPS:');
  console.log('   1. Go to: https://app.alpaca.markets/paper/dashboard/overview');
  console.log('   2. Generate NEW Paper Trading API Keys');
  console.log('   3. Update .env file with new credentials');
  console.log('   4. Run this test again');
  
  return 'UNKNOWN';
}

// Also test the axios library
async function installMissingPackages() {
  try {
    require('axios');
    console.log('✅ axios already installed');
  } catch {
    console.log('📦 Installing axios...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ axios installed');
  }
}

async function main() {
  try {
    await installMissingPackages();
    const apiType = await detectAlpacaApiType();
    
    console.log('');
    console.log('🎯 FINAL RECOMMENDATION');
    console.log('=======================');
    
    switch (apiType) {
      case 'TRADING_API':
        console.log('✅ Your setup is PERFECT for options trading!');
        console.log('🚀 Run: npx ts-node advanced-intraday-strategy/start-alpaca-paper-trading.ts');
        break;
        
      case 'BROKER_API':
        console.log('⚠️  You have Broker API keys (for white-label brokers)');
        console.log('🔄 Need Trading API keys for retail options trading');
        console.log('📋 Get them from: https://app.alpaca.markets/paper/dashboard/overview');
        break;
        
      case 'LIVE_TRADING_API':
        console.log('🚨 DANGER: You have LIVE trading keys!');
        console.log('❌ Get paper trading keys instead');
        console.log('📋 Go to: https://app.alpaca.markets/paper/dashboard/overview');
        break;
        
      default:
        console.log('❌ Need to troubleshoot API credentials');
        console.log('📞 Contact Alpaca support if issues persist');
    }
    
  } catch (error) {
    console.error('❌ Detector failed:', error instanceof Error ? error.message : error);
  }
}

main();