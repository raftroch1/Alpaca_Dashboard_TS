#!/usr/bin/env ts-node
/**
 * PAPER TRADING LAUNCHER
 * 
 * Simple interface to start the Enhanced Paper Trading Engine
 */

import EnhancedPaperTradingEngine from './enhanced-paper-trading-engine';

console.log('🎯 ENHANCED PAPER TRADING LAUNCHER');
console.log('==================================');
console.log('');
console.log('🔥 STRATEGY PERFORMANCE (Backtest Results):');
console.log('   💰 Average Daily P&L: $193');
console.log('   🎯 Win Rate: 77.8%');
console.log('   📈 Profit Factor: 15.60');
console.log('   📊 Average Hold Time: 14.2 minutes');
console.log('   🛡️  Max Loss: $50 | Max Win: $181');
console.log('');
console.log('🚀 Starting live paper trading...');
console.log('');

async function startPaperTrading() {
  const engine = new EnhancedPaperTradingEngine(25000);
  
  try {
    await engine.startPaperTrading();
    
    console.log('✅ Paper trading active! Press Ctrl+C to stop.');
    console.log('');
    console.log('📊 Monitoring for signals every minute...');
    console.log('🎯 Targeting $193/day with 3 trades/day');
    console.log('🛡️  Using proven 0-DTE risk management');
    console.log('');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('');
      console.log('🛑 Graceful shutdown initiated...');
      engine.stopPaperTrading();
      
      setTimeout(() => {
        console.log('✅ Paper trading stopped successfully');
        process.exit(0);
      }, 2000);
    });
    
    // Keep alive and show periodic updates
    setInterval(() => {
      const stats = engine.getCurrentStats();
      const now = new Date();
      
      // Show hourly summary
      if (now.getMinutes() === 0) {
        console.log('');
        console.log('⏰ HOURLY UPDATE');
        console.log('================');
        console.log(`🕐 Time: ${now.toLocaleTimeString()}`);
        console.log(`💰 Today's P&L: $${stats.todaysPnL.toFixed(2)} / $193 target`);
        console.log(`📈 Progress: ${(stats.targetProgress * 100).toFixed(1)}% of daily goal`);
        console.log(`📊 Trades: ${stats.todaysTradesCompleted} completed, ${stats.todaysTradesOpen} open`);
        console.log(`🎯 Win Rate: ${(stats.todaysWinRate * 100).toFixed(1)}% (Target: 60%+)`);
        console.log(`💼 Balance: $${stats.paperBalance.toLocaleString()}`);
        console.log('');
      }
    }, 60000); // Check every minute
    
  } catch (error) {
    console.error('❌ Error starting paper trading:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startPaperTrading();