/**
 * COMPREHENSIVE RISK MANAGEMENT SYSTEM
 * 
 * Multi-layered risk management overlay for 0DTE trading with automated
 * kill switches, position limits, and portfolio protection. Designed to
 * prevent catastrophic losses in the extreme leverage environment of
 * same-day expiration options trading.
 * 
 * Key Features:
 * - Real-time portfolio monitoring
 * - Automated circuit breakers
 * - Dynamic position sizing
 * - Correlation-based limits
 * - Emergency shutdown protocols
 */

import { MarketData, OptionsChain, Strategy } from '../../../lib/types';
import { GreeksSnapshot } from '../../../lib/greeks-engine';
import { ATRSnapshot } from './enhanced-atr-risk-mgmt';
import { StrategySignal } from './coherent-strategy-framework';

export interface RiskLimits {
  // Portfolio-level limits
  maxPortfolioDrawdown: number;        // Max portfolio drawdown %
  maxDailyLoss: number;                // Max daily loss in $
  maxPositionConcentration: number;    // Max % in single position
  maxCorrelatedPositions: number;      // Max positions in correlated assets
  maxTotalNotional: number;            // Max total notional exposure
  
  // Position-level limits
  maxPositionSize: number;             // Max contracts per position
  maxLeverage: number;                 // Max effective leverage
  maxTimeExposure: number;             // Max minutes in 0DTE position
  
  // Greeks limits
  maxNetDelta: number;                 // Max portfolio delta
  maxNetGamma: number;                 // Max portfolio gamma
  maxNetTheta: number;                 // Max portfolio theta (negative)
  maxNetVega: number;                  // Max portfolio vega
  
  // Volatility limits
  maxVolatilityRegime: 'HIGH' | 'EXTREME'; // Block trades above this
  minVolatilityRegime: 'LOW' | 'NORMAL';   // Block trades below this
  maxATRPercentile: number;            // Block if ATR > percentile
  
  // Market condition limits
  maxVIXLevel: number;                 // Block trades if VIX > level
  minLiquidityScore: number;           // Min liquidity score required
  blockNewsEvents: boolean;            // Block during high-impact news
}

export interface KillSwitchTriggers {
  // Immediate shutdown triggers
  portfolioDrawdownPercent: number;    // Kill if portfolio down X%
  dailyLossAmount: number;             // Kill if daily loss > $X
  volatilitySpike: number;             // Kill if volatility spikes X%
  systemErrors: number;                // Kill after X system errors
  
  // Warning level triggers
  warningDrawdownPercent: number;      // Warn at X% drawdown
  warningLossAmount: number;           // Warn at $X daily loss
  warningVolatility: number;           // Warn at X% volatility increase
  
  // Recovery conditions
  cooldownMinutes: number;             // Minutes before system can restart
  manualOverrideRequired: boolean;     // Require manual restart
  maxRestartAttempts: number;          // Max auto-restart attempts
}

export interface PositionRisk {
  id: string;
  symbol: string;
  notionalValue: number;
  maxLoss: number;
  currentPnL: number;
  greeks: GreeksSnapshot;
  correlationScore: number;
  liquidityScore: number;
  timeRemaining: number; // Minutes to expiration
  riskScore: number;     // 0-1 composite risk
}

export interface PortfolioRisk {
  timestamp: Date;
  totalValue: number;
  totalNotional: number;
  totalMaxLoss: number;
  currentPnL: number;
  dailyPnL: number;
  drawdownPercent: number;
  
  // Greeks exposure
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  
  // Risk metrics
  portfolioVaR: number;          // Value at Risk
  portfolioConcentration: number; // Concentration risk
  correlationRisk: number;       // Position correlation risk
  liquidityRisk: number;         // Liquidity risk score
  timeDecayRisk: number;         // Theta decay risk
  
  // Status
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  activeWarnings: string[];
  killSwitchStatus: 'ACTIVE' | 'TRIGGERED' | 'RECOVERY';
}

