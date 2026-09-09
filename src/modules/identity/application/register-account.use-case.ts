import { Account } from '../domain/account/account';
import { EmailAlreadyRegisteredError } from '../domain/errors/email-already-registered.error';
import { UsernameAlreadyTakenError } from '../domain/errors/username-already-taken.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { IdentifierGenerator } from '../domain/ports/identifier-generator';
import { SecretGenerator } from '../domain/ports/secret-generator';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { VerificationCodeGenerator } from '../domain/ports/verification-code-generator';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { EmailAddress } from '../domain/value-objects/email-address';
import { PasswordHash } from '../domain/value-objects/password-hash';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { Username } from '../domain/value-objects/username';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { RegistrationPolicy } from './identity-policy';
import { VerificationJourneyOpener } from './verification-journey-opener';

export interface RegisterAccountInput {
  username: string;
  email: string;
  password: string;
  hasAcceptedTerms: boolean;
}

export interface RegisterAccountOutput {
  journeyId: string;
  journeyExpiresAt: Date;
}

interface RegisterAccountDependencies {
  accounts: AccountRepository;
  journeys: VerificationJourneyRepository;
  unitOfWork: UnitOfWork;
  passwordHasher: PasswordHasher;
  journeyOpener: VerificationJourneyOpener;
  codes: VerificationCodeGenerator;
  identifiers: IdentifierGenerator;
  secrets: SecretGenerator;
  messages: MessageSender;
  clock: Clock;
  policy: RegistrationPolicy;
}

export class RegisterAccountUseCase {
  constructor(private readonly dependencies: RegisterAccountDependencies) {}

  async execute(input: RegisterAccountInput): Promise<RegisterAccountOutput> {
    const username = Username.create(input.username);
    const email = EmailAddress.create(input.email);
    const password = PlainPassword.create(input.password);

    if (!(await this.dependencies.accounts.isUsernameAvailable(username))) {
      throw new UsernameAlreadyTakenError();
    }

    const passwordHash = await this.dependencies.passwordHasher.hash(password);
    const existing = await this.dependencies.accounts.findByEmail(email);
    const openedAt = this.dependencies.clock.now();

    return existing === null
      ? this.openRegistration(username, email, passwordHash, input, openedAt)
      : this.openDecoy(email, openedAt);
  }

  private async openRegistration(
    username: Username,
    email: EmailAddress,
    passwordHash: PasswordHash,
    input: RegisterAccountInput,
    openedAt: Date,
  ): Promise<RegisterAccountOutput> {
    const account = Account.register({
      id: this.dependencies.identifiers.generate(),
      username,
      email,
      passwordHash,
      hasAcceptedTerms: input.hasAcceptedTerms,
      termsVersion: this.dependencies.policy.termsVersion,
      registeredAt: openedAt,
    });

    const code = this.dependencies.codes.generate();
    const journey = await this.dependencies.journeyOpener.open(
      VerificationPurpose.SignUp,
      account.id,
      code.reveal(),
      openedAt,
    );

    try {
      await this.dependencies.unitOfWork.run(async () => {
        await this.dependencies.accounts.add(account);
        await this.dependencies.journeys.add(journey);
      });
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        return this.openDecoy(email, openedAt);
      }
      throw error;
    }

    await this.dispatch(() =>
      this.dependencies.messages.sendRegistrationCode(email, code),
    );

    return { journeyId: journey.id, journeyExpiresAt: journey.expiresAt };
  }

  private async openDecoy(
    email: EmailAddress,
    openedAt: Date,
  ): Promise<RegisterAccountOutput> {
    const journey = await this.dependencies.journeyOpener.open(
      VerificationPurpose.SignUp,
      null,
      this.dependencies.secrets.generate(),
      openedAt,
    );

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.journeys.add(journey);
    });

    await this.dispatch(() =>
      this.dependencies.messages.sendRegistrationAttemptOnExistingAccount(
        email,
      ),
    );

    return { journeyId: journey.id, journeyExpiresAt: journey.expiresAt };
  }

  private async dispatch(send: () => Promise<void>): Promise<void> {
    await send().catch(() => undefined);
  }
}
