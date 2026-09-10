import { Account } from '../../domain/account/account';
import { AccountStatus } from '../../domain/account/account-status';
import { NotificationPreferences } from '../../domain/account/notification-preferences';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { PasswordHash } from '../../domain/value-objects/password-hash';
import { Username } from '../../domain/value-objects/username';

export interface AccountRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  pendingEmail: string | null;
  notifiesProduct: boolean;
  notifiesSecurity: boolean;
  notifiesReminders: boolean;
  deletionScheduledAt: Date | null;
  status: 'PENDING' | 'ACTIVE';
  termsAcceptedAt: Date;
  termsVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const STATUS_TO_DOMAIN: Record<AccountRecord['status'], AccountStatus> = {
  PENDING: AccountStatus.Pending,
  ACTIVE: AccountStatus.Active,
};

const STATUS_TO_RECORD: Record<AccountStatus, AccountRecord['status']> = {
  [AccountStatus.Pending]: 'PENDING',
  [AccountStatus.Active]: 'ACTIVE',
};

export const ACCOUNT_SELECTION = {
  id: true,
  username: true,
  email: true,
  passwordHash: true,
  pendingEmail: true,
  notifiesProduct: true,
  notifiesSecurity: true,
  notifiesReminders: true,
  deletionScheduledAt: true,
  status: true,
  termsAcceptedAt: true,
  termsVersion: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class AccountMapper {
  static toDomain(record: AccountRecord): Account {
    return Account.restore({
      id: record.id,
      username: Username.create(record.username),
      email: EmailAddress.create(record.email),
      passwordHash: PasswordHash.fromStoredValue(record.passwordHash),
      pendingEmail:
        record.pendingEmail === null
          ? null
          : EmailAddress.create(record.pendingEmail),
      notifications: NotificationPreferences.restore({
        product: record.notifiesProduct,
        security: record.notifiesSecurity,
        reminders: record.notifiesReminders,
      }),
      deletionScheduledAt: record.deletionScheduledAt,
      status: STATUS_TO_DOMAIN[record.status],
      termsAcceptedAt: record.termsAcceptedAt,
      termsVersion: record.termsVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(account: Account): AccountRecord {
    return {
      id: account.id,
      username: account.username.toString(),
      email: account.email.toString(),
      passwordHash: account.passwordHash.toString(),
      pendingEmail:
        account.pendingEmail === null ? null : account.pendingEmail.toString(),
      notifiesProduct: account.notifications.product,
      notifiesSecurity: account.notifications.security,
      notifiesReminders: account.notifications.reminders,
      deletionScheduledAt: account.deletionScheduledAt,
      status: STATUS_TO_RECORD[account.status],
      termsAcceptedAt: account.termsAcceptedAt,
      termsVersion: account.termsVersion,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
