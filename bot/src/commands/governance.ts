import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { getProposals } from '../services/governance';

export const governanceCommand = new Composer<BotContext>();

governanceCommand.command('governance', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    const proposals = await getProposals();
    
    if (!proposals || proposals.length === 0) {
      await ctx.reply('No active proposals found.');
      return;
    }

    let message = 'Active Proposals:\n\n';
    
    for (const proposal of proposals) {
      message += `📋 ID: ${proposal.id}\n`;
      message += `Title: ${proposal.title}\n`;
      message += `Description: ${proposal.description}\n`;
      message += `Status: ${proposal.state}\n`;
      message += `Votes: Yes (${proposal.yesVotes}), No (${proposal.noVotes})\n`;
      message += `Ends: ${new Date(proposal.endTime).toLocaleString()}\n\n`;
    }

    message += 'To vote on a proposal, use:\n/vote <proposal_id> <yes/no>';
    
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error in governance command:', error);
    await ctx.reply('An error occurred while fetching governance proposals.');
  }
});

export default governanceCommand;