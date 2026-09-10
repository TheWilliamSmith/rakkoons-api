import { Account } from '../domain/account/account';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { IdentifierGenerator } from '../domain/ports/identifier-generator';
import { MessageSender } from '../domain/ports/message-sender';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationCodeGenerator } from '../domain/ports/verification-code-generator';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { EmailAddress } from '../domain/value-objects/email-address';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { PasswordResetPolicy } from './identity-policy';
import { VerificationJourneyOpener } from './verification-journey-opener';

export interface RequestPasswordResetInput {
  email: string;
}

export interface RequestPasswordResetOutput {
  journeyId: string;
  journeyExpiresAt: Date;
}

interface RequestPasswordResetDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  journeyOpener: VerificationJourneyOpener;
  codes: VerificationCodeGenerator;
  identifiers: IdentifierGenerator;
  passwordHasher: PasswordHasher;
  messages: MessageSender;
  clock: Clock;
  policy: PasswordResetPolicy;
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly dependencies: RequestPasswordResetDependencies,
  ) {}

  async execute(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetOutput> {
    const openedAt = this.dependencies.clock.now();
    const account = await this.findEligibleAccount(input.email);

    if (account === null) {
      await this.dependencies.passwordHasher.verifyDecoy();
      return this.decoyJourney(openedAt);
    }

    const code = this.dependencies.codes.generate();
    const journey = await this.dependencies.journeyOpener.open(
      VerificationPurpose.PasswordReset,
      account.id,
      code.reveal(),
      openedAt,
    );

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.consumeActiveForAccount(
        account.id,
        VerificationPurpose.PasswordReset,
        openedAt,
      );
      await this.dependencies.journeys.add(journey);
    });

    await this.dependencies.messages.sendPasswordResetCode(account.email, code);

    return { journeyId: journey.id, journeyExpiresAt: journey.expiresAt };
  }

  private decoyJourney(openedAt: Date): RequestPasswordResetOutput {
    return {
      journeyId: this.dependencies.identifiers.generate(),
      journeyExpiresAt: new Date(
        openedAt.getTime() + this.dependencies.policy.journeyLifetime,
      ),
    };
  }

  private async findEligibleAccount(raw: string): Promise<Account | null> {
    const email = this.parseEmail(raw);

    if (email === null) {
      return null;
    }

    const account = await this.dependencies.accounts.findByEmail(email);

    return account !== null && account.isActive() ? account : null;
  }

  private parseEmail(raw: string): EmailAddress | null {
    try {
      return EmailAddress.create(raw);
    } catch {
      return null;
    }
  }
}
