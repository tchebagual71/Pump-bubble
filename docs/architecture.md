# Pump-bubble Architecture

## System Architecture

This document describes the architecture of the Pump-bubble Telegram Investment DAO built for the Colosseum Solana Hackathon.

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│               │      │               │      │               │
│  Telegram     │◄────►│  Bot Server   │◄────►│  Solana RPC   │
│  (grammY)     │      │  (Node.js)    │      │  (Helius)     │
│               │      │               │      │               │
└───────────────┘      └───────┬───────┘      └───────────────┘
                              │
                     ┌────────┴───────┐
                     │                │
                     ▼                ▼
            ┌─────────────┐    ┌─────────────┐
            │             │    │             │
            │ PostgreSQL  │    │ File System │
            │ Database    │    │ (Keypairs)  │
            │             │    │             │
            └─────────────┘    └─────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
┌─────────────┐┌─────────────┐┌─────────────┐
│             ││             ││             │
│ Squads      ││ SPL         ││ Jupiter     │
│ Multisig    ││ Governance  ││ Aggregator  │
│             ││             ││             │
└─────────────┘└─────────────┘└─────────────┘
       │             │             │
       └─────────────┼─────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │                 │
            │  Solana         │
            │  Blockchain     │
            │                 │
            └─────────────────┘
```

## Component Overview

### 1. Telegram Bot (grammY)

The Telegram bot serves as the user interface for the DAO. It's built using the grammY framework in TypeScript and handles:
- Command parsing and routing
- User authentication and wallet connection
- Interactive menus and buttons
- Notifications for DAO events

### 2. Backend Server (Node.js)

The backend server handles:
- API endpoints for the bot
- Solana blockchain interactions via web3.js
- Encrypted storage of sensitive information
- Business logic and transaction preparation
- Database interactions

### 3. Database (PostgreSQL)

The PostgreSQL database stores:
- User information and wallet associations
- Proposal metadata and voting records
- Transaction history
- DAO configuration and parameters

### 4. Squads Multisig

The Squads multisig wallet:
- Holds the DAO treasury (primarily USDC)
- Requires multiple signatures for transactions
- Enforces governance decisions
- Provides an audit trail of all treasury movements

### 5. SPL Governance (Realms)

Realms provides:
- On-chain governance functionality
- Proposal creation and management
- Voting mechanisms for DAO decisions
- Execution of approved proposals

### 6. Grape Protocol

Grape Protocol provides:
- Token-gated access control
- Membership verification
- Role-based permissions

### 7. Jupiter Aggregator

Jupiter is used for:
- Trade execution across multiple Solana DEXs
- Best price discovery
- Slippage protection
- Transaction building for trades

### 8. Anchor Programs

Custom Anchor programs handle:
- Deposit and withdrawal logic
- Share token management
- DAO configuration

## Data Flow

1. **User Registration**:
   - User joins Telegram group
   - Bot verifies token ownership via Grape Protocol
   - User connects Solana wallet using wallet adapter
   - Bot stores user-wallet association securely

2. **Fund Deposit**:
   - User initiates deposit via `/deposit` command
   - Bot prepares transaction to transfer USDC to vault
   - User signs transaction with their wallet
   - Backend records deposit and updates share balance

3. **Trade Proposal**:
   - Trader submits proposal via `/propose_trade` command
   - Bot creates governance proposal in Realms
   - Bot notifies group about new proposal
   - Users vote via `/vote` command

4. **Trade Execution**:
   - After proposal approval, execution is triggered
   - Bot fetches best route via Jupiter API
   - Transaction is submitted to Squads multisig
   - Signers approve transaction
   - Trade executes and results are posted to group

5. **Withdrawal**:
   - User requests withdrawal via `/withdraw` command
   - Bot calculates proportional share of treasury
   - Multisig transaction is prepared
   - After approval, funds are transferred to user

## Security Considerations

1. **Private Key Management**:
   - No private keys stored in plain text
   - Encryption for all sensitive data
   - Hardware wallet integration for multisig signers

2. **Transaction Verification**:
   - Multi-level approval process
   - Slippage and amount limits
   - Time-locks for large transactions

3. **Access Control**:
   - Role-based permissions
   - Token-gated access
   - Regular permission audits

4. **Monitoring**:
   - Automated alerts for unusual activity
   - Transaction monitoring
   - Regular treasury audits

## Future Improvements

1. **Cross-Chain Integration**:
   - Bridge to other blockchains via Wormhole or LayerZero
   - Support for assets on multiple chains

2. **Advanced Trading Features**:
   - Limit orders
   - Dollar-cost averaging
   - Automated trading strategies

3. **Enhanced Governance**:
   - Delegation
   - Conviction voting
   - Reputation systems