export interface RiskEvent {
  timestamp: Date;
  type: 'WARNING' | 'LIMIT_BREACH' | 'KILL_SWITCH' | 'RECOVERY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  actionTaken: string;
}

export class ComprehensiveRiskManager {
  
  private static readonly DEFAULT_LIMITS: RiskLimits = {
    // Portfolio limits (optimized for $25K account)
    maxPortfolioDrawdown: 8.0,       // 8% max drawdown ($2,000)
    maxDailyLoss: 500,               // $500 max daily loss (2%)
    maxPositionConcentration: 20.0,   // 20% max in single position
    maxCorrelatedPositions: 3,        // Max 3 correlated positions
    maxTotalNotional: 30000,         // $30k max notional (1.2x account)
    
    // Position limits (optimized for $300 positions)
    maxPositionSize: 300,            // 300 contracts max (~$300 position)
    maxLeverage: 4.0,                // 4x max leverage
    maxTimeExposure: 240,            // 4 hours max (0DTE)
    
    // Greeks limits (scaled for smaller account)
    maxNetDelta: 75,                 // $75 per $1 move
    maxNetGamma: 30,                 // $30 gamma exposure
    maxNetTheta: -150,               // -$150 max theta
    maxNetVega: 75,                  // $75 vega exposure
    
    // Volatility limits
    maxVolatilityRegime: 'HIGH',
    minVolatilityRegime: 'LOW',
    maxATRPercentile: 85,            // 85th percentile ATR
    
    // Market limits
    maxVIXLevel: 35,                 // VIX < 35
    minLiquidityScore: 0.6,          // 60% min liquidity
    blockNewsEvents: true
  };
  
  private static readonly DEFAULT_KILL_SWITCHES: KillSwitchTriggers = {
    // Kill switches (optimized for $25K account)
    portfolioDrawdownPercent: 12.0,   // Kill at 12% drawdown ($3,000)
    dailyLossAmount: 750,            // Kill at $750 daily loss (3%)
    volatilitySpike: 100.0,          // Kill at 100% volatility spike
    systemErrors: 5,                 // Kill after 5 errors
    
    // Warnings (scaled for smaller account)
    warningDrawdownPercent: 5.0,     // Warn at 5% drawdown ($1,250)
    warningLossAmount: 300,          // Warn at $300 loss (1.2%)
    warningVolatility: 50.0,         // Warn at 50% vol spike
    
    // Recovery
    cooldownMinutes: 30,             // 30min cooldown
    manualOverrideRequired: true,    // Require manual restart
    maxRestartAttempts: 3            // Max 3 auto-restarts
  };
  
  private positions: Map<string, PositionRisk> = new Map();
  private riskHistory: PortfolioRisk[] = [];
  private eventHistory: RiskEvent[] = [];
  private killSwitchTriggered = false;
  private systemErrors = 0;
  private restartAttempts = 0;
  private lastKillSwitchTime: Date | null = null;
  
  constructor(
    private limits: RiskLimits = ComprehensiveRiskManager.DEFAULT_LIMITS,
    private killSwitches: KillSwitchTriggers = ComprehensiveRiskManager.DEFAULT_KILL_SWITCHES,
    private initialBalance: number = 25000
  ) {
    console.log('🛡️ Comprehensive Risk Manager initialized');
    console.log(`   Max Daily Loss: $${this.limits.maxDailyLoss}`);
    console.log(`   Max Drawdown: ${this.limits.maxPortfolioDrawdown}%`);
    console.log(`   Kill Switch Drawdown: ${this.killSwitches.portfolioDrawdownPercent}%`);
  }
  
