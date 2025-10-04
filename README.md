# Pump-bubble: Solana-based Telegram Investment DAO for Colosseum Hackathon

## Overview
A multiplayer investment DAO for Telegram groups, powered by Solana. Built for Colosseum's "Arm The Groupchats" challenge, Pump-bubble allows group members to deposit USDC into a Squads multisig wallet via Anchor contracts, receive shares, propose trades through Realms governance, and execute trades via Jupiter aggregator. Access is token-gated using Grape Protocol.

## Features

- **Telegram Bot Interface**: Interact with the DAO directly from Telegram using grammY
- **USDC Deposits & Share Issuance**: Deposit USDC to receive proportional DAO shares through Anchor vault program
- **Squads Multisig Integration**: Secure treasury management with configurable thresholds and programmatic interaction
- **SPL Governance (Realms)**: On-chain proposal submission and voting for trades and role assignments
- **Grape Protocol Integration**: Token-gated access for DAO membership verification
- **Jupiter Aggregator Integration**: Best execution for trades across multiple Solana DEXs

## Repository Structure
- `/bot` — Node.js/TypeScript grammY Telegram bot with command handlers
- `/anchor` — Rust/Anchor Solana programs for vault and share token management
- `/scripts` — CLI scripts for multisig, governance, and token distribution
- `/db` — Postgres database schema and migrations for users, proposals, and votes
- `/sdk` — Shared TypeScript libraries for interacting with Solana programs
- `/docs` — Design documents, architecture diagrams, and guides

## Prerequisites

- Node.js 18+ and npm/yarn
- Rust and Cargo (for Anchor programs)
- Solana CLI tools (v1.16+)
- Anchor CLI
- PostgreSQL database
- Telegram Bot API token
- Helius RPC or QuickNode Solana endpoint
- Solana wallet with funds (for deployment and testing)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/tchebagual71/Pump-bubble.git
cd Pump-bubble
```

### 2. Set Environment Variables

Create a `.env` file in the project root with the following variables:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SOLANA_RPC_URL=your_helius_or_quicknode_endpoint
POSTGRES_CONNECTION_STRING=postgres://username:password@localhost:5432/pump_bubble
WALLET_PRIVATE_KEY=your_deployer_wallet_private_key_for_scripts_only
```

### 2. Set Up the Database

```bash
cd db
# Create the database
psql -U postgres -f init.sql
# Run migrations
psql -U postgres -d pump_bubble -f migrations/001_initial_schema.sql
```

### 3. Deploy Anchor Programs

```bash
cd anchor
anchor build
anchor deploy
```

Note the deployed program ID and update it in the configuration files.

### 4. Set Up Multisig

```bash
cd scripts
npm install
# Create a new multisig with 3 members and threshold of 2
npm run create-multisig -- -t 2 -m address1,address2,address3
```

### 5. Configure Token-Gated Access

```bash
# Create a token-gated community using Grape Protocol
npm run create-token-gate -- -n "Pump DAO" -m TOKEN_MINT_ADDRESS -a 1
```

### 6. Set Up Governance

```bash
# Create a governance realm using SPL Governance
npm run create-governance -- -n "Pump DAO Governance" -c COMMUNITY_MINT_ADDRESS
```

### 7. Configure and Start the Telegram Bot

```bash
cd bot
npm install
# Create a .env file with required credentials
cp .env.example .env
# Edit the .env file with your configuration
nano .env
# Start the bot
npm run dev
```

## Usage

### Basic Commands

- `/start` - Introduction to the DAO
- `/help` - Display available commands
- `/connect_wallet` - Connect your Solana wallet
- `/deposit <amount>` - Deposit USDC to receive shares
- `/balance` - Check your DAO shares and USDC balance
- `/propose_trade <token> <amount>` - Propose a new trade
- `/vote <proposal_id> <yes/no>` - Vote on an active proposal
- `/execute <proposal_id>` - Execute an approved trade via Jupiter
- `/governance` - View active proposals
- `/assign_trader @user` - Propose to grant trading permissions to a user
- `/withdraw <amount>` - Withdraw funds by burning shares

For a complete guide on using the bot, see [User Guide](./docs/user-guide.md).

## Architecture Overview

1. **Telegram Bot** - Built with grammY, handles user commands and messages, interacts with backend services
2. **Backend & Database** - Node.js server connecting to Solana RPC, Squads multisig, Jupiter aggregator and Realms governance
3. **Smart Contracts** - Squads multisig holds pooled funds, Anchor vault program handles deposits and share issuance
4. **Governance Layer** - Realms for proposals and voting, triggering instructions on Squads via programmatic interfaces
5. **Membership & Gating** - Grape Access ensures only token holders can join the group chat
6. **DEX Aggregation** - Jupiter API is used to fetch quotes and execute token swaps
7. **Trading Automation** - CLI scripts automate swap instruction preparation and multisig transaction creation

For detailed architecture diagrams, see [Architecture Documentation](./docs/architecture.md).

## New Features

### Trading Automation Scripts

The repository now includes CLI utilities for automating trade execution:

- **prepare-trade**: Fetches Jupiter quotes and encodes swap instructions
- **create-trade-transaction**: Creates multisig transactions from prepared trades

See `scripts/src/trading/README.md` for the complete workflow.

### Jupiter Integration SDK

The SDK now includes a Jupiter module for easy integration:

```typescript
import { encodeJupiterSwap, getJupiterQuote } from '@pump-bubble/sdk';

// Get a quote
const quote = await getJupiterQuote(inputMint, outputMint, amount, slippage);

// Encode for Anchor program
const swapData = await encodeJupiterSwap(inputMint, outputMint, amount, slippage, multisigPubkey);
```

### Configuration Examples

Example configuration files are provided in the `config/` directory:
- `multisig.example.json` - Squads multisig setup
- `governance.example.json` - SPL Governance realm configuration
- `token-gate.example.json` - Grape Protocol access control

Copy these files and customize for your DAO deployment.