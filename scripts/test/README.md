# Integration Tests

This directory contains integration tests and demo scripts for the Pump-bubble DAO.

## Integration Demo

The `integration-demo.ts` script demonstrates the complete end-to-end flow:

1. **Deposit** - User deposits USDC and receives DAO shares
2. **Propose** - Create a governance proposal for a trade
3. **Vote** - DAO members vote on the proposal
4. **Prepare** - Fetch Jupiter quote and encode swap instruction
5. **Execute** - Create and execute multisig transaction
6. **Withdraw** - User withdraws their share of the vault

### Running the Demo

```bash
# Install dependencies first
cd scripts
npm install

# Set required environment variables
export PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
export SOLANA_NETWORK=devnet
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Configure your deployed instances
export SQUADS_MULTISIG_ADDRESS=<your_multisig>
export GOVERNANCE_REALM_ADDRESS=<your_realm>

# Run the demo
npm run demo
```

### Expected Output

The demo will walk through each step with detailed explanations:

```
╔════════════════════════════════════════════════════╗
║     Pump-bubble DAO Integration Demo              ║
║     End-to-End Trade Execution Flow               ║
╚════════════════════════════════════════════════════╝

📡 Testing connection to Solana...
   Network: devnet
   RPC: https://api.devnet.solana.com
   ✅ Connected! Solana version: 1.18.x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 STEP 1: Deposit USDC into DAO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### What It Tests

The demo validates:
- ✅ Solana RPC connectivity
- ✅ Program ID configuration
- ✅ Deposit workflow
- ✅ Governance proposal creation
- ✅ Voting mechanism
- ✅ Jupiter integration (quote fetching)
- ✅ Multisig transaction creation
- ✅ Trade execution flow
- ✅ Withdrawal process

### Notes

- This is a **demonstration script** that shows the workflow
- It does **not** execute real on-chain transactions
- For real testing, deploy the program to devnet and use actual wallets
- See `docs/setup-guide.md` for deployment instructions

## Real Integration Testing

For actual on-chain integration testing:

### 1. Deploy to Devnet

```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
```

### 2. Setup Infrastructure

```bash
cd scripts

# Create multisig
npm run create-multisig -- -t 2 -m wallet1,wallet2,wallet3

# Create governance realm
npm run create-governance -- -n "Test DAO" -c <SHARE_TOKEN_MINT>
```

### 3. Test Deposit

```bash
cd bot
npm run dev

# In Telegram:
/connect_wallet YOUR_WALLET_ADDRESS
/deposit 10
```

### 4. Test Trade Flow

```bash
# Propose trade
/propose_trade SOL 5

# Vote on proposal
/vote 1 yes

# Prepare swap instruction
cd scripts
npm run prepare-trade -- \
  --input-mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --output-mint So11111111111111111111111111111111111111112 \
  --amount 5000000 \
  --slippage 50

# Create multisig transaction
npm run create-trade-transaction -- \
  --trade-file ./trade-prepared.json \
  --proposal-id 1 \
  --proposal-address <PROPOSAL_ADDRESS>

# Approve and execute
npm run approve-transaction -- --multisig <MULTISIG> --transaction <TX>
npm run execute-transaction -- --multisig <MULTISIG> --transaction <TX>
```

### 5. Test Withdrawal

```bash
# In Telegram:
/withdraw 5
```

## Continuous Integration

To add CI testing:

1. Create `.github/workflows/test.yml`
2. Set up Solana test validator
3. Deploy program to local validator
4. Run integration tests
5. Check for errors and validate state

Example workflow:
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - name: Install Solana
        run: sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
      - name: Start test validator
        run: solana-test-validator &
      - name: Build and test
        run: |
          cd anchor && anchor build && anchor test
          cd ../scripts && npm install && npm run demo
```

## Troubleshooting

### Connection Issues
- Verify RPC URL is accessible
- Check network (devnet/mainnet) matches your configuration
- Ensure no firewall blocking Solana RPC

### Program Not Found
- Verify PROGRAM_ID environment variable
- Check program is deployed to the correct network
- Run `solana program show <PROGRAM_ID>` to verify

### Multisig Errors
- Ensure SQUADS_MULTISIG_ADDRESS is set
- Verify multisig exists on-chain
- Check you have signing authority

## Next Steps

After validating the demo:

1. Deploy to devnet and test with real wallets
2. Add unit tests for individual components
3. Implement automated CI testing
4. Test on mainnet with small amounts
5. Monitor and iterate based on usage
