import { DomainError } from '../../../shared/domain/domain-error';
import { EmailChangeCodeRejectedError } from '../domain/errors/email-change-code-rejected.error';
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

export interface ConfirmEmailChangeInput {
  accountId: string;
  journeyId: string | null;
  code: string;
}

interface ConfirmEmailChangeDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  secretHasher: SecretHasher;
  messages: MessageSender;
  clock: Clock;
}

export class ConfirmEmailChangeUseCase {
  constructor(private readonly dependencies: ConfirmEmailChangeDependencies) {}

  async execute(input: ConfirmEmailChangeInput): Promise<void> {
    const code = this.parseCode(input.code);
    const journey = await this.loadJourney(input.journeyId, input.accountId);
    const submittedAt = this.dependencies.clock.now();
    const rejection = await this.submit(journey, code, submittedAt);

    if (rejection !== null) {
      await this.dependencies.journeys.save(journey);
      throw rejection;
    }

    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new EmailChangeCodeRejectedError();
    }

    const previous = account.confirmEmailChange(submittedAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.save(journey);
      await this.dependencies.accounts.save(account);
    });

    dispatchNotice(
      this.dependencies.messages.sendEmailChangeNotice(previous, account.email),
    );
  }

  private async loadJourney(
    journeyId: string | null,
    accountId: string,
  ): Promise<VerificationJourney> {
    if (journeyId === null) {
      throw new EmailChangeCodeRejectedError();
    }

    const journey = await this.dependencies.journeys.findById(journeyId);

    if (
      journey === null ||
      journey.purpose !== VerificationPurpose.EmailChange ||
      journey.accountId !== accountId
    ) {
      throw new EmailChangeCodeRejectedError();
    }

    return journey;
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
      throw new EmailChangeCodeRejectedError();
    }
  }
}
