# TalangIn — Household Debt Manager Bot

A production-ready Telegram bot for tracking shared expenses and debts within household groups. Users interact via natural language — no slash commands required.

---

## Features

- Create households and invite members via join codes
- Log expenses with flexible splits (even, custom, percentage)
- Log repayments with proof/receipt attachments
- View per-household balance summaries
- Owner-only member management (kick)
- LLM-powered natural language understanding
- Proof enforcement: photos/documents required for expense and payment entries
- Graceful notification handling (pending notifications for unreachable users)

---

## Local Development

### Prerequisites

- Node.js 20+
- An OpenAI API key (or compatible provider)
- Your existing Telegram bot token (from BotFather)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env and set TELEGRAM_BOT_TOKEN, OPENAI_API_KEY

# 3. Run in dev mode (ts-node, auto-creates DB on first run)
npm run dev
```

> **Staging bot (optional):** Create a second bot with BotFather, set `TELEGRAM_BOT_TOKEN=<staging-token>` and `DB_PATH=./data/dev.sqlite` in a separate `.env.dev` file. Run with: `env $(cat .env.dev | xargs) npm run dev`

---

## Set Bot Commands (optional, cosmetic only)

Send this to [@BotFather](https://t.me/BotFather) after selecting your bot with `/mybots`:

```
start - Start the bot / show welcome message
help - Show usage guide
```

The bot works primarily via free-form text, so commands are just convenience shortcuts.

---

## VPS Deploy — Option A: Docker Compose (recommended)

### 1. Install Docker on your Hostinger VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

### 2. Clone / upload your project

```bash
# From your local machine:
scp -r /path/to/TalangIn user@your-vps-ip:/opt/talangin

# Or use git:
git clone https://github.com/yourname/talangin-bot /opt/talangin
```

### 3. Configure environment

```bash
cd /opt/talangin
cp .env.example .env
nano .env   # Set TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
```

### 4. Build and start

```bash
docker compose up -d --build
```

### 5. Verify

```bash
docker compose ps
docker compose logs -f talangin-bot
```

---

## VPS Deploy — Option B: systemd (no Docker)

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Upload project and install deps

```bash
cd /opt/talangin
npm ci
npm run build
```

### 3. Configure environment

```bash
cp .env.example .env
nano .env
```

### 4. Create systemd service

```bash
sudo nano /etc/systemd/system/talangin.service
```

Paste:

```ini
[Unit]
Description=TalangIn Telegram Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/talangin
EnvironmentFile=/opt/talangin/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 5. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable talangin
sudo systemctl start talangin
sudo systemctl status talangin
```

---

## How to Update & Restart

### Docker

```bash
cd /opt/talangin
git pull                        # or re-upload changed files
docker compose up -d --build    # rebuild and restart
```

### systemd

```bash
cd /opt/talangin
git pull
npm run build
sudo systemctl restart talangin
```

---

## Running Tests

```bash
npm test
```

Tests cover:
- Split rounding (even, custom amounts, percentages)
- Zod schema validation for all LLM intents

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Polling vs Webhook | Long polling | Simpler on VPS, no SSL cert required |
| Database | SQLite + Kysely | Zero-config, sufficient for household scale |
| Money storage | Integer cents | Eliminates float rounding errors |
| Overpayment | Cap at outstanding | Avoids negative debt entries |
| Proof storage | Telegram `file_id` only | No disk usage; Telegram hosts the file |
| LLM fallback | `UNKNOWN` intent | Graceful degradation, no crashes |
| Confirmation | Single-use token | Prevents double-submit on button re-click |

---

## Troubleshooting

### "Conflict: terminated by other getUpdates request"
Two instances of the bot are polling simultaneously.
- **Docker:** `docker compose ps` and ensure only one container is running.
- **systemd:** `sudo systemctl status talangin` — check for duplicate processes.
- Stop all instances, wait 30 seconds, then restart one.

### "Bot can't message a user"
The target user hasn't started the bot yet.
- Tell them to send `/start` to the bot.
- The bot stores the notification and will deliver it automatically when they do.

### SQLite permission errors (systemd)
The service user (`www-data`) must own the data directory:
```bash
sudo chown -R www-data:www-data /opt/talangin/data
```

### LLM classification is wrong / UNKNOWN intent
1. Try rephrasing your message more explicitly.
2. Upgrade `OPENAI_MODEL` to `gpt-4o` in `.env` for better accuracy.
3. Check `LOG_LEVEL=debug` logs to see raw LLM output.

### Rate limit hit
Default: 30 messages per 60 seconds per user. Adjust in `.env`:
```
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

---

## Webhook + Nginx (Optional Appendix)

> Use this only if you need webhook mode (e.g., faster response, lower latency).

### 1. Install Nginx and certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Get a domain/subdomain pointing to your VPS IP

### 3. Nginx config

```nginx
# /etc/nginx/sites-available/talangin
server {
    server_name bot.yourdomain.com;

    location /webhook {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/talangin /etc/nginx/sites-enabled/
sudo certbot --nginx -d bot.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Update src/index.ts for webhook mode

```typescript
// Replace bot.launch() with:
const WEBHOOK_URL = 'https://bot.yourdomain.com/webhook';
await bot.launch({
  webhook: {
    domain: WEBHOOK_URL,
    port: 3000,
    path: '/webhook',
  },
});
```

### 5. Make sure to delete the polling endpoint first

```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```
