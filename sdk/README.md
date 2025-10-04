# Pump-bubble DAO SDK

A unified TypeScript SDK for interacting with the Pump-bubble DAO on Solana.

## Features

This SDK provides a convenient way to interact with all components of the Pump-bubble DAO:

- **DAO Module**: Interact with the Anchor program for deposits, withdrawals, and trade execution
- **Multisig Module**: Manage Squads multisig operations for DAO treasury
- **Governance Module**: Interface with SPL Governance for proposal creation and voting

## Installation

```bash
npm install @pump-bubble/sdk
```

## Usage

### Basic Setup

```typescript
import { Connection } from '@solana/web3.js';
import { DaoClient, MultisigClient, GovernanceClient } from '@pump-bubble/sdk';

// Create Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Your wallet implementation
const wallet = {
  publicKey: new PublicKey('...'),
  signTransaction: async (tx) => { /* ... */ },
  signAllTransactions: async (txs) => { /* ... */ },
  sendTransaction: async (tx, conn) => { /* ... */ }
};

// DAO Program ID
const programId = new PublicKey('YOUR_PROGRAM_ID');
```

### DAO Operations

```typescript
// Create DAO client
const dao = new DaoClient(connection, wallet, programId);

// Deposit USDC
await dao.deposit(100); // 100 USDC

// Withdraw USDC
await dao.withdraw(50); // 50 USDC

// Execute a trade
await dao.executeTrade(
  proposalAddress, // Approved governance proposal
  usdcMint,        // Token to sell (USDC)
  solMint,         // Token to buy (SOL)
  100,             // Amount of USDC to sell
  0.9              // Minimum SOL to receive
);
```

### Multisig Operations

```typescript
// Create Multisig client
const multisig = new MultisigClient(connection, wallet);

// Create a new multisig
const multisigAddress = await multisig.createMultisig(
  createKey,  // Key to derive multisig address
  2,          // Threshold (number of approvals needed)
  members     // Array of member public keys
);

// Create a transaction for the multisig to execute
const txAddress = await multisig.createTransaction(
  multisigAddress, // Multisig address
  instructions     // Array of instructions to execute
);

// Approve a transaction
await multisig.approveTransaction(multisigAddress, txAddress);

// Execute a transaction after enough approvals
await multisig.executeTransaction(multisigAddress, txAddress);

// Get all transactions for a multisig
const transactions = await multisig.getTransactions(multisigAddress);
```

### Governance Operations

```typescript
// Create Governance client
const governance = new GovernanceClient(connection, wallet);

// Create a new DAO (Realm)
const realmAddress = await governance.createDao(
  'My Investment DAO',      // Name of the DAO
  communityMintAddress,     // Community token mint
  councilMintAddress,       // Council token mint (optional)
  100000                    // Min tokens to create governance
);

// Create a proposal
const proposalAddress = await governance.createProposal(
  realmAddress,           // Address of the DAO (Realm)
  governingTokenMint,     // Token mint used for voting
  'Buy 10 SOL',           // Name of the proposal
  'Let\'s buy SOL...',    // Description of the proposal
  instructions            // Instructions to execute if approved
);

// Vote on a proposal
await governance.castVote(
  realmAddress,           // Address of the DAO (Realm)
  proposalAddress,        // Address of the proposal
  governingTokenMint,     // Token mint used for voting
  'yes'                   // Vote choice ('yes' or 'no')
);

// Execute a proposal
await governance.executeProposal(proposalAddress);

// Get all proposals for a governance DAO
const proposals = await governance.getProposals(realmAddress);
```

## Development

### Building the SDK

```bash
npm install
npm run build
```

### Running Tests

```bash
npm test
```

## License

MIT