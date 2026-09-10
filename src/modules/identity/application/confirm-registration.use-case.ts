import { DomainError } from '../../../shared/domain/domain-error';
import { VerificationJourneyNotFoundError } from '../domain/errors/verification-journey-not-found.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { dispatchNotice } from './notice-dispatch';

export interface ConfirmRegistrationInput {
  journeyId: string | null;
  code: string;
}

interface ConfirmRegistrationDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  secretHasher: SecretHasher;
  messages: MessageSender;
  clock: Clock;
}

export class ConfirmRegistrationUseCase {
  constructor(private readonly dependencies: ConfirmRegistrationDependencies) {}

  async execute(input: ConfirmRegistrationInput): Promise<void> {
    if (input.journeyId === null) {
      throw new VerificationJourneyNotFoundError();
    }

    const code = VerificationCode.create(input.code);
    const journey = await this.dependencies.journeys.findById(input.journeyId);

    if (journey === null || journey.purpose !== VerificationPurpose.SignUp) {
      throw new VerificationJourneyNotFoundError();
    }

    const submittedAt = this.dependencies.clock.now();
    const rejection = await this.submit(journey, code, submittedAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.save(journey);

      if (rejection === null) {
        await this.activate(journey.accountId, submittedAt);
      }
    });

    if (rejection !== null) {
      throw rejection;
    }

    await this.announce(journey.accountId);
  }

  private async announce(accountId: string | null): Promise<void> {
    if (accountId === null) {
      return;
    }

    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      return;
    }

    dispatchNotice(
      this.dependencies.messages.sendRegistrationConfirmed(
        account.email,
        account.username,
      ),
    );
  }

  private async submit(
    journey: VerificationJourney,
    code: VerificationCode,
    submittedAt: Date,
  ): Promise<DomainError | null> {
    try {
      await journey.submitCode(
        code,
        this.dependencies.secretHasher,
        submittedAt,
      );
      return null;
    } catch (rejection) {
      if (rejection instanceof DomainError) {
        return rejection;
      }
      throw rejection;
    }
  }

  private async activate(
    accountId: string | null,
    activatedAt: Date,
  ): Promise<void> {
    if (accountId === null) {
      return;
    }

    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new VerificationJourneyNotFoundError();
    }

    account.activate(activatedAt);
    await this.dependencies.accounts.save(account);
  }
}
