#!/usr/bin/env node
/**
 * PAPER TRADING RUNNER WITH TIMEFRAME SELECTOR
 * Simple interface to start paper trading with different timeframes
 * 
 * Usage:
 * npm run paper:1min  - Start 1-minute bar trading ($200+ target)
 * npm run paper:5min  - Start 5-minute bar trading ($150+ target)  
 * npm run paper:15min - Start 15-minute bar trading ($100+ target)
 * npm run paper:daily - Start daily bar trading ($30+ target)
 */

import * as readline from 'readline';
import ProfessionalPaperTradingEngine, { 
  TimeframeOption, 
  TIMEFRAME_CONFIGS,
  PaperTradingStatus 
} from './lib/professional-paper-trading-engine';

class PaperTradingRunner {
  private engine?: ProfessionalPaperTradingEngine;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Show timeframe selection menu
   */
  async showTimeframeMenu(): Promise<TimeframeOption> {
    console.log('\n📊 PROFESSIONAL PAPER TRADING - TIMEFRAME SELECTOR');
    console.log('=' .repeat(60));
    console.log('Select your preferred trading timeframe:\n');
    
    const options = Object.entries(TIMEFRAME_CONFIGS);
    
    options.forEach(([key, config], index) => {
      console.log(`${index + 1}. ${config.displayName}`);
      console.log(`   📈 Expected: ${config.expectedTrades} → ${config.targetDaily}`);
      console.log(`   🎯 Risk Level: ${config.riskLevel}`);
      console.log(`   📝 ${config.description}\n`);
    });
    
    return new Promise((resolve) => {
      this.rl.question('Select timeframe (1-4): ', (answer) => {
        const choice = parseInt(answer) - 1;
        if (choice >= 0 && choice < options.length) {
          resolve(options[choice][0] as TimeframeOption);
        } else {
          console.log('❌ Invalid choice. Defaulting to 1-minute bars for maximum performance.');
          resolve('1Min');
        }
      });
    });
  }