  /**
   * Evaluate if a new position should be allowed
   */
  evaluateNewPosition(
    signal: StrategySignal,
    currentBalance: number,
    marketData: MarketData[],
    atrSnapshot: ATRSnapshot,
    vixLevel?: number
  ): {
    approved: boolean;
    reason: string;
    adjustedPositionSize?: number;
    warnings: string[];
  } {
    
    const warnings: string[] = [];
    
    // Check kill switch status
    if (this.killSwitchTriggered) {
      return {
        approved: false,
        reason: 'Kill switch is active - no new positions allowed',
        warnings
      };
    }
    
    // Market condition checks
    const marketCheck = this.checkMarketConditions(atrSnapshot, vixLevel);
    if (!marketCheck.acceptable) {
      return {
        approved: false,
        reason: marketCheck.reason,
        warnings
      };
    }
    warnings.push(...marketCheck.warnings);
    
    // Portfolio-level checks
    const portfolioRisk = this.calculateCurrentPortfolioRisk(currentBalance);
    const portfolioCheck = this.checkPortfolioLimits(portfolioRisk, signal);
    if (!portfolioCheck.acceptable) {
      return {
        approved: false,
        reason: portfolioCheck.reason,
        warnings
      };
    }
    warnings.push(...portfolioCheck.warnings);
    
    // Position-level checks
    const positionCheck = this.checkPositionLimits(signal, currentBalance);
    if (!positionCheck.acceptable) {
      return {
        approved: false,
        reason: positionCheck.reason,
        warnings
      };
    }
    warnings.push(...positionCheck.warnings);
    
    // Greeks checks
    const greeksCheck = this.checkGreeksLimits(signal, portfolioRisk);
    if (!greeksCheck.acceptable) {
      return {
        approved: false,
        reason: greeksCheck.reason,
        warnings
      };
    }
    warnings.push(...greeksCheck.warnings);
    
    // Calculate risk-adjusted position size
    const adjustedSize = this.calculateRiskAdjustedSize(
      signal, portfolioRisk, atrSnapshot
    );
    
    if (adjustedSize < 1) {
      return {
        approved: false,
        reason: 'Risk-adjusted position size below minimum (1 contract)',
        warnings
      };
    }
    
    return {
      approved: true,
      reason: 'Position approved with risk adjustments',
      adjustedPositionSize: adjustedSize,
      warnings
    };
  }
  
  /**
   * Add new position to risk monitoring
   */
  addPosition(
    positionId: string,
    signal: StrategySignal,
    actualPositionSize: number,
    entryGreeks: GreeksSnapshot
  ): void {
    
    const notionalValue = signal.entryPrice * actualPositionSize * 100; // Options contract size
    const maxLoss = Math.abs(signal.entryPrice - signal.stopLoss) * actualPositionSize * 100;
    
    const positionRisk: PositionRisk = {
      id: positionId,
      symbol: 'SPY', // Simplified
      notionalValue,
      maxLoss,
      currentPnL: 0,
      greeks: entryGreeks,
      correlationScore: 1.0, // Simplified - all SPY positions fully correlated
      liquidityScore: signal.confluenceZones.length > 0 ? 0.8 : 0.6, // Simplified
      timeRemaining: 240, // 4 hours for 0DTE
      riskScore: 1 - signal.confidence // Higher confidence = lower risk
    };
    
    this.positions.set(positionId, positionRisk);
    
    console.log(`🛡️ Position added to risk monitoring: ${positionId}`);
    console.log(`   Notional: $${notionalValue.toFixed(0)}, Max Loss: $${maxLoss.toFixed(0)}`);
  }
  
  /**
   * Update existing position risk metrics
   */
  updatePosition(
    positionId: string,
    currentPrice: number,
    currentGreeks: GreeksSnapshot,
    timeRemaining: number
  ): void {
    
    const position = this.positions.get(positionId);
    if (!position) return;
    
    // Update current P&L (simplified calculation)
    position.currentPnL = (currentPrice - position.greeks.underlyingPrice) * 
                         position.greeks.delta * (position.notionalValue / 100);
    
    // Update Greeks
    position.greeks = currentGreeks;
    position.timeRemaining = timeRemaining;
    
    // Update risk score based on time decay and P&L
    const timeDecayFactor = Math.max(0, timeRemaining / 240); // 0-1 based on time left
    const pnlFactor = position.currentPnL < 0 ? 1.2 : 0.8; // Higher risk if losing
    position.riskScore = (position.riskScore * 0.7) + (timeDecayFactor * pnlFactor * 0.3);
  }
  
