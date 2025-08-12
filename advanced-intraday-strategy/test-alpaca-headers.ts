#!/usr/bin/env ts-node
/**
 * ALPACA AUTHENTICATION HEADER TEST
 * 
 * Tests correct authentication method based on Alpaca documentation
 * https://docs.alpaca.markets/docs/market-data-faq#why-am-i-getting-http-403-forbidden
 */

// Load environment variables from project root .env file
const path = require('path');
const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

async function testAlpacaHeaders() {
  
  console.log('🔧 ALPACA HEADER AUTHENTICATION TEST');
  console.log('====================================');
  
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.log('❌ Missing API credentials');
    return false;
  }
  
  console.log(`✅ Found credentials: ${apiKey.substring(0, 8)}...`);
  console.log('');
  
  // Test the CORRECT headers according to Alpaca docs
  console.log('📝 TEST 1: Trading API with CORRECT Headers');
  console.log('===========================================');
  
  try {
    const Alpaca = require('@alpacahq/alpaca-trade-api');
    
    // Method 1: Standard SDK approach
    const alpaca = new Alpaca({
      key: apiKey,
      secret: apiSecret,
      paper: true,
      baseUrl: 'https://paper-api.alpaca.markets'
    });
    
    console.log('🔗 Testing Trading API with SDK...');
    const account = await alpaca.getAccount();
    
    console.log('✅ SUCCESS: Trading API works with SDK!');
    console.log('📊 Account Info:');
    console.log(`   💰 Portfolio Value: $${parseFloat(account.portfolio_value).toLocaleString()}`);
    console.log(`   💳 Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);
    console.log(`   🔄 Account Status: ${account.status}`);
    return true;
    
  } catch (error: any) {
    console.log('❌ SDK method failed:', error.message);
  }
  
  // Test Method 2: Manual headers (according to docs)
  console.log('');
  console.log('📝 TEST 2: Manual Headers (APCA-API-*)');
  console.log('=======================================');
  
  try {
    const axios = require('axios');
    
    const response = await axios.get('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS: Manual headers work!');
    console.log('📊 Account Info:');
    console.log(`   💰 Portfolio Value: $${parseFloat(response.data.portfolio_value).toLocaleString()}`);
    console.log(`   💳 Buying Power: $${parseFloat(response.data.buying_power).toLocaleString()}`);
    console.log(`   🔄 Account Status: ${response.data.status}`);
    return true;
    
  } catch (error: any) {
    console.log('❌ Manual headers failed:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  // Test Method 3: Market Data API (might need different endpoint)
  console.log('');
  console.log('📝 TEST 3: Market Data API');
  console.log('==========================');
  
  try {
    const axios = require('axios');
    
    const response = await axios.get('https://data.alpaca.markets/v2/stocks/SPY/bars/latest', {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS: Market Data API works!');
    console.log('📊 Latest SPY data retrieved');
    return true;
    
  } catch (error: any) {
    console.log('❌ Market Data API failed:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  // Test Method 4: Check if account needs permissions
  console.log('');
  console.log('📝 TEST 4: Account Permissions Check');
  console.log('====================================');
  
  console.log('🔍 Possible Issues:');
  console.log('   1. ❌ Paper trading not enabled on account');
  console.log('   2. ❌ API keys need to be regenerated');
  console.log('   3. ❌ Account pending approval');
  console.log('   4. ❌ Wrong endpoint for your account type');
  console.log('');
  console.log('💡 SOLUTIONS:');
  console.log('   1. Go to: https://app.alpaca.markets/paper/dashboard/overview');
  console.log('   2. Verify paper trading is ENABLED');
  console.log('   3. Regenerate API keys if needed');
  console.log('   4. Check account status in dashboard');
  
  return false;
}

// Also test connection with corrected SDK configuration
async function testCorrectedSDK() {
  
  console.log('');
  console.log('🚀 CORRECTED SDK TEST');
  console.log('=====================');
  
  try {
    const Alpaca = require('@alpacahq/alpaca-trade-api');
    
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;
    
    // Try different configuration approaches
    const configs = [
      {
        name: 'Paper Trading Config 1',
        config: {
          key: apiKey,
          secret: apiSecret,
          paper: true,
          baseUrl: 'https://paper-api.alpaca.markets'
        }
      },
      {
        name: 'Paper Trading Config 2',
        config: {
          key: apiKey,
          secret: apiSecret,
          paper: true
          // Let SDK use default URLs
        }
      },
      {
        name: 'Environment-based Config',
        config: {
          credentials: {
            key: apiKey,
            secret: apiSecret
          },
          paper: true
        }
      }
    ];
    
    for (const { name, config } of configs) {
      try {
        console.log(`🔗 Testing: ${name}`);
        const alpaca = new Alpaca(config);
        const account = await alpaca.getAccount();
        
        console.log(`✅ SUCCESS: ${name} works!`);
        console.log(`   💰 Portfolio: $${parseFloat(account.portfolio_value).toLocaleString()}`);
        console.log(`   🔄 Status: ${account.status}`);
        
        return { success: true, config: name };
        
      } catch (error: any) {
        console.log(`❌ ${name} failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ SDK test failed:', error instanceof Error ? error.message : error);
  }
  
  return { success: false };
}

async function main() {
  const headerTest = await testAlpacaHeaders();
  const sdkTest = await testCorrectedSDK();
  
  console.log('');
  console.log('🎯 FINAL RESULTS');
  console.log('================');
  
  if (headerTest || sdkTest.success) {
    console.log('✅ ALPACA CONNECTION: WORKING!');
    console.log('🚀 Ready to start paper trading');
    console.log('   npx ts-node advanced-intraday-strategy/start-alpaca-paper-trading.ts');
  } else {
    console.log('❌ ALPACA CONNECTION: FAILED');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. Verify your Alpaca dashboard shows ACTIVE paper trading');
    console.log('   2. Try regenerating API keys');
    console.log('   3. Contact Alpaca support if issue persists');
    console.log('');
    console.log('💡 ALTERNATIVE: Use our working paper trading system');
    console.log('   npx ts-node advanced-intraday-strategy/start-paper-trading.ts');
  }
}

main();