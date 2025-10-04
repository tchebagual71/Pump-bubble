# Setting Up Your Solana DAO

This guide will walk you through the complete setup process for your Pump-bubble Investment DAO on Solana.

## Prerequisites

Before you begin, make sure you have:

- A Solana wallet with SOL for deployment and transactions
- Token mint for DAO share tokens
- Token mint for access token (Grape Protocol)
- A Telegram Bot token from BotFather
- PostgreSQL database server

## Step 1: Environment Setup

First, set up your development environment:

```bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/v1.14.17/install)"

# Install Anchor (if not already installed)
npm i -g @project-serum/anchor-cli

# Configure Solana CLI
solana config set --url https://api.mainnet-beta.solana.com
```

## Step 2: Deploy Anchor Program

Navigate to the anchor directory and deploy the program:

```bash
cd anchor
anchor build
anchor deploy
```

Take note of the deployed program ID and update the `Anchor.toml` file accordingly.

## Step 3: Create Multisig Wallet

Navigate to the scripts directory and run:

```bash
cd ../scripts
npm install
npm run create-multisig -- -t 2 -m wallet1,wallet2,wallet3 -o ../config/multisig.json
```

This will create a new Squads multisig wallet with the specified threshold and members.

## Step 4: Create Token-Gated Access

```bash
npm run create-token-gate -- -n "My Investment DAO" -m TOKEN_MINT_ADDRESS -a 1 -o ../config/token-gate.json
```

Replace `TOKEN_MINT_ADDRESS` with your access token mint address.

## Step 5: Set Up Governance

```bash
npm run create-governance -- -n "DAO Governance" -c SHARE_TOKEN_MINT -o ../config/governance.json
```

Replace `SHARE_TOKEN_MINT` with your DAO share token mint address.

## Step 6: Database Setup

```bash
cd ../db
psql -U postgres -f init.sql
psql -U postgres -d pump_bubble -f migrations/001_initial_schema.sql
```

## Step 7: Bot Configuration

Create a `.env` file in the bot directory:

```bash
cd ../bot
cp .env.example .env
```

Edit the `.env` file with your specific configuration:

```
BOT_TOKEN=your_telegram_bot_token
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
DATABASE_URL=postgres://username:password@localhost:5432/pump_bubble
SQUADS_MULTISIG_ADDRESS=your_multisig_address
GRAPE_ACCESS_TOKEN=your_grape_access_token
GOVERNANCE_PROGRAM_ID=your_governance_program_id
MINT_TOKEN_ADDRESS=your_dao_token_address
```

## Step 8: Start the Bot

```bash
npm install
npm run build
npm run start
```

## Verify Setup

- Send a `/start` command to your bot on Telegram
- Connect a wallet with `/connect WALLET_ADDRESS`
- Check your access with `/help`
- Deposit USDC with `/deposit AMOUNT`

## Additional Configuration

### Custom Token Decimals

If your tokens have custom decimal places, update the configuration in:

1. `anchor/programs/pump-bubble-dao/src/lib.rs`
2. `bot/src/utils/solana.ts`

### DAO Customization

To customize your DAO name and other parameters, edit:

1. `bot/src/commands/start.ts`
2. `scripts/src/governance/create-governance.ts`