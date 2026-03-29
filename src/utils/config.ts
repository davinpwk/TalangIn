import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  dbPath: optional('DB_PATH', './data/db.sqlite'),
  nodeEnv: optional('NODE_ENV', 'development'),
  logLevel: optional('LOG_LEVEL', 'info'),
  rateLimitMax: parseInt(optional('RATE_LIMIT_MAX', '30'), 10),
  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
} as const;
