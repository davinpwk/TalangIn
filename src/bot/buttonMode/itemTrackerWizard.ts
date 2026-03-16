import { Context } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { itemRepo } from '../../db/repos/itemRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { escapeMd } from '../../domain/money';
import { t, getLang } from '../../i18n';
import type { BmItemPayload } from '../../types';

export async function showMenu(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const household = await householdRepo.getById(householdId);
  if (!household) return;

  const membership = await householdRepo.getMembership(householdId, telegramId);
  const isOwner = membership?.role === 'OWNER';

  const buttons: Array<Array<{ text: string; callback_data: string }>> = [
    [
      { text: t(lang, 'viewCounts'), callback_data: `bm:item_manage:view:_` },
      { text: t(lang, 'logUsageBtn'), callback_data: `bm:item_manage:log:_` },
    ],
  ];

  if (isOwner) {
    buttons.push([{ text: t(lang, 'manageItems'), callback_data: `bm:item_manage:manage:_` }]);
  }

  await ctx.reply(t(lang, 'itemTrackerMenu') + `\n_(Household: ${escapeMd(household.name)})_`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function showCounts(ctx: Context, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const counts = await itemRepo.getCountsForHousehold(householdId);

  if (counts.length === 0 || counts.every((c) => c.counts.length === 0)) {
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'noCounts'), { parse_mode: 'Markdown' });
    return;
  }

  let text = '📦 *Item Counts*\n\n';
  for (const item of counts) {
    if (item.counts.length === 0) continue;
    text += `*${escapeMd(item.itemName)}*\n`;
    for (const c of item.counts) {
      text += `  • ${escapeMd(c.displayName)}: ${c.quantity}\n`;
    }
    text += '\n';
  }

  await ctx.answerCbQuery();
  await ctx.reply(text.trim(), { parse_mode: 'Markdown' });
}

export async function showLogUsage(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const items = await itemRepo.getItemsForHousehold(householdId);

  if (items.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'noItems'), { parse_mode: 'Markdown' });
    return;
  }

  const payload: BmItemPayload = { householdId, action: 'log' };
  const action = await pendingActionRepo.create(telegramId, 'BM_ITEM_QUANTITY', payload);

  const buttons = items.map((item) => [
    { text: item.name, callback_data: `bm:item:${action.id}:${item.id}` },
  ]);

  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'itemPick'), { reply_markup: { inline_keyboard: buttons } });
}

export async function onItemSelect(ctx: Context, itemId: string, pendingId: string): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const items = await itemRepo.getItemsForHousehold((JSON.parse(action.payload_json) as BmItemPayload).householdId);
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    await ctx.answerCbQuery('Item not found.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmItemPayload;
  payload.itemId = itemId;
  payload.itemName = item.name;
  await pendingActionRepo.updatePayload(action.id, payload);

  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'quantityPrompt'));
}

export async function onQuantity(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const quantity = parseInt(text.trim(), 10);
  if (isNaN(quantity) || quantity <= 0) {
    await ctx.reply('⚠️ Please enter a positive whole number.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmItemPayload;
  await itemRepo.logUsage(payload.itemId!, ctx.from!.id, quantity);
  await pendingActionRepo.markUsed(action.id);
  await ctx.reply(t(lang, 'usageRecorded', { quantity: String(quantity), item: escapeMd(payload.itemName!) }), { parse_mode: 'Markdown' });
}

export async function showManageMenu(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const membership = await householdRepo.getMembership(householdId, telegramId);
  if (membership?.role !== 'OWNER') {
    await ctx.answerCbQuery(t(lang, 'ownerOnlyAction'));
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'manageItems'), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Item', callback_data: `bm:item_manage:add:_` }],
        [{ text: '🗑 Remove Item', callback_data: `bm:item_manage:remove:_` }],
        [{ text: '🔄 Reset Counts', callback_data: `bm:item_manage:reset:_` }],
      ],
    },
  });
}

export async function startAddItem(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const membership = await householdRepo.getMembership(householdId, telegramId);
  if (membership?.role !== 'OWNER') {
    await ctx.answerCbQuery(t(lang, 'ownerOnlyAction'));
    return;
  }

  const payload: BmItemPayload = { householdId, action: 'add' };
  await pendingActionRepo.create(telegramId, 'BM_ITEM_ADD_NAME', payload);
  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'addItemPrompt'));
}

export async function onAddItemName(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const payload = JSON.parse(action.payload_json) as BmItemPayload;
  const name = text.trim();
  if (!name) {
    await ctx.reply(t(lang, 'addItemPrompt'));
    return;
  }
  await itemRepo.addItem(payload.householdId, name, ctx.from!.id);
  await pendingActionRepo.markUsed(action.id);
  await ctx.reply(t(lang, 'itemAdded', { name: escapeMd(name) }), { parse_mode: 'Markdown' });
}

export async function showRemoveItem(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const membership = await householdRepo.getMembership(householdId, telegramId);
  if (membership?.role !== 'OWNER') {
    await ctx.answerCbQuery(t(lang, 'ownerOnlyAction'));
    return;
  }

  const items = await itemRepo.getItemsForHousehold(householdId);
  if (items.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'noItems'), { parse_mode: 'Markdown' });
    return;
  }

  const payload: BmItemPayload = { householdId, action: 'remove' };
  const action = await pendingActionRepo.create(telegramId, 'BM_ITEM_QUANTITY', payload);

  const buttons = items.map((item) => [
    { text: item.name, callback_data: `bm:item:${action.id}:${item.id}` },
  ]);

  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'removeItemPick'), { reply_markup: { inline_keyboard: buttons } });
}

export async function onRemoveItem(ctx: Context, itemId: string, pendingId: string): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }
  const payload = JSON.parse(action.payload_json) as BmItemPayload;
  const items = await itemRepo.getItemsForHousehold(payload.householdId);
  const item = items.find((i) => i.id === itemId);

  await itemRepo.deactivateItem(itemId);
  await pendingActionRepo.markUsed(action.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'itemRemoved', { name: escapeMd(item?.name ?? itemId) }), { parse_mode: 'Markdown' });
}

export async function showResetItem(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const membership = await householdRepo.getMembership(householdId, telegramId);
  if (membership?.role !== 'OWNER') {
    await ctx.answerCbQuery(t(lang, 'ownerOnlyAction'));
    return;
  }

  const items = await itemRepo.getItemsForHousehold(householdId);
  if (items.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'noItems'), { parse_mode: 'Markdown' });
    return;
  }

  const payload: BmItemPayload = { householdId, action: 'reset' };
  const action = await pendingActionRepo.create(telegramId, 'BM_ITEM_QUANTITY', payload);

  const buttons = items.map((item) => [
    { text: item.name, callback_data: `bm:item:${action.id}:${item.id}` },
  ]);

  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'resetPick'), { reply_markup: { inline_keyboard: buttons } });
}

export async function onResetItem(ctx: Context, itemId: string, pendingId: string): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }
  const payload = JSON.parse(action.payload_json) as BmItemPayload;
  const items = await itemRepo.getItemsForHousehold(payload.householdId);
  const item = items.find((i) => i.id === itemId);

  await itemRepo.resetItemCounts(itemId);
  await pendingActionRepo.markUsed(action.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'resetConfirmed', { name: escapeMd(item?.name ?? itemId) }), { parse_mode: 'Markdown' });
}
