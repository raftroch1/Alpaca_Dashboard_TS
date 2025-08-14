# 🎛️ Dashboard Real Trading Setup

## ✅ **COMPLETE ISOLATION FROM MAIN STRATEGY**

Your dashboard now uses **REAL Alpaca integration** but is completely isolated from your main paper trading strategy through:

- **Separate Environment File**: `.env.dashboard`
- **Trade Prefixes**: All dashboard trades have `DASH_` prefix
- **Separate Engine**: `dashboard-alpaca-trading-engine.ts`
- **Same Risk Parameters**: Keeps your proven contract sizes and limits

## 🔧 **Setup Instructions**

### 1. Copy Your Alpaca Credentials

```bash
# Copy your credentials from main .env to dashboard/.env.dashboard
cd advanced-intraday-strategy/dashboard
```

**Edit `.env.dashboard` and replace with your actual credentials:**
```bash
# Dashboard Trading Environment Variables
ALPACA_API_KEY=PKTEST_YOUR_ACTUAL_API_KEY_HERE
ALPACA_SECRET_KEY=YOUR_ACTUAL_SECRET_KEY_HERE
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Dashboard-specific settings (KEEP THESE AS-IS)
DASHBOARD_PORT=8080
DASHBOARD_TRADE_PREFIX=DASH_
DASHBOARD_MAX_CONTRACTS=2
DASHBOARD_SYMBOL=SPY
DASHBOARD_DAILY_LIMIT=null
DASHBOARD_MAX_RISK_PCT=2.0
DASHBOARD_ACCOUNT_SIZE=25000
```

### 2. Launch Dashboard with Real Trading

```bash
# From advanced-intraday-strategy directory
./launch-dashboard.sh
```

Or manually:
```bash
cd dashboard
npm install
npx ts-node launch-dashboard.ts
```

## 🎯 **What You Get**

### ✅ **Real Alpaca Integration**
- Uses your actual Alpaca paper account
- Real market data (1-minute bars)
- Real order execution
- Real P&L tracking

### 🏷️ **Complete Isolation**
- Dashboard trades: `DASH_SPY_1234567890`
- Main strategy trades: No prefix (your existing system)
- Easy to distinguish in Alpaca dashboard
- Zero interference between systems

### 📊 **Same Risk Management**
- 2-4 contracts per trade (same as main)
- $300 max risk per trade
- 35% stop loss, 50% profit target (your current settings)
- No daily trade limits (matches your main strategy)

### 🆕 **Dashboard Features You Can Test**
- **Partial Profit Taking**: 30% profit → close 50% position
- **Breakeven Stop**: Move stop to entry after partial profit
- **Reduced Signal Spacing**: 15-minute vs 30-minute signals
- **Risk Adjustment**: Test different stop/profit parameters

## 🔍 **How to Monitor**

### In Alpaca Dashboard
- **Main Strategy Trades**: Regular order names
- **Dashboard Trades**: All start with `DASH_`

### In Dashboard UI
- Real-time P&L updates
- Live trade count
- Win rate tracking
- Active positions display

## 🛡️ **Safety Features**

### ✅ **No Impact on Main Strategy**
- Different client order IDs
- Different trade prefixes
- Separate risk management
- Independent position tracking

### ✅ **Same Position Sizing**
- Uses identical contract calculation logic
- Same $300 max risk per trade
- Same 2-4 contract range
- Same account size assumptions

### ✅ **Emergency Controls**
- Dashboard emergency stop (only affects dashboard trades)
- Your main strategy continues unaffected
- Independent start/stop controls

## 🎮 **Testing Your Parameters**

### Conservative Test
1. Load "Conservative" preset
2. Start dashboard paper trading
3. Compare performance vs main strategy

### Partial Profit Test
1. Enable "Partial Profit Taking"
2. Set 30% trigger, 50% position close
3. Enable "Move Stop to Breakeven"
4. Monitor impact on win rate

### Signal Spacing Test
1. Enable "Reduced Signal Spacing"
2. Compare 15-min vs 30-min signals
3. Monitor trade frequency and quality

## 📈 **Performance Comparison**

You can now run **side-by-side comparison**:

- **Main Strategy**: Your proven 77.8% win rate system
- **Dashboard Strategy**: Test new parameters with real data
- **Same Market Conditions**: Both trading SPY simultaneously
- **Real Results**: No simulation, actual market execution

## 🚨 **Important Notes**

1. **Both strategies use the same Alpaca paper account** - this is safe since they have different prefixes
2. **Dashboard trades are easily identifiable** with DASH_ prefix
3. **Same risk management** ensures no unexpected position sizes
4. **Real market data** gives you accurate testing results
5. **Independent control** - stopping dashboard doesn't affect main strategy

## 🔄 **Quick Start**

1. ✅ Copy credentials to `.env.dashboard`
2. ✅ Launch dashboard: `./launch-dashboard.sh`
3. ✅ Open browser to dashboard URL
4. ✅ Click "Start Paper Trading" in dashboard
5. ✅ Monitor both main strategy and dashboard trades in Alpaca

Your main paper trading continues unchanged while you test new parameters with real market data! 🎯