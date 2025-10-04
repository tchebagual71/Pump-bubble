# Trading Scripts

CLI utilities for constructing and executing trades through the DAO multisig.

## Overview

These scripts help automate the process of:
1. Fetching Jupiter swap quotes
2. Encoding swap instructions
3. Creating multisig transactions for trade execution

## Scripts

### prepare-trade.ts

Fetches a Jupiter quote and prepares the swap instruction for multisig execution.

**Usage:**
```bash
npm run prepare-trade -- \
  --input-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --output-mint So11111111111111111111111111111111111111112 \
  --amount 1000000 \
  --slippage 50 \
  --multisig <YOUR_MULTISIG_ADDRESS> \
  --output ./trade-prepared.json
```

**Parameters:**
- `--input-mint, -i`: Input token mint address (e.g., USDC)
- `--output-mint, -o`: Output token mint address (e.g., SOL)
- `--amount, -a`: Amount in smallest units (e.g., 1000000 = 1 USDC with 6 decimals)
- `--slippage, -s`: Slippage tolerance in basis points (default: 50 = 0.5%)
- `--multisig, -m`: Multisig address (can also use SQUADS_MULTISIG_ADDRESS env var)
- `--output`: Output file path (default: ./trade-prepared.json)

**Output:**
Creates a JSON file with the prepared trade including:
- Quote details (input/output amounts, price impact)
- Encoded swap transaction
- Metadata for verification

### create-trade-transaction.ts

Takes a prepared trade and creates a multisig transaction.

**Usage:**
```bash
npm run create-trade-transaction -- \
  --trade-file ./trade-prepared.json \
  --proposal-id 1 \
  --proposal-address <GOVERNANCE_PROPOSAL_ADDRESS>
```

**Parameters:**
- `--trade-file, -t`: Path to prepared trade JSON (from prepare-trade.ts)
- `--proposal-id, -p`: ID of the approved governance proposal
- `--proposal-address, -a`: Address of the governance proposal

**Flow:**
1. Reads the prepared trade file
2. Validates the proposal is approved (via governance)
3. Creates a multisig transaction calling the DAO's execute_trade instruction
4. Returns transaction address for multisig members to approve

## Complete Workflow

### 1. Create a Governance Proposal

First, create a proposal through the Telegram bot or SDK:
```
/propose_trade USDC SOL 1000000
```

### 2. Vote on the Proposal

DAO members vote on the proposal:
```
/vote <proposal_id> yes
```

### 3. Prepare the Trade

Once approved, prepare the swap instruction:
```bash
npm run prepare-trade -- \
  -i EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -o So11111111111111111111111111111111111111112 \
  -a 1000000 \
  -s 50 \
  -m <MULTISIG_ADDRESS>
```

### 4. Create Multisig Transaction

Create the transaction for multisig approval:
```bash
npm run create-trade-transaction -- \
  -t ./trade-prepared.json \
  -p 1 \
  -a <PROPOSAL_ADDRESS>
```

### 5. Approve and Execute

Multisig members approve and execute:
```bash
# Each member approves
npm run approve-transaction -- \
  --multisig <MULTISIG_ADDRESS> \
  --transaction <TRANSACTION_ADDRESS>

# Once threshold met, execute
npm run execute-transaction -- \
  --multisig <MULTISIG_ADDRESS> \
  --transaction <TRANSACTION_ADDRESS>
```

## Environment Variables

Required environment variables (set in `.env`):
```
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<YOUR_ANCHOR_PROGRAM_ID>
SQUADS_MULTISIG_ADDRESS=<YOUR_MULTISIG_ADDRESS>
JUPITER_QUOTE_API=https://quote-api.jup.ag/v6
```

## Token Addresses

Common token mints for testing:

**Devnet:**
- USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- SOL (wrapped): `So11111111111111111111111111111111111111112`

**Mainnet:**
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- SOL (wrapped): `So11111111111111111111111111111111111111112`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## Error Handling

Common errors and solutions:

1. **"Failed to get Jupiter quote"**
   - Check token mint addresses are valid
   - Ensure there's liquidity for the pair
   - Try reducing the amount or increasing slippage

2. **"Multisig address is required"**
   - Provide `--multisig` flag or set `SQUADS_MULTISIG_ADDRESS` env var

3. **"Trade file not found"**
   - Check the path to the prepared trade JSON
   - Ensure you ran prepare-trade first

## Security Notes

- Always verify trade details before creating multisig transactions
- Check price impact and slippage settings
- Ensure the governance proposal is approved before execution
- Validate all public keys and amounts
- Test on devnet before mainnet deployment
