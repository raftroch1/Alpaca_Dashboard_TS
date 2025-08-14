# 🎛️ Trading Strategy Dashboard

A comprehensive web-based dashboard for managing and controlling your 0-DTE options trading strategy in real-time. Adjust parameters, run backtests, and monitor performance without modifying core code.

## ✨ Features

### 🎯 **Real-time Parameter Control**
- **Trading Targets**: Daily P&L targets, win/loss sizes, trade limits
- **Risk Management**: Stop loss, profit targets, trailing stops, position sizing
- **Signal Controls**: RSI levels, momentum thresholds, breakout sensitivity
- **Timing**: Signal spacing, force exit times, market hours

### 🆕 **NEW Advanced Features**
- **Partial Profit Taking**: Close 50% at 30% profit, move stop to breakeven
- **Dynamic Signal Spacing**: Reduce from 30min to 15min in trending markets
- **Preset Configurations**: Conservative, Balanced (current), Aggressive
- **Parameter Validation**: Real-time validation with safety limits

### 📊 **Live Backtesting**
- Run backtests instantly with your custom parameters
- Compare results against proven 77.8% win rate strategy
- Validate parameter changes before applying to live trading
- Quick feasibility analysis for extreme parameter changes

### 🚀 **Trading Control**
- Start/stop paper trading with custom parameters
- Emergency stop functionality
- Real-time performance monitoring
- Live P&L tracking and progress indicators

## 🚀 Quick Start

### 1. Launch Dashboard
```bash
# From the advanced-intraday-strategy directory
npx ts-node dashboard/launch-dashboard.ts
```

### 2. Access Dashboard
The dashboard will automatically open in your browser at:
```
file://[your-path]/advanced-intraday-strategy/dashboard/index.html
```

### 3. Connect to Trading Engine
The dashboard automatically connects to the WebSocket server and displays connection status.

## 📁 File Structure

```
dashboard/
├── index.html              # Main dashboard interface
├── assets/
│   ├── dashboard.css       # Styling and responsive design
│   └── dashboard.js        # Frontend JavaScript logic
├── trading-parameters.ts   # Parameter definitions and validation
├── dashboard-server.ts     # WebSocket server for real-time communication
├── backtest-runner.ts      # Integration with existing backtest engine
├── launch-dashboard.ts     # One-click launcher script
└── README.md              # This documentation
```

## 🎛️ Parameter Categories

### 🎯 Trading Targets
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Daily P&L Target | $200 | $50-$1000 | Target profit per trading day |
| Target Win Size | $200 | $50-$500 | Expected profit per winning trade |
| Target Loss Size | $150 | $50-$300 | Maximum loss per losing trade |
| Daily Trade Limit | Unlimited | 1-10 or unlimited | Maximum trades per day |
| Account Size | $25,000 | $10k-$100k | Account balance for position sizing |

### 🛡️ Risk Management
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Initial Stop Loss | 35% | 15%-50% | Initial stop loss percentage |
| Profit Target | 50% | 20%-100% | Profit target percentage |
| Trail Activation | 20% | 10%-40% | Profit level to start trailing |
| Trailing Stop | 10% | 5%-25% | Trailing stop distance |
| Max Risk Per Trade | 2.0% | 0.5%-5.0% | Maximum account risk per trade |

### 📊 Signal Controls
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Signal Spacing | 5 min | 5-60 min | Minimum time between signals |
| RSI Oversold | 25 | 10-40 | RSI level for bullish signals |
| RSI Overbought | 75 | 60-90 | RSI level for bearish signals |
| Momentum Threshold | 0.15% | 0.05%-0.50% | Price move required for momentum signal |
| Volume Confirmation | 1.5x | 1.2x-3.0x | Volume multiplier for signal confirmation |
| Breakout Threshold | 0.10% | 0.05%-0.25% | Price move required for breakout signal |

### 🆕 Advanced Features
| Parameter | Default | Description |
|-----------|---------|-------------|
| Partial Profit Taking | Off | Take 50% profit at 30% gain, move stop to breakeven |
| Reduced Signal Spacing | Off | Cut signal spacing in half during trending markets |
| Move Stop to Breakeven | Off | Move stop loss to entry after partial profit |

## 📊 Preset Configurations

### 🛡️ Conservative
- Lower risk, steady gains
- Suitable for volatile markets
- Target: $100/day with 80%+ win rate
- Max 2 trades/day, tight stops

### ⚖️ Balanced (Current Proven Strategy)
- 77.8% win rate configuration
- Target: $200/day proven performance
- Unlimited trades, moderate risk
- **This is your current working setup**

