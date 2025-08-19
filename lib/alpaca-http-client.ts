/**
 * WORKING ALPACA HTTP CLIENT
 * 
 * Direct HTTP client using correct headers as per Alpaca documentation.
 * This bypasses the buggy SDK and works with real API data.
 */

import axios from 'axios';
import { MarketData, OptionsChain } from './types';

export class AlpacaHTTPClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY || '';
    this.apiSecret = process.env.ALPACA_API_SECRET || '';
    this.baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Alpaca API credentials not found. Please set ALPACA_API_KEY and ALPACA_API_SECRET in .env file.');
    }
  }

  private getHeaders() {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/account`, {
        headers: this.getHeaders()
      });
      console.log('✅ Alpaca HTTP client connection successful');
      return response.status === 200;
    } catch (error) {
      console.error('❌ Alpaca HTTP client connection failed:', error);
      return false;
    }
  }

  async getAccount() {
    const response = await axios.get(`${this.baseUrl}/v2/account`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getMarketData(symbol: string, startDate: Date, endDate: Date, timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '1Day'): Promise<MarketData[]> {
    try {
      console.log(`📊 Fetching REAL ${timeframe} data for ${symbol} from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      
      const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/bars`, {
        headers: this.getHeaders(),
        params: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          timeframe: timeframe,
          limit: 10000
        }
      });

      const marketData: MarketData[] = [];
      
      if (response.data.bars) {
        response.data.bars.forEach((bar: any, index: number) => {
          marketData.push({
            id: `${symbol}_${bar.t}_${index}`,
            symbol: symbol,
            date: new Date(bar.t),
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: BigInt(Math.floor(bar.v)),
            createdAt: new Date()
          });
        });
      }

      console.log(`✅ Retrieved ${marketData.length} REAL ${timeframe} bars for ${symbol}`);
      return marketData;
      
    } catch (error) {
      console.error(`❌ Error fetching REAL market data for ${symbol}:`, error);
      throw error;
    }
  }

  async getOptionsChain(symbol: string, historicalDate?: Date): Promise<OptionsChain[]> {
    try {
      console.log(`📊 Fetching REAL options chain for ${symbol}`);
      
      const response = await axios.get(`${this.baseUrl}/v2/options/contracts`, {
        headers: this.getHeaders(),
        params: {
          underlying_symbols: symbol,
          limit: 100
        }
      });

      const optionsChain: OptionsChain[] = [];
      
      if (response.data.option_contracts) {
        response.data.option_contracts.forEach((contract: any) => {
          optionsChain.push({
            symbol: contract.symbol,
            strike: contract.strike_price,
            expiration: new Date(contract.expiration_date),
            side: contract.type.toUpperCase() as 'CALL' | 'PUT',
            bid: 0, // Would need separate quote request
            ask: 0,
            volume: 0,
            openInterest: contract.open_interest || 0,
            impliedVolatility: 0.25, // Default estimate
            delta: contract.type === 'call' ? 0.5 : -0.5
          });
        });
      }

      console.log(`✅ Retrieved ${optionsChain.length} REAL options contracts for ${symbol}`);
      return optionsChain;
      
    } catch (error) {
      console.error(`❌ Error fetching REAL options chain for ${symbol}:`, error);
      throw error;
    }
  }
}

export const alpacaHTTPClient = new AlpacaHTTPClient();