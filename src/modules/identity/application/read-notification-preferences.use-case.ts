import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';

export interface ReadNotificationPreferencesInput {
  accountId: string;
}

export interface NotificationPreferencesOutput {
  product: boolean;
  security: boolean;
  reminders: boolean;
}

export class ReadNotificationPreferencesUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(
    input: ReadNotificationPreferencesInput,
  ): Promise<NotificationPreferencesOutput> {
    const account = await this.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    return {
      product: account.notifications.product,
      security: account.notifications.security,
      reminders: account.notifications.reminders,
    };
  }
}
