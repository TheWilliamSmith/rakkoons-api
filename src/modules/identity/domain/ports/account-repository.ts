import { Account } from '../account/account';
import { EmailAddress } from '../value-objects/email-address';
import { Username } from '../value-objects/username';

export interface AccountRepository {
  isUsernameAvailable(username: Username): Promise<boolean>;
  findByEmail(email: EmailAddress): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  add(account: Account): Promise<void>;
  save(account: Account): Promise<void>;
  listScheduledForDeletionBefore(instant: Date): Promise<Account[]>;
  remove(accountId: string): Promise<void>;
}
