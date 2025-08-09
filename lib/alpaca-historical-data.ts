/**
 * ALPACA HISTORICAL DATA FETCHER
 * Fetches real market data from Alpaca for backtesting
 */

import { alpacaClient } from './alpaca';
import { MarketData, OptionsChain } from './types';

export interface AlpacaHistoricalDataConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day';
  includeOptionsData: boolean;
  useExtendedHours?: boolean;
}

export interface AlpacaBacktestDataSet {
  marketData: MarketData[];
  optionsData?: {
    date: Date;
    chain: OptionsChain[];
  }[];
  dataQuality: {
    marketDataPoints: number;
    optionsDataPoints: number;
    missingDays: Date[];
    dataCompleteness: number; // 0-1 percentage
  };
}

export class AlpacaHistoricalDataFetcher {
  
  /**
   * Fetch comprehensive historical data for backtesting
   */
  static async fetchBacktestData(config: AlpacaHistoricalDataConfig): Promise<AlpacaBacktestDataSet> {
    console.log('🏗️ Fetching Alpaca historical data for backtest...');
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Period: ${config.startDate.toDateString()} - ${config.endDate.toDateString()}`);
    console.log(`   Timeframe: ${config.timeframe}`);
    console.log(`   Include Options: ${config.includeOptionsData}`);

    try {
      // Test Alpaca connection first
      const connectionTest = await alpacaClient.testConnection();
      if (!connectionTest) {
        throw new Error('Failed to connect to Alpaca API');
      }

      // Fetch market data
      console.log('📊 Fetching market data...');
      const marketData = await alpacaClient.getMarketData(
        config.symbol,
        config.startDate,
        config.endDate,
        config.timeframe
      );

      console.log(`✅ Retrieved ${marketData.length} market data points`);

      // Fetch options data if requested
      let optionsData: { date: Date; chain: OptionsChain[] }[] = [];
      if (config.includeOptionsData) {
        console.log('🔗 Fetching options chain data...');
        optionsData = await this.fetchHistoricalOptionsData(
          config.symbol,
          marketData,
          config.timeframe
        );
        console.log(`✅ Retrieved options data for ${optionsData.length} trading days`);
      }

      // Analyze data quality
      const dataQuality = this.analyzeDataQuality(marketData, optionsData, config);

      const result: AlpacaBacktestDataSet = {
        marketData,
        optionsData: config.includeOptionsData ? optionsData : undefined,
        dataQuality
      };

      console.log('🎯 Data Quality Analysis:');
      console.log(`   Market Data Points: ${dataQuality.marketDataPoints}`);
      console.log(`   Options Data Points: ${dataQuality.optionsDataPoints}`);
      console.log(`   Data Completeness: ${(dataQuality.dataCompleteness * 100).toFixed(1)}%`);
      console.log(`   Missing Days: ${dataQuality.missingDays.length}`);

      return result;

    } catch (error) {
      console.error('❌ Error fetching Alpaca historical data:', error);
      throw error;
    }
  }

  /**
   * Fetch options chain data for specific trading days
   */
  private static async fetchHistoricalOptionsData(
    symbol: string,
    marketData: MarketData[],
    timeframe: string
  ): Promise<{ date: Date; chain: OptionsChain[] }[]> {
    
    const optionsData: { date: Date; chain: OptionsChain[] }[] = [];
    
    // For daily data, fetch options chain for each trading day
    if (timeframe === '1Day') {
      for (const dayData of marketData) {
        try {
          console.log(`📅 Fetching options chain for ${dayData.date.toDateString()}...`);
          
          // Note: This fetches current options chain as historical options data
          // is not available from Alpaca. In practice, you would need a historical
          // options data provider for true historical backtesting.
          const chain = await alpacaClient.getOptionsChain(symbol);
          
          optionsData.push({
            date: dayData.date,
            chain: chain
          });

          // Add delay to avoid rate limiting
          await this.delay(100);
          
        } catch (error) {
          console.warn(`⚠️ Could not fetch options data for ${dayData.date.toDateString()}`);
        }
      }
    } else {
      // For intraday data, fetch options chain once per day
      const uniqueDays = new Set<string>();
      for (const dataPoint of marketData) {
        const dayKey = dataPoint.date.toDateString();
        if (!uniqueDays.has(dayKey)) {
          uniqueDays.add(dayKey);
          
          try {
            console.log(`📅 Fetching intraday options chain for ${dayKey}...`);
            const chain = await alpacaClient.getOptionsChain(symbol);
            
            optionsData.push({
              date: dataPoint.date,
              chain: chain
            });

            // Add delay to avoid rate limiting
            await this.delay(200);
            
          } catch (error) {
            console.warn(`⚠️ Could not fetch options data for ${dayKey}`);
          }
        }
      }
    }

    return optionsData;
  }

  /**
   * Analyze data quality and completeness
   */
  private static analyzeDataQuality(
    marketData: MarketData[],
    optionsData: { date: Date; chain: OptionsChain[] }[],
    config: AlpacaHistoricalDataConfig
  ) {
    // Calculate expected trading days
    const expectedTradingDays = this.getExpectedTradingDays(config.startDate, config.endDate);
    
    // Find missing days
    const marketDataDays = new Set(marketData.map(d => d.date.toDateString()));
    const missingDays: Date[] = [];
    
    for (const day of expectedTradingDays) {
      if (!marketDataDays.has(day.toDateString())) {
        missingDays.push(day);
      }
    }

    // Calculate completeness percentage
    const dataCompleteness = Math.max(0, Math.min(1, 
      (expectedTradingDays.length - missingDays.length) / expectedTradingDays.length
    ));

    return {
      marketDataPoints: marketData.length,
      optionsDataPoints: optionsData.reduce((sum, day) => sum + day.chain.length, 0),
      missingDays,
      dataCompleteness
    };
  }

  /**
   * Get expected trading days (excluding weekends and major holidays)
   */
  private static getExpectedTradingDays(startDate: Date, endDate: Date): Date[] {
    const tradingDays: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Major market holidays (simplified)
    const holidays = new Set([
      '2024-01-01', // New Year's Day
      '2024-01-15', // MLK Day
      '2024-02-19', // Presidents Day
      '2024-03-29', // Good Friday
      '2024-05-27', // Memorial Day
      '2024-06-19', // Juneteenth
      '2024-07-04', // Independence Day
      '2024-09-02', // Labor Day
      '2024-11-28', // Thanksgiving
      '2024-12-25', // Christmas
    ]);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip weekends and holidays
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays.has(dateString)) {
        tradingDays.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return tradingDays;
  }

  /**
   * Fetch VIX data for volatility analysis
   */
  static async fetchVIXData(startDate: Date, endDate: Date): Promise<MarketData[]> {
    try {
      console.log('📈 Fetching VIX data for volatility analysis...');
      
      const vixData = await alpacaClient.getMarketData(
        'VIX',
        startDate,
        endDate,
        '1Day'
      );

      console.log(`✅ Retrieved ${vixData.length} VIX data points`);
      return vixData;
      
    } catch (error) {
      console.warn('⚠️ VIX data not available, using default volatility assumptions');
      return [];
    }
  }

  /**
   * Enhanced market data with additional indicators
   */
  static async fetchEnhancedMarketData(config: AlpacaHistoricalDataConfig): Promise<{
    primaryData: MarketData[];
    vixData: MarketData[];
    dataQuality: any;
  }> {
    console.log('🚀 Fetching enhanced market data with volatility indicators...');

    // Fetch primary market data
    const backtestData = await this.fetchBacktestData(config);
    
    // Fetch VIX data for volatility context
    const vixData = await this.fetchVIXData(config.startDate, config.endDate);

    return {
      primaryData: backtestData.marketData,
      vixData,
      dataQuality: backtestData.dataQuality
    };
  }

  /**
   * Validate data quality and provide recommendations
   */
  static validateDataForBacktest(dataSet: AlpacaBacktestDataSet): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check data completeness
    if (dataSet.dataQuality.dataCompleteness < 0.95) {
      warnings.push(`Data completeness is ${(dataSet.dataQuality.dataCompleteness * 100).toFixed(1)}% (below 95%)`);
      recommendations.push('Consider using a shorter date range or filling missing data');
    }

    // Check minimum data points
    if (dataSet.dataQuality.marketDataPoints < 20) {
      warnings.push('Insufficient market data points for reliable backtesting');
      recommendations.push('Use at least 20 trading days for meaningful backtest results');
    }

    // Check options data availability
    if (dataSet.optionsData && dataSet.dataQuality.optionsDataPoints < 100) {
      warnings.push('Limited options data may affect spread pricing accuracy');
      recommendations.push('Consider using synthetic options pricing for historical periods');
    }

    // Check for large gaps
    if (dataSet.dataQuality.missingDays.length > 5) {
      warnings.push(`${dataSet.dataQuality.missingDays.length} missing trading days detected`);
      recommendations.push('Review missing days for market holidays or data outages');
    }

    const isValid = warnings.length === 0 || dataSet.dataQuality.dataCompleteness >= 0.85;

    return { isValid, warnings, recommendations };
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AlpacaHistoricalDataFetcher;