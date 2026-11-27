import type { User } from './domain';

export function userLabel(user: User): string {
  return `${user.displayName} (${user.id})`;
}
