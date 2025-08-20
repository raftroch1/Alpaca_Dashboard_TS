#!/usr/bin/env ts-node
/**
 * DASHBOARD WEBSOCKET SERVER
 * 
 * Real-time communication server for the trading dashboard
 * Handles parameter updates, backtest execution, and live trading control
 * 
 * IMPORTANT: This is a separate tool that doesn't modify core strategy files
 */

import { WebSocketServer, WebSocket } from 'ws';
import { TradingParameters, ParameterValidator, ParameterPresets } from './trading-parameters';
import DashboardAlpacaTradingEngine from './dashboard-alpaca-trading-engine';

interface DashboardMessage {
  type: 'UPDATE_PARAMETERS' | 'RUN_BACKTEST' | 'START_PAPER_TRADING' | 'EMERGENCY_STOP' | 'REQUEST_STATUS';
  config?: Partial<TradingParameters> & {
    backtestPeriod?: {
      type: 'daysBack' | 'custom';
      daysBack?: number;
      startDate?: string;
      endDate?: string;
      description?: string;
    };
  };
  data?: any;
}

interface ClientConnection {
  id: string;
  ws: WebSocket;
  lastPing: number;
}

export class DashboardServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private currentParameters: TradingParameters;
  private dashboardTradingEngine?: DashboardAlpacaTradingEngine;
  private isTrading = false;
  private tradingStats = {
    pnl: 0,
    tradesCount: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    isRunning: false
  };

  constructor(port: number = 8080) {
    this.currentParameters = ParameterPresets.BALANCED.parameters;
    this.wss = new WebSocketServer({ port });
    
    console.log('🎛️ DASHBOARD SERVER STARTING');
    console.log('============================');
    console.log(`📡 WebSocket server: ws://localhost:${port}`);
    console.log(`📊 Dashboard URL: file://$(pwd)/advanced-intraday-strategy/dashboard/index.html`);
    console.log(`🔧 Current preset: ${ParameterPresets.BALANCED.name}`);
    console.log('');

    this.setupWebSocketServer();
    this.startHeartbeat();
    this.logServerReady();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      
      console.log(`📱 Client connected: ${clientId}`);
      
      const client: ClientConnection = {
        id: clientId,
        ws,
        lastPing: Date.now()
      };
      
      this.clients.set(clientId, client);

      // Send initial status
      this.sendToClient(clientId, {
        type: 'STATUS_UPDATE',
        parameters: this.currentParameters,
        isTrading: this.isTrading,
        stats: this.tradingStats
      });

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message: DashboardMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`❌ Failed to parse message from ${clientId}:`, error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`📱 Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private async handleClientMessage(clientId: string, message: DashboardMessage): Promise<void> {
    console.log(`📨 Message from ${clientId}: ${message.type}`);

    try {
      switch (message.type) {
        case 'UPDATE_PARAMETERS':
          await this.handleUpdateParameters(clientId, message.config || {});
          break;

        case 'RUN_BACKTEST':
          await this.handleRunBacktest(clientId, message.config || {});
          break;

        case 'START_PAPER_TRADING':
          await this.handleStartPaperTrading(clientId, message.config || {});
          break;

        case 'EMERGENCY_STOP':
          await this.handleEmergencyStop(clientId);
          break;

        case 'REQUEST_STATUS':
          this.sendToClient(clientId, {
            type: 'STATUS_UPDATE',
            parameters: this.currentParameters,
            isTrading: this.isTrading,
            stats: this.tradingStats
          });
          break;

        default:
          console.log(`❓ Unknown message type: ${message.type}`);
          this.sendError(clientId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${clientId}:`, error);
      this.sendError(clientId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleUpdateParameters(clientId: string, config: Partial<TradingParameters>): Promise<void> {
    console.log('🔧 Updating parameters:', Object.keys(config));

    // Validate parameters
    const validation = ParameterValidator.validate(config);
    if (!validation.valid) {
      this.sendError(clientId, `Parameter validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    // Sanitize and update parameters
    const sanitized = ParameterValidator.sanitize(config);
    this.currentParameters = { ...this.currentParameters, ...sanitized };

    console.log('✅ Parameters updated successfully');

    // Broadcast to all clients
    this.broadcast({
      type: 'PARAMETERS_UPDATED',
      parameters: this.currentParameters
    });

    // TODO: Apply parameters to running trading engine
    // This would require integration with your existing trading engine
    console.log('📝 Note: Parameter changes ready for application to trading engine');
  }

  private async handleRunBacktest(clientId: string, config: Partial<TradingParameters> & { backtestPeriod?: any }): Promise<void> {
    console.log('📊 Starting REAL backtest with dashboard parameters...');

    try {
      // Extract backtest period info
      const backtestPeriod = config.backtestPeriod || { type: 'daysBack', daysBack: 3, description: 'Last 3 Days' };
      
      // Update parameters for backtest (excluding backtestPeriod from trading parameters)
      const { backtestPeriod: _, ...tradingConfig } = config;
      const testParameters = { ...this.currentParameters, ...tradingConfig };

      console.log(`📅 Backtest Period: ${backtestPeriod.description}`);
      
      // Import and run DIRECT INSTITUTIONAL backtest engine with dashboard parameters
      const { DirectInstitutionalBacktestRunner } = await import('./direct-institutional-backtest-runner');
      
      let results;
      // Always use our proven DirectInstitutionalBacktestRunner
      results = await DirectInstitutionalBacktestRunner.runDirectInstitutionalBacktest(
        testParameters,
        '1Min',
        backtestPeriod.daysBack || 3
      );

      this.sendToClient(clientId, {
        type: 'BACKTEST_RESULTS',
        results
      });

      console.log('✅ REAL backtest completed successfully');
      console.log(`📊 Results: ${results.totalTrades} trades, ${(results.winRate * 100).toFixed(1)}% win rate`);

    } catch (error) {
      console.error('❌ Real backtest failed:', error);
      this.sendError(clientId, `Backtest failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleStartPaperTrading(clientId: string, config: Partial<TradingParameters>): Promise<void> {
    console.log('🚀 Starting REAL dashboard paper trading with custom parameters...');

    try {
      // Update parameters
      this.currentParameters = { ...this.currentParameters, ...config };
      
      // Initialize dashboard trading engine with real Alpaca integration
      if (!this.dashboardTradingEngine) {
        this.dashboardTradingEngine = new DashboardAlpacaTradingEngine(this.currentParameters);
      } else {
        this.dashboardTradingEngine.updateParameters(config);
      }

      // Start actual dashboard paper trading
      await this.dashboardTradingEngine.startDashboardPaperTrading();
      this.isTrading = true;

      console.log('✅ INSTITUTIONAL PAPER TRADING STARTED');
      console.log('🏛️ Using SAME institutional features as backtest:');
      console.log(`   📊 GEX Analysis: ${this.currentParameters.enableGEXFilters ? 'ON' : 'OFF'} (weight: ${this.currentParameters.gexWeight || 0.30})`);
      console.log(`   📈 Volume Profile: ${this.currentParameters.enableVolumeProfile ? 'ON' : 'OFF'} (weight: ${this.currentParameters.avpWeight || 0.20})`);
      console.log(`   🔍 AVWAP Analysis: ${this.currentParameters.enableMicrofractals ? 'ON' : 'OFF'} (weight: ${this.currentParameters.avwapWeight || 0.20})`);
      console.log(`   🌀 Microfractals: ${this.currentParameters.enableMicrofractals ? 'ON' : 'OFF'} (weight: ${this.currentParameters.fractalWeight || 0.20})`);
      console.log(`   ⚡ ATR Risk Mgmt: ${this.currentParameters.enableATRRiskManagement ? 'ON' : 'OFF'} (weight: ${this.currentParameters.atrWeight || 0.10})`);
      console.log('🎯 Trading Parameters:');
      console.log(`   💰 Daily target: $${this.currentParameters.dailyPnLTarget}`);
      console.log(`   🛡️ Stop loss: ${(this.currentParameters.initialStopLossPct * 100).toFixed(1)}%`);
      console.log(`   📈 Profit target: ${(this.currentParameters.profitTargetPct * 100).toFixed(1)}%`);
      console.log(`   🎯 Min confluence: ${this.currentParameters.minimumBullishScore || 0.5}`);
      console.log('🏷️ Trade prefix: DASH_ (isolated from main strategy)');

      // Start real live updates instead of simulation
      this.startRealTradingUpdates();

      this.broadcast({
        type: 'TRADING_STARTED',
        parameters: this.currentParameters
      });

    } catch (error) {
      console.error('❌ Failed to start dashboard paper trading:', error);
      this.sendError(clientId, `Failed to start trading: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleEmergencyStop(clientId: string): Promise<void> {
    console.log('🛑 DASHBOARD EMERGENCY STOP TRIGGERED');

    this.isTrading = false;
    this.tradingStats.isRunning = false;

    // Stop actual dashboard trading engine
    if (this.dashboardTradingEngine) {
      await this.dashboardTradingEngine.stopDashboardPaperTrading();
      console.log('🛑 Dashboard trading engine stopped');
    }

    this.broadcast({
      type: 'EMERGENCY_STOPPED',
      message: 'Dashboard trading stopped by emergency command'
    });

    console.log('✅ Dashboard emergency stop completed');
  }

  private async simulateBacktest(parameters: TradingParameters): Promise<any> {
    // Simulate backtest execution time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate realistic but simulated results based on parameters
    const baseWinRate = 0.778; // Your proven win rate
    const baseDailyPnL = 193; // Your proven daily P&L

    // Adjust results based on parameter changes
    let adjustedWinRate = baseWinRate;
    let adjustedDailyPnL = baseDailyPnL;

    // More conservative stop loss = higher win rate but lower profits
    if (parameters.initialStopLossPct < 0.30) {
      adjustedWinRate += 0.05;
      adjustedDailyPnL *= 0.85;
    }

    // More aggressive profit target = lower win rate but higher profits
    if (parameters.profitTargetPct > 0.60) {
      adjustedWinRate -= 0.08;
      adjustedDailyPnL *= 1.15;
    }

    // Partial profit taking = higher win rate
    if (parameters.usePartialProfitTaking) {
      adjustedWinRate += 0.03;
      adjustedDailyPnL *= 0.95;
    }

    // Generate results
    const totalTrades = 15 + Math.floor(Math.random() * 10); // 15-25 trades
    const winRate = Math.max(0.4, Math.min(0.9, adjustedWinRate + (Math.random() - 0.5) * 0.1));
    const dailyPnL = adjustedDailyPnL + (Math.random() - 0.5) * 50;
    const totalReturn = (dailyPnL / 25000) * 100 * 3; // 3 days
    const maxDrawdown = Math.random() * 0.08 + 0.02; // 2-10%

    return {
      totalTrades,
      winRate,
      totalReturn,
      avgDailyPnL: dailyPnL,
      maxDrawdown,
      period: '3 days (simulated)'
    };
  }

  private startRealTradingUpdates(): void {
    if (!this.isTrading) return;

    // Get REAL trading updates from dashboard engine every 10 seconds
    const updateInterval = setInterval(async () => {
      if (!this.isTrading) {
        clearInterval(updateInterval);
        return;
      }

      try {
        // Get real stats from dashboard trading engine
        if (this.dashboardTradingEngine) {
          const realStats = await this.dashboardTradingEngine.getDashboardStats();
          
          // Update trading stats with real data
          this.tradingStats = {
            pnl: realStats.pnl,
            tradesCount: realStats.tradesCount,
            winRate: realStats.winRate,
            avgWin: realStats.avgWin,
            avgLoss: realStats.avgLoss,
            isRunning: realStats.isRunning
          };
          
          // Broadcast real dashboard trading data
          this.broadcast({
            type: 'LIVE_UPDATE',
            data: {
              ...this.tradingStats,
              activeTrades: realStats.activeTrades,
              tradePrefix: 'DASH_' // Show dashboard trade identification
            }
          });
        }
        
      } catch (error) {
        console.error('❌ Error getting real dashboard trading stats:', error);
      }

    }, 10000);
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send message to ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  private broadcast(message: any): void {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  private sendError(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: 'ERROR',
      message: error
    });
  }

  private generateClientId(): string {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is still responsive
          if (now - client.lastPing > 30000) { // 30 seconds timeout
            console.log(`💔 Client ${clientId} timed out`);
            client.ws.terminate();
            this.clients.delete(clientId);
          } else {
            // Send ping
            client.ws.ping();
          }
        } else {
          this.clients.delete(clientId);
        }
      });
    }, 15000); // Every 15 seconds
  }

  private logServerReady(): void {
    console.log('✅ Dashboard server ready!');
    console.log('');
    console.log('🌐 DASHBOARD ACCESS:');
    console.log('  1. Open your browser');
    console.log(`  2. Navigate to: file://${process.cwd()}/advanced-intraday-strategy/dashboard/index.html`);
    console.log('  3. The dashboard will automatically connect');
    console.log('');
    console.log('🎛️ FEATURES AVAILABLE:');
    console.log('  ✅ Real-time parameter adjustment');
    console.log('  ✅ Preset configurations (Conservative/Balanced/Aggressive)');
    console.log('  ✅ Live backtest execution');
    console.log('  ✅ Paper trading control');
    console.log('  ✅ Emergency stop functionality');
    console.log('  ✅ Live performance monitoring');
    console.log('');
    console.log('🚀 NEW FEATURES:');
    console.log('  📊 Partial profit taking (30% → close 50% position)');
    console.log('  🛡️ Breakeven stop management');
    console.log('  ⚡ Reduced signal spacing for active markets');
    console.log('  🎯 Dynamic risk adjustment');
    console.log('  🔗 REAL Alpaca integration with DASH_ prefix isolation');
    console.log('');
    console.log('🏷️ IMPORTANT: Dashboard trades use DASH_ prefix');
    console.log('  ✅ Completely isolated from your main strategy');
    console.log('  ✅ Same contract sizes and risk management');
    console.log('  ✅ Real market data and execution');
    console.log('  ✅ Copy credentials from main .env to dashboard/.env.dashboard');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop the server');
    console.log('');
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping dashboard server...');
    
    // Close all client connections
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutting down');
      }
    });
    
    // Close server
    this.wss.close(() => {
      console.log('✅ Dashboard server stopped');
    });
  }
}

// CLI interface
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 8080;
  const server = new DashboardServer(port);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received shutdown signal...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received termination signal...');
    await server.stop();
    process.exit(0);
  });
}

export default DashboardServer;