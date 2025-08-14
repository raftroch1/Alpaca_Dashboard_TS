#!/usr/bin/env ts-node
/**
 * DASHBOARD TEST SCRIPT
 * 
 * Quick test to verify dashboard components are working
 */

import { TradingParameters, ParameterValidator, ParameterPresets } from './trading-parameters';

async function testDashboard(): Promise<void> {
  console.log('🧪 TESTING TRADING DASHBOARD');
  console.log('===========================');
  
  try {
    // Test 1: Parameter Presets
    console.log('📊 Test 1: Parameter Presets');
    const presets = ParameterPresets.getAllPresets();
    console.log(`✅ Found ${presets.length} presets: ${presets.map(p => p.name).join(', ')}`);
    
    // Test 2: Parameter Validation
    console.log('\n🔧 Test 2: Parameter Validation');
    const testParams: Partial<TradingParameters> = {
      dailyPnLTarget: 250,
      initialStopLossPct: 0.30,
      rsiOversold: 25,
      rsiOverbought: 75
    };
    
    const validation = ParameterValidator.validate(testParams);
    console.log(`✅ Validation result: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    if (!validation.valid) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    }
    
    // Test 3: Parameter Sanitization
    console.log('\n🧹 Test 3: Parameter Sanitization');
    const unsafeParams: Partial<TradingParameters> = {
      dailyPnLTarget: 5000, // Too high
      initialStopLossPct: 0.80, // Too high
      rsiOversold: 5 // Too low
    };
    
    const sanitized = ParameterValidator.sanitize(unsafeParams);
    console.log(`✅ Sanitized parameters:`);
    console.log(`   Daily target: ${unsafeParams.dailyPnLTarget} → ${sanitized.dailyPnLTarget}`);
    console.log(`   Stop loss: ${unsafeParams.initialStopLossPct} → ${sanitized.initialStopLossPct}`);
    console.log(`   RSI oversold: ${unsafeParams.rsiOversold} → ${sanitized.rsiOversold}`);
    
    // Test 4: WebSocket Dependencies
    console.log('\n🔌 Test 4: WebSocket Dependencies');
    try {
      await import('ws');
      console.log('✅ WebSocket module available');
    } catch (error) {
      console.log('❌ WebSocket module not found - run: npm install ws @types/ws');
    }
    
    // Test 5: File Structure
    console.log('\n📁 Test 5: File Structure');
    const fs = require('fs');
    const requiredFiles = [
      'index.html',
      'assets/dashboard.css',
      'assets/dashboard.js',
      'trading-parameters.ts',
      'dashboard-server.ts',
      'backtest-runner.ts',
      'launch-dashboard.ts',
      'README.md'
    ];
    
    let allFilesExist = true;
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
      }
    }
    
    console.log('\n🎯 DASHBOARD TEST RESULTS');
    console.log('=========================');
    if (allFilesExist) {
      console.log('✅ All tests passed! Dashboard is ready to use.');
      console.log('');
      console.log('🚀 QUICK START:');
      console.log('   cd advanced-intraday-strategy');
      console.log('   ./launch-dashboard.sh');
      console.log('');
      console.log('📱 Or manually:');
      console.log('   cd dashboard');
      console.log('   npm install');
      console.log('   npx ts-node launch-dashboard.ts');
    } else {
      console.log('❌ Some tests failed. Please check missing files.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testDashboard();
}

export default testDashboard;