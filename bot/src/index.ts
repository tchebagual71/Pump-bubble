import * as dotenv from 'dotenv';
import { Bot, session } from 'grammy';
import { run } from '@grammyjs/runner';
import { BotContext } from './types/context';
import { configureCommands } from './commands';
import { setupMiddleware } from './middleware/auth';
import { membershipMiddleware } from './middleware/membership';
import logger from './utils/logger';

dotenv.config();

// Initialize the bot
const bot = new Bot<BotContext>(process.env.BOT_TOKEN || '');

// Set up session middleware
bot.use(session({
  initial: () => ({
    isAuthenticated: false
  })
}));

// Set up authentication middleware
setupMiddleware(bot);

// Set up membership middleware (token-gated access)
bot.use(membershipMiddleware);

// Configure commands
configureCommands(bot);

// Handle errors
bot.catch((err) => {
  logger.error('Bot error:', err);
});

// Start the bot
async function startBot() {
  logger.info('Starting bot...');
  
  // If webhook environment is set, use webhooks, otherwise use long polling
  if (process.env.NODE_ENV === 'production') {
    const port = parseInt(process.env.PORT || '3000');
    logger.info(`Starting webhook server on port ${port}...`);
    
    // Use webhook in production
    const domain = process.env.WEBHOOK_DOMAIN;
    if (!domain) {
      throw new Error('WEBHOOK_DOMAIN is not set in production environment');
    }
    
    await bot.api.setWebhook(`${domain}/webhook`);
    
    // Start express server for webhooks here if needed
  } else {
    // Use long polling in development
    logger.info('Starting long polling...');
    const runner = run(bot);
    
    // Handle graceful shutdown
    const stopRunner = () => {
      runner.isRunning() && runner.stop();
      logger.info('Bot stopped gracefully');
      process.exit(0);
    };
    
    process.on('SIGINT', stopRunner);
    process.on('SIGTERM', stopRunner);
  }
}

startBot().catch((err) => {
  logger.error('Failed to start bot:', err);
  process.exit(1);
});

export default bot;