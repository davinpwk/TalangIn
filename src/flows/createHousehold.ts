import { Context } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { t, getLang } from '../i18n';
import { escapeMd } from '../domain/money';
import type { CreateHouseholdIntent } from '../llm/schemas';

export async function handle(ctx: Context, intent: CreateHouseholdIntent): Promise<void> {
  const lang = getLang(ctx);
  const currency = (intent.currency ?? 'AUD').toUpperCase();

  const { id: _id, joinCode } = await householdRepo.create({
    name: intent.household_name,
    ownerTelegramId: ctx.from!.id,
    currency,
  });

  await ctx.reply(
    t(lang, 'householdCreated', {
      name: escapeMd(intent.household_name),
      currency,
      joinCode,
    }),
    { parse_mode: 'Markdown' }
  );
}
