import { Provider } from '@nestjs/common';
import { CheckUsernameAvailabilityUseCase } from './application/check-username-availability.use-case';
import { ConfirmRegistrationUseCase } from './application/confirm-registration.use-case';
import {
  RegistrationPolicy,
  SessionPolicy,
} from './application/identity-policy';
import { OpenSessionUseCase } from './application/open-session.use-case';
import { RegisterAccountUseCase } from './application/register-account.use-case';
import { VerificationJourneyOpener } from './application/verification-journey-opener';
import { type AccountRepository } from './domain/ports/account-repository';
import { type Clock } from './domain/ports/clock';
import { type IdentifierGenerator } from './domain/ports/identifier-generator';
import { type MessageSender } from './domain/ports/message-sender';
import { type PasswordHasher } from './domain/ports/password-hasher';
import { type SecretGenerator } from './domain/ports/secret-generator';
import { type SecretHasher } from './domain/ports/secret-hasher';
import { type SessionRepository } from './domain/ports/session-repository';
import { type UnitOfWork } from './domain/ports/unit-of-work';
import { type VerificationCodeGenerator } from './domain/ports/verification-code-generator';
import { type VerificationJourneyRepository } from './domain/ports/verification-journey-repository';
import { IdentityToken } from './identity.tokens';

export const IDENTITY_USE_CASE_PROVIDERS: Provider[] = [
  {
    provide: VerificationJourneyOpener,
    inject: [
      IdentityToken.SecretHasher,
      IdentityToken.IdentifierGenerator,
      IdentityToken.RegistrationPolicy,
    ],
    useFactory: (
      secretHasher: SecretHasher,
      identifiers: IdentifierGenerator,
      policy: RegistrationPolicy,
    ): VerificationJourneyOpener =>
      new VerificationJourneyOpener({ secretHasher, identifiers, policy }),
  },
  {
    provide: CheckUsernameAvailabilityUseCase,
    inject: [IdentityToken.AccountRepository],
    useFactory: (
      accounts: AccountRepository,
    ): CheckUsernameAvailabilityUseCase =>
      new CheckUsernameAvailabilityUseCase(accounts),
  },
  {
    provide: RegisterAccountUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.UnitOfWork,
      IdentityToken.PasswordHasher,
      VerificationJourneyOpener,
      IdentityToken.VerificationCodeGenerator,
      IdentityToken.IdentifierGenerator,
      IdentityToken.SecretGenerator,
      IdentityToken.MessageSender,
      IdentityToken.Clock,
      IdentityToken.RegistrationPolicy,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      unitOfWork: UnitOfWork,
      passwordHasher: PasswordHasher,
      journeyOpener: VerificationJourneyOpener,
      codes: VerificationCodeGenerator,
      identifiers: IdentifierGenerator,
      secrets: SecretGenerator,
      messages: MessageSender,
      clock: Clock,
      policy: RegistrationPolicy,
    ): RegisterAccountUseCase =>
      new RegisterAccountUseCase({
        accounts,
        journeys,
        unitOfWork,
        passwordHasher,
        journeyOpener,
        codes,
        identifiers,
        secrets,
        messages,
        clock,
        policy,
      }),
  },
  {
    provide: ConfirmRegistrationUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.UnitOfWork,
      IdentityToken.SecretHasher,
      IdentityToken.Clock,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      unitOfWork: UnitOfWork,
      secretHasher: SecretHasher,
      clock: Clock,
    ): ConfirmRegistrationUseCase =>
      new ConfirmRegistrationUseCase({
        accounts,
        journeys,
        unitOfWork,
        secretHasher,
        clock,
      }),
  },
  {
    provide: OpenSessionUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.SessionRepository,
      IdentityToken.PasswordHasher,
      IdentityToken.SecretHasher,
      IdentityToken.IdentifierGenerator,
      IdentityToken.SecretGenerator,
      IdentityToken.Clock,
      IdentityToken.SessionPolicy,
    ],
    useFactory: (
      accounts: AccountRepository,
      sessions: SessionRepository,
      passwordHasher: PasswordHasher,
      secretHasher: SecretHasher,
      identifiers: IdentifierGenerator,
      secrets: SecretGenerator,
      clock: Clock,
      policy: SessionPolicy,
    ): OpenSessionUseCase =>
      new OpenSessionUseCase({
        accounts,
        sessions,
        passwordHasher,
        secretHasher,
        identifiers,
        secrets,
        clock,
        policy,
      }),
  },
];
