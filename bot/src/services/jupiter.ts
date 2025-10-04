import axios from 'axios';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import logger from '../utils/logger';

// Jupiter API endpoints
const JUPITER_QUOTE_API = process.env.JUPITER_QUOTE_API || 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = process.env.JUPITER_SWAP_API || 'https://jup.ag/api/v6/swap';

// Default slippage percentage
const DEFAULT_SLIPPAGE = 0.5;

/**
 * Get quote for a token swap
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = DEFAULT_SLIPPAGE * 100
) {
  try {
    const response = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps,
        onlyDirectRoutes: false,
      }
    });

    return {
      success: true,
      data: response.data,
      outAmount: response.data.outAmount,
      price: response.data.price
    };
  } catch (error) {
    logger.error('Error getting Jupiter quote:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Execute a swap transaction using Jupiter
 */
export async function executeSwap(
  connection: Connection,
  wallet: any, // Should be a proper wallet adapter
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = DEFAULT_SLIPPAGE * 100
) {
  try {
    // 1. Get quote from Jupiter
    const quoteResponse = await getQuote(inputMint, outputMint, amount, slippageBps);
    
    if (!quoteResponse.success) {
      throw new Error(`Failed to get quote: ${quoteResponse.error}`);
    }

    // 2. Get swap instructions from Jupiter
    const { data: quoteData } = quoteResponse;
    
    const swapResponse = await axios.post(`${JUPITER_SWAP_API}`, {
      quoteResponse: quoteData,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true
    });

    // 3. Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
    const transaction = Transaction.from(swapTransactionBuf);
    
    // 4. Execute the transaction
    const txid = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet]
    );

    return {
      success: true,
      txId: txid,
      inputAmount: amount,
      outputAmount: quoteResponse.outAmount,
      price: quoteResponse.price
    };
  } catch (error) {
    logger.error('Error executing Jupiter swap:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get token prices in USDC
 */
export async function getTokenPrice(tokenMint: string) {
  try {
    // Using Jupiter to get price in USDC
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Solana USDC mint
    
    const response = await axios.get(`${JUPITER_QUOTE_API}/price`, {
      params: {
        ids: tokenMint,
        vsToken: USDC_MINT
      }
    });

    if (response.data && response.data.data && response.data.data[tokenMint]) {
      return {
        success: true,
        price: response.data.data[tokenMint].price
      };
    }

    return {
      success: false,
      error: 'Price not found'
    };
  } catch (error) {
    logger.error('Error getting token price:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}