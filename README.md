# 🚀 Enhanced Institutional-Grade Options Trading System

A sophisticated 0-DTE options trading platform with advanced Greeks-based risk management, realistic transaction cost modeling, and professional-grade backtesting capabilities.

## 🌟 Key Features

### 📊 **Advanced Risk Management**
- **Greeks Engine**: Real-time Delta, Gamma, Theta, Vega, Rho calculations
- **Portfolio Risk Monitoring**: Aggregate exposure tracking across positions
- **Position Sizing**: Dynamic sizing based on Greeks exposure
- **Risk Limits**: Portfolio-level delta, gamma, theta, vega constraints

### 💰 **Realistic Transaction Cost Modeling**
- **Commission Structure**: Industry-standard $0.65/contract + regulatory fees
- **Slippage Modeling**: Market impact based on volatility conditions
- **Spread Costs**: Multi-leg transaction cost calculations
- **Fill Simulation**: Realistic bid-ask spread execution

### 🔍 **Market Condition Filters**
- **Volatility Screening**: IV range validation (8%-60%)
- **Liquidity Analysis**: Volume/Open Interest requirements
- **VIX Monitoring**: Market regime detection
- **Quality Assessment**: Liquidity scoring (Excellent/Good/Fair/Poor)

### ⚡ **0-DTE Optimization**
- **Same-Day Expiration Risk Controls**: Special handling for intraday options
- **Accelerated Profit Taking**: Enhanced exit conditions for short-dated options
- **Time-Based Risk Management**: Position risk increases near expiration
- **Market Hours Validation**: Trading only during 9:30 AM - 4:00 PM ET

## 🏗️ Architecture

### Core Components

```
lib/
├── backtest-engine.ts           # Enhanced backtesting with Greeks integration
├── live-paper-trading-engine.ts # Real-time trading with Alpaca API
├── greeks-engine.ts             # Advanced options risk calculations
├── transaction-cost-engine.ts   # Realistic trading cost modeling
├── adaptive-strategy-selector.ts # Market regime-aware strategy selection
├── technical-indicators.ts      # RSI, MACD, Bollinger Bands
├── monte-carlo-engine.ts        # Stress testing and VaR analysis
├── bear-call-spread-strategy.ts # Enhanced Bear Call exit logic
├── bull-put-spread-strategy.ts  # Bull Put spread implementation
├── iron-condor-strategy.ts      # Professional Iron Condor exits
└── types.ts                     # TypeScript interfaces
```

### Strategy Types
- **Bull Put Spreads**: Bullish credit spreads
- **Bear Call Spreads**: Bearish credit spreads  
- **Iron Condors**: Neutral, range-bound strategies
- **Single Options**: Legacy support for individual calls/puts

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/raftroch1/Alpaca_Dashboard_TS.git
cd Alpaca_Dashboard_TS
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your Alpaca API credentials:

```env
ALPACA_API_KEY=your_api_key_here
ALPACA_SECRET_KEY=your_secret_key_here
ALPACA_PAPER=true
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### 3. Run Tests

Validate all enhanced features:

```bash
npm test
```

### 4. Start Live Trading

```bash
npm run start:live
```

## 📈 Backtesting

Run comprehensive backtests with institutional-grade features:

```typescript
import { BacktestEngine } from './lib/backtest-engine';

const strategy = {
  maxPositions: 3,
  maxPortfolioRisk: 0.10,
  enableTransactionCosts: true,
  enableVolatilityFilter: true,
  enableLiquidityFilter: true
};

const results = await BacktestEngine.runBacktest(
  'SPY',
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  50000,
  strategy
);
```

## 🎯 Risk Management

### Portfolio Limits
- **Max Portfolio Risk**: 10% of account value
- **Max Delta Exposure**: 2% of account per position
- **Max Gamma Risk**: 0.5 threshold
- **Max Theta Decay**: 1% of account daily
- **Max Vega Exposure**: 5% per 1% volatility move

### Position Exits
- **Greeks-Based**: Delta expansion, gamma risk, theta acceleration
- **Profit Targets**: 25-50% of maximum profit
- **Loss Limits**: 2x credit received
- **Time-Based**: Risk increases 12 hours before expiration
- **Volatility**: IV expansion beyond normal ranges

## 🔧 Configuration

### Risk Parameters

```typescript
const riskConfig = {
  maxPortfolioRisk: 0.10,        // 10% max portfolio exposure
  maxPositionSize: 0.02,         // 2% per position
  maxPortfolioDelta: 100,        // Delta limit
  maxPortfolioGamma: 50,         // Gamma limit
  maxPortfolioTheta: -500,       // Theta limit
  maxPortfolioVega: 200          // Vega limit
};
```

### Market Filters

```typescript
const filterConfig = {
  minIV: 0.08,                   // 8% minimum IV
  maxIV: 0.60,                   // 60% maximum IV
  maxBidAskSpread: 0.10,         // $0.10 max spread
  minVolume: 100,                // Minimum daily volume
  minOpenInterest: 500,          // Minimum open interest
  vixThresholdLow: 8,            // Low VIX threshold
  vixThresholdHigh: 60           // High VIX threshold
};
```

## 📊 Performance Metrics

The system tracks comprehensive performance analytics:

- **Risk-Adjusted Returns**: Sharpe ratio, Sortino ratio
- **Drawdown Analysis**: Maximum drawdown, recovery time
- **Greeks Performance**: Delta P&L, Gamma P&L, Theta decay
- **Transaction Cost Impact**: Net vs gross returns
- **Strategy Attribution**: Performance by strategy type
- **Market Regime Performance**: Returns across volatility environments

## 🛡️ Safety Features

### Pre-Trade Validation
- ✅ Greeks exposure limits
- ✅ Portfolio correlation checks
- ✅ Liquidity screening
- ✅ Volatility range validation
- ✅ Market hours verification

### Real-Time Monitoring
- ✅ Position Greeks tracking
- ✅ Portfolio risk aggregation
- ✅ P&L monitoring
- ✅ Risk limit breach alerts

### Emergency Controls
- ✅ Position size limits
- ✅ Loss limit enforcement
- ✅ Market condition filters
- ✅ Time-based exits

## 🧪 Testing

Comprehensive test suite validates all components:

```bash
# Run all tests
npm test

# Test specific components
npm run test:greeks
npm run test:costs
npm run test:filters
npm run test:backtest
```

## 📚 API Reference

### GreeksEngine

```typescript
// Calculate option Greeks
const greeks = GreeksEngine.calculateGreeks(
  option,           // OptionsChain
  underlyingPrice,  // number
  timeToExpiration, // number (years)
  impliedVolatility // number
);

// Check risk limits
const riskCheck = GreeksEngine.checkGreeksRisk(greeks, positionSize);
```

### TransactionCostEngine

```typescript
// Simulate realistic fills
const fill = TransactionCostEngine.simulateFill(
  'SELL',          // BUY | SELL
  bid,             // number
  ask,             // number
  quantity,        // number
  'NORMAL'         // NORMAL | VOLATILE | ILLIQUID
);
```

### LivePaperTradingEngine

```typescript
// Start live trading
const engine = new LivePaperTradingEngine(strategy);
await engine.start();

// Monitor status
const status = engine.getLiveStatus();
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Options trading involves substantial risk and is not suitable for all investors. Past performance does not guarantee future results. Always conduct your own research and consider consulting with a financial advisor before making investment decisions.

## 🆘 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check the documentation
- Review the test suite for usage examples

---

**Built with ❤️ for professional options traders**