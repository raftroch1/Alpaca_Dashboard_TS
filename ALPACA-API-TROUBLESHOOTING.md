# Alpaca API Troubleshooting Guide

## 403 Forbidden Error with Alpaca SDK

### Problem
The `@alpacahq/alpaca-trade-api` SDK sometimes returns 403 Forbidden errors even with valid API keys.

### Root Cause
The SDK may not be sending the correct HTTP headers (`APCA-API-KEY-ID` and `APCA-API-SECRET-KEY`) as required by Alpaca's API documentation.

### Solution
We have multiple working solutions in the codebase:

1. **Primary Solution**: `lib/alpaca-http-client.ts`
   - Direct HTTP client using `axios`
   - Correctly sends `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY` headers
   - Proven to work with real Alpaca data

2. **Existing Integration**: `lib/alpaca.ts`
   - Already has working `getMarketData()` method using `axios`
   - Used successfully by `lib/backtest-engine.ts` and other components
   - Has fallback to mock data if API fails

### Usage Examples

#### Using the HTTP Client
```typescript
import { alpacaHTTPClient } from './lib/alpaca-http-client';

// Test connection
const connected = await alpacaHTTPClient.testConnection();

// Get market data
const marketData = await alpacaHTTPClient.getMarketData('SPY', startDate, endDate, '1Day');

// Get options chain
const options = await alpacaHTTPClient.getOptionsChain('SPY');
```

#### Using the Main Client
```typescript
import { alpacaClient } from './lib/alpaca';

// This already works for market data
const marketData = await alpacaClient.getMarketData('SPY', startDate, endDate, '1Day');
```

### Files That Use Real Alpaca Data
- `lib/backtest-engine.ts` - Uses `alpacaClient.getMarketData()`
- `lib/alpaca-historical-data.ts` - Uses `alpacaClient` for comprehensive data fetching
- `advanced-intraday-strategy/dashboard/dashboard-alpaca-trading-engine.ts` - Now uses `alpacaHTTPClient`

### Environment Variables Required
```bash
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### Testing Connection
```bash
# Test with curl (this should work if keys are valid)
curl -H "APCA-API-KEY-ID: $ALPACA_API_KEY" \
     -H "APCA-API-SECRET-KEY: $ALPACA_API_SECRET" \
     https://paper-api.alpaca.markets/v2/account
```

### Key Points
- **Don't modify `lib/alpaca.ts`** - it's used by existing backtests
- Use `lib/alpaca-http-client.ts` for new integrations that need guaranteed real data
- The main `alpacaClient` already works for market data fetching
- Always test with `curl` first to verify API keys are valid

### Dashboard Integration
The dashboard now uses `alpacaHTTPClient` instead of `alpacaClient` to ensure real data access without breaking existing backtests.