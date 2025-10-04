import { BotContext } from '../types/context';

export async function startCommand(ctx: BotContext): Promise<void> {
  const username = ctx.from?.username || 'there';
  
  await ctx.reply(
    `👋 Hello @${username}! Welcome to Pump-bubble - your Solana-based Investment DAO.\n\n` +
    `This bot allows your group chat to become a multiplayer investment DAO on Solana.\n\n` +
    `🔹 Deposit USDC to receive DAO shares\n` +
    `🔹 Propose and vote on trades using Realms governance\n` +
    `🔹 Execute trades via Jupiter aggregator\n` +
    `🔹 Withdraw your share of profits\n\n` +
    `To get started, connect your Solana wallet using /connect`,
    {
      parse_mode: 'Markdown',
    }
  );
}