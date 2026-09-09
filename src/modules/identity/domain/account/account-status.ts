export const AccountStatus = {
  Pending: 'pending',
  Active: 'active',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];
