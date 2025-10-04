# Solana DAO Telegram Bot Usage Guide

This guide explains how to interact with the Pump-bubble Investment DAO through the Telegram bot interface.

## Getting Started

### Basic Commands

- `/start` - Introduction to the DAO bot
- `/help` - Display available commands and help
- `/connect YOUR_WALLET_ADDRESS` - Connect your Solana wallet

## Joining the DAO

To join the DAO, you need:

1. The DAO Telegram group invite link
2. Required access tokens in your Solana wallet
3. Some SOL for transaction fees

### Connection Process

1. Join the Telegram group
2. Send `/connect YOUR_WALLET_ADDRESS` to the bot
3. The bot will verify your wallet has the required tokens
4. Once verified, you'll get access to DAO features

## Using the DAO

### Viewing Balances

```
/balance
```

This shows:
- Your USDC deposit balance
- Your DAO share tokens
- Your voting power

### Depositing Funds

```
/deposit AMOUNT
```

For example: `/deposit 100` to deposit 100 USDC.

This will:
1. Transfer USDC from your wallet to the DAO treasury
2. Mint share tokens to your wallet
3. Update your voting power in the DAO

### Proposing Trades

```
/propose
```

This starts a proposal wizard that guides you through:
1. Setting a title for the proposal
2. Adding a description
3. Specifying the token to buy
4. Setting the USDC amount to use

### Voting on Proposals

```
/governance
```

This shows all active proposals. You can:
1. View proposal details
2. Cast votes (yes/no)
3. See voting results

### Executing Trades

```
/execute PROPOSAL_ID
```

This executes an approved trade proposal. Only authorized members can execute trades.

## Advanced Features

### Checking Multisig Status

```
/multisig
```

Shows the status of the multisig wallet including:
- Treasury balance
- Pending transactions
- Transaction history

### Withdrawing Funds

```
/withdraw AMOUNT
```

Burns your share tokens and returns a proportional amount of USDC from the treasury.

## Troubleshooting

### Connection Issues

If you have trouble connecting your wallet:
1. Make sure you entered the correct wallet address
2. Verify you have the required access tokens
3. Try disconnecting and reconnecting

### Transaction Failures

If a deposit or trade execution fails:
1. Check your wallet has sufficient funds
2. Verify you have SOL for transaction fees
3. Try again or contact a DAO admin

## Getting Help

For additional help, contact the DAO administrators through the Telegram group.