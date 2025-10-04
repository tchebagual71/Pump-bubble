#!/usr/bin/env node
/**
 * Prepare Trade Script
 * 
 * This script fetches a Jupiter quote and encodes the swap instruction
 * for use in a multisig transaction. The output JSON can be passed to
 * the create-trade-transaction script.
 * 
 * Usage:
 *   npm run prepare-trade -- \
 *     --input-mint <INPUT_MINT> \
 *     --output-mint <OUTPUT_MINT> \
 *     --amount <AMOUNT> \
 *     --slippage <SLIPPAGE_BPS> \
 *     --output <OUTPUT_FILE>
 */

import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const JUPITER_QUOTE_API = process.env.JUPITER_QUOTE_API || 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = process.env.JUPITER_SWAP_API || 'https://quote-api.jup.ag/v6/swap';

interface PreparedTrade {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
  quote: any;
  swapTransactionBase64: string;
  estimatedOutput: string;
  priceImpact: string;
  timestamp: string;
}

async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number
) {
  const response = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
    params: {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      onlyDirectRoutes: false,
    }
  });
  return response.data;
}

async function getSwapTransaction(quote: any, userPublicKey: string) {
  const response = await axios.post(JUPITER_SWAP_API, {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  });
  return response.data.swapTransaction;
}

async function prepareTrade(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number,
  multisigAddress: string,
  outputFile: string
) {
  console.log('Fetching Jupiter quote...');
  console.log(`  Input: ${inputMint}`);
  console.log(`  Output: ${outputMint}`);
  console.log(`  Amount: ${amount}`);
  console.log(`  Slippage: ${slippageBps} bps (${slippageBps / 100}%)`);

  try {
    // Validate input mint
    new PublicKey(inputMint);
    new PublicKey(outputMint);
    new PublicKey(multisigAddress);
  } catch (error) {
    console.error('Error: Invalid public key format');
    process.exit(1);
  }

  // Get quote from Jupiter
  const quote = await getQuote(inputMint, outputMint, amount, slippageBps);
  
  console.log('\nQuote received:');
  console.log(`  Expected output: ${quote.outAmount}`);
  console.log(`  Price impact: ${quote.priceImpactPct}%`);
  console.log(`  Route: ${quote.routePlan.length} steps`);

  // Get swap transaction
  console.log('\nFetching swap transaction...');
  const swapTransactionBase64 = await getSwapTransaction(quote, multisigAddress);

  // Prepare output
  const preparedTrade: PreparedTrade = {
    inputMint,
    outputMint,
    amount,
    slippageBps,
    quote,
    swapTransactionBase64,
    estimatedOutput: quote.outAmount,
    priceImpact: quote.priceImpactPct,
    timestamp: new Date().toISOString(),
  };

  // Write to file
  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(preparedTrade, null, 2));
  
  console.log(`\n✅ Trade prepared successfully!`);
  console.log(`   Output saved to: ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review the trade details in ${outputFile}`);
  console.log(`  2. Create a multisig transaction using:`);
  console.log(`     npm run create-trade-transaction -- --trade-file ${outputFile}`);
}

const program = new Command();

program
  .name('prepare-trade')
  .description('Prepare a Jupiter swap for multisig execution')
  .requiredOption('-i, --input-mint <address>', 'Input token mint address')
  .requiredOption('-o, --output-mint <address>', 'Output token mint address')
  .requiredOption('-a, --amount <amount>', 'Amount in smallest units (e.g., lamports)')
  .option('-s, --slippage <bps>', 'Slippage tolerance in basis points', '50')
  .option('-m, --multisig <address>', 'Multisig address (defaults to env var)', process.env.SQUADS_MULTISIG_ADDRESS)
  .option('--output <file>', 'Output file path', './trade-prepared.json')
  .action(async (options) => {
    try {
      if (!options.multisig) {
        console.error('Error: Multisig address is required. Provide via --multisig or SQUADS_MULTISIG_ADDRESS env var.');
        process.exit(1);
      }

      await prepareTrade(
        options.inputMint,
        options.outputMint,
        options.amount,
        parseInt(options.slippage),
        options.multisig,
        options.output
      );
    } catch (error) {
      console.error('Error preparing trade:', error);
      process.exit(1);
    }
  });

program.parse();
