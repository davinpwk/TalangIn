import './utils/config'; // load .env first
import { createBot } from './bot/createBot';
import { logger } from './utils/logger';
import cron from 'node-cron';
import { sendWeeklySummaries } from './notifications/weeklySummary';

async function main() {
  logger.info('Starting TalangIn bot...');

  const bot = createBot();

  // Graceful shutdown
  process.once('SIGINT', () => {
    logger.info('SIGINT received, stopping bot...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger.info('SIGTERM received, stopping bot...');
    bot.stop('SIGTERM');
  });

  // Register bot commands (shows up in Telegram's "/" menu)
  await bot.telegram.setMyCommands([
    { command: 'start',    description: 'Welcome & help' },
    { command: 'help',     description: 'Show what I can do' },
    { command: 'settings', description: 'Change language' },
    { command: 'cancel',   description: 'Cancel current action' },
  ]);

  // Start polling
  await bot.launch();
  logger.info('Bot is running (long polling)');

  // Weekly summary — every Saturday at 19:00 AEDT (Australia/Sydney)
  cron.schedule('0 19 * * 6', () => {
    sendWeeklySummaries(bot).catch((err) =>
      logger.error({ err }, 'Weekly summary job failed')
    );
  }, { timezone: 'Australia/Sydney' });
  logger.info('Weekly summary cron registered (Sat 19:00 AEDT)');
}

main().catch((err) => {
  logger.error(err, 'Fatal error during startup');
  process.exit(1);
});
