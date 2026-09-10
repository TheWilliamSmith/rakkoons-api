import { Account } from '../domain/account/account';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { SecretGenerator } from '../domain/ports/secret-generator';
import { SignInCodeThrottle } from '../domain/ports/sign-in-code-throttle';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationCodeGenerator } from '../domain/ports/verification-code-generator';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { EmailAddress } from '../domain/value-objects/email-address';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationJourneyOpener } from './verification-journey-opener';

export interface RequestSignInCodeInput {
  email: string;
  origin: string;
}

export interface RequestSignInCodeOutput {
  journeyId: string;
  journeyExpiresAt: Date;
}

interface RequestSignInCodeDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  journeyOpener: VerificationJourneyOpener;
  codes: VerificationCodeGenerator;
  secrets: SecretGenerator;
  throttle: SignInCodeThrottle;
  messages: MessageSender;
  clock: Clock;
}

export class RequestSignInCodeUseCase {
  constructor(private readonly dependencies: RequestSignInCodeDependencies) {}

  async execute(
    input: RequestSignInCodeInput,
  ): Promise<RequestSignInCodeOutput> {
    const openedAt = this.dependencies.clock.now();
    const email = this.parseEmail(input.email);
    const allowed = email !== null && (await this.allows(email, input.origin));
    const account = email === null ? null : await this.findAccount(email);

    if (account === null || email === null) {
      return this.decoyJourney(null, openedAt);
    }

    return allowed
      ? this.emitCode(account, email, openedAt)
      : this.withheldJourney(account, openedAt);
  }

  private async emitCode(
    account: Account,
    email: EmailAddress,
    openedAt: Date,
  ): Promise<RequestSignInCodeOutput> {
    const code = this.dependencies.codes.generate();
    const journey = await this.open(account.id, code.reveal(), openedAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.consumeActiveForAccount(
        account.id,
        VerificationPurpose.SignIn,
        openedAt,
      );
      await this.dependencies.journeys.add(journey);
    });

    this.dispatch(email, code);

    return output(journey);
  }

  private async withheldJourney(
    account: Account,
    openedAt: Date,
  ): Promise<RequestSignInCodeOutput> {
    const pending = await this.dependencies.journeys.findActiveForAccount(
      account.id,
      VerificationPurpose.SignIn,
    );

    return pending === null
      ? this.decoyJourney(account.id, openedAt)
      : output(pending);
  }

  private async decoyJourney(
    accountId: string | null,
    openedAt: Date,
  ): Promise<RequestSignInCodeOutput> {
    const journey = await this.open(
      accountId,
      this.dependencies.secrets.generate(),
      openedAt,
    );

    await this.dependencies.journeys.add(journey);

    return output(journey);
  }

  private open(
    accountId: string | null,
    secret: string,
    openedAt: Date,
  ): Promise<VerificationJourney> {
    return this.dependencies.journeyOpener.open(
      VerificationPurpose.SignIn,
      accountId,
      secret,
      openedAt,
    );
  }

  private dispatch(email: EmailAddress, code: VerificationCode): void {
    void this.dependencies.messages
      .sendSignInCode(email, code)
      .catch(() => undefined);
  }

  private allows(email: EmailAddress, origin: string): Promise<boolean> {
    return this.dependencies.throttle.allowsCodeFor(email, origin);
  }

  private async findAccount(email: EmailAddress): Promise<Account | null> {
    return this.dependencies.accounts.findByEmail(email);
  }

  private parseEmail(raw: string): EmailAddress | null {
    try {
      return EmailAddress.create(raw);
    } catch {
      return null;
    }
  }
}

function output(journey: VerificationJourney): RequestSignInCodeOutput {
  return { journeyId: journey.id, journeyExpiresAt: journey.expiresAt };
}