  /**
   * Start paper trading with selected timeframe
   */
  async startPaperTrading(timeframe?: TimeframeOption): Promise<void> {
    try {
      // Select timeframe if not provided
      const selectedTimeframe = timeframe || await this.showTimeframeMenu();
      const config = TIMEFRAME_CONFIGS[selectedTimeframe];
      
      console.log(`\n🚀 Starting Paper Trading with ${config.displayName}`);
      console.log(`🎯 Target Performance: ${config.targetDaily}/day`);
      console.log(`📊 Expected Activity: ${config.expectedTrades}`);
      console.log(`⚠️  Risk Level: ${config.riskLevel}`);
      console.log(`⏰ Check Interval: ${config.checkInterval / 1000}s\n`);
      
      // Initialize engine
      this.engine = new ProfessionalPaperTradingEngine(selectedTimeframe);
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Start trading
      const result = await this.engine.start();
      
      if (result.success) {
        console.log('✅ Paper trading started successfully!');
        console.log('\nCommands:');
        console.log('  status  - Show current status');
        console.log('  stop    - Stop paper trading');
        console.log('  quit    - Exit application\n');
        
        this.startCommandLoop();
      } else {
        console.error('❌ Failed to start paper trading:', result.message);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Error starting paper trading:', error);
      process.exit(1);
    }
  }

  /**
   * Setup event handlers for real-time updates
   */
  private setupEventHandlers(): void {
    if (!this.engine) return;
    
    this.engine.on('started', (data) => {
      console.log(`🎉 Trading started with ${data.config.displayName}`);
    });
    
    this.engine.on('tradeExecuted', (data) => {
      console.log(`\n📈 TRADE EXECUTED`);
      console.log(`Strategy: ${data.strategy}`);
      console.log(`Entry Credit: $${data.position.entryPrice.toFixed(2)}`);
      console.log(`Max Loss: $${data.position.maxLoss.toFixed(2)}`);
      console.log(`Risk Score: ${data.position.riskScore.toFixed(2)}`);
    });
    
    this.engine.on('positionClosed', (data) => {
      console.log(`\n🚪 POSITION CLOSED`);
      console.log(`Reason: ${data.reason}`);
      console.log(`Final P&L: $${data.finalPnL.toFixed(2)}`);
      console.log(`${data.finalPnL > 0 ? '💰 PROFIT' : '📉 LOSS'}`);
    });
    
    this.engine.on('performanceUpdate', (data) => {
      // Periodic performance updates (every 10th update to avoid spam)
      if (data.totalTrades % 10 === 0 && data.totalTrades > 0) {
        console.log(`\n📊 PERFORMANCE UPDATE`);
        console.log(`Total Trades: ${data.totalTrades} | Win Rate: ${data.winRate.toFixed(1)}%`);
        console.log(`Total P&L: $${data.totalPnL.toFixed(2)} | Portfolio Value: $${data.currentPortfolioValue.toFixed(2)}`);
        console.log(`Sharpe Ratio: ${data.sharpeRatio.toFixed(2)} | Max Drawdown: ${data.maxDrawdown.toFixed(1)}%`);
      }
    });
    
    this.engine.on('error', (error) => {
      console.error('❌ Engine Error:', error);
    });
  }

  /**
   * Start interactive command loop
   */
  private startCommandLoop(): void {
    const promptUser = () => {
      this.rl.question('> ', async (command) => {
        await this.handleCommand(command.trim().toLowerCase());
        if (this.engine?.getStatus().isRunning) {
          promptUser(); // Continue the loop
        }
      });
    };
    
    promptUser();
  }

  /**
   * Handle user commands
   */
  private async handleCommand(command: string): Promise<void> {
    if (!this.engine) return;
    
    switch (command) {
      case 'status':
        this.showStatus();
        break;
        
      case 'stop':
        this.engine.stop();
        console.log('🛑 Paper trading stopped');
        this.rl.close();
        break;
        
      case 'quit':
      case 'exit':
        if (this.engine.getStatus().isRunning) {
          this.engine.stop();
        }
        console.log('👋 Goodbye!');
        this.rl.close();
        break;
        
      case 'help':
        console.log('\nCommands:');
        console.log('  status  - Show current status');
        console.log('  stop    - Stop paper trading');
        console.log('  quit    - Exit application');
        break;
        
      default:
        console.log('❓ Unknown command. Type "help" for available commands.');
        break;
    }
  }

  /**
   * Show detailed status
   */
  private showStatus(): void {
    if (!this.engine) return;
    
    const status = this.engine.getStatus();
    const uptime = status.uptime / (1000 * 60 * 60); // hours
    
    console.log('\n📊 PAPER TRADING STATUS');
    console.log('=' .repeat(40));
    console.log(`Running: ${status.isRunning ? '✅ YES' : '❌ NO'}`);
    console.log(`Timeframe: ${status.selectedTimeframe.displayName}`);
    console.log(`Uptime: ${uptime.toFixed(1)} hours`);
    console.log(`Target: ${status.selectedTimeframe.targetDaily}/day`);
    
    console.log('\n💰 PERFORMANCE');
    console.log('-' .repeat(20));
    console.log(`Total Trades: ${status.totalTrades}`);
    console.log(`Win Rate: ${status.winRate.toFixed(1)}%`);
    console.log(`Total P&L: $${status.totalPnL.toFixed(2)}`);
    console.log(`Unrealized P&L: $${status.unrealizedPnL.toFixed(2)}`);
    console.log(`Portfolio Value: $${status.currentBalance.toFixed(2)}`);
    console.log(`Sharpe Ratio: ${status.sharpeRatio.toFixed(2)}`);
    console.log(`Max Drawdown: ${status.maxDrawdown.toFixed(1)}%`);
    
    if (uptime > 0.1) { // More than 6 minutes
      const dailyProjection = (status.totalPnL / uptime) * 24;
      const targetAchievement = (dailyProjection / parseFloat(status.selectedTimeframe.targetDaily.replace(/[^0-9.-]/g, ''))) * 100;
      
      console.log('\n🎯 DAILY PROJECTION');
      console.log('-' .repeat(20));
      console.log(`Projected Daily P&L: $${dailyProjection.toFixed(2)}`);
      console.log(`Target Achievement: ${targetAchievement.toFixed(1)}%`);
      
      if (targetAchievement >= 100) {
        console.log('🎉 ON TRACK TO MEET TARGET!');
      } else if (targetAchievement >= 75) {
        console.log('🔥 CLOSE TO TARGET');
      } else {
        console.log('💡 BELOW TARGET - Consider optimization');
      }
    }
    
    console.log('\n📈 PORTFOLIO');
    console.log('-' .repeat(20));
    console.log(`Open Positions: ${status.positionCount}`);
    console.log(`Portfolio Risk: ${(status.portfolioRisk * 100).toFixed(1)}%`);
    console.log(`Portfolio Delta: ${status.portfolioGreeks.delta.toFixed(2)}`);
    console.log(`Portfolio Theta: ${status.portfolioGreeks.theta.toFixed(0)}`);
    
    if (status.positionCount > 0) {
      console.log('\n🔍 OPEN POSITIONS');
      console.log('-' .repeat(20));
      status.openPositions.forEach((pos, index) => {
        const timeHeld = (Date.now() - pos.entryDate.getTime()) / (1000 * 60 * 60);
        console.log(`${index + 1}. ${pos.side} - $${pos.currentPnL.toFixed(2)} P&L (${timeHeld.toFixed(1)}h)`);
      });
    }
    
    console.log(`\nNext Check: ${status.nextCheckTime.toLocaleTimeString()}`);
    console.log('');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new PaperTradingRunner();
  
  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n🚀 Professional Paper Trading Engine');
    console.log('\nUsage:');
    console.log('  npm run paper           - Interactive timeframe selection');
    console.log('  npm run paper:1min      - Start with 1-minute bars ($200+ target)');
    console.log('  npm run paper:5min      - Start with 5-minute bars ($150+ target)');
    console.log('  npm run paper:15min     - Start with 15-minute bars ($100+ target)');
    console.log('  npm run paper:daily     - Start with daily bars ($30+ target)');
    
    console.log('\nTimeframe Options:');
    Object.entries(TIMEFRAME_CONFIGS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(6)}: ${config.description}`);
    });
    
    console.log('\nFeatures:');
    console.log('  ✓ 100% matches backtesting suite');
    console.log('  ✓ Greeks-based risk management');
    console.log('  ✓ Transaction cost modeling');
    console.log('  ✓ Portfolio risk limits');
    console.log('  ✓ Real-time market data');
    console.log('  ✓ Alpaca paper trading integration');
    
    process.exit(0);
  }
  
  // Direct timeframe selection from command line
  let selectedTimeframe: TimeframeOption | undefined;
  
  if (args.includes('--1min') || process.env.TIMEFRAME === '1Min') {
    selectedTimeframe = '1Min';
  } else if (args.includes('--5min') || process.env.TIMEFRAME === '5Min') {
    selectedTimeframe = '5Min';
  } else if (args.includes('--15min') || process.env.TIMEFRAME === '15Min') {
    selectedTimeframe = '15Min';
  } else if (args.includes('--daily') || process.env.TIMEFRAME === '1Day') {
    selectedTimeframe = '1Day';
  }
  
  try {
    await runner.startPaperTrading(selectedTimeframe);
  } catch (error) {
    console.error('❌ Failed to start paper trading:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { PaperTradingRunner };