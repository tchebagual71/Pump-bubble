# Instruction Format Guide

This document describes the standard format for proposing and executing arbitrary Solana instructions through the DAO's governance and multisig system.

## Overview

The DAO supports executing any valid Solana instruction through its governance process. This allows community members to propose not just trades, but any on-chain action including:
- Token swaps via Jupiter
- NFT purchases
- Protocol interactions (lending, staking, etc.)
- Program upgrades
- Treasury management

## Standard Instruction Format

All instructions must follow this JSON format:

```json
{
  "programId": "PROGRAM_PUBLIC_KEY",
  "accounts": [
    {
      "pubkey": "ACCOUNT_PUBLIC_KEY",
      "isSigner": false,
      "isWritable": true
    }
  ],
  "data": "BASE64_ENCODED_INSTRUCTION_DATA"
}
```

### Fields

#### programId (required)
- **Type**: String (Base58 encoded public key)
- **Description**: The program ID to invoke
- **Example**: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` (Jupiter)

#### accounts (required)
- **Type**: Array of AccountMeta objects
- **Description**: All accounts required by the instruction
- Each account must specify:
  - `pubkey`: Account's public key (Base58 string)
  - `isSigner`: Whether this account must sign the transaction (boolean)
  - `isWritable`: Whether this account will be modified (boolean)

#### data (required)
- **Type**: String (Base64 encoded bytes)
- **Description**: The instruction data to pass to the program
- **How to obtain**: 
  - For Jupiter: Use the prepare-trade script
  - For custom instructions: Serialize according to program's IDL

## Example: Jupiter Swap

```json
{
  "programId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "accounts": [
    {
      "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "isSigner": false,
      "isWritable": false
    },
    {
      "pubkey": "YOUR_SOURCE_TOKEN_ACCOUNT",
      "isSigner": false,
      "isWritable": true
    },
    {
      "pubkey": "YOUR_DESTINATION_TOKEN_ACCOUNT",
      "isSigner": false,
      "isWritable": true
    }
  ],
  "data": "BASE64_ENCODED_SWAP_DATA"
}
```

## Creating Instructions

### Method 1: Using Trading Scripts (Recommended for Swaps)

For Jupiter swaps, use the provided automation:

```bash
# 1. Prepare the swap instruction
npm run prepare-trade -- \
  --input-mint <INPUT_MINT> \
  --output-mint <OUTPUT_MINT> \
  --amount <AMOUNT> \
  --slippage <SLIPPAGE_BPS>

# 2. This creates a JSON file with all required fields
cat trade-prepared.json
```

### Method 2: Using the SDK

```typescript
import { encodeJupiterSwap } from '@pump-bubble/sdk';
import { PublicKey } from '@solana/web3.js';

const swapData = await encodeJupiterSwap(
  'INPUT_MINT',
  'OUTPUT_MINT',
  1000000, // amount
  50,      // slippage in bps
  multisigPublicKey
);

const instruction = {
  programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  accounts: [...], // From Jupiter API
  data: swapData.toString('base64')
};
```

### Method 3: Manual Construction

For custom instructions:

```typescript
import { TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh'; // or your serialization method

// 1. Create the instruction data according to program's schema
const instructionData = serialize(schema, yourData);

// 2. Build the account metas
const accounts = [
  { pubkey: account1, isSigner: false, isWritable: true },
  { pubkey: account2, isSigner: true, isWritable: false },
];

// 3. Format as JSON
const instruction = {
  programId: programId.toBase58(),
  accounts: accounts.map(acc => ({
    pubkey: acc.pubkey.toBase58(),
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  })),
  data: Buffer.from(instructionData).toString('base64')
};
```

## Validation Rules

Before submitting an instruction, ensure:

1. **Program ID is valid**
   - Must be a valid Base58 Solana public key
   - Program must exist on the target network

2. **Accounts are correct**
   - All required accounts are included
   - Signer flags match transaction requirements
   - Writable flags match expected state changes

3. **Data is properly encoded**
   - Must be valid Base64
   - Must match program's expected instruction format
   - Size should be reasonable (< 1KB for most instructions)

4. **Security checks**
   - Verify destination addresses
   - Check amounts and limits
   - Validate slippage settings for swaps
   - Ensure no malicious accounts

## Governance Process

1. **Create Proposal**
   ```
   /propose_custom <INSTRUCTION_JSON>
   ```

2. **Community Review**
   - DAO members review the instruction
   - Verify safety and intent
   - Discuss in Telegram

3. **Vote**
   ```
   /vote <PROPOSAL_ID> yes
   ```

4. **Execute**
   Once approved and multisig threshold met:
   ```bash
   npm run create-trade-transaction -- \
     --trade-file instruction.json \
     --proposal-id <ID> \
     --proposal-address <ADDRESS>
   ```

## Common Instruction Types

### 1. Token Swap (Jupiter)
```json
{
  "type": "swap",
  "programId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "inputMint": "USDC_MINT",
  "outputMint": "SOL_MINT",
  "amount": "1000000",
  "slippageBps": 50
}
```

### 2. Token Transfer
```json
{
  "type": "transfer",
  "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "source": "SOURCE_ACCOUNT",
  "destination": "DEST_ACCOUNT",
  "amount": "1000000"
}
```

### 3. NFT Purchase
```json
{
  "type": "nft_purchase",
  "programId": "MARKETPLACE_PROGRAM_ID",
  "nftMint": "NFT_MINT",
  "price": "5000000",
  "marketplace": "magic-eden"
}
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Always verify instruction details** before voting
2. **Check all account addresses** match expected values
3. **Validate amounts** are within reasonable limits
4. **Test on devnet first** for new instruction types
5. **Use minimal privileges** (only mark accounts as writable/signer when necessary)
6. **Implement spending limits** through governance parameters
7. **Monitor execution** and verify results after execution

## Troubleshooting

### "Invalid instruction data"
- Check Base64 encoding is correct
- Verify data matches program's expected format
- Ensure all required fields are included

### "Account not found"
- Verify all account addresses exist on-chain
- Check you're on the correct network (devnet/mainnet)

### "Insufficient funds"
- Verify vault has enough balance
- Check token account balances
- Ensure correct decimals for amounts

### "Unauthorized signer"
- Verify multisig has authority over accounts
- Check PDA derivations are correct
- Ensure proper delegation is set up

## Resources

- [Solana Cookbook - Instructions](https://solanacookbook.com/core-concepts/transactions.html)
- [Jupiter API Documentation](https://station.jup.ag/docs/apis/swap-api)
- [SPL Governance Documentation](https://docs.realms.today/)
- [Squads Protocol Documentation](https://docs.squads.so/)
