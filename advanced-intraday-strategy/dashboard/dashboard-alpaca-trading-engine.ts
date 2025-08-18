#!/usr/bin/env ts-node
/**
 * DASHBOARD ALPACA PAPER TRADING ENGINE
 * 
 * Isolated copy of main trading engine for dashboard parameter testing
 * Uses real Alpaca integration but with DASH_ prefixes for trade identification
 * 
 * ✅ Real Alpaca paper account integration (isolated from main strategy)
 * ✅ Dashboard parameter injection
 * ✅ Trade identification via DASH_ prefix
 * ✅ Same contract sizes and risk management as main strategy
 * ✅ Complete isolation from main trading engine
 */

// Load dashboard-specific environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.dashboard') });

import { Strategy, MarketData, OptionsChain } from '../../lib/types';
import { alpacaHTTPClient } from '../../lib/alpaca-http-client';
import { TechnicalAnalysis } from '../../lib/technical-indicators';
import { TradingParameters } from './trading-parameters';
import { AdaptiveStrategySelector } from '../../lib/adaptive-strategy-selector';

interface DashboardAlpacaConfig {
  apiKey: string;
  secretKey: string;
  paper: boolean;
  baseUrl: string;
  tradePrefix: string;
}

interface DashboardSignal {
  action: 'BUY_CALL' | 'BUY_PUT' | 'NO_TRADE';
  confidence: number;
  reasoning: string[];
  signalType: 'SOPHISTICATED' | 'RSI_EXTREME' | 'MOMENTUM' | 'BREAKOUT' | 'TIME_BASED';
  targetProfit: number;
  maxLoss: number;
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

interface DashboardTrade {
  id: string;
  orderId: string;
  clientOrderId: string;
  timestamp: Date;
  action: 'BUY_CALL' | 'BUY_PUT';
  symbol: string;
  strike: number;
  entryPrice: number;
  quantity: number;
  signalType: string;
  status: 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  fillPrice?: number;
  fillTime?: Date;
  exitOrderId?: string;
  pnl?: number;
  trailingStopPrice?: number;
  initialStopLoss?: number;
}

export class DashboardAlpacaTradingEngine {
  
  private alpaca: any;
  private activeTrades: DashboardTrade[] = [];
  private completedTrades: DashboardTrade[] = [];
  private accountInfo: any = null;
  private parameters: TradingParameters;
  
  // Daily tracking
  private dailyTradesGenerated = 0;
  private currentDay = '';
  private lastSignalTime = 0;
  
  // Dashboard-specific identifiers
  private readonly TRADE_PREFIX = process.env.DASHBOARD_TRADE_PREFIX || 'DASH_';
  private readonly SYMBOL = process.env.DASHBOARD_SYMBOL || 'SPY';
  
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(parameters?: TradingParameters) {
    // Use provided parameters or default balanced configuration
    this.parameters = parameters || this.getDefaultParameters();
    
    this.initializeAlpacaConnection();
    
    console.log('🎛️ DASHBOARD ALPACA TRADING ENGINE INITIALIZED');
    console.log('===============================================');
    console.log(`🏷️ Trade Prefix: ${this.TRADE_PREFIX}`);
    console.log(`📊 Symbol: ${this.SYMBOL}`);
    console.log(`🎯 Daily Target: $${this.parameters.dailyPnLTarget}`);
    console.log(`🛡️ Stop Loss: ${this.parameters.initialStopLossPct}%`);
    console.log(`📈 Profit Target: ${this.parameters.profitTargetPct}%`);
    console.log(`⏱️ Signal Spacing: ${this.parameters.minSignalSpacingMinutes} minutes`);
    console.log(`💰 Max Risk/Trade: ${this.parameters.maxRiskPerTradePct}%`);
    console.log('');
  }

  private getDefaultParameters(): TradingParameters {
    return {
      dailyPnLTarget: 200,
      targetWinSize: 200,
      targetLossSize: 150,
      dailyTradeTarget: null, // Unlimited
      
      initialStopLossPct: 0.35,
      profitTargetPct: 0.50,
      trailActivationPct: 0.20,
      trailStopPct: 0.10,
      maxDrawdownPct: 0.15,
      
      minSignalSpacingMinutes: 5,
      forceExitTime: 15.5,
      maxHoldMinutesMorning: 90,
      maxHoldMinutesAfternoon: 60,
      
      rsiOversold: 25,
      rsiOverbought: 75,
      rsiPeriod: 14,
      momentumThresholdPct: 0.15,
      volumeConfirmationRatio: 1.5,
      breakoutThresholdPct: 0.10,
      
      basePositionValue: 500,
      maxRiskPerTradePct: 0.02,
      accountSize: 25000,
      maxConcurrentPositions: 3,
      
      enableRsiSignals: true,
      enableMomentumSignals: true,
      enableBreakoutSignals: true,
      enableTimeBasedSignals: true,
      
      usePartialProfitTaking: false,
      partialProfitLevel: 0.30,
      partialProfitSize: 0.50,
      moveStopToBreakeven: false,
      reducedSignalSpacing: false,
      
      // Institutional features (default values)
      enableGEXFilters: true,
      enableVolumeProfile: true,
      enableMicrofractals: true,
      enableATRRiskManagement: true,
      requireConfluence: true,
      minConfidenceLevel: 0.6,
      enableGreeksMonitoring: true,
      portfolioRiskLimit: 10.0,
      dailyLossLimit: 500
    };
  }

