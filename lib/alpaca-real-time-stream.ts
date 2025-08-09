/**
 * ALPACA REAL-TIME STREAMING ENGINE
 * Addresses key limitations with live market data and news feeds
 * 
 * Sources:
 * - Market Data: https://docs.alpaca.markets/docs/streaming-market-data
 * - Real-time News: https://docs.alpaca.markets/docs/streaming-real-time-news
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { OptionsChain, MarketData } from './types';

export interface RealTimeMarketData {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  type: 'quote' | 'trade' | 'bar';
}

export interface RealTimeNewsData {
  id: string;
  headline: string;
  summary: string;
  content: string;
  symbols: string[];
  timestamp: Date;
  url: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface RealTimeOptionData {
  symbol: string;
  underlying: string;
  strike: number;
  side: 'CALL' | 'PUT';
  expiration: Date;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  timestamp: Date;
}

export class AlpacaRealTimeStream extends EventEmitter {
  private marketDataWs?: WebSocket;
  private newsWs?: WebSocket;
  private optionsWs?: WebSocket;
  
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  
  private subscriptions = {
    quotes: new Set<string>(),
    trades: new Set<string>(),
    bars: new Set<string>(),
    news: new Set<string>(),
    options: new Set<string>()
  };

  private credentials = {
    apiKey: process.env.ALPACA_API_KEY || '',
    apiSecret: process.env.ALPACA_SECRET_KEY || '',
    isPaper: process.env.ALPACA_PAPER === 'true'
  };

  constructor() {
    super();
    this.setupErrorHandling();
  }

  /**
   * Connect to all real-time streams
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to Alpaca real-time streams...');
      
      // Connect to market data stream
      await this.connectMarketData();
      
      // Connect to news stream  
      await this.connectNews();
      
      // Connect to options stream
      await this.connectOptions();
      
      console.log('✅ All real-time streams connected successfully');
      
    } catch (error) {
      console.error('❌ Failed to connect to real-time streams:', error);
      throw error;
    }
  }

  /**
   * Connect to market data WebSocket stream
   */
  private async connectMarketData(): Promise<void> {
    const baseUrl = this.credentials.isPaper 
      ? 'wss://stream.data.sandbox.alpaca.markets'
      : 'wss://stream.data.alpaca.markets';
    
    const url = `${baseUrl}/v2/sip`;
    
    this.marketDataWs = new WebSocket(url, {
      headers: {
        'APCA-API-KEY-ID': this.credentials.apiKey,
        'APCA-API-SECRET-KEY': this.credentials.apiSecret
      }
    });

    return new Promise((resolve, reject) => {
      this.marketDataWs!.on('open', () => {
        console.log('📊 Market data stream connected');
      });

      this.marketDataWs!.on('message', (data) => {
        this.handleMarketDataMessage(data);
      });

      this.marketDataWs!.on('error', (error) => {
        console.error('❌ Market data stream error:', error);
        reject(error);
      });

      this.marketDataWs!.on('close', () => {
        console.log('📊 Market data stream disconnected');
        this.handleReconnect('marketData');
      });

      // Wait for authentication success
      this.once('marketDataAuthenticated', resolve);
    });
  }

  /**
   * Connect to news WebSocket stream
   */
  private async connectNews(): Promise<void> {
    const baseUrl = this.credentials.isPaper 
      ? 'wss://stream.data.sandbox.alpaca.markets'
      : 'wss://stream.data.alpaca.markets';
    
    const url = `${baseUrl}/v1beta1/news`;
    
    this.newsWs = new WebSocket(url, {
      headers: {
        'APCA-API-KEY-ID': this.credentials.apiKey,
        'APCA-API-SECRET-KEY': this.credentials.apiSecret
      }
    });

    return new Promise((resolve, reject) => {
      this.newsWs!.on('open', () => {
        console.log('📰 News stream connected');
      });

      this.newsWs!.on('message', (data) => {
        this.handleNewsMessage(data);
      });

      this.newsWs!.on('error', (error) => {
        console.error('❌ News stream error:', error);
        reject(error);
      });

      this.newsWs!.on('close', () => {
        console.log('📰 News stream disconnected');
        this.handleReconnect('news');
      });

      // Wait for authentication success
      this.once('newsAuthenticated', resolve);
    });
  }

  /**
   * Connect to options WebSocket stream
   */
  private async connectOptions(): Promise<void> {
    const baseUrl = this.credentials.isPaper 
      ? 'wss://stream.data.sandbox.alpaca.markets'
      : 'wss://stream.data.alpaca.markets';
    
    const url = `${baseUrl}/v1beta1/options`;
    
    this.optionsWs = new WebSocket(url, {
      headers: {
        'APCA-API-KEY-ID': this.credentials.apiKey,
        'APCA-API-SECRET-KEY': this.credentials.apiSecret
      }
    });

    return new Promise((resolve, reject) => {
      this.optionsWs!.on('open', () => {
        console.log('🔗 Options stream connected');
      });

      this.optionsWs!.on('message', (data) => {
        this.handleOptionsMessage(data);
      });

      this.optionsWs!.on('error', (error) => {
        console.error('❌ Options stream error:', error);
        reject(error);
      });

      this.optionsWs!.on('close', () => {
        console.log('🔗 Options stream disconnected');
        this.handleReconnect('options');
      });

      // Wait for authentication success
      this.once('optionsAuthenticated', resolve);
    });
  }

  /**
   * Handle market data messages
   */
  private handleMarketDataMessage(data: WebSocket.Data): void {
    try {
      const messages = JSON.parse(data.toString());
      
      for (const message of messages) {
        switch (message.T) {
          case 'success':
            if (message.msg === 'connected') {
              this.authenticateMarketData();
            } else if (message.msg === 'authenticated') {
              console.log('✅ Market data stream authenticated');
              this.emit('marketDataAuthenticated');
            }
            break;
            
          case 'q': // Quote
            this.emit('quote', this.parseQuote(message));
            break;
            
          case 't': // Trade
            this.emit('trade', this.parseTrade(message));
            break;
            
          case 'b': // Bar
            this.emit('bar', this.parseBar(message));
            break;
            
          case 'error':
            console.error('Market data error:', message);
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing market data message:', error);
    }
  }

  /**
   * Handle news messages
   */
  private handleNewsMessage(data: WebSocket.Data): void {
    try {
      const messages = JSON.parse(data.toString());
      
      for (const message of messages) {
        switch (message.T) {
          case 'success':
            if (message.msg === 'connected') {
              this.authenticateNews();
            } else if (message.msg === 'authenticated') {
              console.log('✅ News stream authenticated');
              this.emit('newsAuthenticated');
            }
            break;
            
          case 'n': // News
            this.emit('news', this.parseNews(message));
            break;
            
          case 'error':
            console.error('News error:', message);
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing news message:', error);
    }
  }

  /**
   * Handle options messages
   */
  private handleOptionsMessage(data: WebSocket.Data): void {
    try {
      const messages = JSON.parse(data.toString());
      
      for (const message of messages) {
        switch (message.T) {
          case 'success':
            if (message.msg === 'connected') {
              this.authenticateOptions();
            } else if (message.msg === 'authenticated') {
              console.log('✅ Options stream authenticated');
              this.emit('optionsAuthenticated');
            }
            break;
            
          case 'q': // Options Quote
            this.emit('optionQuote', this.parseOptionQuote(message));
            break;
            
          case 't': // Options Trade
            this.emit('optionTrade', this.parseOptionTrade(message));
            break;
            
          case 'error':
            console.error('Options error:', message);
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing options message:', error);
    }
  }

  /**
   * Authenticate market data stream
   */
  private authenticateMarketData(): void {
    const authMessage = {
      action: 'auth',
      key: this.credentials.apiKey,
      secret: this.credentials.apiSecret
    };
    
    this.marketDataWs?.send(JSON.stringify(authMessage));
  }

  /**
   * Authenticate news stream
   */
  private authenticateNews(): void {
    const authMessage = {
      action: 'auth',
      key: this.credentials.apiKey,
      secret: this.credentials.apiSecret
    };
    
    this.newsWs?.send(JSON.stringify(authMessage));
  }

  /**
   * Authenticate options stream
   */
  private authenticateOptions(): void {
    const authMessage = {
      action: 'auth',
      key: this.credentials.apiKey,
      secret: this.credentials.apiSecret
    };
    
    this.optionsWs?.send(JSON.stringify(authMessage));
  }

  /**
   * Subscribe to real-time quotes for symbols
   */
  subscribeToQuotes(symbols: string[]): void {
    symbols.forEach(symbol => this.subscriptions.quotes.add(symbol));
    
    const subscribeMessage = {
      action: 'subscribe',
      quotes: symbols
    };
    
    this.marketDataWs?.send(JSON.stringify(subscribeMessage));
    console.log(`📊 Subscribed to quotes: ${symbols.join(', ')}`);
  }

  /**
   * Subscribe to real-time trades for symbols
   */
  subscribeToTrades(symbols: string[]): void {
    symbols.forEach(symbol => this.subscriptions.trades.add(symbol));
    
    const subscribeMessage = {
      action: 'subscribe',
      trades: symbols
    };
    
    this.marketDataWs?.send(JSON.stringify(subscribeMessage));
    console.log(`📊 Subscribed to trades: ${symbols.join(', ')}`);
  }

  /**
   * Subscribe to real-time news for symbols
   */
  subscribeToNews(symbols: string[]): void {
    symbols.forEach(symbol => this.subscriptions.news.add(symbol));
    
    const subscribeMessage = {
      action: 'subscribe',
      news: symbols
    };
    
    this.newsWs?.send(JSON.stringify(subscribeMessage));
    console.log(`📰 Subscribed to news: ${symbols.join(', ')}`);
  }

  /**
   * Subscribe to real-time options data
   */
  subscribeToOptions(symbols: string[]): void {
    symbols.forEach(symbol => this.subscriptions.options.add(symbol));
    
    const subscribeMessage = {
      action: 'subscribe',
      quotes: symbols,
      trades: symbols
    };
    
    this.optionsWs?.send(JSON.stringify(subscribeMessage));
    console.log(`🔗 Subscribed to options: ${symbols.join(', ')}`);
  }

  /**
   * Parse quote message
   */
  private parseQuote(message: any): RealTimeMarketData {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      price: (message.bp + message.ap) / 2, // Mid price
      volume: 0, // Not available in quotes
      bid: message.bp,
      ask: message.ap,
      type: 'quote'
    };
  }

  /**
   * Parse trade message
   */
  private parseTrade(message: any): RealTimeMarketData {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      price: message.p,
      volume: message.s,
      bid: 0, // Not available in trades
      ask: 0, // Not available in trades
      type: 'trade'
    };
  }

  /**
   * Parse bar message
   */
  private parseBar(message: any): RealTimeMarketData {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      price: message.c, // Close price
      volume: message.v,
      bid: 0,
      ask: 0,
      type: 'bar'
    };
  }

  /**
   * Parse news message
   */
  private parseNews(message: any): RealTimeNewsData {
    return {
      id: message.id || Date.now().toString(),
      headline: message.headline || '',
      summary: message.summary || '',
      content: message.content || '',
      symbols: message.symbols || [],
      timestamp: new Date(message.created_at || message.updated_at),
      url: message.url || '',
      source: message.source || 'Alpaca',
      sentiment: this.analyzeSentiment(message.headline + ' ' + message.summary)
    };
  }

  /**
   * Parse options quote message
   */
  private parseOptionQuote(message: any): RealTimeOptionData {
    const optionInfo = this.parseOptionSymbol(message.S);
    
    return {
      symbol: message.S,
      underlying: optionInfo.underlying,
      strike: optionInfo.strike,
      side: optionInfo.side,
      expiration: optionInfo.expiration,
      bid: message.bp,
      ask: message.ap,
      last: 0, // Not available in quotes
      volume: 0, // Not available in quotes
      openInterest: 0, // Not available in quotes
      timestamp: new Date(message.t)
    };
  }

  /**
   * Parse options trade message
   */
  private parseOptionTrade(message: any): RealTimeOptionData {
    const optionInfo = this.parseOptionSymbol(message.S);
    
    return {
      symbol: message.S,
      underlying: optionInfo.underlying,
      strike: optionInfo.strike,
      side: optionInfo.side,
      expiration: optionInfo.expiration,
      bid: 0, // Not available in trades
      ask: 0, // Not available in trades
      last: message.p,
      volume: message.s,
      openInterest: 0, // Not available in real-time
      timestamp: new Date(message.t)
    };
  }

  /**
   * Parse option symbol to extract details
   */
  private parseOptionSymbol(symbol: string): {
    underlying: string;
    strike: number;
    side: 'CALL' | 'PUT';
    expiration: Date;
  } {
    // Parse format: SPYYYMMDDCPPPPPPP
    const match = symbol.match(/^([A-Z]+)(\d{6})([CP])(\d{8})$/);
    
    if (!match) {
      throw new Error(`Invalid option symbol format: ${symbol}`);
    }
    
    const [, underlying, dateStr, callPut, strikeStr] = match;
    
    // Parse expiration date YYMMDD
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1;
    const day = parseInt(dateStr.substring(4, 6));
    const expiration = new Date(year, month, day);
    
    // Parse strike price
    const strike = parseInt(strikeStr) / 1000;
    
    return {
      underlying,
      strike,
      side: callPut === 'C' ? 'CALL' : 'PUT',
      expiration
    };
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const positiveWords = ['up', 'rise', 'gain', 'bull', 'positive', 'growth', 'increase', 'surge', 'rally'];
    const negativeWords = ['down', 'fall', 'loss', 'bear', 'negative', 'decline', 'drop', 'crash', 'plunge'];
    
    const positiveScore = positiveWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);
    const negativeScore = negativeWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(streamType: 'marketData' | 'news' | 'options'): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${streamType}`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect ${streamType} in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      switch (streamType) {
        case 'marketData':
          this.connectMarketData();
          break;
        case 'news':
          this.connectNews();
          break;
        case 'options':
          this.connectOptions();
          break;
      }
    }, delay);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('Real-time stream error:', error);
    });
  }

  /**
   * Disconnect all streams
   */
  disconnect(): void {
    console.log('🔌 Disconnecting all real-time streams...');
    
    this.marketDataWs?.close();
    this.newsWs?.close();
    this.optionsWs?.close();
    
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    
    console.log('✅ All streams disconnected');
  }

  /**
   * Get connection status
   */
  getStatus(): {
    marketData: boolean;
    news: boolean;
    options: boolean;
    subscriptions: typeof this.subscriptions;
  } {
    return {
      marketData: this.marketDataWs?.readyState === WebSocket.OPEN,
      news: this.newsWs?.readyState === WebSocket.OPEN,
      options: this.optionsWs?.readyState === WebSocket.OPEN,
      subscriptions: {
        quotes: this.subscriptions.quotes,
        trades: this.subscriptions.trades,
        bars: this.subscriptions.bars,
        news: this.subscriptions.news,
        options: this.subscriptions.options
      }
    };
  }
}

export default AlpacaRealTimeStream;