import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { depositFunds } from '../services/vault';

export const depositCommand = new Composer<BotContext>();

depositCommand.command('deposit', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length < 1) {
      await ctx.reply('Usage: /deposit <amount>');
      return;
    }

    const amount = parseFloat(args[0]);
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('Please provide a valid positive amount to deposit.');
      return;
    }
    
    await ctx.reply(`Processing deposit of ${amount} USDC...`);
    
    const result = await depositFunds(amount, ctx.session.walletAddress!);
    
    if (result.success) {
      await ctx.reply(
        `✅ Deposit successful!\n` +
        `Amount: ${result.amount} USDC\n` +
        `Shares minted: ${result.shares}\n` +
        `Transaction ID: ${result.txId}`
      );
    } else {
      await ctx.reply(`❌ Deposit failed: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in deposit command:', error);
    await ctx.reply('An error occurred while processing your deposit.');
  }
});

export default depositCommand;