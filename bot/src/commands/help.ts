import { BotContext } from '../types/context';

export async function helpCommand(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `📚 *Available Commands*\n\n` +
    `/start - Get started with the investment DAO\n` +
    `/help - Show this help message\n` +
    `/connect - Connect your Solana wallet\n` +
    `/deposit - Deposit USDC into the DAO\n` +
    `/balance - Check your share balance\n` +
    `/propose - Propose a new trade\n` +
    `/execute - Execute an approved trade\n` +
    `/governance - View and vote on proposals\n\n` +
    `Need more help? Join our community: t.me/pumpbubblesupport`,
    {
      parse_mode: 'Markdown',
    }
  );
}