### ⚡ Aggressive
- Higher targets, more frequent trading
- Suitable for trending markets
- Target: $400/day with higher risk
- Up to 5 concurrent positions

## 🔧 Integration with Core Strategy

The dashboard is designed as a **completely separate tool** that doesn't modify your core strategy files:

### ✅ What It Does
- Provides a user-friendly interface for parameter adjustment
- Runs backtests with custom parameters
- Controls trading engine through WebSocket communication
- Validates parameters before application

### ✅ What It Doesn't Do
- **No modification** of core strategy files in `lib/` or main `advanced-intraday-strategy/` files
- **No interference** with existing trading logic
- **No risk** to your proven strategy implementation

### 🔌 Integration Points
1. **Parameter Application**: Sends validated parameters to trading engine
2. **Backtest Integration**: Uses existing `enhanced-hybrid-backtest.ts` with custom parameters
3. **Live Trading Control**: Communicates with `AlpacaPaperTradingEngine` for start/stop control

## 💡 Usage Examples

### 📊 Quick Backtest
1. Adjust parameters in the dashboard
2. Click "Run Backtest"
3. Review results in modal popup
4. Apply parameters if satisfied with results

### 🎯 Target Optimization
1. Set desired daily P&L target
2. Adjust risk parameters to achieve target
3. Use preset configurations as starting points
4. Validate with backtest before applying

### 🛡️ Risk Adjustment
1. Increase stop loss percentage for volatile markets
2. Enable partial profit taking for higher win rates
3. Reduce position sizes during uncertain periods
4. Use emergency stop for immediate halt

## 🚨 Safety Features

### 🔒 Parameter Validation
- **Range limits** prevent extreme values
- **Logical validation** ensures parameter consistency
- **Risk warnings** for potentially dangerous combinations
- **Automatic sanitization** of out-of-range values

### 🛡️ Emergency Controls
- **Emergency Stop**: Immediately halt all trading
- **Connection monitoring**: Auto-reconnect on server disconnect
- **Parameter backup**: Revert to last known good configuration

### 📊 Performance Monitoring
- **Real-time P&L tracking**
- **Win rate monitoring**
- **Target progress indicators**
- **Performance warnings**

## 🔧 Advanced Usage

### 📈 Market Condition Adaptation
```typescript
// Conservative during high volatility
if (VIX > 25) {
  loadPreset('conservative');
}

// Aggressive during strong trends
if (trendStrength > 0.8) {
  loadPreset('aggressive');
  enableReducedSignalSpacing();
}
```

### 🎯 Profit Target Scaling
```typescript
// Scale targets based on account size
const dailyTarget = accountSize * 0.008; // 0.8% daily target
const maxRisk = accountSize * 0.02;      // 2% max risk per trade
```

### 🕐 Time-based Adjustments
```typescript
// Tighter parameters near market close
if (timeUntilClose < 60) { // 60 minutes
  initialStopLoss = 0.25;  // Tighter stop
  profitTarget = 0.30;     // Lower target
}
```

## 🐛 Troubleshooting

### 🔌 Connection Issues
```bash
# Check if server is running
netstat -an | grep 8080

# Restart dashboard server
npx ts-node dashboard/launch-dashboard.ts
```

### 📊 Backtest Failures
- Ensure market data is available for selected date range
- Check parameter combinations are realistic
- Verify TypeScript compilation is successful

### 🌐 Browser Compatibility
- Requires modern browser with WebSocket support
- Chrome/Firefox/Safari/Edge all supported
- Mobile browsers supported with responsive design

## 🔮 Future Enhancements

### 📊 Advanced Analytics
- [ ] Parameter sensitivity analysis
- [ ] Monte Carlo simulations
- [ ] Multi-timeframe backtesting
- [ ] Performance attribution analysis

### 🤖 AI-Assisted Optimization
- [ ] Genetic algorithm parameter optimization
- [ ] Market regime detection
- [ ] Adaptive parameter adjustment
- [ ] Predictive performance modeling

### 📱 Mobile Features
- [ ] Mobile app version
- [ ] Push notifications
- [ ] Offline parameter editing
- [ ] Voice control commands

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the activity log in the dashboard
3. Ensure all dependencies are installed: `npm install ws @types/ws`
4. Verify your proven strategy is working before applying dashboard parameters

---

**⚠️ Important**: This dashboard is a tool to enhance your existing proven strategy. Always validate parameter changes with backtesting before applying to live trading. Your 77.8% win rate strategy should remain your baseline for comparison.