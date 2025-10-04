import { Composer } from 'grammy';
import { BotContext } from '../types/context';
import logger from '../utils/logger';
import { assignTraderRole } from '../services/governance';

export const assignTraderCommand = new Composer<BotContext>();

assignTraderCommand.command('assign_trader', async (ctx) => {
  try {
    if (!ctx.session.isAuthenticated) {
      await ctx.reply('You need to connect your wallet first with /connect_wallet');
      return;
    }

    // Check if user is admin
    if (!ctx.session.isAdmin) {
      await ctx.reply('❌ Only DAO administrators can assign trader roles.');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1);
    
    if (!args || args.length < 1) {
      await ctx.reply('Usage: /assign_trader @username or /assign_trader walletAddress');
      return;
    }

    const userIdentifier = args[0];
    let walletAddress: string;
    
    // If the identifier starts with @, it's a username
    if (userIdentifier.startsWith('@')) {
      // TODO: Lookup wallet address from username in database
      await ctx.reply('Creating proposal to assign trader role...');
      await ctx.reply('⚠️ Username lookup not implemented. Please use wallet address directly.');
      return;
    } else {
      // Otherwise assume it's a wallet address
      walletAddress = userIdentifier;
    }
    
    await ctx.reply(`Creating governance proposal to assign trader role to ${walletAddress}...`);
    
    const result = await assignTraderRole(walletAddress, ctx.session.walletAddress!);
    
    if (result.success) {
      await ctx.reply(
        `✅ Trader role assignment proposal created!\n` +
        `Proposal ID: ${result.proposalId}\n\n` +
        `Members can now vote on this proposal using /vote ${result.proposalId} yes/no`
      );
    } else {
      await ctx.reply(`❌ Failed to create trader role proposal: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in assign_trader command:', error);
    await ctx.reply('An error occurred while creating the trader role proposal.');
  }
});

export default assignTraderCommand;