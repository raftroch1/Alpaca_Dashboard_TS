/**
 * TRADING PARAMETERS INTERFACE
 * 
 * Configuration interface for the dashboard - completely separate from core strategy files
 * This allows real-time parameter adjustments without modifying core trading logic
 */

export interface TradingParameters {
  // 🎯 Trading Targets
  dailyPnLTarget: number;           // $200 default
  targetWinSize: number;            // $200 default  
  targetLossSize: number;           // $150 default
  dailyTradeTarget: number | null;  // null = unlimited
  
  // 🛡️ Risk Management
  initialStopLossPct: number;       // 0.35 (35%)
  profitTargetPct: number;          // 0.50 (50%)
  trailActivationPct: number;       // 0.20 (20%)
  trailStopPct: number;             // 0.10 (10%)
  maxDrawdownPct: number;           // 0.15 (15%)
  
  // ⏰ Timing Controls
  minSignalSpacingMinutes: number;  // 5 minutes
  forceExitTime: number;            // 15.5 (3:30 PM)
  maxHoldMinutesMorning: number;    // 90 minutes
  maxHoldMinutesAfternoon: number;  // 60 minutes
  
  // 📊 Signal Thresholds
  rsiOversold: number;              // 25
  rsiOverbought: number;            // 75
  rsiPeriod: number;                // 14
  momentumThresholdPct: number;     // 0.15%
  volumeConfirmationRatio: number;  // 1.5x
  breakoutThresholdPct: number;     // 0.10%
  
  // 💰 Position Sizing
  basePositionValue: number;        // $500
  maxRiskPerTradePct: number;       // 0.02 (2%)
  accountSize: number;              // $25,000
  maxConcurrentPositions: number;   // 3
  
  // 🎨 Strategy Preferences  
  enableRsiSignals: boolean;        // true
  enableMomentumSignals: boolean;   // true
  enableBreakoutSignals: boolean;   // true
  enableTimeBasedSignals: boolean;  // true
  
  // 📈 Advanced Features (NEW)
  usePartialProfitTaking: boolean;  // false (new feature)
  partialProfitLevel: number;       // 0.30 (30% for partial exit)
  partialProfitSize: number;        // 0.50 (50% of position)
  moveStopToBreakeven: boolean;     // false
  reducedSignalSpacing: boolean;    // false (15 min vs 30 min)
  
  // 🏛️ Institutional Features (NEW)
  enableGEXFilters: boolean;        // true (Gamma Exposure filtering)
  enableVolumeProfile: boolean;     // true (Anchored Volume Profile)
  enableMicrofractals: boolean;     // true (Microfractal-Fibonacci)
  enableATRRiskManagement: boolean; // true (ATR-based position sizing)
  requireConfluence: boolean;       // true (require multiple signals)
  minConfidenceLevel: number;       // 0.6 (60% minimum signal confidence)
  enableGreeksMonitoring: boolean;  // true (real-time Greeks tracking)
  portfolioRiskLimit: number;       // 10.0 (10% max portfolio risk)
  dailyLossLimit: number;           // 500 (max daily loss limit)
  
  // 🎯 DirectIntegrationConfig Parameters (for paper trading)
  gexWeight?: number;               // 0.30 (GEX component weight)
  avpWeight?: number;               // 0.20 (AVP component weight)
  avwapWeight?: number;             // 0.20 (AVWAP component weight)
  fractalWeight?: number;           // 0.20 (Fractal component weight)
  atrWeight?: number;               // 0.10 (ATR component weight)
  minimumBullishScore?: number;     // 0.5 (minimum bullish confluence score)
  minimumBearishScore?: number;     // 0.5 (minimum bearish confluence score)
  riskMultiplier?: number;          // 1.0 (risk adjustment multiplier)
  maxPositionSize?: number;         // 0.02 (max position size as % of account)
}

export interface TradingPreset {
  name: string;
  description: string;
  parameters: TradingParameters;
}

