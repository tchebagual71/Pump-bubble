import { BotContext } from '../types/context';
import { isValidSolanaAddress } from '../utils/solana';
import logger from '../utils/logger';

export async function connectWalletCommand(ctx: BotContext): Promise<void> {
  // Check if the command has wallet address parameter
  const message = ctx.message?.text || '';
  const parts = message.split(' ');
  
  if (parts.length < 2) {
    await ctx.reply(
      `To connect your wallet, please provide your Solana wallet address:\n\n` +
      `/connect YOUR_WALLET_ADDRESS\n\n` +
      `Example: /connect 7nxTzJLt3Vvh3CaCqehpG7KwMvj2xn8h1QpLJrmMQAZ1`,
      {
        parse_mode: 'Markdown',
      }
    );
    return;
  }
  
  const walletAddress = parts[1];
  
  // Validate wallet address
  if (!isValidSolanaAddress(walletAddress)) {
    await ctx.reply(
      `⚠️ Invalid Solana wallet address. Please check and try again.`,
      {
        parse_mode: 'Markdown',
      }
    );
    return;
  }
  
  try {
    // Store wallet address in session
    ctx.session.walletAddress = walletAddress;
    ctx.session.isAuthenticated = true;
    
    logger.info(`User ${ctx.from?.id} connected wallet: ${walletAddress}`);
    
    await ctx.reply(
      `✅ Wallet connected successfully!\n\n` +
      `Address: \`${walletAddress}\`\n\n` +
      `You can now interact with the investment DAO. Try /deposit to add funds or /balance to check your current shares.`,
      {
        parse_mode: 'Markdown',
      }
    );
  } catch (error) {
    logger.error('Error connecting wallet:', error);
    await ctx.reply(
      `⚠️ Something went wrong while connecting your wallet. Please try again later.`,
      {
        parse_mode: 'Markdown',
      }
    );
  }
}