# Pump-bubble: Solana-based Telegram Investment DAO

## Overview
A multiplayer investment DAO for Telegram groups, powered by Solana. Members deposit USDC into a Squads multisig wallet via Anchor contracts, receive shares, promote trades (realms), and execute trades programmatically. Access is token-gated using Grape Protocol.

## Features

- **Telegram Bot Interface**: Interact with the DAO directly from Telegram
- **USDC Deposits & Share Issuance**: Deposit USDC to receive proportional DAO shares
- **Squads Multisig Integration**: Secure treasury management with multisignature control
- **SPL Governance (Realms)**: On-chain proposal submission and voting for trades
- **Token-Gated Access**: Restrict DAO membership using Grape Protocol
- **Trade Execution**: Execute approved trades programmatically

## Structure
- `/bot` — Node.js/TypeScript grammY Telegram bot
- `/anchor` — Rust/Anchor Solana programs
- `/scripts` — CLI scripts for multisig and governance
- `/db` — Postgres database schema and migrations

## Prerequisites

- Node.js 18+ and npm/yarn
- Rust and Cargo
- Solana CLI tools
- PostgreSQL database
- Telegram Bot API token
- Solana wallet with funds

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/tchebagual71/Pump-bubble.git
cd Pump-bubble
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
- `/connect` - Connect your Solana wallet
- `/deposit` - Deposit USDC to receive shares
- `/balance` - Check your DAO shares and USDC balance
- `/propose` - Propose a new trade
- `/execute` - Execute an approved trade
- `/governance` - View and vote on proposals