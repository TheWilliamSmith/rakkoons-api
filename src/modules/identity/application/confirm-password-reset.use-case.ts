import { Account } from '../domain/account/account';
import { PasswordResetCodeRejectedError } from '../domain/errors/password-reset-code-rejected.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { loadPasswordResetJourney } from './password-reset-journey';

export interface ConfirmPasswordResetInput {
  journeyId: string | null;
  password: string;
}

interface ConfirmPasswordResetDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  sessions: SessionRepository;
  unitOfWork: UnitOfWork;
  passwordHasher: PasswordHasher;
  clock: Clock;
}

export class ConfirmPasswordResetUseCase {
  constructor(
    private readonly dependencies: ConfirmPasswordResetDependencies,
  ) {}

  async execute(input: ConfirmPasswordResetInput): Promise<void> {
    const journey = await loadPasswordResetJourney(
      this.dependencies.journeys,
      input.journeyId,
    );

    const password = PlainPassword.create(input.password);
    const changedAt = this.dependencies.clock.now();

    journey.consumeVerified(changedAt);

    const account = await this.loadAccount(journey.accountId);
    account.changePassword(
      await this.dependencies.passwordHasher.hash(password),
      changedAt,
    );

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.accounts.save(account);
      await this.dependencies.journeys.save(journey);
      await this.dependencies.journeys.consumeActiveForAccount(
        account.id,
        VerificationPurpose.PasswordReset,
        changedAt,
      );
      await this.dependencies.sessions.revokeAllForAccount(
        account.id,
        changedAt,
      );
    });
  }

  private async loadAccount(accountId: string | null): Promise<Account> {
    const account =
      accountId === null
        ? null
        : await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new PasswordResetCodeRejectedError();
    }

    return account;
  }
}
