#!/usr/bin/env node
/**
 * LAUNCHER FOR ALPACA LIVE PAPER TRADING ENGINE
 * 
 * Features:
 * - Interactive timeframe selection
 * - Environment validation
 * - Graceful shutdown handling
 * - Real-time status monitoring
 * 
 * Usage:
 * npx ts-node lib/start-alpaca-live-trading.ts
 * npx ts-node lib/start-alpaca-live-trading.ts --timeframe 1Min
 * npx ts-node lib/start-alpaca-live-trading.ts --timeframe 5Min
 * npx ts-node lib/start-alpaca-live-trading.ts --timeframe 15Min
 * npx ts-node lib/start-alpaca-live-trading.ts --timeframe 1Day
 */

import * as readline from 'readline';
import AlpacaLivePaperTradingEngine, { TimeframeOption, TIMEFRAME_CONFIGS } from './alpaca-live-paper-trading';

// Parse command line arguments
const args = process.argv.slice(2);
const timeframeArg = args.find(arg => arg.startsWith('--timeframe='))?.split('=')[1] as TimeframeOption;
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log(`
🚀 Alpaca Live Paper Trading Engine for lib/ Strategy

Usage:
  npx ts-node lib/start-alpaca-live-trading.ts [--timeframe=TIMEFRAME]

Timeframes:
  1Min    - 1-Minute Bars (High frequency, $200-300/day target)
  5Min    - 5-Minute Bars (Medium frequency, $150-200/day target)  
  15Min   - 15-Minute Bars (Low frequency, $75-150/day target)
  1Day    - Daily Bars (Conservative, $20-40/day target)

Examples:
  npx ts-node lib/start-alpaca-live-trading.ts --timeframe=1Min
  npx ts-node lib/start-alpaca-live-trading.ts --timeframe=1Day

Environment Variables Required:
  ALPACA_API_KEY       - Your Alpaca Paper Trading API Key
  ALPACA_API_SECRET    - Your Alpaca Paper Trading Secret Key

Get credentials from: https://app.alpaca.markets/paper/dashboard/overview
`);
  process.exit(0);
}

class AlpacaLiveTradingLauncher {
  private engine?: AlpacaLivePaperTradingEngine;
  private rl?: readline.Interface;

