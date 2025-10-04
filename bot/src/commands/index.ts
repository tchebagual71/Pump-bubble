import { Bot, Keyboard } from 'grammy';
import { BotContext } from '../types/context';
import { startCommand } from './start';
import { helpCommand } from './help';
import { connectWalletCommand } from './connectWallet';
import { depositCommand } from './deposit';
import { balanceCommand } from './balance';
import { proposeTradeCommand } from './proposeTrade';
import governanceCommand from './governance';
import voteCommand from './vote';
import executeCommand from './execute';
import assignTraderCommand from './assignTrader';
import withdrawCommand from './withdraw';

export function configureCommands(bot: Bot<BotContext>) {
  // Basic commands
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('connect', connectWalletCommand);
  
  // DAO functionality
  bot.command('deposit', depositCommand);
  bot.command('balance', balanceCommand);
  bot.command('governance', governanceCommand);
  bot.command('vote', voteCommand);
  bot.command('execute', executeCommand);
  bot.command('assign_trader', assignTraderCommand);
  bot.command('withdraw', withdrawCommand);
  bot.command('propose', proposeTradeCommand);
  
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