import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { executeProposal } from '../services/governance';

export const executeCommand = new Composer<BotContext>();

executeCommand.command('execute', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length < 1) {
      await ctx.reply('Usage: /execute <proposal_id>');
      return;
    }

    const proposalId = args[0];
    
    await ctx.reply('Preparing to execute the approved proposal...');
    
    // Check if user is authorized to execute
    if (!ctx.session.isTrader) {
      await ctx.reply('❌ Only authorized traders can execute proposals.');
      return;
    }
    
    const result = await executeProposal(proposalId, ctx.session.walletAddress!);
    
    if (result.success) {
      await ctx.reply(`✅ Proposal executed successfully! Transaction: ${result.txId}`);
      
      if (result.tradeDetails) {
        const { fromToken, toToken, amount, receivedAmount } = result.tradeDetails;
        await ctx.reply(
          `💱 Trade executed:\n` +
          `From: ${amount} ${fromToken}\n` +
          `To: ${receivedAmount} ${toToken}\n` +
          `Slippage: ${result.tradeDetails.slippage}%`
        );
      }
    } else {
      await ctx.reply(`❌ Failed to execute proposal: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in execute command:', error);
    await ctx.reply('An error occurred while executing the proposal.');
  }
});

export default executeCommand;