  /**
   * Remove position from risk monitoring
   */
  removePosition(positionId: string): void {
    const removed = this.positions.delete(positionId);
    if (removed) {
      console.log(`🛡️ Position removed from risk monitoring: ${positionId}`);
    }
  }
  
  /**
   * Monitor portfolio risk and trigger warnings/kill switches
   */
  monitorRisk(currentBalance: number, marketData: MarketData[]): {
    riskStatus: PortfolioRisk;
    actions: string[];
    killSwitchTriggered: boolean;
  } {
    
    const portfolioRisk = this.calculateCurrentPortfolioRisk(currentBalance);
    this.riskHistory.push(portfolioRisk);
    
    const actions: string[] = [];
    
    // Check kill switch conditions
    const killSwitchCheck = this.checkKillSwitchConditions(portfolioRisk);
    if (killSwitchCheck.triggered && !this.killSwitchTriggered) {
      this.triggerKillSwitch(killSwitchCheck.reason, portfolioRisk);
      actions.push('KILL_SWITCH_TRIGGERED');
    }
    
    // Check warning conditions
    const warnings = this.checkWarningConditions(portfolioRisk);
    actions.push(...warnings);
    
    // Update position time decay
    this.updateTimeDecayRisk();
    
    // Log critical risk events
    if (portfolioRisk.riskLevel === 'CRITICAL' || portfolioRisk.riskLevel === 'EMERGENCY') {
      this.logRiskEvent({
        timestamp: new Date(),
        type: 'WARNING',
        severity: 'CRITICAL',
        message: `Portfolio risk level: ${portfolioRisk.riskLevel}`,
        data: portfolioRisk,
        actionTaken: 'Monitoring intensified'
      });
    }
    
    return {
      riskStatus: portfolioRisk,
      actions,
      killSwitchTriggered: this.killSwitchTriggered
    };
  }
  
  /**
   * Check market conditions for trading approval
   */
  private checkMarketConditions(
    atrSnapshot: ATRSnapshot,
    vixLevel?: number
  ): { acceptable: boolean; reason: string; warnings: string[] } {
    
    const warnings: string[] = [];
    
    // VIX level check
    if (vixLevel && vixLevel > this.limits.maxVIXLevel) {
      return {
        acceptable: false,
        reason: `VIX level ${vixLevel.toFixed(1)} exceeds limit ${this.limits.maxVIXLevel}`,
        warnings
      };
    }
    
    // ATR percentile check
    if (atrSnapshot.volatilityPercentile > this.limits.maxATRPercentile) {
      return {
        acceptable: false,
        reason: `ATR at ${atrSnapshot.volatilityPercentile.toFixed(0)}th percentile exceeds limit ${this.limits.maxATRPercentile}`,
        warnings
      };
    }
    
    // Volatility regime check
    if (atrSnapshot.volatilityRegime === 'EXTREME' && this.limits.maxVolatilityRegime !== 'EXTREME') {
      return {
        acceptable: false,
        reason: `Extreme volatility regime blocked`,
        warnings
      };
    }
    
    // Warnings for concerning conditions
    if (atrSnapshot.volatilityRegime === 'HIGH') {
      warnings.push('High volatility regime - exercise caution');
    }
    
    if (vixLevel && vixLevel > 25) {
      warnings.push(`Elevated VIX: ${vixLevel.toFixed(1)}`);
    }
    
    return { acceptable: true, reason: 'Market conditions acceptable', warnings };
  }
  
