#!/bin/bash
# 🎛️ Trading Dashboard Quick Launcher
# One-click script to start the trading dashboard

echo "🚀 LAUNCHING TRADING DASHBOARD"
echo "=============================="

# Check if we're in the right directory
if [ ! -d "dashboard" ]; then
    echo "❌ Error: Please run this script from the advanced-intraday-strategy directory"
    echo "   Expected: advanced-intraday-strategy/launch-dashboard.sh"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed"
    echo "   Please install Node.js: https://nodejs.org/"
    exit 1
fi

# Check for TypeScript
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is required but not found"
    echo "   Please ensure npm is properly installed"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Install dependencies if needed
echo "📦 Installing dependencies..."
cd dashboard
npm install --silent

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    echo "   Try running: cd dashboard && npm install"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Launch the dashboard
echo "🎛️ Starting dashboard server..."
echo "📱 Dashboard will open automatically in your browser"
echo "🛑 Press Ctrl+C to stop the dashboard"
echo ""

# Start the dashboard with error handling
npx ts-node launch-dashboard.ts

# If the script exits, show helpful message
echo ""
echo "📋 DASHBOARD STOPPED"
echo "==================="
echo "Dashboard has been stopped. To restart:"
echo "  ./launch-dashboard.sh"
echo ""
echo "Manual launch options:"
echo "  cd dashboard && npm start"
echo "  cd dashboard && npx ts-node launch-dashboard.ts"