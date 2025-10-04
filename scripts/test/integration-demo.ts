#!/usr/bin/env node
/**
 * Integration Demo Script
 * 
 * This script demonstrates the end-to-end flow of the DAO:
 * 1. Deposit funds into the DAO
 * 2. Create a governance proposal for a trade
 * 3. Vote on the proposal
 * 4. Prepare the Jupiter swap instruction
 * 5. Execute the trade through multisig
 * 6. Withdraw funds
 * 
 * This is a demonstration script showing the workflow.
 * In a real deployment, these steps would be executed by different users
 * over time through the Telegram bot or CLI tools.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Token addresses for testing
const TOKENS = {
  devnet: {
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    SOL: 'So11111111111111111111111111111111111111112',
  },
  mainnet: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SOL: 'So11111111111111111111111111111111111111112',
  }
};

interface TestConfig {
  network: 'devnet' | 'mainnet';
  rpcUrl: string;
  programId: string;
  multisigAddress?: string;
  realmAddress?: string;
}

function validateConfig(): TestConfig {
  const network = (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet';
  const rpcUrl = process.env.SOLANA_RPC_URL || `https://api.${network}.solana.com`;
  const programId = process.env.PROGRAM_ID;
  
  if (!programId) {
    console.error('❌ Error: PROGRAM_ID environment variable is required');
    process.exit(1);
  }

  return {
    network,
    rpcUrl,
    programId,
    multisigAddress: process.env.SQUADS_MULTISIG_ADDRESS,
    realmAddress: process.env.GOVERNANCE_REALM_ADDRESS,
  };
}

async function testConnection(config: TestConfig): Promise<Connection> {
  console.log('\n📡 Testing connection to Solana...');
  console.log(`   Network: ${config.network}`);
  console.log(`   RPC: ${config.rpcUrl}`);
  
  const connection = new Connection(config.rpcUrl, 'confirmed');
  
  try {
    const version = await connection.getVersion();
    console.log(`   ✅ Connected! Solana version: ${version['solana-core']}`);
    return connection;
  } catch (error) {
    console.error(`   ❌ Connection failed: ${error}`);
    process.exit(1);
  }
}

async function step1_deposit(config: TestConfig) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 STEP 1: Deposit USDC into DAO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n💡 In a real deployment, users would deposit via:');
  console.log('   • Telegram bot: /deposit 100');
  console.log('   • SDK: await daoClient.deposit(100000000)');
  console.log('   • CLI: npm run deposit -- --amount 100000000');
  
  console.log('\n📝 This would:');
  console.log('   1. Transfer USDC from user wallet to DAO vault');
  console.log('   2. Mint share tokens to user (1:1 ratio)');
  console.log('   3. Update DAO state (total_shares, deposit_count)');
  
  console.log('\n✅ Deposit simulation complete');
  return { depositAmount: 100, sharesReceived: 100 };
}

async function step2_createProposal(config: TestConfig) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 2: Create Governance Proposal');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const tradeDetails = {
    fromToken: 'USDC',
    toToken: 'SOL',
    amount: 50,
    slippage: 0.5,
  };
  
  console.log('\n💡 Creating proposal for trade:');
  console.log(`   From: ${tradeDetails.fromToken}`);
  console.log(`   To: ${tradeDetails.toToken}`);
  console.log(`   Amount: $${tradeDetails.amount}`);
  console.log(`   Slippage: ${tradeDetails.slippage}%`);
  
  console.log('\n📝 Via Telegram bot: /propose_trade SOL 50');
  console.log('   Or SDK: await governanceClient.createProposal(...)');
  
  console.log('\n✅ Proposal created');
  console.log(`   Proposal ID: 1`);
  console.log(`   Status: Active`);
  console.log(`   Voting period: 7200 slots (~1 hour on mainnet)`);
  
  return { proposalId: 1, tradeDetails };
}

async function step3_vote(proposalId: number) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗳️  STEP 3: Vote on Proposal');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log(`\n💡 DAO members vote on proposal #${proposalId}:`);
  console.log('   • User 1: /vote 1 yes (50 shares)');
  console.log('   • User 2: /vote 1 yes (30 shares)');
  console.log('   • User 3: /vote 1 no (20 shares)');
  
  console.log('\n📊 Vote results:');
  console.log('   Yes: 80 shares (80%)');
  console.log('   No:  20 shares (20%)');
  console.log('   ✅ Proposal passed (threshold: 60%)');
  
  return { passed: true, yesVotes: 80, noVotes: 20 };
}

async function step4_prepareTrade(config: TestConfig, tradeDetails: any) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  STEP 4: Prepare Jupiter Swap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const tokens = TOKENS[config.network];
  
  console.log('\n💡 Preparing swap instruction:');
  console.log(`   Input mint: ${tokens.USDC}`);
  console.log(`   Output mint: ${tokens.SOL}`);
  console.log(`   Amount: ${tradeDetails.amount * 1000000} (USDC decimals)`);
  
  console.log('\n📝 Running: npm run prepare-trade --');
  console.log(`   --input-mint ${tokens.USDC}`);
  console.log(`   --output-mint ${tokens.SOL}`);
  console.log(`   --amount ${tradeDetails.amount * 1000000}`);
  console.log(`   --slippage ${tradeDetails.slippage * 100}`);
  
  console.log('\n🔍 Fetching quote from Jupiter...');
  console.log('   ✅ Quote received');
  console.log(`   Expected output: ~${(tradeDetails.amount / 100).toFixed(4)} SOL`);
  console.log(`   Price impact: 0.02%`);
  console.log(`   Route: USDC → Orca → SOL (2 hops)`);
  
  console.log('\n✅ Trade prepared and saved to trade-prepared.json');
  
  return {
    swapInstructionSize: 1248,
    expectedOutput: tradeDetails.amount / 100,
  };
}

async function step5_executeViaMultisig(config: TestConfig, proposalId: number) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 STEP 5: Execute via Multisig');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n💡 Creating multisig transaction:');
  console.log(`   npm run create-trade-transaction --`);
  console.log(`   --trade-file ./trade-prepared.json`);
  console.log(`   --proposal-id ${proposalId}`);
  console.log(`   --proposal-address <PROPOSAL_ADDRESS>`);
  
  console.log('\n✅ Multisig transaction created');
  console.log('   Transaction PDA: 7xKu...9Abc');
  
  console.log('\n🔑 Multisig members approve:');
  console.log('   • Member 1: npm run approve-transaction (✅ approved)');
  console.log('   • Member 2: npm run approve-transaction (✅ approved)');
  console.log('   • Threshold met: 2/3');
  
  console.log('\n⚡ Executing transaction...');
  console.log('   npm run execute-transaction');
  console.log('   ✅ Transaction executed');
  console.log('   Signature: 5xYz...8Def');
  
  return { txSignature: '5xYz...8Def' };
}

async function step6_withdraw() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 STEP 6: Withdraw Funds');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n💡 User withdraws their share:');
  console.log('   /withdraw 50');
  console.log('   Or SDK: await daoClient.withdraw(50000000)');
  
  console.log('\n📝 This would:');
  console.log('   1. Burn 50 share tokens');
  console.log('   2. Calculate proportional vault assets');
  console.log('   3. Transfer assets back to user');
  
  console.log('\n✅ Withdrawal complete');
  console.log('   Shares burned: 50');
  console.log('   USDC returned: ~55 (including trade gains)');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Pump-bubble DAO Integration Demo              ║');
  console.log('║     End-to-End Trade Execution Flow               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  
  const config = validateConfig();
  const connection = await testConnection(config);
  
  console.log('\n📋 Configuration:');
  console.log(`   Program ID: ${config.programId}`);
  console.log(`   Multisig: ${config.multisigAddress || 'Not configured'}`);
  console.log(`   Realm: ${config.realmAddress || 'Not configured'}`);
  
  try {
    // Step 1: Deposit
    const { depositAmount, sharesReceived } = await step1_deposit(config);
    
    // Step 2: Create proposal
    const { proposalId, tradeDetails } = await step2_createProposal(config);
    
    // Step 3: Vote
    const voteResult = await step3_vote(proposalId);
    
    if (!voteResult.passed) {
      console.log('\n❌ Proposal did not pass. Demo ending.');
      return;
    }
    
    // Step 4: Prepare trade
    await step4_prepareTrade(config, tradeDetails);
    
    // Step 5: Execute via multisig
    const { txSignature } = await step5_executeViaMultisig(config, proposalId);
    
    // Step 6: Withdraw
    await step6_withdraw();
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║                   DEMO COMPLETE                    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    
    console.log('\n✅ All steps completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Deposited: $100 USDC');
    console.log('   • Received: 100 shares');
    console.log('   • Traded: $50 USDC → SOL');
    console.log('   • Withdrew: 50 shares → ~$55');
    console.log('   • Net gain: ~10% (from trade profit)');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Deploy to devnet: cd anchor && anchor deploy');
    console.log('   2. Create multisig: npm run create-multisig');
    console.log('   3. Create governance: npm run create-governance');
    console.log('   4. Start bot: cd bot && npm run dev');
    console.log('   5. Test with real wallets on devnet');
    
    console.log('\n📚 Documentation:');
    console.log('   • Setup Guide: docs/setup-guide.md');
    console.log('   • Trading Scripts: scripts/src/trading/README.md');
    console.log('   • Instruction Format: docs/instruction-format.md');
    console.log('   • Architecture: docs/architecture.md');
    
  } catch (error) {
    console.error('\n❌ Error during demo:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main };
