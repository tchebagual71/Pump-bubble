/**
 * Grape Protocol Integration Service
 * 
 * Helper service for token-gating access using Grape Protocol
 */

import fetch from 'node-fetch';
import { PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'grape-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export class GrapeProtocolService {
  private apiUrl: string;
  private accessToken: string;
  
  constructor(
    apiUrl = process.env.GRAPE_API_URL || 'https://api.grapeprotocol.com',
    accessToken = process.env.GRAPE_ACCESS_TOKEN
  ) {
    this.apiUrl = apiUrl;
    
    // Check if access token is provided
    if (!accessToken) {
      throw new Error('Grape access token is required. Set GRAPE_ACCESS_TOKEN in your environment variables.');
    }
    
    this.accessToken = accessToken;
  }
  
  /**
   * Create a new token-gated community
   * @param name - Name of the community
   * @param description - Description of the community
   * @param mintAddress - Token mint address for gating
   * @param minTokens - Minimum number of tokens required for access
   * @returns ID of the created community
   */
  async createCommunity(
    name: string,
    description: string,
    mintAddress: string,
    minTokens: number
  ): Promise<string> {
    try {
      // Validate mint address
      try {
        new PublicKey(mintAddress);
      } catch (e) {
        throw new Error(`Invalid mint address: ${mintAddress}`);
      }
      
      // Create community with token gate
      const response = await fetch(`${this.apiUrl}/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          name,
          description,
          tokenGate: {
            mint: mintAddress,
            minTokens: minTokens.toString(),
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || response.statusText}`);
      }
      
      const data = await response.json();
      logger.info(`Created Grape community: ${name} with ID: ${data.id}`);
      
      return data.id;
    } catch (error) {
      logger.error('Failed to create community:', error);
      throw new Error(`Failed to create community: ${error.message}`);
    }
  }
  
  /**
   * Verify if a wallet has access to a token-gated community
   * @param walletAddress - Address of the wallet to check
   * @param communityId - ID of the community
   * @returns Whether the wallet has access
   */
  async checkAccess(
    walletAddress: string,
    communityId: string
  ): Promise<boolean> {
    try {
      // Validate wallet address
      try {
        new PublicKey(walletAddress);
      } catch (e) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }
      
      // Check access
      const response = await fetch(
        `${this.apiUrl}/access/${communityId}/${walletAddress}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        // If 403, it means no access
        if (response.status === 403) {
          return false;
        }
        
        const error = await response.json();
        throw new Error(`API Error: ${error.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.hasAccess === true;
    } catch (error) {
      logger.error('Failed to check access:', error);
      throw new Error(`Failed to check access: ${error.message}`);
    }
  }
  
  /**
   * Get token balance for a wallet
   * @param walletAddress - Address of the wallet to check
   * @param mintAddress - Token mint address
   * @returns Token balance
   */
  async getTokenBalance(
    walletAddress: string,
    mintAddress: string
  ): Promise<number> {
    try {
      // Validate addresses
      try {
        new PublicKey(walletAddress);
        new PublicKey(mintAddress);
      } catch (e) {
        throw new Error(`Invalid address format`);
      }
      
      // Get token balance
      const response = await fetch(
        `${this.apiUrl}/tokens/${walletAddress}/${mintAddress}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || response.statusText}`);
      }
      
      const data = await response.json();
      return parseFloat(data.balance);
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }
  
  /**
   * Create an invitation link for a community
   * @param communityId - ID of the community
   * @param expireHours - Hours until expiry (default 24)
   * @returns Invitation link
   */
  async createInviteLink(
    communityId: string,
    expireHours: number = 24
  ): Promise<string> {
    try {
      // Create invite
      const response = await fetch(
        `${this.apiUrl}/communities/${communityId}/invites`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: JSON.stringify({
            expireHours
          })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || response.statusText}`);
      }
      
      const data = await response.json();
      logger.info(`Created invite link for community ${communityId}`);
      
      return data.inviteLink;
    } catch (error) {
      logger.error('Failed to create invite link:', error);
      throw new Error(`Failed to create invite link: ${error.message}`);
    }
  }
}

// Export singleton instance
export const grapeService = new GrapeProtocolService();