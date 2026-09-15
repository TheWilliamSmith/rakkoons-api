import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationPurpose } from '../domain/verification/verification-purpose';

export interface CancelEmailChangeInput {
  accountId: string;
}

interface CancelEmailChangeDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  clock: Clock;
}

export class CancelEmailChangeUseCase {
  constructor(private readonly dependencies: CancelEmailChangeDependencies) {}

  async execute(input: CancelEmailChangeInput): Promise<void> {
    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    const cancelledAt = this.dependencies.clock.now();

    account.cancelEmailChange(cancelledAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.consumeActiveForAccount(
        account.id,
        VerificationPurpose.EmailChange,
        cancelledAt,
      );
      await this.dependencies.accounts.save(account);
    });
  }
}