export class ParameterPresets {
  static readonly CONSERVATIVE: TradingPreset = {
    name: "Conservative",
    description: "Lower risk, steady gains - suitable for volatile markets",
    parameters: {
      dailyPnLTarget: 100,
      targetWinSize: 100,
      targetLossSize: 75,
      dailyTradeTarget: 2,
      
      initialStopLossPct: 0.25,
      profitTargetPct: 0.40,
      trailActivationPct: 0.15,
      trailStopPct: 0.08,
      maxDrawdownPct: 0.10,
      
      minSignalSpacingMinutes: 30,
      forceExitTime: 15.0, // 3:00 PM
      maxHoldMinutesMorning: 60,
      maxHoldMinutesAfternoon: 45,
      
      rsiOversold: 20,
      rsiOverbought: 80,
      rsiPeriod: 14,
      momentumThresholdPct: 0.20,
      volumeConfirmationRatio: 2.0,
      breakoutThresholdPct: 0.15,
      
      basePositionValue: 300,
      maxRiskPerTradePct: 0.015,
      accountSize: 25000,
      maxConcurrentPositions: 2,
      
      enableRsiSignals: true,
      enableMomentumSignals: true,
      enableBreakoutSignals: false,
      enableTimeBasedSignals: false,
      
      usePartialProfitTaking: true,
      partialProfitLevel: 0.25,
      partialProfitSize: 0.50,
      moveStopToBreakeven: true,
      reducedSignalSpacing: false,
      
      // Institutional features - conservative settings
      enableGEXFilters: true,
      enableVolumeProfile: true,
      enableMicrofractals: false, // Disabled for conservative
      enableATRRiskManagement: true,
      requireConfluence: true,
      minConfidenceLevel: 0.7, // Higher confidence for conservative
      enableGreeksMonitoring: true,
      portfolioRiskLimit: 5.0, // Lower risk for conservative
      dailyLossLimit: 300,
      
      // 🛡️ CONSERVATIVE WEIGHTS (Total = 1.0) - Stability-focused
      gexWeight: 0.0,      // DISABLED
      avpWeight: 0.40,     // HIGH - Support/resistance focus
      avwapWeight: 0.35,   // HIGH - Trend confirmation
      fractalWeight: 0.15, // LOW - Less aggressive entries
      atrWeight: 0.10,     // STANDARD - Risk management
      minimumBullishScore: 0.6,  // Higher threshold for conservative
      minimumBearishScore: 0.6,
      riskMultiplier: 0.8,
      maxPositionSize: 0.015
    }
  };

  static readonly BALANCED: TradingPreset = {
    name: "Balanced",
    description: "Current proven strategy - 77.8% win rate configuration",
    parameters: {
      dailyPnLTarget: 200,
      targetWinSize: 200,
      targetLossSize: 150,
      dailyTradeTarget: null, // unlimited
      
      initialStopLossPct: 0.35,
      profitTargetPct: 0.50,
      trailActivationPct: 0.20,
      trailStopPct: 0.10,
      maxDrawdownPct: 0.15,
      
      minSignalSpacingMinutes: 5,
      forceExitTime: 15.5, // 3:30 PM
      maxHoldMinutesMorning: 90,
      maxHoldMinutesAfternoon: 60,
      
      rsiOversold: 25,
      rsiOverbought: 75,
      rsiPeriod: 14,
      momentumThresholdPct: 0.15,
      volumeConfirmationRatio: 1.5,
      breakoutThresholdPct: 0.10,
      
      basePositionValue: 500,
      maxRiskPerTradePct: 0.02,
      accountSize: 25000,
      maxConcurrentPositions: 3,
      
      enableRsiSignals: true,
      enableMomentumSignals: true,
      enableBreakoutSignals: true,
      enableTimeBasedSignals: true,
      
      usePartialProfitTaking: true,  // ✅ ENABLE PARTIAL PROFIT
      partialProfitLevel: 0.30,      // Take partial at 30%
      partialProfitSize: 0.50,       // Take 50% of position
      moveStopToBreakeven: true,     // Move stop to breakeven after partial
      reducedSignalSpacing: false,
      
      // Institutional features - balanced settings
      enableGEXFilters: true,
      enableVolumeProfile: true,
      enableMicrofractals: true,
      enableATRRiskManagement: true,
      requireConfluence: true,
      minConfidenceLevel: 0.6, // Standard confidence
      enableGreeksMonitoring: true,
      portfolioRiskLimit: 10.0, // Standard risk
      dailyLossLimit: 500,
      
      // DirectIntegrationConfig parameters (GEX DISABLED FOR TREND FOLLOWING)
      gexWeight: 0.0,   // DISABLED - was causing bullish bias
      avpWeight: 0.25,  // Increased
      avwapWeight: 0.40, // MAJOR WEIGHT - trend following  
      fractalWeight: 0.25, // Increased
      atrWeight: 0.10,
      minimumBullishScore: 0.5,  // Relaxed from 0.7 (same as backtest)
      minimumBearishScore: 0.5,
      riskMultiplier: 1.0,
      maxPositionSize: 0.02
    }
  };