  /**
   * Check portfolio-level limits
   */
  private checkPortfolioLimits(
    portfolioRisk: PortfolioRisk,
    signal: StrategySignal
  ): { acceptable: boolean; reason: string; warnings: string[] } {
    
    const warnings: string[] = [];
    
    // Daily loss check
    if (Math.abs(portfolioRisk.dailyPnL) > this.limits.maxDailyLoss) {
      return {
        acceptable: false,
        reason: `Daily loss $${Math.abs(portfolioRisk.dailyPnL).toFixed(0)} exceeds limit $${this.limits.maxDailyLoss}`,
        warnings
      };
    }
    
    // Drawdown check
    if (portfolioRisk.drawdownPercent > this.limits.maxPortfolioDrawdown) {
      return {
        acceptable: false,
        reason: `Portfolio drawdown ${portfolioRisk.drawdownPercent.toFixed(1)}% exceeds limit ${this.limits.maxPortfolioDrawdown}%`,
        warnings
      };
    }
    
    // Total notional check
    const newNotional = signal.entryPrice * signal.positionSize * 100;
    if (portfolioRisk.totalNotional + newNotional > this.limits.maxTotalNotional) {
      return {
        acceptable: false,
        reason: `Total notional would exceed limit $${this.limits.maxTotalNotional}`,
        warnings
      };
    }
    
    // Position concentration check
    const concentrationAfter = ((newNotional) / (portfolioRisk.totalValue + newNotional)) * 100;
    if (concentrationAfter > this.limits.maxPositionConcentration) {
      return {
        acceptable: false,
        reason: `Position concentration ${concentrationAfter.toFixed(1)}% would exceed limit ${this.limits.maxPositionConcentration}%`,
        warnings
      };
    }
    
    // Correlation check (simplified - all SPY positions are correlated)
    const correlatedPositions = this.positions.size;
    if (correlatedPositions >= this.limits.maxCorrelatedPositions) {
      return {
        acceptable: false,
        reason: `Already at limit of ${this.limits.maxCorrelatedPositions} correlated positions`,
        warnings
      };
    }
    
    // Warnings
    if (portfolioRisk.drawdownPercent > this.limits.maxPortfolioDrawdown * 0.7) {
      warnings.push(`Approaching drawdown limit: ${portfolioRisk.drawdownPercent.toFixed(1)}%`);
    }
    
    if (Math.abs(portfolioRisk.dailyPnL) > this.limits.maxDailyLoss * 0.7) {
      warnings.push(`Approaching daily loss limit: $${Math.abs(portfolioRisk.dailyPnL).toFixed(0)}`);
    }
    
    return { acceptable: true, reason: 'Portfolio limits acceptable', warnings };
  }
  
  /**
   * Check position-level limits
   */
  private checkPositionLimits(
    signal: StrategySignal,
    currentBalance: number
  ): { acceptable: boolean; reason: string; warnings: string[] } {
    
    const warnings: string[] = [];
    
    // Position size check
    if (signal.positionSize > this.limits.maxPositionSize) {
      return {
        acceptable: false,
        reason: `Position size ${signal.positionSize} exceeds limit ${this.limits.maxPositionSize}`,
        warnings
      };
    }
    
    // Leverage check
    const notionalValue = signal.entryPrice * signal.positionSize * 100;
    const leverage = notionalValue / currentBalance;
    if (leverage > this.limits.maxLeverage) {
      return {
        acceptable: false,
        reason: `Leverage ${leverage.toFixed(1)}x exceeds limit ${this.limits.maxLeverage}x`,
        warnings
      };
    }
    
    // Max loss check
    const maxLoss = Math.abs(signal.entryPrice - signal.stopLoss) * signal.positionSize * 100;
    const riskPercent = (maxLoss / currentBalance) * 100;
    if (riskPercent > 10) { // 10% max risk per position
      return {
        acceptable: false,
        reason: `Position risk ${riskPercent.toFixed(1)}% exceeds 10% limit`,
        warnings
      };
    }
    
    return { acceptable: true, reason: 'Position limits acceptable', warnings };
  }
  