  updateParameters(newParameters: Partial<TradingParameters>): void {
    this.parameters = { ...this.parameters, ...newParameters };
    
    console.log('🔧 DASHBOARD PARAMETERS UPDATED');
    console.log(`🎯 Daily Target: $${this.parameters.dailyPnLTarget}`);
    console.log(`🛡️ Stop Loss: ${this.parameters.initialStopLossPct}%`);
    console.log(`📈 Profit Target: ${this.parameters.profitTargetPct}%`);
    console.log(`⏱️ Signal Spacing: ${this.parameters.minSignalSpacingMinutes} minutes`);
    
    if (this.parameters.usePartialProfitTaking) {
      console.log(`🎯 Partial Profit: ${(this.parameters.partialProfitLevel * 100).toFixed(0)}% → Close ${(this.parameters.partialProfitSize * 100).toFixed(0)}%`);
    }
  }

  private initializeAlpacaConnection(): void {
    try {
      const apiKey = process.env.ALPACA_API_KEY || '';
      const apiSecret = process.env.ALPACA_API_SECRET || '';
      
      if (!apiKey || !apiSecret) {
        throw new Error('Dashboard Alpaca API credentials not found. Please set ALPACA_API_KEY and ALPACA_API_SECRET in .env.dashboard file.');
      }
      
      // Use axios for manual header authentication (EXACT SAME as main strategy)
      const axios = require('axios');
      
      this.alpaca = {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
          'Content-Type': 'application/json'
        },
        baseUrl: 'https://paper-api.alpaca.markets',
        
        // Account methods (same as main strategy)
        async getAccount() {
          const response = await axios.get(`${this.baseUrl}/v2/account`, { headers: this.headers });
          return response.data;
        },
        
        // Market data methods (same as main strategy)

        
        // Order methods (same as main strategy)
        async getOrders(params: any = {}) {
          const queryParams = new URLSearchParams(params);
          const response = await axios.get(`${this.baseUrl}/v2/orders?${queryParams}`, { 
            headers: this.headers 
          });
          return response.data;
        },
        
        async cancelOrder(orderId: string) {
          const response = await axios.delete(`${this.baseUrl}/v2/orders/${orderId}`, { 
            headers: this.headers 
          });
          return response.data;
        },
        
        // MISSING METHOD: createOrder (same as main strategy)
        async createOrder(orderData: any) {
          const response = await axios.post(`${this.baseUrl}/v2/orders`, orderData, { 
            headers: this.headers 
          });
          return response.data;
        },
        
        // MISSING METHOD: getPositions (same as main strategy)
        async getPositions() {
          const response = await axios.get(`${this.baseUrl}/v2/positions`, { 
            headers: this.headers 
          });
          return response.data;
        }
      };
      
      console.log('✅ Dashboard Alpaca connection initialized (SAME METHOD AS MAIN STRATEGY)');
      console.log(`🔗 Base URL: ${this.alpaca.baseUrl}`);
      console.log(`🏷️ Trade prefix: ${this.TRADE_PREFIX}`);
      console.log(`🔑 API Key: ${apiKey.substring(0, 6)}...`);
      
    } catch (error) {
      console.error('❌ Failed to initialize dashboard Alpaca connection:', error);
      throw error;
    }
  }

  async startDashboardPaperTrading(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Dashboard trading is already running');
      return;
    }