  static readonly SENSITIVE: TradingPreset = {
    name: "Sensitive",
    description: "More sensitive to trade opportunities - for testing signals",
    parameters: {
      dailyPnLTarget: 150,
      targetWinSize: 150,
      targetLossSize: 100,
      dailyTradeTarget: null,
      
      initialStopLossPct: 0.30,
      profitTargetPct: 0.45,
      trailActivationPct: 0.15,
      trailStopPct: 0.08,
      maxDrawdownPct: 0.12,
      
      minSignalSpacingMinutes: 5,
      forceExitTime: 15.5,
      maxHoldMinutesMorning: 75,
      maxHoldMinutesAfternoon: 50,
      
      rsiOversold: 30,
      rsiOverbought: 70,
      rsiPeriod: 14,
      momentumThresholdPct: 0.10,
      volumeConfirmationRatio: 1.2,
      breakoutThresholdPct: 0.06,
      
      basePositionValue: 400,
      maxRiskPerTradePct: 0.015,
      accountSize: 25000,
      maxConcurrentPositions: 3,
      
      enableRsiSignals: true,
      enableMomentumSignals: true,
      enableBreakoutSignals: true,
      enableTimeBasedSignals: true,
      
      usePartialProfitTaking: false,
      partialProfitLevel: 0.25,
      partialProfitSize: 0.50,
      moveStopToBreakeven: false,
      reducedSignalSpacing: false,
      
      // Institutional features - more sensitive settings
      enableGEXFilters: true,
      enableVolumeProfile: true,
      enableMicrofractals: true,
      enableATRRiskManagement: true,
      requireConfluence: false, // Don't require confluence for more signals
      minConfidenceLevel: 0.35, // Much lower confidence threshold
      enableGreeksMonitoring: true,
      portfolioRiskLimit: 8.0,
      dailyLossLimit: 400,
      
      // ⚡ SENSITIVE WEIGHTS (Total = 1.0) - Signal-focused
      gexWeight: 0.0,      // DISABLED
      avpWeight: 0.20,     // LOWER - Less filtering
      avwapWeight: 0.30,   // MEDIUM - Trend detection
      fractalWeight: 0.35, // HIGH - More precise entries
      atrWeight: 0.15,     // HIGHER - More volatility awareness
      minimumBullishScore: 0.4,  // Lower for more signals
      minimumBearishScore: 0.4,
      riskMultiplier: 1.1,
      maxPositionSize: 0.025
    }
  };

  static readonly AGGRESSIVE: TradingPreset = {
    name: "Aggressive",
    description: "Higher targets, more frequent trading - for trending markets",
    parameters: {
      dailyPnLTarget: 400,
      targetWinSize: 300,
      targetLossSize: 200,
      dailyTradeTarget: null,
      
      initialStopLossPct: 0.40,
      profitTargetPct: 0.60,
      trailActivationPct: 0.25,
      trailStopPct: 0.12,
      maxDrawdownPct: 0.20,
      
      minSignalSpacingMinutes: 5,
      forceExitTime: 15.5,
      maxHoldMinutesMorning: 120,
      maxHoldMinutesAfternoon: 90,
      
      rsiOversold: 30,
      rsiOverbought: 70,
      rsiPeriod: 14,
      momentumThresholdPct: 0.12,
      volumeConfirmationRatio: 1.3,
      breakoutThresholdPct: 0.08,
      
      basePositionValue: 750,
      maxRiskPerTradePct: 0.025,
      accountSize: 25000,
      maxConcurrentPositions: 5,
      
      enableRsiSignals: true,
      enableMomentumSignals: true,
      enableBreakoutSignals: true,
      enableTimeBasedSignals: true,
      
      usePartialProfitTaking: true,
      partialProfitLevel: 0.35,
      partialProfitSize: 0.40,
      moveStopToBreakeven: true,
      reducedSignalSpacing: true,
      
      // Institutional features - aggressive settings
      enableGEXFilters: true,
      enableVolumeProfile: true,
      enableMicrofractals: true,
      enableATRRiskManagement: true,
      requireConfluence: false, // More signals for aggressive
      minConfidenceLevel: 0.5, // Lower confidence for more trades
      enableGreeksMonitoring: true,
      portfolioRiskLimit: 15.0, // Higher risk for aggressive
      dailyLossLimit: 750,
      
      // 🚀 AGGRESSIVE WEIGHTS (Total = 1.0) - Opportunity-focused
      gexWeight: 0.0,      // DISABLED
      avpWeight: 0.15,     // LOW - Less conservative filtering
      avwapWeight: 0.45,   // HIGHEST - Strong trend following
      fractalWeight: 0.30, // HIGH - Aggressive entries
      atrWeight: 0.10,     // STANDARD - Risk management
      minimumBullishScore: 0.45,  // Lower for more opportunities
      minimumBearishScore: 0.45,
      riskMultiplier: 1.2,
      maxPositionSize: 0.03
    }
  };