  /**
   * Check Greeks limits for portfolio
   */
  private checkGreeksLimits(
    signal: StrategySignal,
    portfolioRisk: PortfolioRisk
  ): { acceptable: boolean; reason: string; warnings: string[] } {
    
    const warnings: string[] = [];
    
    // Estimate new position Greeks (simplified)
    const positionDelta = signal.atrAnalysis.currentPrice * signal.positionSize * 0.5; // Assume 0.5 delta
    const positionGamma = signal.positionSize * 0.01; // Simplified
    const positionTheta = signal.positionSize * -20; // Simplified
    const positionVega = signal.positionSize * 10; // Simplified
    
    // Check delta limit
    if (Math.abs(portfolioRisk.netDelta + positionDelta) > this.limits.maxNetDelta) {
      return {
        acceptable: false,
        reason: `Net delta would exceed limit ${this.limits.maxNetDelta}`,
        warnings
      };
    }
    
    // Check gamma limit
    if (Math.abs(portfolioRisk.netGamma + positionGamma) > this.limits.maxNetGamma) {
      return {
        acceptable: false,
        reason: `Net gamma would exceed limit ${this.limits.maxNetGamma}`,
        warnings
      };
    }
    
    // Check theta limit (negative values)
    if ((portfolioRisk.netTheta + positionTheta) < this.limits.maxNetTheta) {
      return {
        acceptable: false,
        reason: `Net theta would exceed limit ${this.limits.maxNetTheta}`,
        warnings
      };
    }
    
    // Check vega limit
    if (Math.abs(portfolioRisk.netVega + positionVega) > this.limits.maxNetVega) {
      return {
        acceptable: false,
        reason: `Net vega would exceed limit ${this.limits.maxNetVega}`,
        warnings
      };
    }
    
    return { acceptable: true, reason: 'Greeks limits acceptable', warnings };
  }
  
  /**
   * Calculate risk-adjusted position size
   */
  private calculateRiskAdjustedSize(
    signal: StrategySignal,
    portfolioRisk: PortfolioRisk,
    atrSnapshot: ATRSnapshot
  ): number {
    
    let adjustedSize = signal.positionSize;
    
    // Reduce size based on portfolio risk level
    switch (portfolioRisk.riskLevel) {
      case 'HIGH':
        adjustedSize *= 0.7;
        break;
      case 'CRITICAL':
        adjustedSize *= 0.5;
        break;
      case 'EMERGENCY':
        adjustedSize *= 0.3;
        break;
    }
    
    // Reduce size based on volatility
    if (atrSnapshot.volatilityRegime === 'HIGH') {
      adjustedSize *= 0.8;
    } else if (atrSnapshot.volatilityRegime === 'EXTREME') {
      adjustedSize *= 0.5;
    }
    
    // Reduce size based on signal confidence
    adjustedSize *= signal.confidence;
    
    // Ensure minimum size
    return Math.max(1, Math.floor(adjustedSize));
  }
  
  /**
   * Calculate current portfolio risk metrics
   */
  private calculateCurrentPortfolioRisk(currentBalance: number): PortfolioRisk {
    
    let totalNotional = 0;
    let totalMaxLoss = 0;
    let currentPnL = 0;
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    
    // Aggregate position metrics
    for (const position of Array.from(this.positions.values())) {
      totalNotional += position.notionalValue;
      totalMaxLoss += position.maxLoss;
      currentPnL += position.currentPnL;
      netDelta += position.greeks.delta;
      netGamma += position.greeks.gamma;
      netTheta += position.greeks.theta;
      netVega += position.greeks.vega;
    }
    
    const totalValue = currentBalance + currentPnL;
    const drawdownPercent = ((this.initialBalance - totalValue) / this.initialBalance) * 100;
    
    // Calculate daily P&L (simplified)
    const dailyPnL = currentPnL; // Simplified - assume all P&L is daily
    
    // Calculate risk scores
    const portfolioVaR = totalMaxLoss * 0.95; // Simplified VaR
    const portfolioConcentration = this.positions.size > 0 ? 
      Math.max(...Array.from(this.positions.values()).map(p => p.notionalValue)) / totalNotional : 0;
    
    const correlationRisk = this.positions.size > 1 ? 0.8 : 0; // High correlation for SPY positions
    const liquidityRisk = 1 - (Array.from(this.positions.values())
      .reduce((sum, p) => sum + p.liquidityScore, 0) / Math.max(1, this.positions.size));
    
    const timeDecayRisk = Math.abs(netTheta) / Math.max(1, totalValue);
    
    // Determine risk level
    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
    if (drawdownPercent > 15 || Math.abs(dailyPnL) > 7500) {
      riskLevel = 'EMERGENCY';
    } else if (drawdownPercent > 10 || Math.abs(dailyPnL) > 5000) {
      riskLevel = 'CRITICAL';
    } else if (drawdownPercent > 7 || Math.abs(dailyPnL) > 2500) {
      riskLevel = 'HIGH';
    } else if (drawdownPercent > 3 || Math.abs(dailyPnL) > 1000) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'LOW';
    }
    
