#!/usr/bin/env ts-node
/**
 * DASHBOARD LAUNCHER
 * 
 * One-click launch script for the trading dashboard
 * Starts the WebSocket server and opens the dashboard in browser
 */

import DashboardServer from './dashboard-server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

class DashboardLauncher {
  private server?: DashboardServer;
  private port: number;

  constructor(port: number = 8081) {
    this.port = port;
  }

  async launch(): Promise<void> {
    console.log('🚀 LAUNCHING TRADING DASHBOARD');
    console.log('==============================');
    
    try {
      // Check if required dependencies are installed
      await this.checkDependencies();
      
      // Start WebSocket server
      console.log('📡 Starting WebSocket server...');
      this.server = new DashboardServer(this.port);
      
      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Open dashboard in browser
      await this.openDashboard();
      
      console.log('✅ Dashboard launched successfully!');
      console.log('🎛️ You can now control your trading strategy from the web interface');
      console.log('');
      console.log('🛑 Press Ctrl+C to stop the dashboard');
      
    } catch (error) {
      console.error('❌ Failed to launch dashboard:', error);
      process.exit(1);
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('🔍 Checking dependencies...');
    
    try {
      // Check if ws module is available
      await import('ws');
      console.log('✅ WebSocket dependency available');
    } catch (error) {
      console.log('📦 Installing WebSocket dependency...');
      try {
        await execAsync('npm install ws @types/ws');
        console.log('✅ WebSocket dependency installed');
      } catch (installError) {
        throw new Error('Failed to install WebSocket dependency. Please run: npm install ws @types/ws');
      }
    }
  }

  private async openDashboard(): Promise<void> {
    const dashboardPath = path.resolve(__dirname, 'index.html');
    const cacheBuster = Date.now();
    const dashboardUrl = `file://${dashboardPath}?v=${cacheBuster}`;
    
    console.log('🌐 Opening dashboard in browser...');
    console.log(`📱 Dashboard URL: ${dashboardUrl}`);
    
    try {
      // Try to open in browser based on platform
      const platform = process.platform;
      let command: string;
      
      switch (platform) {
        case 'darwin': // macOS
          command = `open "${dashboardUrl}"`;
          break;
        case 'win32': // Windows
          command = `start "${dashboardUrl}"`;
          break;
        default: // Linux and others
          command = `xdg-open "${dashboardUrl}"`;
          break;
      }
      
      await execAsync(command);
      console.log('✅ Dashboard opened in browser');
      
    } catch (error) {
      console.log('⚠️ Could not auto-open browser. Please manually open:');
      console.log(`   ${dashboardUrl}`);
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
    }
  }
}

// CLI interface
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 8080;
  const launcher = new DashboardLauncher(port);

  // Launch dashboard
  launcher.launch().catch(error => {
    console.error('❌ Launch failed:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down dashboard...');
    await launcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Dashboard terminated...');
    await launcher.stop();
    process.exit(0);
  });
}

export default DashboardLauncher;