import { Bot, NextFunction } from 'grammy';
import { BotContext } from '../types/context';
import { verifyTokenGate } from '../services/grape';
import logger from '../utils/logger';

export function setupMiddleware(bot: Bot<BotContext>) {
  // Authentication middleware
  bot.use(async (ctx: BotContext, next: NextFunction) => {
    // Skip authentication for commands that don't require it
    if (
      ctx.message?.text && 
      ['/start', '/help', '/connect', '/auth'].some(cmd => 
        ctx.message?.text?.startsWith(cmd)
      )
    ) {
      return next();
    }
    
    // Check if user is authenticated
    if (!ctx.session.isAuthenticated || !ctx.session.walletAddress) {
      logger.info(`Unauthenticated access attempt by user: ${ctx.from?.id}`);
      await ctx.reply(
        "⛔ You need to connect your wallet to interact with the DAO. Use /connect command."
      );
      return;
    }
    
    // Verify token-gate access
    try {
      const hasAccess = await verifyTokenGate(ctx.session.walletAddress);
      if (!hasAccess) {
        logger.info(`Access denied for wallet: ${ctx.session.walletAddress}`);
        await ctx.reply(
          "⛔ You don't have the required tokens to access this DAO. Please acquire the necessary tokens."
        );
        return;
      }
    } catch (error) {
      logger.error('Error verifying token-gate access:', error);
      await ctx.reply("⚠️ Error verifying your access. Please try again later.");
      return;
    }
    
    return next();
  });
}