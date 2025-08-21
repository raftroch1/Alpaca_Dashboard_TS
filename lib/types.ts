
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  userId: string;
  
  // Strategy Parameters
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bbPeriod: number;
  bbStdDev: number;
  
  // Risk Management
  stopLossPercent: number;
  takeProfitPercent: number;
  positionSizePercent: number;
  maxPositions: number;
  
  // Options Parameters
  daysToExpiration: number;
  deltaRange: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Backtest {
  id: string;
  name: string;
  strategyId: string;
  userId: string;
  
  // Test Parameters
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  
  // Results
  totalReturn?: number;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  winRate?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  averageWin?: number;
  averageLoss?: number;
  profitFactor?: number;
  
  // Status
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  completedAt?: Date;
  errorMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BacktestTrade {
  id: string;
  backtestId: string;
  
  // Trade Details
  symbol: string;
  side: 'CALL' | 'PUT' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR';
  strike: number;
  expiration: Date;
  entryDate: Date;
  exitDate?: Date;
  
  // Pricing
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  
  // Results
  pnl?: number;
  pnlPercent?: number;
  
  // Technical Indicators at Entry
  rsiValue?: number;
  macdValue?: number;
  macdSignalValue?: number;
  bbUpper?: number;
  bbLower?: number;
  spyPrice?: number;
  
  // Exit Reason
  exitReason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'EXPIRATION' | 'SIGNAL_EXIT';
  
  createdAt: Date;
}

export interface Trade {
  id: string;
  strategyId: string;
  userId: string;
  
  // Trade Details
  alpacaOrderId?: string;
  symbol: string;
  side: 'CALL' | 'PUT' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR';
  strike: number;
  expiration: Date;
  entryDate: Date;
  exitDate?: Date;
  
  // Pricing
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  
  // Results
  pnl?: number;
  pnlPercent?: number;
  
  // Status
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  
  // Technical Indicators at Entry
  rsiValue?: number;
  macdValue?: number;
  macdSignalValue?: number;
  bbUpper?: number;
  bbLower?: number;
  spyPrice?: number;
  
  // Exit Reason
  exitReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketData {
  id: string;
  symbol: string;
  date: Date;
  
  // OHLCV Data
  open: number;
  high: number;
  low: number;
  close: number;
  volume: bigint;
  
  // Technical Indicators (calculated and stored)
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  
  createdAt: Date;
}

export interface OptionsData {
  id: string;
  symbol: string;
  strike: number;
  expiration: Date;
  side: 'CALL' | 'PUT';
  date: Date;
  
  // Options Pricing
  bid: number;
  ask: number;
  last?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  
  createdAt: Date;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
}

export interface OptionsChain {
  symbol: string;
  expiration: Date;
  strike: number;
  side: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  last?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;        // Real gamma from market data (critical for GEX accuracy)
  theta?: number;        // Time decay (important for 0DTE)
  vega?: number;         // Volatility sensitivity
  rho?: number;          // Interest rate sensitivity
  volume?: number;
  openInterest?: number;
}

export interface BullPutSpread {
  sellPut: OptionsChain;
  buyPut: OptionsChain;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  probability: number;
}

export interface BearCallSpread {
  sellCall: OptionsChain;
  buyCall: OptionsChain;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  probability: number;
  breakeven: number;
}

export interface IronCondor {
  sellPut: OptionsChain;
  buyPut: OptionsChain;
  sellCall: OptionsChain;
  buyCall: OptionsChain;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  probability: number;
  profitZone: {
    lower: number;
    upper: number;
  };
  breakevens: {
    lower: number;
    upper: number;
  };
}

export interface TradeSignal {
  action: 'BUY_CALL' | 'BUY_PUT' | 'SELL' | 'HOLD' | 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'IRON_CONDOR';
  confidence: number;
  reason: string;
  indicators: TechnicalIndicators;
  timestamp: Date;
  spread?: BullPutSpread | BearCallSpread | IronCondor;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  averageTradeLength: number;
  // ADVANCED RISK METRICS
  sortinoRatio?: number; // Downside deviation adjusted returns
  var95?: number; // Value at Risk (95th percentile)
  expectedShortfall?: number; // Expected loss beyond VaR
  maxConsecutiveLosses?: number;
  totalFees?: number; // Transaction costs
  netReturn?: number; // Return after fees
  monthlyReturns?: number[]; // For detailed analysis
  worstMonth?: number;
  bestMonth?: number;
  volatility?: number; // Annualized volatility
  skewness?: number; // Return distribution skew
  kurtosis?: number; // Return distribution tail risk
}

export interface AlpacaCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl: string; // paper or live
}

export interface BacktestParams {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}
