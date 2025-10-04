import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import logger from '../utils/logger';

// Configure Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

/**
 * Check the token balance for a specific wallet
 * @param walletAddress - The Solana wallet address
 * @param mintAddress - The token mint address to check
 * @returns The token balance as a number
 */
export async function getTokenBalance(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint,
    });
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    // Get balance from the first token account
    const tokenAccount = tokenAccounts.value[0];
    const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    
    return balance;
  } catch (error) {
    logger.error(`Error getting token balance for ${walletAddress}:`, error);
    throw new Error(`Failed to get token balance: ${error}`);
  }
}

/**
 * Convert a Solana signature to an explorer URL
 * @param signature - The transaction signature
 * @returns URL to the Solana explorer
 */
export function getExplorerUrl(signature: string): string {
  const cluster = process.env.SOLANA_NETWORK || 'mainnet-beta';
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Format SOL or token amount with appropriate decimals
 * @param amount - The raw amount 
 * @param decimals - Number of decimal places
 * @returns Formatted amount string
 */
export function formatAmount(amount: number, decimals = 6): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Validate if a string is a valid Solana public key
 * @param address - The address to validate
 * @returns boolean indicating if address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}