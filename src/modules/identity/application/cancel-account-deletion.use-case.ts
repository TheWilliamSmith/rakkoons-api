import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';

export interface CancelAccountDeletionInput {
  accountId: string;
}

interface CancelAccountDeletionDependencies {
  accounts: AccountRepository;
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
  }
}
