import { Account } from '@identity/domain/account/account';
import { AccountRepository } from '@identity/domain/ports/account-repository';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { Username } from '@identity/domain/value-objects/username';

export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  isUsernameAvailable(username: Username): Promise<boolean> {
    return Promise.resolve(
      ![...this.accounts.values()].some((account) =>
        account.username.equals(username),
      ),
    );
  }

  findByEmail(email: EmailAddress): Promise<Account | null> {
    return Promise.resolve(
      [...this.accounts.values()].find((account) =>
        account.email.equals(email),
      ) ?? null,
    );
  }

  findById(id: string): Promise<Account | null> {
    return Promise.resolve(this.accounts.get(id) ?? null);
  }

  add(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
    return Promise.resolve();
  }

  save(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
    return Promise.resolve();
  }

  listScheduledForDeletionBefore(instant: Date): Promise<Account[]> {
    return Promise.resolve(
      [...this.accounts.values()].filter((account) => {
        const scheduled = account.deletionScheduledAt;

        return scheduled !== null && scheduled.getTime() <= instant.getTime();
      }),
    );
  }

  remove(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
    return Promise.resolve();
  }

  count(): number {
    return this.accounts.size;
  }
}