    try {
      console.log('🚀 STARTING DASHBOARD PAPER TRADING');
      console.log('==================================');
      
      // Get account info
      this.accountInfo = await this.alpaca.getAccount();
      const portfolioValue = parseFloat(this.accountInfo.portfolio_value);
      const buyingPower = parseFloat(this.accountInfo.buying_power);
      
      console.log(`💰 Portfolio Value: $${portfolioValue.toLocaleString()}`);
      console.log(`💸 Buying Power: $${buyingPower.toLocaleString()}`);
      console.log(`📊 Dashboard Symbol: ${this.SYMBOL}`);
      console.log(`🏷️ Trade Prefix: ${this.TRADE_PREFIX}`);
      console.log('');
      
      this.isRunning = true;
      this.startMonitoringLoop();
      
      console.log('✅ Dashboard paper trading started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start dashboard paper trading:', error);
      throw error;
    }
  }

  async stopDashboardPaperTrading(): Promise<void> {
    console.log('🛑 STOPPING DASHBOARD PAPER TRADING');
    
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    // Cancel any pending dashboard orders
    try {
      const openOrders = await this.alpaca.getOrders({ status: 'open' });
      const dashboardOrders = openOrders.filter((order: any) => 
        order.client_order_id?.startsWith(this.TRADE_PREFIX)
      );
      
      for (const order of dashboardOrders) {
        await this.alpaca.cancelOrder(order.id);
        console.log(`🚫 Cancelled dashboard order: ${order.client_order_id}`);
      }
      
    } catch (error) {
      console.error('⚠️ Error cancelling dashboard orders:', error);
    }
    
    console.log('✅ Dashboard paper trading stopped');
  }

  private startMonitoringLoop(): void {
    console.log('📡 Starting dashboard monitoring loop...');
    
    // Start monitoring loop (every 10 seconds for fast 0-DTE exit monitoring)
    this.monitoringInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Market hours check (9:30 AM - 4:00 PM ET)
        if (hour < 9 || (hour === 9 && minute < 30) || hour >= 16) {
          return;
        }
        
        // Get current market data
        const marketData = await this.getCurrentMarketData();
        if (!marketData || marketData.length === 0) {
          return;
        }
        
        const currentBar = marketData[marketData.length - 1];
        
        // Update daily tracking
        this.updateDailyTracking(currentBar);
        
        // Manage existing positions (critical for 0-DTE stop losses)
        await this.manageDashboardPositions(currentBar);
        
        // Generate new signals
        const signal = await this.generateDashboardSignal(marketData, currentBar);
        
        if (signal && signal.action !== 'NO_TRADE') {
          console.log(`📊 Dashboard signal: ${signal.action} (${signal.signalType}) - Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
          
          // Execute trade with dashboard parameters
          await this.executeDashboardTrade(signal, currentBar);
        }
        
        // Log status every 5 minutes
        if (minute % 5 === 0) {
          await this.logDashboardStatus();
        }
        
      } catch (error) {
        console.error('❌ Dashboard monitoring error:', error);
      }
      
    }, 10000); // Every 10 seconds
  }

  private async getCurrentMarketData(): Promise<MarketData[]> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago (match main strategy)
      
              const marketData = await alpacaHTTPClient.getMarketData(
        this.SYMBOL,
        startTime,
        endTime,
        '1Min'
      );
      
      if (marketData.length < 20) {
        console.log('⚠️  Insufficient market data, waiting...');
        return [];
      }
      
      return marketData;
      
    } catch (error) {
      console.error('❌ Error fetching dashboard market data:', error);
      return [];
    }
  }

  private async generateDashboardSignal(marketData: MarketData[], currentBar: MarketData): Promise<DashboardSignal | null> {
    const currentTime = currentBar.date;
    const currentTimeMs = currentTime.getTime();
    
    // Check daily trade limit (if set)
    if (this.parameters.dailyTradeTarget && this.dailyTradesGenerated >= this.parameters.dailyTradeTarget) {
      return null;
    }
    
    // Check signal spacing using dashboard parameters
    const minutesSinceLastSignal = (currentTimeMs - this.lastSignalTime) / (1000 * 60);
    const requiredSpacing = this.parameters.reducedSignalSpacing ? 
      this.parameters.minSignalSpacingMinutes / 2 : 
      this.parameters.minSignalSpacingMinutes;
      
    if (minutesSinceLastSignal < requiredSpacing && this.lastSignalTime > 0) {
      return null;
    }
    
    // Check concurrent positions limit
    if (this.activeTrades.length >= this.parameters.maxConcurrentPositions) {
      return null;
    }
    
    console.log(`🏛️ DASH: Using DirectInstitutionalIntegration (SAME AS BACKTEST)`);
    
    if (marketData.length < 50) {
      console.log(`⚠️ DASH: Insufficient data - only ${marketData.length} bars (need 50 for institutional signals)`);
      return null;
    }
    
    try {
      // Get options chain
      const optionsChain = await alpacaHTTPClient.getOptionsChain('SPY');
      
      // 🚀 USE EXACT SAME METHOD AS BACKTEST - DirectInstitutionalIntegration
      const { DirectInstitutionalIntegration } = await import('../../clean-strategy/core/institutional-strategy/direct-institutional-integration');
      
      // Use EXACT SAME config as backtest - read from dashboard parameters
      const institutionalConfig = {
        gexWeight: this.parameters.gexWeight || 0.30,
        avpWeight: this.parameters.avpWeight || 0.20,
        avwapWeight: this.parameters.avwapWeight || 0.20,
        fractalWeight: this.parameters.fractalWeight || 0.20,
        atrWeight: this.parameters.atrWeight || 0.10,
        minimumBullishScore: this.parameters.minimumBullishScore || 0.5,
        minimumBearishScore: this.parameters.minimumBearishScore || 0.5,
        riskMultiplier: this.parameters.riskMultiplier || 1.0,
        maxPositionSize: this.parameters.maxPositionSize || 0.02
      };
      
      const signal = await DirectInstitutionalIntegration.generateDirectSignal(
        marketData,
        optionsChain,
        25000,  // Account balance (same as backtest)
        institutionalConfig  // Same config as backtest, read from dashboard
      );
      
      if (signal && signal.action !== 'NO_TRADE') {
        
        console.log(`🏛️ PAPER TRADING - INSTITUTIONAL SIGNAL: ${signal.action}`);
        console.log(`📊 Confidence: ${(signal.confidence * 100).toFixed(1)}% (SAME AS BACKTEST)`);
        console.log(`🔍 Reasoning: ${signal.reasoning}`);
        console.log(`🎯 Using: GEX(${institutionalConfig.gexWeight}), AVP(${institutionalConfig.avpWeight}), AVWAP(${institutionalConfig.avwapWeight}), Fractals(${institutionalConfig.fractalWeight}), ATR(${institutionalConfig.atrWeight})`);
        
        // Map our DirectInstitutional signals to dashboard format
        let dashboardAction: 'BUY_CALL' | 'BUY_PUT' | 'NO_TRADE';
        
        switch (signal.action) {
          case 'BUY_CALL':
          case 'SELL_PUT':  // Bullish strategies -> BUY_CALL for dashboard
            dashboardAction = 'BUY_CALL';
            break;
          case 'BUY_PUT':
          case 'SELL_CALL': // Bearish strategies -> BUY_PUT for dashboard
            dashboardAction = 'BUY_PUT';
            break;
          default:
            dashboardAction = 'NO_TRADE';
        }

        // Convert to dashboard format (same confidence and reasoning as backtest)
        return {
          action: dashboardAction,
          confidence: signal.confidence,
          reasoning: [signal.reasoning],
          signalType: 'SOPHISTICATED',  // Using sophisticated for institutional signals
          targetProfit: this.parameters.profitTargetPct,
          maxLoss: this.parameters.initialStopLossPct,
          quality: signal.confidence > 0.8 ? 'EXCELLENT' : signal.confidence > 0.6 ? 'GOOD' : 'FAIR'
        };
      }
      
    } catch (error) {
      console.log('⚠️ Direct institutional signal generation error');
      console.error(error);
    }
    
    return null;
  }
  
  /**
   * Create strategy object from dashboard parameters (same as backtest)
   */
  private createStrategyFromParameters(): Strategy {
    return {
      id: 'dashboard-institutional',
      name: 'Dashboard Institutional Strategy',
      userId: 'dashboard',
      rsiPeriod: this.parameters.rsiPeriod,
      rsiOverbought: this.parameters.rsiOverbought,
      rsiOversold: this.parameters.rsiOversold,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      stopLossPercent: this.parameters.initialStopLossPct,
      takeProfitPercent: this.parameters.profitTargetPct,
      maxPositions: this.parameters.maxConcurrentPositions,
      positionSizePercent: 0.02,
      daysToExpiration: 0, // 0-DTE
      deltaRange: 0.5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Convert institutional signal actions to dashboard format
   */
  private convertInstitutionalAction(action: string): 'BUY_CALL' | 'BUY_PUT' | 'NO_TRADE' {
    switch (action) {
      case 'BULL_PUT_SPREAD':
      case 'BUY_CALL':
        return 'BUY_CALL';
      case 'BEAR_CALL_SPREAD':
      case 'BUY_PUT':
        return 'BUY_PUT';
      case 'IRON_CONDOR':
        // For Iron Condor, choose direction based on market conditions
        return Math.random() > 0.5 ? 'BUY_CALL' : 'BUY_PUT';
      default:
        return 'NO_TRADE';
    }
  }

  private async executeDashboardTrade(signal: DashboardSignal, currentBar: MarketData): Promise<void> {
    try {
      // Only execute if signal is actionable
      if (signal.action === 'NO_TRADE') {
        return;
      }
      
      const accountInfo = await this.alpaca.getAccount();
      const portfolioValue = parseFloat(accountInfo.portfolio_value);
      
      // Use dashboard risk parameters (same as main but with dashboard parameters)
      const maxRisk = Math.min(300, portfolioValue * this.parameters.maxRiskPerTradePct);
      const currentPrice = currentBar.close;
      
      // Calculate position size (same logic as main strategy)
      const estimatedOptionPrice = currentPrice * 0.10; // Rough estimate
      const quantity = Math.max(2, Math.min(4, Math.floor(maxRisk / (estimatedOptionPrice * 100))));
      
      // Generate dashboard-specific client order ID
      const clientOrderId = `${this.TRADE_PREFIX}${this.SYMBOL}_${Date.now()}`;
      
      // Generate proper Alpaca option symbol format
      const strike = this.calculateStrike(currentPrice, signal.action as 'BUY_CALL' | 'BUY_PUT');
      const today = new Date();
      
      // Use proper Alpaca option symbol format: SPY240818C00643000
      const year = today.getFullYear().toString().slice(-2);
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const optionType = signal.action === 'BUY_CALL' ? 'C' : 'P';
      const strikeFormatted = String(Math.round(strike * 1000)).padStart(8, '0');
      const optionSymbol = `SPY${year}${month}${day}${optionType}${strikeFormatted}`;
      
      console.log(`🔧 Generated option symbol: ${optionSymbol} (Fixed Alpaca format)`);
      const actualStrike = strike;
      
      console.log(`🎯 DASH Submitting REAL Order: ${signal.action} ${quantity} contracts`);
      console.log(`📋 Option Symbol: ${optionSymbol}`);
      console.log(`💰 Strike: $${actualStrike}, Risk: $${maxRisk.toFixed(2)}`);
      
      // 🚨 SUBMIT ACTUAL ORDER TO ALPACA (same as main strategy)
      const order = await this.alpaca.createOrder({
        symbol: optionSymbol,
        qty: quantity.toString(),
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        client_order_id: clientOrderId
      });
      
      console.log(`✅ DASH Real Order Submitted! Order ID: ${order.id}`);
      console.log(`🏷️ Client Order ID: ${clientOrderId}`);
      
      const trade: DashboardTrade = {
        id: clientOrderId,
        orderId: order.id,
        clientOrderId,
        timestamp: currentBar.date,
        action: signal.action,
        symbol: optionSymbol,
        strike: actualStrike,
        entryPrice: estimatedOptionPrice,
        quantity,
        signalType: signal.signalType,
        status: 'SUBMITTED'
      };
      
      // ✅ CRITICAL FIX: Only track successful orders
      this.activeTrades.push(trade);
      this.dailyTradesGenerated++;
      this.lastSignalTime = currentBar.date.getTime();
      
      console.log(`📈 Trade added to tracking: ${this.activeTrades.length}/${this.parameters.maxConcurrentPositions} active`);
      
    } catch (error: any) {
      console.error('❌ Dashboard trade execution error:', error);
      console.log('🚫 Order failed - not adding to active trades to prevent position blocking');
      
      if (error.response && error.response.data) {
        console.log(`🔍 Alpaca Error: ${error.response.data.message} (Code: ${error.response.data.code})`);
      }
    }
  }

  private calculateStrike(currentPrice: number, action: 'BUY_CALL' | 'BUY_PUT'): number {
    // Simple strike selection for 0-DTE
    const roundedPrice = Math.round(currentPrice);
    
    if (action === 'BUY_CALL') {
      return roundedPrice; // ATM calls
    } else {
      return roundedPrice; // ATM puts
    }
  }

  private async manageDashboardPositions(currentBar: MarketData): Promise<void> {
    // Update order statuses with real Alpaca data
    await this.updateDashboardOrderStatuses();
    
    // Get real Alpaca positions to check P&L
    const alpacaPositions = await this.alpaca.getPositions();
    const dashboardPositions = alpacaPositions.filter((pos: any) => 
      pos.symbol.includes('SPY') && pos.qty !== '0'
    );
    
    if (dashboardPositions.length > 0) {
      const now = new Date();
      console.log(`🔍 [${now.toLocaleTimeString()}] REAL POSITION CHECK - ${dashboardPositions.length} active positions`);
      console.log(`📊 Current SPY Price: $${currentBar.close.toFixed(2)}`);
      
      // Check each real Alpaca position for exit conditions
      for (const position of dashboardPositions) {
        await this.checkRealPositionExit(position, currentBar);
      }
    }
    
    // Also check our internal trade tracking
    const filledTrades = this.activeTrades.filter(t => t.status === 'FILLED');
    for (const trade of filledTrades) {
      await this.checkDashboardTradeExits(trade, currentBar);
    }
  }

  private async updateDashboardOrderStatuses(): Promise<void> {
    try {
      // Check status of active trades
      for (const trade of this.activeTrades) {
        if (trade.status === 'SUBMITTED' && trade.orderId) {
          try {
            const orders = await this.alpaca.getOrders();
            const order = orders.find((o: any) => o.id === trade.orderId);
            
            if (order) {
              if (order.status === 'filled') {
                trade.status = 'FILLED';
                trade.fillPrice = parseFloat(order.filled_avg_price || '0');
                trade.fillTime = new Date(order.filled_at);
                
                // CRITICAL: Calculate stop loss price based on fill price (dashboard parameters)
                trade.initialStopLoss = trade.fillPrice * (1 - this.parameters.initialStopLossPct);
                trade.trailingStopPrice = trade.initialStopLoss;
                
                console.log(`✅ DASH Order Filled: ${trade.action} ${trade.quantity} contracts at $${trade.fillPrice}`);
                console.log(`🛡️  DASH Stop Loss Set: $${trade.initialStopLoss.toFixed(2)} (-${(this.parameters.initialStopLossPct * 100).toFixed(0)}%)`);
              } else if (order.status === 'canceled' || order.status === 'cancelled') {
                trade.status = 'CANCELLED';
                console.log(`❌ DASH Order Cancelled: ${trade.clientOrderId}`);
              } else if (order.status === 'rejected') {
                trade.status = 'REJECTED';
                console.log(`🚫 DASH Order Rejected: ${trade.clientOrderId}`);
              }
            }
          } catch (orderError) {
            // Individual order check failed, continue with others
            console.log(`⚠️ Could not check status for order ${trade.orderId}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error updating dashboard order statuses:', error);
    }
  }

  private async checkDashboardTradeExits(trade: DashboardTrade, currentBar: MarketData): Promise<void> {
    if (!trade.fillPrice || !trade.initialStopLoss) return;
    
    const currentStockPrice = currentBar.close;
    const holdTimeMinutes = (currentBar.date.getTime() - trade.timestamp.getTime()) / (1000 * 60);
    
    // Get real Alpaca option prices (same as main strategy)
    const positions = await this.alpaca.getPositions();
    const alpacaPosition = positions.find((pos: any) => pos.symbol === trade.symbol);
    
    let currentValue;
    if (alpacaPosition) {
      // Use REAL Alpaca market value - convert from total position value to per-contract price
      currentValue = parseFloat(alpacaPosition.market_value) / (trade.quantity * 100);
      console.log(`📊 DASH REAL Alpaca Price for ${trade.symbol}: $${currentValue.toFixed(2)} (market_value: $${alpacaPosition.market_value})`);
    } else {
      // Fallback to estimation if no position found
      const stockMovePct = (currentStockPrice - trade.strike!) / trade.strike!;
      
      if (trade.action === 'BUY_CALL') {
        if (currentStockPrice > trade.strike!) {
          currentValue = trade.fillPrice * (1 + Math.abs(stockMovePct) * 3);
        } else {
          currentValue = trade.fillPrice * Math.max(0.05, (1 - Math.abs(stockMovePct) * 8));
        }
      } else { // BUY_PUT
        if (currentStockPrice < trade.strike!) {
          currentValue = trade.fillPrice * (1 + Math.abs(stockMovePct) * 3);
        } else {
          currentValue = trade.fillPrice * Math.max(0.05, (1 - Math.abs(stockMovePct) * 8));
        }
      }
      console.log(`📊 DASH ESTIMATED Price for ${trade.symbol}: $${currentValue.toFixed(2)} (no Alpaca position found)`);
    }
    
    const profitPct = (currentValue - trade.fillPrice) / trade.fillPrice;
    const absoluteLossPct = Math.abs(Math.min(0, profitPct));
    
    console.log(`🔍 DASH ${trade.symbol} (${trade.action}):`);
    console.log(`   💰 Entry: $${trade.fillPrice.toFixed(2)} → Current: $${currentValue.toFixed(2)}`);
    console.log(`   📊 P&L: ${profitPct >= 0 ? '+' : ''}${(profitPct * 100).toFixed(1)}%`);
    console.log(`   🛡️  Stop Loss: $${trade.initialStopLoss.toFixed(2)} (-${(this.parameters.initialStopLossPct * 100).toFixed(0)}%)`);
    
    // Check for profit target
    if (profitPct >= this.parameters.profitTargetPct) {
      console.log(`🎯 DASH PROFIT TARGET HIT: ${(profitPct * 100).toFixed(1)}% >= ${(this.parameters.profitTargetPct * 100).toFixed(0)}%`);
      await this.exitDashboardTrade(trade, 'PROFIT_TARGET');
      return;
    }
    
    // Enhanced stop loss logic (same as main strategy)
    const percentageLossTriggered = absoluteLossPct >= this.parameters.initialStopLossPct;
    const priceLossTriggered = currentValue <= trade.initialStopLoss;
    const realLossTriggered = absoluteLossPct >= 0.30; // 30% real loss trigger for 0-DTE protection
    
    if (percentageLossTriggered || priceLossTriggered || realLossTriggered) {
      let triggerReason;
      if (realLossTriggered && absoluteLossPct < this.parameters.initialStopLossPct) {
        triggerReason = `30% real loss protection: ${(absoluteLossPct * 100).toFixed(1)}% >= 30%`;
      } else if (percentageLossTriggered) {
        triggerReason = `${(absoluteLossPct * 100).toFixed(1)}% loss >= ${(this.parameters.initialStopLossPct * 100).toFixed(0)}%`;
      } else {
        triggerReason = `Price $${currentValue.toFixed(2)} <= $${trade.initialStopLoss.toFixed(2)}`;
      }
      
      console.log(`🛑 DASH STOP LOSS TRIGGERED: ${triggerReason}`);
      console.log(`   📊 Loss Check: ${(absoluteLossPct * 100).toFixed(1)}% vs ${(this.parameters.initialStopLossPct * 100).toFixed(0)}% = ${percentageLossTriggered ? 'TRIGGERED' : 'OK'}`);
      console.log(`   💰 Price Check: $${currentValue.toFixed(2)} vs $${trade.initialStopLoss.toFixed(2)} = ${priceLossTriggered ? 'TRIGGERED' : 'OK'}`);
      console.log(`   🔥 Real Loss Check: ${(absoluteLossPct * 100).toFixed(1)}% vs 30% = ${realLossTriggered ? 'TRIGGERED' : 'OK'}`);
      
      await this.exitDashboardTrade(trade, 'STOP_LOSS');
      return;
    }
    
    // Partial profit taking logic
    if (this.parameters.usePartialProfitTaking && profitPct >= this.parameters.partialProfitLevel) {
      console.log(`📈 DASH partial profit taking triggered at ${(profitPct * 100).toFixed(1)}%`);
      // TODO: Implement partial exit logic when needed
    }
  }

  private async checkRealPositionExit(position: any, currentBar: MarketData): Promise<void> {
    try {
      const symbol = position.symbol;
      const quantity = Math.abs(parseInt(position.qty));
      const marketValue = parseFloat(position.market_value);
      const totalPnL = parseFloat(position.unrealized_pl);
      const costBasis = parseFloat(position.cost_basis);
      const currentPrice = marketValue / (quantity * 100); // Per-contract price
      
      console.log(`🔍 REAL POSITION: ${symbol}`);
      console.log(`   💰 Market Value: $${marketValue} | P&L: $${totalPnL.toFixed(2)}`);
      console.log(`   📊 Cost Basis: $${costBasis} | Current: $${currentPrice.toFixed(2)}`);
      
      // Calculate percentage P&L
      const pnlPercent = totalPnL / Math.abs(costBasis);
      
      console.log(`   📈 P&L%: ${(pnlPercent * 100).toFixed(1)}%`);
      
      // CHECK STOP LOSS (35% loss)
      if (pnlPercent <= -this.parameters.initialStopLossPct) {
        console.log(`🛑 STOP LOSS TRIGGERED: ${(pnlPercent * 100).toFixed(1)}% <= -${(this.parameters.initialStopLossPct * 100).toFixed(0)}%`);
        await this.closeAlpacaPosition(symbol, quantity, 'STOP_LOSS');
        return;
      }
      
      // CHECK PROFIT TARGET (50% gain)
      if (pnlPercent >= this.parameters.profitTargetPct) {
        console.log(`🎯 PROFIT TARGET HIT: ${(pnlPercent * 100).toFixed(1)}% >= ${(this.parameters.profitTargetPct * 100).toFixed(0)}%`);
        await this.closeAlpacaPosition(symbol, quantity, 'PROFIT_TARGET');
        return;
      }
      
      // CHECK TIME-BASED EXIT (3:30 PM for 0-DTE)
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeDecimal = hour + (minute / 60);
      
      if (timeDecimal >= this.parameters.forceExitTime) {
        console.log(`⏰ FORCE EXIT TIME: ${hour}:${minute.toString().padStart(2, '0')} >= ${this.parameters.forceExitTime}`);
        await this.closeAlpacaPosition(symbol, quantity, 'TIME_EXIT');
        return;
      }
      
    } catch (error) {
      console.error('❌ Error checking real position exit:', error);
    }
  }

  private async closeAlpacaPosition(symbol: string, quantity: number, reason: string): Promise<void> {
    try {
      console.log(`🚪 CLOSING POSITION: ${symbol} (${quantity} contracts) - ${reason}`);
      
      // Get current position P&L from Alpaca before closing
      const positions = await this.alpaca.getPositions();
      const position = positions.find((pos: any) => pos.symbol === symbol);
      
      let pnl = 0;
      if (position) {
        pnl = parseFloat(position.unrealized_pl);
        console.log(`💰 Position P&L: $${pnl.toFixed(2)}`);
      }
      
      // Submit sell order to close position
      const closeOrder = await this.alpaca.createOrder({
        symbol: symbol,
        qty: quantity.toString(),
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
        client_order_id: `${this.TRADE_PREFIX}CLOSE_${Date.now()}`
      });
      
      console.log(`✅ CLOSE ORDER SUBMITTED: ${closeOrder.id}`);
      
      // Find and move the trade to completed with P&L
      const tradeIndex = this.activeTrades.findIndex(t => t.symbol === symbol);
      if (tradeIndex !== -1) {
        const trade = this.activeTrades[tradeIndex];
        trade.pnl = pnl;
        trade.status = 'FILLED'; // Mark as completed
        
        // Move to completed trades for win rate calculation
        this.completedTrades.push(trade);
        this.activeTrades.splice(tradeIndex, 1);
        
        console.log(`📊 Trade completed: ${symbol} → P&L: $${pnl.toFixed(2)} (${reason})`);
        console.log(`🎯 Updated stats: ${this.completedTrades.length} completed, ${this.activeTrades.length} active`);
      } else {
        console.log(`⚠️ Trade not found in activeTrades for symbol: ${symbol}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to close position ${symbol}:`, error);
    }
  }

  private async exitDashboardTrade(trade: DashboardTrade, reason: string): Promise<void> {
    try {
      console.log(`🚪 Dashboard trade exit: ${trade.clientOrderId} - ${reason}`);
      
      // Get current P&L from Alpaca position if available
      if (!trade.pnl) {
        const positions = await this.alpaca.getPositions();
        const position = positions.find((pos: any) => pos.symbol === trade.symbol);
        
        if (position) {
          trade.pnl = parseFloat(position.unrealized_pl);
          console.log(`💰 Final P&L: $${trade.pnl.toFixed(2)}`);
        } else {
          // Fallback: estimate P&L if no position found
          trade.pnl = 0;
          console.log(`⚠️ No position found for P&L calculation, setting to $0`);
        }
      }
      
      // Move to completed trades
      this.activeTrades = this.activeTrades.filter(t => t.id !== trade.id);
      this.completedTrades.push(trade);
      
      console.log(`📊 Trade moved to completed: ${this.completedTrades.length} total completed`);
      
    } catch (error) {
      console.error('❌ Dashboard trade exit error:', error);
    }
  }

  private updateDailyTracking(currentBar: MarketData): void {
    const currentDay = currentBar.date.toDateString();
    
    if (currentDay !== this.currentDay) {
      this.currentDay = currentDay;
      this.dailyTradesGenerated = 0;
      console.log(`📅 Dashboard new trading day: ${currentDay}`);
    }
  }

  private async logDashboardStatus(): Promise<void> {
    const totalPnL = this.completedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = this.completedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = this.completedTrades.length > 0 ? winningTrades / this.completedTrades.length : 0;
    
    console.log(`📊 INSTITUTIONAL PAPER TRADING STATUS:`);
    console.log(`   💰 P&L: $${totalPnL.toFixed(2)} (Target: $${this.parameters.dailyPnLTarget})`);
    console.log(`   📈 Active Positions: ${this.activeTrades.length}/${this.parameters.maxConcurrentPositions}`);
    console.log(`   🎯 Win Rate: ${(winRate * 100).toFixed(1)}% (Backtest: 50.9%)`);
    console.log(`   🏛️ Features: GEX(${this.parameters.gexWeight || 0.30}), AVP(${this.parameters.avpWeight || 0.20}), AVWAP(${this.parameters.avwapWeight || 0.20}), Fractals(${this.parameters.fractalWeight || 0.20})`);
  }

  async getDashboardStats(): Promise<any> {
    const totalPnL = this.completedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = this.completedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = this.completedTrades.filter(t => (t.pnl || 0) <= 0);
    
    return {
      pnl: totalPnL,
      tradesCount: this.completedTrades.length,
      activeTrades: this.activeTrades.length,
      winRate: this.completedTrades.length > 0 ? winningTrades.length / this.completedTrades.length : 0,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0,
      isRunning: this.isRunning,
      parameters: this.parameters
    };
  }
}

export default DashboardAlpacaTradingEngine;