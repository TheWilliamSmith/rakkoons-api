import { Account } from '../domain/account/account';
import { CurrentPasswordRejectedError } from '../domain/errors/current-password-rejected.error';
import { EmailAlreadyRegisteredError } from '../domain/errors/email-already-registered.error';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationCodeGenerator } from '../domain/ports/verification-code-generator';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { EmailAddress } from '../domain/value-objects/email-address';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationJourneyOpener } from './verification-journey-opener';

export interface RequestEmailChangeInput {
  accountId: string;
  email: string;
  currentPassword: string;
}

export interface RequestEmailChangeOutput {
  journeyId: string;
  journeyExpiresAt: Date;
}

interface RequestEmailChangeDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  journeyOpener: VerificationJourneyOpener;
  codes: VerificationCodeGenerator;
  passwordHasher: PasswordHasher;
  messages: MessageSender;
  clock: Clock;
}

export class RequestEmailChangeUseCase {
  constructor(private readonly dependencies: RequestEmailChangeDependencies) {}

  async execute(
    input: RequestEmailChangeInput,
  ): Promise<RequestEmailChangeOutput> {
    const email = EmailAddress.create(input.email);
    const account = await this.loadAccount(input.accountId);

    await this.verifyCurrentPassword(account, input.currentPassword);

    if ((await this.dependencies.accounts.findByEmail(email)) !== null) {
      throw new EmailAlreadyRegisteredError();
    }

    const requestedAt = this.dependencies.clock.now();
    const code = this.dependencies.codes.generate();
    const journey = await this.dependencies.journeyOpener.open(
      VerificationPurpose.EmailChange,
      account.id,
      code.reveal(),
      requestedAt,
    );

    account.requestEmailChange(email, requestedAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.consumeActiveForAccount(
        account.id,
        VerificationPurpose.EmailChange,
        requestedAt,
      );
      await this.dependencies.journeys.add(journey);
      await this.dependencies.accounts.save(account);
    });

    await this.dependencies.messages.sendEmailChangeCode(email, code);

    return { journeyId: journey.id, journeyExpiresAt: journey.expiresAt };
  }

  private async loadAccount(accountId: string): Promise<Account> {
    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    return account;
  }

  private async verifyCurrentPassword(
    account: Account,
    raw: string,
  ): Promise<void> {
    let password: PlainPassword;

    try {
      password = PlainPassword.create(raw);
    } catch {
      await this.dependencies.passwordHasher.verifyDecoy();
      throw new CurrentPasswordRejectedError();
    }

    if (
      !(await this.dependencies.passwordHasher.matches(
        password,
        account.passwordHash,
      ))
    ) {
      throw new CurrentPasswordRejectedError();
    }
  }
}
