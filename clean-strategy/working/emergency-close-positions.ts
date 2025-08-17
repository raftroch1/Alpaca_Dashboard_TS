#!/usr/bin/env ts-node
/**
 * EMERGENCY POSITION CLOSER
 * 
 * Immediately closes all open positions in Alpaca paper account
 * Use this when you need to exit positions manually due to excessive losses
 */

// Load environment variables from project root .env file
const path = require('path');
const projectRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const axios = require('axios');

async function emergencyCloseAllPositions() {
  
  console.log('🚨 EMERGENCY POSITION CLOSER');
  console.log('============================');
  console.log('⚠️  This will IMMEDIATELY close ALL open positions');
  console.log('');
  
  try {
    const apiKey = process.env.ALPACA_API_KEY || '';
    const apiSecret = process.env.ALPACA_API_SECRET || '';
    
    if (!apiKey || !apiSecret) {
      throw new Error('Missing Alpaca API credentials');
    }
    
    const headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    };
    
    const baseUrl = 'https://paper-api.alpaca.markets';
    
    // 1. Get all open positions
    console.log('🔍 Checking open positions...');
    const positionsResponse = await axios.get(`${baseUrl}/v2/positions`, { headers });
    const positions = positionsResponse.data;
    
    if (positions.length === 0) {
      console.log('✅ No open positions found');
      return;
    }
    
    console.log(`📊 Found ${positions.length} open positions:`);
    
    // 2. Close each position
    for (const position of positions) {
      const symbol = position.symbol;
      const qty = Math.abs(parseFloat(position.qty));
      const side = parseFloat(position.qty) > 0 ? 'sell' : 'buy';
      const unrealizedPL = parseFloat(position.unrealized_pl);
      
      console.log(`   📈 ${symbol}: ${position.qty} shares, P&L: $${unrealizedPL.toFixed(2)}`);
      
      try {
        // Submit market order to close position
        const closeOrder = {
          symbol: symbol,
          qty: qty.toString(),
          side: side,
          type: 'market',
          time_in_force: 'day'
        };
        
        console.log(`🔄 Closing ${symbol}...`);
        const orderResponse = await axios.post(`${baseUrl}/v2/orders`, closeOrder, { headers });
        
        console.log(`✅ ${symbol} close order submitted (ID: ${orderResponse.data.id})`);
        
      } catch (error: any) {
        console.error(`❌ Failed to close ${symbol}:`, error.response?.data || error.message);
      }
    }
    
    // 3. Cancel all open orders
    console.log('');
    console.log('🗑️  Cancelling all open orders...');
    try {
      await axios.delete(`${baseUrl}/v2/orders`, { headers });
      console.log('✅ All open orders cancelled');
    } catch (error: any) {
      console.error('❌ Failed to cancel orders:', error.response?.data || error.message);
    }
    
    // 4. Final status
    console.log('');
    console.log('🏁 EMERGENCY CLOSE COMPLETED');
    console.log('============================');
    console.log('✅ All positions should be closed');
    console.log('⏰ Check your Alpaca dashboard to confirm');
    
  } catch (error: any) {
    console.error('❌ Emergency close failed:', error.response?.data || error.message);
  }
}

// Run immediately
emergencyCloseAllPositions();