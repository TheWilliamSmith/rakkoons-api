import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { UnitOfWork } from '../domain/ports/unit-of-work';

export interface PurgeDueAccountsOutput {
  purgedCount: number;
}

interface PurgeDueAccountsDependencies {
  accounts: AccountRepository;
  unitOfWork: UnitOfWork;
  clock: Clock;
}

export class PurgeDueAccountsUseCase {
  constructor(private readonly dependencies: PurgeDueAccountsDependencies) {}

  async execute(): Promise<PurgeDueAccountsOutput> {
    const due = await this.dependencies.accounts.listScheduledForDeletionBefore(
      this.dependencies.clock.now(),
    );

    for (const account of due) {
      await this.dependencies.unitOfWork.run(async () => {
        await this.dependencies.accounts.remove(account.id);
      });
    }

    return { purgedCount: due.length };
  }
}
