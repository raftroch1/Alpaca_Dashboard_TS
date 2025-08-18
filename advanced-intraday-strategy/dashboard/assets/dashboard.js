/**
 * Trading Dashboard JavaScript
 * 
 * Handles real-time parameter updates, WebSocket communication,
 * and user interface interactions for the 0-DTE trading strategy
 */

class TradingDashboard {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = false;
        this.currentConfig = this.getDefaultConfig();
        
        this.initializeUI();
        this.initializeWebSocket();
        this.bindEvents();
        this.loadPreset('balanced'); // Start with balanced preset
        this.initializeAdvancedControls(); // Initialize advanced controls with defaults
    }

    getDefaultConfig() {
        return {
            dailyPnLTarget: 200,
            targetWinSize: 200,
            targetLossSize: 150,
            dailyTradeTarget: null,
            initialStopLossPct: 35,
            profitTargetPct: 50,
            trailActivationPct: 20,
            trailStopPct: 10,
            maxRiskPerTradePct: 2.0,
            minSignalSpacingMinutes: 5,
            rsiOversold: 25,
            rsiOverbought: 75,
            momentumThresholdPct: 0.15,
            volumeConfirmationRatio: 1.5,
            breakoutThresholdPct: 0.10,
            forceExitTime: 15.5,
            accountSize: 25000,
            maxConcurrentPositions: 3,
            enableRsiSignals: true,
            enableMomentumSignals: true,
            enableBreakoutSignals: true,
            enableTimeBasedSignals: true,
            usePartialProfitTaking: false,
            partialProfitLevel: 30,
            partialProfitSize: 50,
            moveStopToBreakeven: false,
            reducedSignalSpacing: false
        };
    }

    initializeUI() {
        // Set initial values
        Object.keys(this.currentConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.currentConfig[key];
                } else {
                    element.value = this.currentConfig[key] === null ? 'null' : this.currentConfig[key];
                }
            }
        });

        // Update UI state
        this.updatePartialProfitControls();
        this.updateConnectionStatus(false);
        this.addLog('Dashboard initialized', 'info');
    }

    initializeWebSocket() {
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                this.addLog('Connected to trading engine', 'success');
                
                // Request current status
                this.sendMessage({
                    type: 'REQUEST_STATUS'
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.addLog('Connection lost - attempting reconnect...', 'warning');
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.addLog('Connection error occurred', 'error');
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.addLog('Failed to connect to trading engine', 'error');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            setTimeout(() => {
                this.addLog(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, 'info');
                this.initializeWebSocket();
            }, delay);
        } else {
            this.addLog('Max reconnection attempts reached. Please refresh page.', 'error');
        }
    }

    bindEvents() {
        // Parameter change handlers
        document.addEventListener('change', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
                this.handleParameterChange(event.target);
            }
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                if (preset.includes('-adv')) {
                    this.loadAdvancedPreset(preset);
                } else {
                    this.loadPreset(preset);
                }
            });
        });

        // Action buttons
        document.getElementById('applyParametersBtn').addEventListener('click', () => {
            this.applyParameters();
        });

        document.getElementById('runBacktestBtn').addEventListener('click', () => {
            this.runBacktest();
        });

        document.getElementById('startPaperTradingBtn').addEventListener('click', () => {
            this.startPaperTrading();
        });

        document.getElementById('emergencyStopBtn').addEventListener('click', () => {
            this.emergencyStop();
        });

        document.getElementById('clearLogBtn').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Backtest period selector
        document.getElementById('backtestPeriod').addEventListener('change', (e) => {
            this.handlePeriodChange(e.target.value);
        });

        // Partial profit toggle
        document.getElementById('usePartialProfitTaking').addEventListener('change', () => {
            this.updatePartialProfitControls();
        });

        // Advanced controls toggle
        document.getElementById('advancedToggleBtn').addEventListener('click', () => {
            this.toggleAdvancedControls();
        });

        // Advanced range inputs - update display values
        document.querySelectorAll('#advancedControlsContent input[type="range"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateRangeDisplay(e.target);
            });
        });

        // Click outside modal to close
        document.getElementById('backtestModal').addEventListener('click', (e) => {
            if (e.target.id === 'backtestModal') {
                this.closeModal();
            }
        });
    }

    handleParameterChange(element) {
        let value = element.value;
        
        // Convert values
        if (element.type === 'number') {
            value = parseFloat(value);
        } else if (element.type === 'checkbox') {
            value = element.checked;
        } else if (value === 'null') {
            value = null;
        } else if (value === 'true' || value === 'false') {
            value = value === 'true';
        }

        this.currentConfig[element.id] = value;
        this.addLog(`Updated ${element.id}: ${element.value}`, 'info');

        // Special handling for partial profit toggle
        if (element.id === 'usePartialProfitTaking') {
            this.updatePartialProfitControls();
        }
    }

    updatePartialProfitControls() {
        const enabled = document.getElementById('usePartialProfitTaking').checked;
        const controls = document.querySelectorAll('.partial-profit-control');
        
        controls.forEach(control => {
            const inputs = control.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = !enabled;
            });
            
            if (enabled) {
                control.classList.add('enabled');
            } else {
                control.classList.remove('enabled');
            }
        });
    }

    loadPreset(presetName) {
        // Update active button
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.preset === presetName) {
                btn.classList.add('active');
            }
        });

        const presets = {
            conservative: {
                dailyPnLTarget: 100,
                targetWinSize: 100,
                targetLossSize: 75,
                dailyTradeTarget: 2,
                initialStopLossPct: 25,
                profitTargetPct: 40,
                trailActivationPct: 15,
                trailStopPct: 8,
                minSignalSpacingMinutes: 30,
                rsiOversold: 20,
                rsiOverbought: 80,
                momentumThresholdPct: 0.20,
                volumeConfirmationRatio: 2.0,
                breakoutThresholdPct: 0.15,
                forceExitTime: 15.0,
                maxRiskPerTradePct: 1.5,
                maxConcurrentPositions: 2,
                enableBreakoutSignals: false,
                enableTimeBasedSignals: false,
                usePartialProfitTaking: true,
                partialProfitLevel: 25,
                moveStopToBreakeven: true,
                reducedSignalSpacing: false
            },
            balanced: {
                dailyPnLTarget: 200,
                targetWinSize: 200,
                targetLossSize: 150,
                dailyTradeTarget: null,
                initialStopLossPct: 35,
                profitTargetPct: 50,
                trailActivationPct: 20,
                trailStopPct: 10,
                minSignalSpacingMinutes: 5,
                rsiOversold: 25,
                rsiOverbought: 75,
                momentumThresholdPct: 0.15,
                volumeConfirmationRatio: 1.5,
                breakoutThresholdPct: 0.10,
                forceExitTime: 15.5,
                maxRiskPerTradePct: 2.0,
                maxConcurrentPositions: 3,
                enableRsiSignals: true,
                enableMomentumSignals: true,
                enableBreakoutSignals: true,
                enableTimeBasedSignals: true,
                usePartialProfitTaking: false,
                partialProfitLevel: 30,
                partialProfitSize: 50,
                moveStopToBreakeven: false,
                reducedSignalSpacing: false
            },
            sensitive: {
                dailyPnLTarget: 150,
                targetWinSize: 150,
                targetLossSize: 100,
                dailyTradeTarget: null,
                initialStopLossPct: 30,
                profitTargetPct: 45,
                trailActivationPct: 15,
                trailStopPct: 8,
                minSignalSpacingMinutes: 5,
                rsiOversold: 30,
                rsiOverbought: 70,
                momentumThresholdPct: 0.10,
                volumeConfirmationRatio: 1.2,
                breakoutThresholdPct: 0.06,
                forceExitTime: 15.5,
                maxRiskPerTradePct: 1.5,
                maxConcurrentPositions: 3,
                enableRsiSignals: true,
                enableMomentumSignals: true,
                enableBreakoutSignals: true,
                enableTimeBasedSignals: true,
                usePartialProfitTaking: false,
                partialProfitLevel: 25,
                partialProfitSize: 50,
                moveStopToBreakeven: false,
                reducedSignalSpacing: false
            },
            aggressive: {
                dailyPnLTarget: 400,
                targetWinSize: 300,
                targetLossSize: 200,
                dailyTradeTarget: null,
                initialStopLossPct: 40,
                profitTargetPct: 60,
                trailActivationPct: 25,
                trailStopPct: 12,
                minSignalSpacingMinutes: 5,
                rsiOversold: 30,
                rsiOverbought: 70,
                momentumThresholdPct: 0.12,
                volumeConfirmationRatio: 1.3,
                breakoutThresholdPct: 0.08,
                forceExitTime: 15.5,
                maxRiskPerTradePct: 2.5,
                maxConcurrentPositions: 5,
                enableRsiSignals: true,
                enableMomentumSignals: true,
                enableBreakoutSignals: true,
                enableTimeBasedSignals: true,
                usePartialProfitTaking: true,
                partialProfitLevel: 35,
                partialProfitSize: 40,
                moveStopToBreakeven: true,
                reducedSignalSpacing: true
            }
        };

        const preset = presets[presetName];
        if (preset) {
            // Update configuration
            this.currentConfig = { ...this.currentConfig, ...preset };
            
            // Update UI elements
            Object.keys(preset).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = preset[key];
                    } else {
                        element.value = preset[key] === null ? 'null' : preset[key];
                    }
                }
            });

            this.updatePartialProfitControls();
            this.addLog(`Loaded ${presetName.toUpperCase()} preset`, 'success');
        }
    }

    toggleAdvancedControls() {
        const content = document.getElementById('advancedControlsContent');
        const toggleBtn = document.getElementById('advancedToggleBtn');
        const isVisible = content.style.display !== 'none';
        
        if (isVisible) {
            content.style.display = 'none';
            toggleBtn.classList.remove('expanded');
        } else {
            content.style.display = 'block';
            toggleBtn.classList.add('expanded');
        }
    }

    updateRangeDisplay(input) {
        const valueSpan = document.getElementById(input.id + 'Value');
        if (valueSpan) {
            let displayValue = input.value;
            
            // Format specific values
            if (input.id === 'portfolioHeatThreshold') {
                displayValue = (parseFloat(input.value) * 100).toFixed(0) + '%';
            } else if (input.id === 'emergencyStopLoss') {
                displayValue = '-$' + Math.abs(input.value);
            }
            
            valueSpan.textContent = displayValue;
        }
    }

    getAdvancedDefaults() {
        return {
            // Component Weights
            gexWeight: 0.30,
            avpWeight: 0.20,
            avwapWeight: 0.20,
            fractalWeight: 0.20,
            atrWeight: 0.10,
            
            // Signal Thresholds
            minimumBullishScore: 0.60,
            minimumBearishScore: 0.60,
            confluenceMinimumScore: 0.6,
            
            // GEX Controls
            gexConfidenceThreshold: 0.5,
            treatExtremeAsOpportunity: true,
            
            // ATR Controls
            atrPeriod: 14,
            customStopMultiplier: 2.5,
            positionSizeMultiplier: 1.0,
            
            // Advanced Risk
            maxCorrelatedPositions: 2,
            portfolioHeatThreshold: 0.10,
            emergencyStopLoss: -400,
            allowCounterTrendTrades: false,
            dynamicThresholds: false
        };
    }

    loadAdvancedPreset(presetName) {
        const presets = {
            'conservative-adv': {
                gexWeight: 0.25,
                avpWeight: 0.25,
                avwapWeight: 0.25,
                fractalWeight: 0.15,
                atrWeight: 0.10,
                minimumBullishScore: 0.70,
                minimumBearishScore: 0.70,
                confluenceMinimumScore: 0.7,
                gexConfidenceThreshold: 0.6,
                treatExtremeAsOpportunity: false,
                atrPeriod: 20,
                customStopMultiplier: 3.0,
                positionSizeMultiplier: 0.8,
                maxCorrelatedPositions: 1,
                portfolioHeatThreshold: 0.08,
                emergencyStopLoss: -300,
                allowCounterTrendTrades: false,
                dynamicThresholds: false
            },
            'balanced-adv': {
                gexWeight: 0.30,
                avpWeight: 0.20,
                avwapWeight: 0.20,
                fractalWeight: 0.20,
                atrWeight: 0.10,
                minimumBullishScore: 0.60,
                minimumBearishScore: 0.60,
                confluenceMinimumScore: 0.6,
                gexConfidenceThreshold: 0.5,
                treatExtremeAsOpportunity: true,
                atrPeriod: 14,
                customStopMultiplier: 2.5,
                positionSizeMultiplier: 1.0,
                maxCorrelatedPositions: 2,
                portfolioHeatThreshold: 0.10,
                emergencyStopLoss: -400,
                allowCounterTrendTrades: false,
                dynamicThresholds: false
            },
            'sensitive-adv': {
                gexWeight: 0.30,
                avpWeight: 0.20,
                avwapWeight: 0.20,
                fractalWeight: 0.20,
                atrWeight: 0.10,
                minimumBullishScore: 0.35,
                minimumBearishScore: 0.35,
                confluenceMinimumScore: 0.35,
                gexConfidenceThreshold: 0.3,
                treatExtremeAsOpportunity: true,
                atrPeriod: 14,
                customStopMultiplier: 2.0,
                positionSizeMultiplier: 1.0,
                maxCorrelatedPositions: 3,
                portfolioHeatThreshold: 0.08,
                emergencyStopLoss: -400,
                allowCounterTrendTrades: false,
                dynamicThresholds: false
            },
            'aggressive-adv': {
                gexWeight: 0.35,
                avpWeight: 0.15,
                avwapWeight: 0.15,
                fractalWeight: 0.25,
                atrWeight: 0.10,
                minimumBullishScore: 0.50,
                minimumBearishScore: 0.50,
                confluenceMinimumScore: 0.5,
                gexConfidenceThreshold: 0.4,
                treatExtremeAsOpportunity: true,
                atrPeriod: 10,
                customStopMultiplier: 2.0,
                positionSizeMultiplier: 1.2,
                maxCorrelatedPositions: 3,
                portfolioHeatThreshold: 0.15,
                emergencyStopLoss: -500,
                allowCounterTrendTrades: true,
                dynamicThresholds: true
            }
        };

        const preset = presets[presetName];
        if (preset) {
            // Update advanced controls
            Object.keys(preset).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = preset[key];
                    } else {
                        element.value = preset[key];
                    }
                    
                    // Update range display values
                    if (element.type === 'range') {
                        this.updateRangeDisplay(element);
                    }
                }
            });
            
            this.addLog(`Loaded ${presetName.replace('-adv', '').toUpperCase()} advanced preset`, 'success');
        }
    }

    initializeAdvancedControls() {
        // Load default advanced settings
        const defaults = this.getAdvancedDefaults();
        Object.keys(defaults).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = defaults[key];
                } else {
                    element.value = defaults[key];
                }
                
                // Update range display values
                if (element.type === 'range') {
                    this.updateRangeDisplay(element);
                }
            }
        });
        
        // Load balanced advanced preset by default
        this.loadAdvancedPreset('balanced-adv');
    }

    applyParameters() {
        const config = this.gatherCurrentConfig();
        
        if (this.isConnected) {
            this.sendMessage({
                type: 'UPDATE_PARAMETERS',
                config: config
            });
            this.addLog('Parameters sent to trading engine', 'success');
        } else {
            this.addLog('Not connected to trading engine', 'error');
        }
    }

    handlePeriodChange(period) {
        const customDateRange = document.getElementById('customDateRange');
        const customEndDate = document.getElementById('customEndDate');
        
        if (period === 'custom') {
            customDateRange.style.display = 'block';
            customEndDate.style.display = 'block';
            
            // Set default dates
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month back
            
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        } else {
            customDateRange.style.display = 'none';
            customEndDate.style.display = 'none';
        }
    }

    getBacktestPeriodInfo() {
        const periodSelect = document.getElementById('backtestPeriod').value;
        
        if (periodSelect === 'custom') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (!startDate || !endDate) {
                throw new Error('Please select both start and end dates for custom range');
            }
            
            return {
                type: 'custom',
                startDate: startDate,
                endDate: endDate,
                description: `${startDate} to ${endDate}`
            };
        } else {
            // Calculate days back based on period
            const periodMap = {
                '3days': { daysBack: 3, description: 'Last 3 Days' },
                '1week': { daysBack: 7, description: 'Last 1 Week' },
                '2weeks': { daysBack: 14, description: 'Last 2 Weeks' },
                '1month': { daysBack: 30, description: 'Last 1 Month' },
                '3months': { daysBack: 90, description: 'Last 3 Months' },
                '6months': { daysBack: 180, description: 'Last 6 Months' }
            };
            
            const periodInfo = periodMap[periodSelect] || periodMap['3days'];
            return {
                type: 'daysBack',
                daysBack: periodInfo.daysBack,
                description: periodInfo.description
            };
        }
    }

    runBacktest() {
        const config = this.gatherCurrentConfig();
        
        try {
            const periodInfo = this.getBacktestPeriodInfo();
            config.backtestPeriod = periodInfo;
            
            if (this.isConnected) {
                this.showModal();
                this.showBacktestLoading();
                
                this.sendMessage({
                    type: 'RUN_BACKTEST',
                    config: config
                });
                this.addLog(`Starting backtest for ${periodInfo.description}...`, 'info');
            } else {
                this.addLog('Not connected to trading engine', 'error');
            }
        } catch (error) {
            this.addLog(`Backtest error: ${error.message}`, 'error');
        }
    }

    startPaperTrading() {
        const config = this.gatherCurrentConfig();
        
        if (this.isConnected) {
            this.sendMessage({
                type: 'START_PAPER_TRADING',
                config: config
            });
            this.addLog('Starting paper trading...', 'info');
        } else {
            this.addLog('Not connected to trading engine', 'error');
        }
    }

    emergencyStop() {
        if (this.isConnected) {
            this.sendMessage({
                type: 'EMERGENCY_STOP'
            });
            this.addLog('Emergency stop triggered', 'warning');
        } else {
            this.addLog('Not connected to trading engine', 'error');
        }
    }

    gatherCurrentConfig() {
        const config = {};
        
        // Fields that are displayed as percentages but need to be stored as decimals
        const percentageFields = [
            'initialStopLossPct', 'profitTargetPct', 'trailActivationPct', 
            'trailStopPct', 'maxRiskPerTradePct', 'maxDrawdownPct',
            'partialProfitLevel', 'partialProfitSize', 'momentumThresholdPct',
            'breakoutThresholdPct'
        ];
        
        // Gather basic parameters
        Object.keys(this.currentConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    config[key] = element.checked;
                } else if (element.type === 'number') {
                    let value = parseFloat(element.value);
                    
                    // Convert percentage fields to decimals
                    if (percentageFields.includes(key)) {
                        value = value / 100;
                    }
                    
                    config[key] = value;
                } else {
                    const value = element.value;
                    config[key] = value === 'null' ? null : 
                                 value === 'true' ? true : 
                                 value === 'false' ? false : value;
                }
            }
        });
        
        // 🏛️ ADD INSTITUTIONAL PARAMETERS FROM ADVANCED CONTROLS
        const institutionalParams = [
            'gexWeight', 'avpWeight', 'avwapWeight', 'fractalWeight', 'atrWeight',
            'minimumBullishScore', 'minimumBearishScore', 'confluenceMinimumScore',
            'gexConfidenceThreshold', 'atrPeriod', 'customStopMultiplier',
            'positionSizeMultiplier', 'maxCorrelatedPositions', 'portfolioHeatThreshold',
            'emergencyStopLoss'
        ];
        
        institutionalParams.forEach(param => {
            const element = document.getElementById(param);
            if (element) {
                if (element.type === 'checkbox') {
                    config[param] = element.checked;
                } else if (element.type === 'range' || element.type === 'number') {
                    config[param] = parseFloat(element.value);
                } else {
                    const value = element.value;
                    config[param] = value === 'true' ? true : value === 'false' ? false : value;
                }
            }
        });
        
        return config;
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'STATUS_UPDATE':
                this.updateStatus(data);
                break;
            case 'LIVE_UPDATE':
                this.updateLiveStats(data.data);
                break;
            case 'BACKTEST_RESULTS':
                this.showBacktestResults(data.results);
                break;
            case 'PARAMETERS_UPDATED':
                this.addLog('Parameters applied successfully', 'success');
                break;
            case 'EMERGENCY_STOPPED':
                this.updateTradingStatus('stopped');
                this.addLog('All trading stopped', 'warning');
                break;
            case 'ERROR':
                this.addLog(`Error: ${data.message}`, 'error');
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    updateStatus(data) {
        if (data.parameters) {
            this.currentConfig = { ...this.currentConfig, ...data.parameters };
        }
        
        if (data.isTrading !== undefined) {
            this.updateTradingStatus(data.isTrading ? 'running' : 'stopped');
        }
    }

    updateLiveStats(data) {
        if (data.pnl !== undefined) {
            const pnlElement = document.getElementById('currentPnL');
            const sign = data.pnl >= 0 ? '+' : '';
            pnlElement.textContent = `${sign}$${data.pnl.toFixed(2)}`;
            pnlElement.className = `stat-value ${data.pnl >= 0 ? 'profit' : 'loss'}`;
            
            // Update progress
            const progressElement = document.getElementById('pnlProgress');
            const target = this.currentConfig.dailyPnLTarget || 200;
            const progress = (data.pnl / target * 100).toFixed(1);
            progressElement.textContent = `${progress}% of $${target} target`;
        }

        if (data.tradesCount !== undefined) {
            const tradesElement = document.getElementById('tradesCount');
            tradesElement.textContent = data.tradesCount;
            
            const targetElement = document.getElementById('tradesTarget');
            const limit = data.tradeLimit || 'Unlimited';
            targetElement.textContent = limit === 'Unlimited' ? 'Unlimited' : `Limit: ${limit}`;
        }

        if (data.winRate !== undefined) {
            document.getElementById('winRate').textContent = `${(data.winRate * 100).toFixed(1)}%`;
        }

        if (data.avgWin !== undefined) {
            document.getElementById('avgWin').textContent = `$${data.avgWin.toFixed(0)}`;
        }

        if (data.avgLoss !== undefined) {
            document.getElementById('avgLoss').textContent = `Avg Loss: $${data.avgLoss.toFixed(0)}`;
        }

        if (data.isRunning !== undefined) {
            this.updateTradingStatus(data.isRunning ? 'running' : 'stopped');
        }
    }

    updateTradingStatus(status) {
        const statusElement = document.getElementById('tradingStatus');
        statusElement.className = `trading-status ${status}`;
        statusElement.innerHTML = `
            <span class="status-dot"></span>
            <span>${status === 'running' ? 'Running' : 'Stopped'}</span>
        `;
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        
        indicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
        text.textContent = connected ? 'Connected' : 'Disconnected';
    }

    showModal() {
        document.getElementById('backtestModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('backtestModal').classList.remove('show');
    }

    showBacktestLoading() {
        document.getElementById('backtestResults').innerHTML = `
            <div class="results-loading">
                <div class="spinner"></div>
                <p>Running backtest with your parameters...</p>
                <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 10px;">
                    Testing last 3 days of market data
                </p>
            </div>
        `;
    }

    showBacktestResults(results) {
        const resultsHtml = `
            <div class="backtest-results">
                <div class="results-summary">
                    <h4>📊 Backtest Summary</h4>
                    <div class="results-grid">
                        <div class="result-item">
                            <span class="result-label">Total Trades</span>
                            <span class="result-value">${results.totalTrades}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Win Rate</span>
                            <span class="result-value ${results.winRate >= 0.6 ? 'profit' : 'loss'}">
                                ${(results.winRate * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Total Return</span>
                            <span class="result-value ${results.totalReturn >= 0 ? 'profit' : 'loss'}">
                                ${results.totalReturn >= 0 ? '+' : ''}${results.totalReturn.toFixed(2)}%
                            </span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Avg Daily P&L</span>
                            <span class="result-value ${results.avgDailyPnL >= 0 ? 'profit' : 'loss'}">
                                ${results.avgDailyPnL >= 0 ? '+' : ''}$${results.avgDailyPnL.toFixed(2)}
                            </span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Max Drawdown</span>
                            <span class="result-value loss">
                                ${(results.maxDrawdown * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Target Achievement</span>
                            <span class="result-value ${results.avgDailyPnL >= this.currentConfig.dailyPnLTarget ? 'profit' : 'loss'}">
                                ${(results.avgDailyPnL / this.currentConfig.dailyPnLTarget * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
                <div class="results-actions">
                    <button class="btn btn-primary" onclick="dashboard.applyParameters()">
                        Use These Parameters
                    </button>
                    <button class="btn btn-info" onclick="dashboard.closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.getElementById('backtestResults').innerHTML = resultsHtml;
        this.addLog(`Backtest completed: ${results.totalTrades} trades, ${(results.winRate * 100).toFixed(1)}% win rate`, 'success');
    }

    addLog(message, type = 'info') {
        const logOutput = document.getElementById('logOutput');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;

        // Keep only last 100 log entries
        while (logOutput.children.length > 100) {
            logOutput.removeChild(logOutput.firstChild);
        }
    }

    clearLog() {
        document.getElementById('logOutput').innerHTML = '';
        this.addLog('Log cleared', 'info');
    }
}

// Additional CSS for backtest results
const additionalCSS = `
.backtest-results {
    color: white;
}

.results-summary h4 {
    color: #4CAF50;
    margin-bottom: 20px;
    font-size: 16px;
}

.results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 25px;
}

.result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.result-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
}

.result-value {
    font-size: 16px;
    font-weight: bold;
}

.result-value.profit { color: #4CAF50; }
.result-value.loss { color: #f44336; }

.results-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
}

@media (max-width: 600px) {
    .results-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TradingDashboard();
});

// Global function for button handlers
window.dashboard = dashboard;