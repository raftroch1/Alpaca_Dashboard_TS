#!/usr/bin/env ts-node
/**
 * DEBUG ALPACA CONNECTION
 * 
 * Detailed debugging to figure out why connection failed after working
 */

// Load environment variables from project root .env file
const path = require('path');
const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const axios = require('axios');

async function debugAlpacaConnection() {
  
  console.log('🔍 DETAILED ALPACA CONNECTION DEBUG');
  console.log('===================================');
  
  const apiKey = process.env.ALPACA_API_KEY || '';
  const apiSecret = process.env.ALPACA_API_SECRET || '';
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🔐 Secret: ${apiSecret.substring(0, 8)}...`);
  
  const headers = {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret,
    'Content-Type': 'application/json'
  };
  
  const baseUrl = 'https://paper-api.alpaca.markets';
  
  try {
    // 1. Test account endpoint
    console.log('\n📝 1. Testing Account Endpoint...');
    const accountResponse = await axios.get(`${baseUrl}/v2/account`, { headers });
    console.log('✅ Account endpoint working');
    console.log(`   💰 Portfolio Value: $${parseFloat(accountResponse.data.portfolio_value).toLocaleString()}`);
    console.log(`   💼 Buying Power: $${parseFloat(accountResponse.data.buying_power).toLocaleString()}`);
    console.log(`   📊 Account Status: ${accountResponse.data.status}`);
    
    // 2. Check for recent orders
    console.log('\n📝 2. Checking Recent Orders...');
    const ordersResponse = await axios.get(`${baseUrl}/v2/orders?status=all&limit=10&direction=desc`, { headers });
    console.log(`✅ Found ${ordersResponse.data.length} recent orders`);
    
    ordersResponse.data.forEach((order: any, index: number) => {
      console.log(`   ${index + 1}. ${order.symbol} - ${order.side} ${order.qty} - ${order.status} - ${order.created_at}`);
      if (order.filled_at) {
        console.log(`      💰 Filled at: $${order.filled_avg_price} on ${order.filled_at}`);
      }
    });
    
    // 3. Check positions
    console.log('\n📝 3. Checking Current Positions...');
    const positionsResponse = await axios.get(`${baseUrl}/v2/positions`, { headers });
    console.log(`✅ Found ${positionsResponse.data.length} current positions`);
    
    positionsResponse.data.forEach((position: any, index: number) => {
      const unrealizedPL = parseFloat(position.unrealized_pl);
      console.log(`   ${index + 1}. ${position.symbol}`);
      console.log(`      📊 Qty: ${position.qty}, Value: $${parseFloat(position.market_value).toFixed(2)}`);
      console.log(`      💰 P&L: $${unrealizedPL.toFixed(2)} (${((unrealizedPL / parseFloat(position.cost_basis)) * 100).toFixed(1)}%)`);
      console.log(`      🕐 Entry: ${position.created_at}`);
    });
    
    // 4. Check clock (market status)
    console.log('\n📝 4. Checking Market Clock...');
    const clockResponse = await axios.get(`${baseUrl}/v2/clock`, { headers });
    console.log(`✅ Market Status: ${clockResponse.data.is_open ? 'OPEN' : 'CLOSED'}`);
    console.log(`   📅 Current Time: ${clockResponse.data.timestamp}`);
    console.log(`   🔔 Next Open: ${clockResponse.data.next_open}`);
    console.log(`   🔕 Next Close: ${clockResponse.data.next_close}`);
    
    console.log('\n🎉 CONNECTION IS WORKING!');
    console.log('=========================');
    console.log('✅ All endpoints accessible');
    console.log('✅ Authentication successful');
    console.log('✅ Paper trading account active');
    
  } catch (error: any) {
    console.log('\n❌ CONNECTION FAILED');
    console.log('====================');
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run debug
debugAlpacaConnection();