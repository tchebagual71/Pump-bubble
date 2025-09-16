# Pump-bubble

Solana-native listener for mint transfers and AMM swap instructions. Monitors token transactions and broadcasts real-time updates via Server-Sent Events.

## Features

- 🔗 Native Solana Web3.js integration
- 📊 Real-time mint transfer monitoring
- 🔄 AMM swap instruction tracking
- 💰 Per-wallet delta and total computation
- 📡 Server-Sent Events (SSE) broadcasting
- 🎯 Support for major AMM programs (Raydium, Whirlpool, etc.)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Test the SSE endpoint:**
   Visit `http://localhost:3000/test` to see live events

## API Endpoints

- `GET /api/events` - Server-Sent Events stream for real-time updates
- `GET /api/totals` - Current wallet totals as JSON
- `GET /health` - Health check endpoint
- `GET /test` - Test page for monitoring events

## Event Format

Events are broadcast in the following format:
```json
{
  "wallet": "wallet_address",
  "delta": 123.456,
  "total": 789.012,
  "signature": "transaction_signature",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Configuration

Set these environment variables:

- `SOLANA_RPC_URL` - Solana RPC endpoint (default: mainnet-beta)
- `MINT_ADDRESS` - Token mint address to monitor
- `PORT` - Server port (default: 3000)

## Monitored Programs

- Raydium AMM
- Raydium V4
- Whirlpool
- Generic Swap Programs