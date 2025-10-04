#!/usr/bin/env node
/**
 * Create Trade Transaction Script
 * 
 * This script takes a prepared trade JSON (from prepare-trade.ts) and creates
 * a multisig transaction that can be approved and executed by multisig members.
 * 
 * Usage:
 *   npm run create-trade-transaction -- \
 *     --trade-file <TRADE_JSON_FILE> \
 *     --proposal-id <PROPOSAL_ID> \
 *     --proposal-address <PROPOSAL_ADDRESS>
 */

import { Command } from 'commander';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface PreparedTrade {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
  swapTransactionBase64: string;
  estimatedOutput: string;
  priceImpact: string;
}

async function createTradeTransaction(
  tradeFile: string,
  proposalId: string,
  proposalAddress: string
) {
  // Load prepared trade
  const tradePath = path.resolve(tradeFile);
  if (!fs.existsSync(tradePath)) {
    console.error(`Error: Trade file not found: ${tradePath}`);
    process.exit(1);
  }

  const trade: PreparedTrade = JSON.parse(fs.readFileSync(tradePath, 'utf-8'));

  console.log('Creating multisig transaction for trade...');
  console.log(`  Proposal ID: ${proposalId}`);
  console.log(`  Proposal Address: ${proposalAddress}`);
  console.log(`  Input: ${trade.inputMint}`);
  console.log(`  Output: ${trade.outputMint}`);
  console.log(`  Amount: ${trade.amount}`);
  console.log(`  Expected output: ${trade.estimatedOutput}`);
  console.log(`  Price impact: ${trade.priceImpact}%`);

  // Validate environment
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const programId = process.env.PROGRAM_ID;
  const multisigAddress = process.env.SQUADS_MULTISIG_ADDRESS;

  if (!rpcUrl || !programId || !multisigAddress) {
    console.error('Error: Missing required environment variables:');
    if (!rpcUrl) console.error('  - SOLANA_RPC_URL');
    if (!programId) console.error('  - PROGRAM_ID');
    if (!multisigAddress) console.error('  - SQUADS_MULTISIG_ADDRESS');
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('\n📝 Transaction would be created with the following details:');
  console.log(`   Program: ${programId}`);
  console.log(`   Multisig: ${multisigAddress}`);
  console.log(`   Swap data size: ${trade.swapTransactionBase64.length} bytes`);

  // In a real implementation, this would:
  // 1. Create an instruction to call the Anchor program's execute_trade
  // 2. Pass the swap transaction data as an argument
  // 3. Create a Squads multisig transaction with that instruction
  // 4. Return the transaction address for approval

  console.log('\n⚠️  NOTE: This is a demonstration script.');
  console.log('    In production, this would create an actual multisig transaction');
  console.log('    that calls the DAO program\'s execute_trade instruction.');
  
  console.log('\n✅ Transaction prepared (simulation)');
  console.log('\nNext steps:');
  console.log('  1. Have multisig members approve the transaction:');
  console.log('     npm run approve-transaction -- --multisig <MULTISIG> --transaction <TX_ADDRESS>');
  console.log('  2. Execute the transaction once threshold is met:');
  console.log('     npm run execute-transaction -- --multisig <MULTISIG> --transaction <TX_ADDRESS>');
}

const program = new Command();

program
  .name('create-trade-transaction')
  .description('Create a multisig transaction from a prepared trade')
  .requiredOption('-t, --trade-file <file>', 'Path to prepared trade JSON file')
  .requiredOption('-p, --proposal-id <id>', 'Governance proposal ID')
  .requiredOption('-a, --proposal-address <address>', 'Governance proposal address')
  .action(async (options) => {
    try {
      await createTradeTransaction(
        options.tradeFile,
        options.proposalId,
        options.proposalAddress
      );
    } catch (error) {
      console.error('Error creating trade transaction:', error);
      process.exit(1);
    }
  });

program.parse();
