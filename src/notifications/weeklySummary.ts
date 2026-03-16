import { Telegraf } from 'telegraf';
import { userRepo } from '../db/repos/userRepo';
import { householdRepo } from '../db/repos/householdRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { itemRepo } from '../db/repos/itemRepo';
import { formatMoney, escapeMd } from '../domain/money';
import { displayName } from '../domain/displayName';
import { t, type Lang } from '../i18n';
import { logger } from '../utils/logger';

export async function sendWeeklySummaries(bot: Telegraf): Promise<void> {
  logger.info('Running weekly summary notifications...');

  const users = await userRepo.getAllWithLanguage();
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const lang = (user.language as Lang | null) ?? null;
      const households = await householdRepo.getActiveHouseholdsForUser(user.telegram_id);

      if (households.length === 0) {
        skipped++;
        continue;
      }

      const lines: string[] = [];

      for (const household of households) {
        const sectionLines: string[] = [];

        // ── Debts ────────────────────────────────────────────────────────────
        const debts = await debtRepo.getDebtsForUserInHousehold(household.id, user.telegram_id);
        const iOwe = debts.filter((d) => d.debtor_telegram_id === user.telegram_id);
        const owedToMe = debts.filter((d) => d.creditor_telegram_id === user.telegram_id);

        sectionLines.push(t(lang, 'weeklySummaryHeader', { householdName: escapeMd(household.name) }));

        if (iOwe.length === 0 && owedToMe.length === 0) {
          sectionLines.push(t(lang, 'weeklySummaryAllSettled'));
        } else {
          if (iOwe.length > 0) {
            sectionLines.push(t(lang, 'weeklySummaryYouOwe'));
            for (const d of iOwe) {
              const name = escapeMd(
                displayName({
                  nickname: null,
                  username: d.creditor_username ?? null,
                  first_name: d.creditor_first_name,
                })
              );
              sectionLines.push(`  • ${name}: *${formatMoney(d.amount_cents, household.currency_default)}*\n`);
            }
          }
          if (owedToMe.length > 0) {
            sectionLines.push(t(lang, 'weeklySummaryYouAreOwed'));
            for (const d of owedToMe) {
              const name = escapeMd(
                displayName({
                  nickname: null,
                  username: d.debtor_username ?? null,
                  first_name: d.debtor_first_name,
                })
              );
              sectionLines.push(`  • ${name}: *${formatMoney(d.amount_cents, household.currency_default)}*\n`);
            }
          }
        }

        // ── Item usage (last 7 days) ──────────────────────────────────────
        const items = await itemRepo.getCountsForHouseholdSince(household.id, weekAgo);
        const activeItems = items.filter((i) => i.counts.length > 0);

        sectionLines.push(t(lang, 'weeklySummaryItemHeader'));
        if (activeItems.length === 0) {
          sectionLines.push(t(lang, 'weeklySummaryNoItems'));
        } else {
          for (const item of activeItems) {
            const countParts = item.counts.map((c) => `${escapeMd(c.displayName)}: ${c.quantity}`).join(', ');
            sectionLines.push(`  • *${escapeMd(item.itemName)}* — ${countParts}\n`);
          }
        }

        lines.push(sectionLines.join(''));
      }

      const message = lines.join('\n') + '\n' + t(lang, 'weeklySummaryFooter');

      await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
      sent++;
    } catch (err) {
      logger.warn({ err, telegramId: user.telegram_id }, 'Failed to send weekly summary to user');
      skipped++;
    }
  }

  logger.info({ sent, skipped }, 'Weekly summary notifications complete');
}
