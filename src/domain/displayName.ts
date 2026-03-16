export function displayName(user: {
  nickname?: string | null;
  username?: string | null;
  first_name: string;
}): string {
  return user.nickname ?? (user.username ? `@${user.username}` : user.first_name);
}
