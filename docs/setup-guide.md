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
# Telegram
BOT_TOKEN=your_telegram_bot_token

# Solana
SOLANA_RPC_URL=your_helius_or_quicknode_endpoint
PROGRAM_ID=your_anchor_program_id

# Database
DATABASE_URL=postgres://username:password@localhost:5432/pump_bubble

# DAO Components
SQUADS_MULTISIG_ADDRESS=your_multisig_address
GRAPE_ACCESS_TOKEN_MINT=your_grape_access_token_mint
GOVERNANCE_REALM_ADDRESS=your_governance_realm_address
SHARE_TOKEN_MINT_ADDRESS=your_dao_share_token_address

# Jupiter
JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
```

## Step 8: Build and Use SDK

```bash
cd ../sdk
npm install
npm run build
```

The SDK provides a unified interface for interacting with all DAO components:

```typescript
import { DaoClient, MultisigClient, GovernanceClient } from '@pump-bubble/sdk';
import { Connection, Keypair } from '@solana/web3.js';

// Connect to Solana
const connection = new Connection(SOLANA_RPC_URL);
const wallet = { /* your wallet implementation */ };

// Create client instances
const dao = new DaoClient(connection, wallet, PROGRAM_ID);
const multisig = new MultisigClient(connection, wallet);
const governance = new GovernanceClient(connection, wallet);

// Use the clients
await dao.deposit(amount);
await multisig.createTransaction(multisigAddress, instructions);
await governance.castVote(realmAddress, proposalAddress, mintAddress, 'yes');
```

## Step 9: Start the Bot

```bash
cd ../bot
npm install
npm run build
npm run start
```

## Verify Setup

- Send a `/start` command to your bot on Telegram
- Connect a wallet with `/connect_wallet YOUR_WALLET_ADDRESS`
- Check your access with `/help`
- Deposit USDC with `/deposit AMOUNT`
- Check your balance with `/balance`
- Test the governance by proposing a small trade: `/propose_trade SOL 0.1`
- Vote on your proposal: `/vote PROPOSAL_ID yes`
- After approval, execute the trade: `/execute PROPOSAL_ID`
- Test assigning a trader role: `/assign_trader @username`

## Additional Configuration

### Custom Token Decimals

If your tokens have custom decimal places, update the configuration in:

1. `anchor/programs/pump-bubble-dao/src/lib.rs`
2. `bot/src/utils/solana.ts`

### DAO Customization

To customize your DAO name and other parameters, edit:

1. `bot/src/commands/start.ts`
2. `scripts/src/governance/create-governance.ts`

### Jupiter Trading Configuration

To adjust slippage tolerance and other trading parameters:

1. Edit `bot/src/services/jupiter.ts`
2. Modify the default slippage in `scripts/src/trading/prepare-trade.ts`
3. Review trading workflow documentation in `scripts/src/trading/README.md`

### Trading Automation

The repository includes CLI tools for automating trade execution:

```bash
# Prepare a swap instruction
npm run prepare-trade -- \
  --input-mint <USDC_MINT> \
  --output-mint <SOL_MINT> \
  --amount 1000000 \
  --slippage 50

# Create multisig transaction from prepared trade
npm run create-trade-transaction -- \
  --trade-file ./trade-prepared.json \
  --proposal-id 1 \
  --proposal-address <PROPOSAL_ADDRESS>
```

See `scripts/src/trading/README.md` for complete workflow documentation.

### Grape Protocol Access Control

To modify token requirements or roles:

1. Update settings in `scripts/src/grape/create-token-gate.ts`
2. Adjust membership verification in `bot/src/middleware/membership.ts`

## Security Considerations

- Use hardware wallets for multisig signers when possible
- Regularly audit permissions and access controls
- Start with small amounts in treasury and gradually increase as confidence grows
- Set up monitoring and alerts for treasury movements
- Consider implementing time-locks for large transactions