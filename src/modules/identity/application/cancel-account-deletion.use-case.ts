import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { dispatchNotice } from './notice-dispatch';

export interface CancelAccountDeletionInput {
  accountId: string;
}

interface CancelAccountDeletionDependencies {
  accounts: AccountRepository;
  messages: MessageSender;
  clock: Clock;
}

export class CancelAccountDeletionUseCase {
  constructor(
    private readonly dependencies: CancelAccountDeletionDependencies,
  ) {}

  async execute(input: CancelAccountDeletionInput): Promise<void> {
    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    account.cancelDeletion(this.dependencies.clock.now());
    await this.dependencies.accounts.save(account);

    dispatchNotice(
      this.dependencies.messages.sendAccountDeletionCancelled(account.email),
    );
  }
}