  async start(): Promise<void> {
    console.log('🚀 Alpaca Live Paper Trading Engine - lib/ Strategy');
    console.log('================================================\n');

    try {
      // 1. Validate environment
      await this.validateEnvironment();

      // 2. Select timeframe
      const selectedTimeframe = await this.selectTimeframe();

      // 3. Initialize engine
      this.engine = new AlpacaLivePaperTradingEngine(selectedTimeframe);

      // 4. Setup event listeners
      this.setupEventListeners();

      // 5. Setup graceful shutdown
      this.setupGracefulShutdown();

      // 6. Start trading
      const result = await this.engine.start();
      
      if (!result.success) {
        console.error(`❌ Failed to start: ${result.message}`);
        process.exit(1);
      }

      // 7. Start status monitoring
      this.startStatusMonitoring();

      console.log('\n✅ Alpaca Live Paper Trading is now running!');
      console.log('📊 Press Ctrl+C to stop gracefully');
      console.log('📈 Monitor performance in real-time below:\n');

    } catch (error: any) {
      console.error('❌ Failed to start Alpaca Live Paper Trading:', error.message);
      process.exit(1);
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment...');

    const requiredVars = ['ALPACA_API_KEY', 'ALPACA_API_SECRET'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(varName => {
        console.error(`   ${varName}`);
      });
      console.error('\n📋 Please set these in your .env file or environment');
      console.error('🔗 Get credentials from: https://app.alpaca.markets/paper/dashboard/overview');
      throw new Error('Missing environment variables');
    }

    console.log('✅ Environment validation passed');
  }

  private async selectTimeframe(): Promise<TimeframeOption> {
    if (timeframeArg && Object.keys(TIMEFRAME_CONFIGS).includes(timeframeArg)) {
      console.log(`📊 Using timeframe from command line: ${TIMEFRAME_CONFIGS[timeframeArg].displayName}`);
      return timeframeArg;
    }

    console.log('\n📊 Select Trading Timeframe:');
    console.log('===========================');

    const timeframes = Object.entries(TIMEFRAME_CONFIGS);
    timeframes.forEach(([key, config], index) => {
      console.log(`${index + 1}. ${config.displayName}`);
      console.log(`   ${config.description}`);
      console.log(`   Expected: ${config.expectedTrades}, Target: ${config.targetDaily}`);
      console.log(`   Risk Level: ${config.riskLevel}\n`);
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      this.rl!.question('Enter your choice (1-4) or timeframe name: ', (answer) => {
        this.rl!.close();

        // Handle numeric choice
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= timeframes.length) {
          const selectedKey = timeframes[choice - 1][0] as TimeframeOption;
          console.log(`📊 Selected: ${TIMEFRAME_CONFIGS[selectedKey].displayName}\n`);
          resolve(selectedKey);
          return;
        }

        // Handle timeframe name
        const timeframeName = answer.trim() as TimeframeOption;
        if (Object.keys(TIMEFRAME_CONFIGS).includes(timeframeName)) {
          console.log(`📊 Selected: ${TIMEFRAME_CONFIGS[timeframeName].displayName}\n`);
          resolve(timeframeName);
          return;
        }

        // Default to 1Day if invalid input
        console.log('⚠️ Invalid choice, defaulting to 1Day (Conservative)\n');
        resolve('1Day');
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.engine) return;

    this.engine.on('started', (data) => {
      console.log(`🎯 Trading started with ${data.config.displayName}`);
      console.log(`💰 Account Value: $${data.account.portfolio_value.toFixed(2)}`);
      console.log(`📈 Max Positions: ${data.config.maxPositions}`);
    });

    this.engine.on('tradeExecuted', (data) => {
      console.log(`\n📈 TRADE EXECUTED: ${data.strategyType}`);
      console.log(`   Order IDs: ${data.alpacaOrderIds.join(', ')}`);
      console.log(`   Signal: ${JSON.stringify(data.signal.indicators, null, 2)}`);
    });

    this.engine.on('positionClosed', (data) => {
      console.log(`\n🚪 POSITION CLOSED: ${data.position.symbol}`);
      console.log(`   Reason: ${data.reason}`);
      console.log(`   P&L: $${data.finalPnL.toFixed(2)}`);
    });

    this.engine.on('performanceUpdate', (data) => {
      // Performance updates are handled by status monitoring
    });

    this.engine.on('error', (error) => {
      console.error(`\n❌ Engine Error: ${error.message}`);
    });

    this.engine.on('cycleComplete', (data) => {
      // Cycle completion is handled by status monitoring
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      console.log('\n🛑 Received shutdown signal...');
      
      if (this.engine) {
        console.log('📊 Stopping trading engine...');
        this.engine.stop();
        
        const status = this.engine.getStatus();
        console.log('\n📈 Final Performance Summary:');
        console.log(`   Total Trades: ${status.totalTrades}`);
        console.log(`   Win Rate: ${status.winRate.toFixed(1)}%`);
        console.log(`   Total P&L: $${status.totalPnL.toFixed(2)}`);
        console.log(`   Portfolio Value: $${status.currentBalance.toFixed(2)}`);
        console.log(`   Max Drawdown: ${status.maxDrawdown.toFixed(1)}%`);
        console.log(`   Open Positions: ${status.positionCount}`);
      }
      
      console.log('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGQUIT', shutdown);
  }

  private startStatusMonitoring(): void {
    let lastCycleTime = new Date();
    let cycleCount = 0;

    setInterval(() => {
      if (!this.engine) return;

      const status = this.engine.getStatus();
      const now = new Date();
      const runtime = Math.floor((now.getTime() - status.uptime) / 1000);
      
      // Clear screen and show status
      console.clear();
      console.log('🚀 Alpaca Live Paper Trading Engine - lib/ Strategy');
      console.log('==================================================');
      console.log(`⏰ Runtime: ${this.formatDuration(runtime * 1000)}`);
      console.log(`📊 Timeframe: ${status.selectedTimeframe.displayName}`);
      console.log(`⚡ Next Check: ${status.nextCheckTime.toLocaleTimeString()}`);
      console.log();

      // Performance metrics
      console.log('📈 PERFORMANCE METRICS');
      console.log('----------------------');
      console.log(`Total Trades: ${status.totalTrades}`);
      console.log(`Win Rate: ${status.winRate.toFixed(1)}%`);
      console.log(`Total P&L: $${status.totalPnL.toFixed(2)}`);
      console.log(`Unrealized P&L: $${status.unrealizedPnL.toFixed(2)}`);
      console.log(`Portfolio Value: $${status.currentBalance.toFixed(2)}`);
      console.log(`Max Drawdown: ${status.maxDrawdown.toFixed(1)}%`);
      console.log(`Sharpe Ratio: ${status.sharpeRatio.toFixed(2)}`);
      console.log();

      // Portfolio status
      console.log('📊 PORTFOLIO STATUS');
      console.log('-------------------');
      console.log(`Open Positions: ${status.positionCount}/${status.selectedTimeframe.maxPositions}`);
      console.log(`Portfolio Risk: ${(status.portfolioRisk * 100).toFixed(1)}%`);
      console.log(`Market Data Points: ${status.currentMarketData.length}`);
      console.log();

      // Recent activity
      if (status.openPositions.length > 0) {
        console.log('🎯 OPEN POSITIONS');
        console.log('-----------------');
        status.openPositions.slice(0, 3).forEach((pos: any) => {
          const runtime = Math.floor((now.getTime() - new Date(pos.entryDate).getTime()) / 1000 / 60);
          console.log(`${pos.side}: $${pos.currentPnL.toFixed(2)} P&L (${runtime}m)`);
        });
        console.log();
      }

      // Market data status
      if (status.currentMarketData.length > 0) {
        const latest = status.currentMarketData[status.currentMarketData.length - 1];
        console.log('📊 MARKET STATUS');
        console.log('----------------');
        console.log(`SPY Price: $${latest.close.toFixed(2)}`);
        console.log(`Volume: ${latest.volume.toLocaleString()}`);
        console.log(`Last Update: ${new Date(latest.date).toLocaleTimeString()}`);
        console.log();
      }

      console.log('📝 Controls: Ctrl+C to stop gracefully');

      cycleCount++;
    }, 5000); // Update every 5 seconds
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Start the launcher
const launcher = new AlpacaLiveTradingLauncher();
launcher.start().catch((error) => {
  console.error('❌ Failed to start launcher:', error.message);
  process.exit(1);
});