import { DomainError } from '../../../shared/domain/domain-error';
import { Account } from '../domain/account/account';
import { SignInCodeRejectedError } from '../domain/errors/sign-in-code-rejected.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { OpenedSession, SessionOpener } from './session-opener';

export interface VerifySignInCodeInput {
  journeyId: string | null;
  code: string;
}

export type VerifySignInCodeOutput = OpenedSession;

interface VerifySignInCodeDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  sessionOpener: SessionOpener;
  secretHasher: SecretHasher;
  clock: Clock;
}

export class VerifySignInCodeUseCase {
  constructor(private readonly dependencies: VerifySignInCodeDependencies) {}

  async execute(input: VerifySignInCodeInput): Promise<VerifySignInCodeOutput> {
    const code = this.parseCode(input.code);
    const journey = await this.loadJourney(input.journeyId);
    const submittedAt = this.dependencies.clock.now();
    const rejection = await this.submit(journey, code, submittedAt);

    if (rejection !== null) {
      await this.dependencies.journeys.save(journey);
      throw rejection;
    }

    const account = await this.loadAccount(journey.accountId);
    account.confirmEmailPossession(submittedAt);

    return this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.save(journey);
      await this.dependencies.accounts.save(account);

      return this.dependencies.sessionOpener.openFor(account);
    });
  }

  private async loadJourney(
    journeyId: string | null,
  ): Promise<VerificationJourney> {
    if (journeyId === null) {
      throw new SignInCodeRejectedError();
    }

    const journey = await this.dependencies.journeys.findById(journeyId);

    if (journey === null || journey.purpose !== VerificationPurpose.SignIn) {
      throw new SignInCodeRejectedError();
    }

    return journey;
  }

  private async loadAccount(accountId: string | null): Promise<Account> {
    const account =
      accountId === null
        ? null
        : await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new SignInCodeRejectedError();
    }

    return account;
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

  private parseCode(raw: string): VerificationCode {
    try {
      return VerificationCode.create(raw);
    } catch {
      throw new SignInCodeRejectedError();
    }
  }
}