  static getAllPresets(): TradingPreset[] {
    return [this.CONSERVATIVE, this.BALANCED, this.SENSITIVE, this.AGGRESSIVE];
  }

  static getPreset(name: string): TradingPreset | null {
    switch (name.toLowerCase()) {
      case 'conservative': return this.CONSERVATIVE;
      case 'balanced': return this.BALANCED;
      case 'sensitive': return this.SENSITIVE;
      case 'aggressive': return this.AGGRESSIVE;
      default: return null;
    }
  }
}

export class ParameterValidator {
  static validate(params: Partial<TradingParameters>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate numeric ranges
    if (params.dailyPnLTarget !== undefined) {
      if (params.dailyPnLTarget < 50 || params.dailyPnLTarget > 1000) {
        errors.push('Daily P&L target must be between $50 and $1000');
      }
    }

    if (params.initialStopLossPct !== undefined) {
      if (params.initialStopLossPct < 0.10 || params.initialStopLossPct > 0.60) {
        errors.push('Initial stop loss must be between 10% and 60%');
      }
    }

    if (params.profitTargetPct !== undefined) {
      if (params.profitTargetPct < 0.15 || params.profitTargetPct > 1.50) {
        errors.push('Profit target must be between 15% and 150%');
      }
    }

    if (params.rsiOversold !== undefined) {
      if (params.rsiOversold < 5 || params.rsiOversold > 45) {
        errors.push('RSI oversold level must be between 5 and 45');
      }
    }

    if (params.rsiOverbought !== undefined) {
      if (params.rsiOverbought < 55 || params.rsiOverbought > 95) {
        errors.push('RSI overbought level must be between 55 and 95');
      }
    }

    if (params.rsiOversold !== undefined && params.rsiOverbought !== undefined) {
      if (params.rsiOverbought - params.rsiOversold < 20) {
        errors.push('RSI overbought must be at least 20 points higher than oversold');
      }
    }

    if (params.maxRiskPerTradePct !== undefined) {
      if (params.maxRiskPerTradePct < 0.005 || params.maxRiskPerTradePct > 0.10) {
        errors.push('Max risk per trade must be between 0.5% and 10%');
      }
    }

    if (params.accountSize !== undefined) {
      if (params.accountSize < 1000 || params.accountSize > 500000) {
        errors.push('Account size must be between $1,000 and $500,000');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static sanitize(params: Partial<TradingParameters>): Partial<TradingParameters> {
    const sanitized: Partial<TradingParameters> = {};

    Object.keys(params).forEach(key => {
      const value = params[key as keyof TradingParameters];
      
      switch (key) {
        case 'dailyPnLTarget':
          sanitized.dailyPnLTarget = Math.max(50, Math.min(1000, value as number));
          break;
        case 'initialStopLossPct':
          sanitized.initialStopLossPct = Math.max(0.10, Math.min(0.60, value as number));
          break;
        case 'profitTargetPct':
          sanitized.profitTargetPct = Math.max(0.15, Math.min(1.50, value as number));
          break;
        case 'rsiOversold':
          sanitized.rsiOversold = Math.max(5, Math.min(45, value as number));
          break;
        case 'rsiOverbought':
          sanitized.rsiOverbought = Math.max(55, Math.min(95, value as number));
          break;
        case 'maxRiskPerTradePct':
          sanitized.maxRiskPerTradePct = Math.max(0.005, Math.min(0.10, value as number));
          break;
        case 'accountSize':
          sanitized.accountSize = Math.max(1000, Math.min(500000, value as number));
          break;
        default:
          (sanitized as any)[key] = value;
      }
    });

    return sanitized;
  }
}