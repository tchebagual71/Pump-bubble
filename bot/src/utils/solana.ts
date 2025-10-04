import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { decode } from 'bs58';
import logger from './logger';

// Initialize Solana connection
let _connection: Connection | null = null;

/**
 * Get a Solana RPC connection
 */
export function getSolanaConnection(): Connection {
  if (!_connection) {
    const endpoint = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    _connection = new Connection(endpoint, 'confirmed');
  }
  
  return _connection;
}

// For backwards compatibility
const connection = getSolanaConnection();

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
    
    // Return existing code here
  } catch (error) {
    logger.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Load a keypair from private key string
 */
export function loadKeypairFromPrivateKey(privateKeyString: string): Keypair {
  try {
    const privateKey = decode(privateKeyString);
    return Keypair.fromSecretKey(privateKey);
  } catch (error) {
    logger.error('Error loading keypair:', error);
    throw new Error('Invalid private key format');
  }
}

/**
 * Validate a Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format a Solana address for display (truncate middle)
 */
export function formatSolanaAddress(address: string): string {
  if (!isValidSolanaAddress(address)) {
    return 'Invalid address';
  }
  
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get token metadata by mint address
 */
export async function getTokenMetadata(mintAddress: string) {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(mintAddress);
    
    // In production, this would fetch token metadata from the chain
    // For now, we'll return some hardcoded values for common tokens
    
    const knownTokens: { [key: string]: { symbol: string, name: string, decimals: number } } = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Wrapped SOL', decimals: 9 },
      '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium', decimals: 6 },
    };
    
    if (mintAddress in knownTokens) {
      return {
        success: true,
        ...knownTokens[mintAddress]
      };
    }
    
    return {
      success: false,
      error: 'Token metadata not found'
    };
  } catch (error) {
    logger.error('Error getting token metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
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