import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { voteOnProposal } from '../services/governance';

export const voteCommand = new Composer<BotContext>();

voteCommand.command('vote', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length < 2) {
      await ctx.reply('Usage: /vote <proposal_id> <yes/no>');
      return;
    }

    const proposalId = args[0];
    const voteDecision = args[1].toLowerCase();
    
    if (voteDecision !== 'yes' && voteDecision !== 'no') {
      await ctx.reply('Vote must be either "yes" or "no"');
      return;
    }

    const vote = voteDecision === 'yes';
    
    await ctx.reply('Processing your vote...');
    
    const result = await voteOnProposal(proposalId, vote, ctx.session.walletAddress!);
    
    if (result.success) {
      await ctx.reply(`✅ Your vote has been recorded! Transaction: ${result.txId}`);
    } else {
      await ctx.reply(`❌ Failed to record your vote: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in vote command:', error);
    await ctx.reply('An error occurred while processing your vote.');
  }
});

export default voteCommand;