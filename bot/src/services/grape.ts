import fetch from 'node-fetch';
import { PublicKey } from '@solana/web3.js';
import logger from '../utils/logger';

// Grape Protocol API settings
const GRAPE_API_URL = process.env.GRAPE_API_URL || 'https://api.grapeprotocol.com';
const GRAPE_ACCESS_TOKEN = process.env.GRAPE_ACCESS_TOKEN || '';
const GRAPE_COMMUNITY_ID = process.env.GRAPE_COMMUNITY_ID || '';
const GRAPE_ACCESS_TOKEN_MINT = process.env.GRAPE_ACCESS_TOKEN_MINT || '';

/**
 * Check if a wallet has access to a token-gated community
 * @param walletAddress - Address of the wallet to check
 * @param communityId - ID of the community
 * @returns Whether the wallet has access
 */
export async function checkAccess(walletAddress: string, communityId: string): Promise<boolean> {
  try {
    if (!GRAPE_ACCESS_TOKEN) {
      logger.warn('GRAPE_ACCESS_TOKEN not configured, assuming access granted');
      return true; // Default to granting access if not configured
    }

    // Validate wallet address
    try {
      new PublicKey(walletAddress);
    } catch (e) {
      logger.error('Invalid wallet address format', e);
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }
    
    // Check access via API
    const response = await fetch(
      `${GRAPE_API_URL}/access/${communityId}/${walletAddress}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GRAPE_ACCESS_TOKEN}`
        }
      }
    );
    
    if (!response.ok) {
      // If 403, it means no access
      if (response.status === 403) {
        return false;
      }
      
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.hasAccess === true;
  } catch (error) {
    logger.error('Error checking Grape Protocol access:', error);
    // Default to granting access in case of API errors
    // This is a graceful degradation to prevent locking users out
    return true;
  }
}

/**
 * Get token balance for a wallet
 * @param walletAddress - Address of the wallet to check
 * @param mintAddress - Token mint address
 * @returns Token balance
 */
export async function getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
  try {
    if (!GRAPE_ACCESS_TOKEN) {
      logger.warn('GRAPE_ACCESS_TOKEN not configured, assuming zero balance');
      return 0;
    }

    // Validate addresses
    try {
      new PublicKey(walletAddress);
      new PublicKey(mintAddress);
    } catch (e) {
      throw new Error(`Invalid address format`);
    }
    
    // Get token balance via API
    const response = await fetch(
      `${GRAPE_API_URL}/tokens/${walletAddress}/${mintAddress}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GRAPE_ACCESS_TOKEN}`
        }
      }
    );
    
    if (!response.ok) {
      // If 404, token not found
      if (response.status === 404) {
        return 0;
      }
      
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    return parseFloat(data.balance);
  } catch (error) {
    logger.error('Error getting token balance:', error);
    return 0; // Default to zero in case of errors
  }
}

/**
 * Verify if a wallet has the required tokens for DAO access
 * @param walletAddress - The Solana wallet address
 * @returns boolean indicating if the wallet has access
 */
export async function verifyTokenGate(walletAddress: string): Promise<boolean> {
  try {
    // Use the checkAccess method with the configured community ID
    return await checkAccess(walletAddress, GRAPE_COMMUNITY_ID);
  } catch (error) {
    logger.error(`Error verifying token gate for ${walletAddress}:`, error);
    // Graceful degradation - allow access if the verification fails
    return true;
  }
}

// Export the service as an object
export const grapeService = {
  checkAccess,
  getTokenBalance,
  verifyTokenGate
};