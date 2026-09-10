import { NotificationPreferencesPatch } from '../domain/account/notification-preferences';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';

export interface UpdateNotificationPreferencesInput {
  accountId: string;
  preferences: NotificationPreferencesPatch;
}

interface UpdateNotificationPreferencesDependencies {
  accounts: AccountRepository;
  clock: Clock;
}

export class UpdateNotificationPreferencesUseCase {
  constructor(
    private readonly dependencies: UpdateNotificationPreferencesDependencies,
  ) {}

  async execute(input: UpdateNotificationPreferencesInput): Promise<void> {
    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    account.changeNotifications(
      input.preferences,
      this.dependencies.clock.now(),
    );
    await this.dependencies.accounts.save(account);
  }
}
