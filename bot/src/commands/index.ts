import { Bot, Keyboard } from 'grammy';
import { BotContext } from '../types/context';
import { startCommand } from './start';
import { helpCommand } from './help';
import { connectWalletCommand } from './connectWallet';
import { depositCommand } from './deposit';
import { balanceCommand } from './balance';
import { proposeTradeCommand } from './proposeTrade';
import { executeTradeCommand } from './executeTrade';
import { governanceCommand } from './governance';

export function configureCommands(bot: Bot<BotContext>) {
  // Basic commands
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('connect', connectWalletCommand);
  
  // DAO functionality
  bot.command('deposit', depositCommand);
  bot.command('balance', balanceCommand);
  bot.command('propose', proposeTradeCommand);
  bot.command('execute', executeTradeCommand);
  bot.command('governance', governanceCommand);
  
  // Register bot commands with Telegram
  bot.api.setMyCommands([
    { command: 'start', description: 'Start interacting with the Investment DAO' },
    { command: 'help', description: 'Show available commands and help' },
    { command: 'connect', description: 'Connect your Solana wallet' },
    { command: 'deposit', description: 'Deposit USDC into the DAO' },
    { command: 'balance', description: 'Check your DAO shares and USDC balance' },
    { command: 'propose', description: 'Propose a new trade' },
    { command: 'execute', description: 'Execute an approved trade' },
    { command: 'governance', description: 'View governance proposals and vote' }
  ]);
}