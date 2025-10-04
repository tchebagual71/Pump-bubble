/**
 * Jupiter Integration Module
 * 
 * Provides functions to interact with Jupiter aggregator for token swaps.
 * Includes quote fetching and swap instruction encoding for multisig transactions.
 */

import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import axios from 'axios';

// Jupiter API endpoints
const JUPITER_QUOTE_API = process.env.JUPITER_QUOTE_API || 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = process.env.JUPITER_SWAP_API || 'https://quote-api.jup.ag/v6/swap';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export interface JupiterSwapInstructions {
  setupInstructions: TransactionInstruction[];
  swapInstruction: TransactionInstruction;
  cleanupInstruction?: TransactionInstruction;
}

/**
 * Get a quote from Jupiter for a token swap
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address
 * @param amount - Amount in smallest units (e.g., lamports)
 * @param slippageBps - Slippage tolerance in basis points (default: 50 = 0.5%)
 * @returns Jupiter quote response
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number | string,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  try {
    const response = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false,
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(`Failed to get Jupiter quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get swap instructions from Jupiter
 * @param quote - Jupiter quote response
 * @param userPublicKey - User's public key
 * @param wrapUnwrapSOL - Whether to wrap/unwrap SOL (default: true)
 * @returns Swap transaction as base64 encoded string
 */
export async function getJupiterSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: PublicKey,
  wrapUnwrapSOL: boolean = true
): Promise<string> {
  try {
    const response = await axios.post(JUPITER_SWAP_API, {
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: wrapUnwrapSOL,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    });

    return response.data.swapTransaction;
  } catch (error) {
    throw new Error(`Failed to get Jupiter swap transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encode swap instruction data for use in Anchor program
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address
 * @param amount - Amount in smallest units
 * @param slippageBps - Slippage tolerance in basis points
 * @param userPublicKey - User's public key (usually the multisig)
 * @returns Base64 encoded swap transaction data
 */
export async function encodeJupiterSwap(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  userPublicKey: PublicKey
): Promise<Buffer> {
  // Get quote from Jupiter
  const quote = await getJupiterQuote(inputMint, outputMint, amount, slippageBps);
  
  // Get swap transaction
  const swapTransactionBase64 = await getJupiterSwapTransaction(quote, userPublicKey);
  
  // Return as buffer for use in Anchor instruction
  return Buffer.from(swapTransactionBase64, 'base64');
}

/**
 * Get Jupiter quote with price information
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address  
 * @param amount - Amount in smallest units
 * @param slippageBps - Slippage tolerance in basis points
 * @returns Quote with formatted price information
 */
export async function getJupiterQuoteWithPrice(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<{
  quote: JupiterQuote;
  inAmount: string;
  outAmount: string;
  priceImpact: string;
  estimatedPrice: number;
}> {
  const quote = await getJupiterQuote(inputMint, outputMint, amount, slippageBps);
  
  const inAmount = quote.inAmount;
  const outAmount = quote.outAmount;
  const estimatedPrice = Number(outAmount) / Number(inAmount);
  
  return {
    quote,
    inAmount,
    outAmount,
    priceImpact: quote.priceImpactPct,
    estimatedPrice,
  };
}

export default {
  getJupiterQuote,
  getJupiterSwapTransaction,
  encodeJupiterSwap,
  getJupiterQuoteWithPrice,
};
