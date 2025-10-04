import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { withdrawFunds } from '../services/vault';

export const withdrawCommand = new Composer<BotContext>();

withdrawCommand.command('withdraw', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length < 1) {
      await ctx.reply('Usage: /withdraw <amount>');
      return;
    }

    const amount = parseFloat(args[0]);
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('Please provide a valid positive amount to withdraw.');
      return;
    }
    
    await ctx.reply(`Processing withdrawal of ${amount} USDC...`);
    
    const result = await withdrawFunds(amount, ctx.session.walletAddress!);
    
    if (result.success) {
      await ctx.reply(
        `✅ Withdrawal request submitted!\n` +
        `Transaction ID: ${result.txId}\n` +
        `This will require approval from the multisig signers.`
      );
    } else {
      await ctx.reply(`❌ Withdrawal request failed: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in withdraw command:', error);
    await ctx.reply('An error occurred while processing your withdrawal.');
  }
});

export default withdrawCommand;