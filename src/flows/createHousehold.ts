import { Context } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import type { CreateHouseholdIntent } from '../llm/schemas';

export async function handle(ctx: Context, intent: CreateHouseholdIntent): Promise<void> {
  const telegramId = ctx.from!.id;
  const currency = (intent.currency ?? 'AUD').toUpperCase();

  const { id: _id, joinCode } = await householdRepo.create({
    name: intent.household_name,
    ownerTelegramId: telegramId,
    currency,
  });

  await ctx.reply(
    `🏠 *Household created!*\n\n` +
      `Name: *${escMd(intent.household_name)}*\n` +
      `Currency: *${currency}*\n\n` +
      `Share this join code with your household members:\n` +
      `\`${joinCode}\`\n\n` +
      `They can join by sending: \`join ${joinCode}\``,
    { parse_mode: 'Markdown' }
  );
}

function escMd(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
