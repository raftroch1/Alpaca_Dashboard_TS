#!/usr/bin/env ts-node
/**
 * DIRECT HTTP TEST FOR ALPACA API
 * 
 * Tests Alpaca API using direct HTTP requests with proper headers
 * as specified in the official documentation.
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testAlpacaDirectHTTP() {
  console.log('🧪 DIRECT HTTP ALPACA TEST');
  console.log('============================');
  
  // Get credentials from environment
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  
  if (!apiKey || !apiSecret) {
    console.log('❌ Missing API credentials');
    return;
  }
  
  console.log('📝 1. Testing Trading API (Account endpoint)...');
  console.log(`🔗 URL: ${baseUrl}/v2/account`);
  console.log(`🔑 Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Test Trading API with correct headers from documentation
    const response = await axios.get(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Trading API Success!');
    console.log('📊 Account ID:', response.data.id);
    console.log('💰 Portfolio Value:', response.data.portfolio_value);
    console.log('📈 Buying Power:', response.data.buying_power);
    console.log('🎯 Options Level:', response.data.options_approved_level);
    
  } catch (error: any) {
    console.log('❌ Trading API Failed');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.message);
    console.log('Response:', error.response?.data);
    
    if (error.response?.headers?.['x-request-id']) {
      console.log('🆔 Request ID:', error.response.headers['x-request-id']);
    }
  }
  
  console.log('\n📝 2. Testing Market Data API (Stock bars)...');
  
  try {
    // Test Market Data API
    const marketDataResponse = await axios.get('https://data.alpaca.markets/v2/stocks/SPY/bars', {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Accept': 'application/json'
      },
      params: {
        timeframe: '1Day',
        start: '2024-01-01',
        limit: 5
      }
    });
    
    console.log('✅ Market Data API Success!');
    console.log('📊 Bars received:', marketDataResponse.data.bars?.length || 0);
    
  } catch (error: any) {
    console.log('❌ Market Data API Failed');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.message);
    
    if (error.response?.headers?.['x-request-id']) {
      console.log('🆔 Request ID:', error.response.headers['x-request-id']);
    }
  }
  
  console.log('\n📝 3. Testing Options Chain...');
  
  try {
    // Test Options API
    const optionsResponse = await axios.get(`${baseUrl}/v2/options/contracts`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Accept': 'application/json'
      },
      params: {
        underlying_symbols: 'SPY',
        limit: 5
      }
    });
    
    console.log('✅ Options API Success!');
    console.log('📊 Options contracts:', optionsResponse.data.option_contracts?.length || 0);
    
  } catch (error: any) {
    console.log('❌ Options API Failed');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.message);
    
    if (error.response?.headers?.['x-request-id']) {
      console.log('🆔 Request ID:', error.response.headers['x-request-id']);
    }
  }
}

// Run the test
testAlpacaDirectHTTP().catch(console.error);