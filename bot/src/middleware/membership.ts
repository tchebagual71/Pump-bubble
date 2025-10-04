import { Context, MiddlewareFn } from 'telegraf';
import { message } from 'telegraf/filters';
import { PublicKey } from '@solana/web3.js';
import { grapeService } from '../services/grape';
import { userRepository } from '../services/database';
import logger from '../utils/logger';
import { BotContext } from '../types/context';

// Get Grape community ID from environment
const GRAPE_COMMUNITY_ID = process.env.GRAPE_COMMUNITY_ID || '';
const GRAPE_ACCESS_TOKEN_MINT = process.env.GRAPE_ACCESS_TOKEN_MINT || '';

if (!GRAPE_COMMUNITY_ID) {
  logger.warn('GRAPE_COMMUNITY_ID is not configured. Membership checks will be disabled.');
}

/**
 * Middleware to check if a user has the required tokens to access the DAO
 * Uses Grape Protocol to verify token holdings
 */
export const membershipMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  try {
    // Skip membership check if the configuration is missing
    if (!GRAPE_COMMUNITY_ID) {
      logger.warn('Skipping membership check: GRAPE_COMMUNITY_ID not configured');
      return next();
    }

    // Commands that should work without membership verification
    const publicCommands = ['/start', '/help', '/connectwallet'];
    
    // Skip membership check for public commands
    if (ctx.message && 'text' in ctx.message && publicCommands.includes(ctx.message.text.split(' ')[0])) {
      return next();
    }
    
    // Get user's wallet address
    const userId = ctx.from?.id;
    if (!userId) {
      logger.warn('No user ID found in context');
      return ctx.reply('Error: Unable to identify user');
    }
    
    // Check if the user has a connected wallet
    const user = await userRepository.findByTelegramId(userId.toString());
    if (!user || !user.wallet_address) {
      return ctx.reply('You need to connect a wallet first. Use /connectwallet to link your Solana wallet.');
    }

    // Validate wallet address
    let walletAddress: string;
    try {
      new PublicKey(user.wallet_address); // Just to validate the format
      walletAddress = user.wallet_address;
    } catch (e) {
      logger.error('Invalid wallet address format', e);
      return ctx.reply('Your connected wallet address is invalid. Please use /connectwallet to update it.');
    }
    
    // Check access via Grape Protocol
    try {
      logger.info(`Checking membership for wallet ${walletAddress}`);
      const hasAccess = await grapeService.checkAccess(walletAddress, GRAPE_COMMUNITY_ID);
      
      if (!hasAccess) {
        // Get more specific information about what's missing
        let tokenBalance = 0;
        if (GRAPE_ACCESS_TOKEN_MINT) {
          tokenBalance = await grapeService.getTokenBalance(walletAddress, GRAPE_ACCESS_TOKEN_MINT);
        }
        
        return ctx.reply(
          'You do not have the required tokens to access this DAO.\n\n' +
          `Your current balance: ${tokenBalance} tokens\n\n` +
          'Please acquire the required tokens and try again.'
        );
      }
      
      // User has access, proceed to the next middleware/handler
      return next();
    } catch (error) {
      // Log the error but allow access in case of API failures
      // This is a graceful degradation to prevent locking users out due to API issues
      logger.error('Error checking Grape Protocol access:', error);
      return next();
    }
  } catch (error) {
    logger.error('Error in membership middleware:', error);
    return next();
  }
};