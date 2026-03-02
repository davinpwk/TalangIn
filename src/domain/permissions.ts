import { householdRepo } from '../db/repos/householdRepo';

export async function getActiveMembership(householdId: string, telegramId: number) {
  const member = await householdRepo.getMembership(householdId, telegramId);
  if (!member || member.status !== 'ACTIVE') return null;
  return member;
}

export async function isOwner(householdId: string, telegramId: number): Promise<boolean> {
  const member = await getActiveMembership(householdId, telegramId);
  return member?.role === 'OWNER';
}

export async function isActiveMember(
  householdId: string,
  telegramId: number
): Promise<boolean> {
  const member = await getActiveMembership(householdId, telegramId);
  return member !== null;
}