    const activeWarnings: string[] = [];
    if (Math.abs(netDelta) > this.limits.maxNetDelta * 0.8) {
      activeWarnings.push('Approaching delta limit');
    }
    if (Math.abs(netTheta) > Math.abs(this.limits.maxNetTheta) * 0.8) {
      activeWarnings.push('High theta exposure');
    }
    if (this.positions.size >= this.limits.maxCorrelatedPositions) {
      activeWarnings.push('At position limit');
    }
    
    return {
      timestamp: new Date(),
      totalValue,
      totalNotional,
      totalMaxLoss,
      currentPnL,
      dailyPnL,
      drawdownPercent: Math.max(0, drawdownPercent),
      netDelta,
      netGamma,
      netTheta,
      netVega,
      portfolioVaR,
      portfolioConcentration,
      correlationRisk,
      liquidityRisk,
      timeDecayRisk,
      riskLevel,
      activeWarnings,
      killSwitchStatus: this.killSwitchTriggered ? 'TRIGGERED' : 'ACTIVE'
    };
  }
  
  /**
   * Check kill switch conditions
   */
  private checkKillSwitchConditions(
    portfolioRisk: PortfolioRisk
  ): { triggered: boolean; reason: string } {
    
    // Portfolio drawdown kill switch
    if (portfolioRisk.drawdownPercent >= this.killSwitches.portfolioDrawdownPercent) {
      return {
        triggered: true,
        reason: `Portfolio drawdown ${portfolioRisk.drawdownPercent.toFixed(1)}% >= kill switch ${this.killSwitches.portfolioDrawdownPercent}%`
      };
    }
    
    // Daily loss kill switch
    if (Math.abs(portfolioRisk.dailyPnL) >= this.killSwitches.dailyLossAmount) {
      return {
        triggered: true,
        reason: `Daily loss $${Math.abs(portfolioRisk.dailyPnL).toFixed(0)} >= kill switch $${this.killSwitches.dailyLossAmount}`
      };
    }
    
    // System errors kill switch
    if (this.systemErrors >= this.killSwitches.systemErrors) {
      return {
        triggered: true,
        reason: `System errors ${this.systemErrors} >= kill switch ${this.killSwitches.systemErrors}`
      };
    }
    
    return { triggered: false, reason: '' };
  }
  
  /**
   * Check warning conditions
   */
  private checkWarningConditions(portfolioRisk: PortfolioRisk): string[] {
    const warnings: string[] = [];
    
    if (portfolioRisk.drawdownPercent >= this.killSwitches.warningDrawdownPercent) {
      warnings.push(`WARNING: Drawdown ${portfolioRisk.drawdownPercent.toFixed(1)}%`);
    }
    
    if (Math.abs(portfolioRisk.dailyPnL) >= this.killSwitches.warningLossAmount) {
      warnings.push(`WARNING: Daily loss $${Math.abs(portfolioRisk.dailyPnL).toFixed(0)}`);
    }
    
    if (portfolioRisk.riskLevel === 'HIGH' || portfolioRisk.riskLevel === 'CRITICAL') {
      warnings.push(`WARNING: Risk level ${portfolioRisk.riskLevel}`);
    }
    
    return warnings;
  }
  
  /**
   * Trigger kill switch
   */
  private triggerKillSwitch(reason: string, portfolioRisk: PortfolioRisk): void {
    this.killSwitchTriggered = true;
    this.lastKillSwitchTime = new Date();
    
    this.logRiskEvent({
      timestamp: new Date(),
      type: 'KILL_SWITCH',
      severity: 'CRITICAL',
      message: `KILL SWITCH TRIGGERED: ${reason}`,
      data: portfolioRisk,
      actionTaken: 'All trading halted, positions to be reviewed'
    });
    
    console.error(`🚨 KILL SWITCH TRIGGERED: ${reason}`);
    console.error(`🚨 ALL TRADING HALTED`);
  }
  
  /**
   * Update time decay risk for all positions
   */
  private updateTimeDecayRisk(): void {
    for (const position of Array.from(this.positions.values())) {
      position.timeRemaining = Math.max(0, position.timeRemaining - 1); // Decrement by 1 minute
      
      if (position.timeRemaining <= 30) { // 30 minutes to expiration
        position.riskScore = Math.min(1, position.riskScore * 1.5); // Increase risk
      }
    }
  }
  
  /**
   * Log risk event
   */
  private logRiskEvent(event: RiskEvent): void {
    this.eventHistory.push(event);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
    
    console.log(`🛡️ RISK EVENT [${event.severity}]: ${event.message}`);
  }
  
  /**
   * Record system error
   */
  recordSystemError(error: string): void {
    this.systemErrors++;
    
    this.logRiskEvent({
      timestamp: new Date(),
      type: 'WARNING',
      severity: 'MEDIUM',
      message: `System error recorded: ${error}`,
      data: { errorCount: this.systemErrors },
      actionTaken: 'Error logged, monitoring for kill switch threshold'
    });
  }
  
  /**
   * Reset kill switch (manual override)
   */
  resetKillSwitch(manualOverride: boolean = false): {
    success: boolean;
    message: string;
  } {
    
    if (!this.killSwitchTriggered) {
      return { success: false, message: 'Kill switch is not triggered' };
    }
    
    if (this.killSwitches.manualOverrideRequired && !manualOverride) {
      return { success: false, message: 'Manual override required to reset kill switch' };
    }
    
    if (this.lastKillSwitchTime) {
      const timeSinceKill = (new Date().getTime() - this.lastKillSwitchTime.getTime()) / (1000 * 60);
      if (timeSinceKill < this.killSwitches.cooldownMinutes) {
        return {
          success: false,
          message: `Cooldown period: ${(this.killSwitches.cooldownMinutes - timeSinceKill).toFixed(0)} minutes remaining`
        };
      }
    }
    
    if (this.restartAttempts >= this.killSwitches.maxRestartAttempts && !manualOverride) {
      return {
        success: false,
        message: `Maximum restart attempts (${this.killSwitches.maxRestartAttempts}) exceeded`
      };
    }
    
    this.killSwitchTriggered = false;
    this.systemErrors = 0;
    this.restartAttempts++;
    
    this.logRiskEvent({
      timestamp: new Date(),
      type: 'RECOVERY',
      severity: 'HIGH',
      message: `Kill switch reset ${manualOverride ? '(manual override)' : '(automatic)'}`,
      data: { restartAttempt: this.restartAttempts },
      actionTaken: 'Trading systems re-enabled'
    });
    
    console.log(`🛡️ KILL SWITCH RESET - Trading re-enabled`);
    
    return { success: true, message: 'Kill switch reset successfully' };
  }
  
  /**
   * Get current risk status summary
   */
  getRiskStatus(): {
    portfolioRisk: PortfolioRisk;
    killSwitchActive: boolean;
    positionCount: number;
    recentEvents: RiskEvent[];
  } {
    
    const portfolioRisk = this.calculateCurrentPortfolioRisk(
      this.initialBalance + Array.from(this.positions.values())
        .reduce((sum, p) => sum + p.currentPnL, 0)
    );
    
    return {
      portfolioRisk,
      killSwitchActive: this.killSwitchTriggered,
      positionCount: this.positions.size,
      recentEvents: this.eventHistory.slice(-10) // Last 10 events
    };
  }
}

export default ComprehensiveRiskManager;