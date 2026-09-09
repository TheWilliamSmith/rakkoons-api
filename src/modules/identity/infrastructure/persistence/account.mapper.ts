import { Account } from '../../domain/account/account';
import { AccountStatus } from '../../domain/account/account-status';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { PasswordHash } from '../../domain/value-objects/password-hash';
import { Username } from '../../domain/value-objects/username';

export interface AccountRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
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
      status: STATUS_TO_RECORD[account.status],
      termsAcceptedAt: account.termsAcceptedAt,
      termsVersion: account.termsVersion,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
