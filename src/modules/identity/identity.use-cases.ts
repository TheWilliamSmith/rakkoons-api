import { Provider } from '@nestjs/common';
import { AuthenticateSessionUseCase } from './application/authenticate-session.use-case';
import { CheckUsernameAvailabilityUseCase } from './application/check-username-availability.use-case';
import { ConfirmPasswordResetUseCase } from './application/confirm-password-reset.use-case';
import { ConfirmRegistrationUseCase } from './application/confirm-registration.use-case';
import {
  PasswordResetPolicy,
  RegistrationPolicy,
  SessionPolicy,
  VerificationPolicy,
} from './application/identity-policy';
import { OpenSessionUseCase } from './application/open-session.use-case';
import { RegisterAccountUseCase } from './application/register-account.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { RequestSignInCodeUseCase } from './application/request-sign-in-code.use-case';
import { RevokeSessionUseCase } from './application/revoke-session.use-case';
import { SessionOpener } from './application/session-opener';
import { VerificationJourneyOpener } from './application/verification-journey-opener';
import { VerifyPasswordResetCodeUseCase } from './application/verify-password-reset-code.use-case';
import { VerifySignInCodeUseCase } from './application/verify-sign-in-code.use-case';
import { type AccountRepository } from './domain/ports/account-repository';
import { type Clock } from './domain/ports/clock';
import { type IdentifierGenerator } from './domain/ports/identifier-generator';
import { type MessageSender } from './domain/ports/message-sender';
import { type PasswordHasher } from './domain/ports/password-hasher';
import { type SecretGenerator } from './domain/ports/secret-generator';
import { type SecretHasher } from './domain/ports/secret-hasher';
import { type SessionRepository } from './domain/ports/session-repository';
import { type SignInCodeThrottle } from './domain/ports/sign-in-code-throttle';
import { type UnitOfWork } from './domain/ports/unit-of-work';
import { type VerificationCodeGenerator } from './domain/ports/verification-code-generator';
import { type VerificationJourneyRepository } from './domain/ports/verification-journey-repository';
import { IdentityToken } from './identity.tokens';

function journeyOpenerProvider(provide: symbol, policyToken: symbol): Provider {
  return {
    provide,
    inject: [
      IdentityToken.SecretHasher,
      IdentityToken.IdentifierGenerator,
      policyToken,
    ],
    useFactory: (
      secretHasher: SecretHasher,
      identifiers: IdentifierGenerator,
      policy: VerificationPolicy,
    ): VerificationJourneyOpener =>
      new VerificationJourneyOpener({ secretHasher, identifiers, policy }),
  };
}

export const IDENTITY_USE_CASE_PROVIDERS: Provider[] = [
  journeyOpenerProvider(
    IdentityToken.RegistrationJourneyOpener,
    IdentityToken.RegistrationPolicy,
  ),
  journeyOpenerProvider(
    IdentityToken.SignInCodeJourneyOpener,
    IdentityToken.SignInCodePolicy,
  ),
  journeyOpenerProvider(
    IdentityToken.PasswordResetJourneyOpener,
    IdentityToken.PasswordResetPolicy,
  ),
  {
    provide: SessionOpener,
    inject: [
      IdentityToken.SessionRepository,
      IdentityToken.SecretHasher,
      IdentityToken.IdentifierGenerator,
      IdentityToken.SecretGenerator,
      IdentityToken.Clock,
      IdentityToken.SessionPolicy,
    ],
    useFactory: (
      sessions: SessionRepository,
      secretHasher: SecretHasher,
      identifiers: IdentifierGenerator,
      secrets: SecretGenerator,
      clock: Clock,
      policy: SessionPolicy,
    ): SessionOpener =>
      new SessionOpener({
        sessions,
        secretHasher,
        identifiers,
        secrets,
        clock,
        policy,
      }),
  },
  {
    provide: RequestSignInCodeUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.UnitOfWork,
      IdentityToken.SignInCodeJourneyOpener,
      IdentityToken.VerificationCodeGenerator,
      IdentityToken.SecretGenerator,
      IdentityToken.SignInCodeThrottle,
      IdentityToken.MessageSender,
      IdentityToken.Clock,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      unitOfWork: UnitOfWork,
      journeyOpener: VerificationJourneyOpener,
      codes: VerificationCodeGenerator,
      secrets: SecretGenerator,
      throttle: SignInCodeThrottle,
      messages: MessageSender,
      clock: Clock,
    ): RequestSignInCodeUseCase =>
      new RequestSignInCodeUseCase({
        accounts,
        journeys,
        unitOfWork,
        journeyOpener,
        codes,
        secrets,
        throttle,
        messages,
        clock,
      }),
  },
  {
    provide: VerifySignInCodeUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.UnitOfWork,
      SessionOpener,
      IdentityToken.SecretHasher,
      IdentityToken.Clock,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      unitOfWork: UnitOfWork,
      sessionOpener: SessionOpener,
      secretHasher: SecretHasher,
      clock: Clock,
    ): VerifySignInCodeUseCase =>
      new VerifySignInCodeUseCase({
        accounts,
        journeys,
        unitOfWork,
        sessionOpener,
        secretHasher,
        clock,
      }),
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
      IdentityToken.RegistrationJourneyOpener,
      IdentityToken.VerificationCodeGenerator,
      IdentityToken.IdentifierGenerator,
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
    provide: RequestPasswordResetUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.UnitOfWork,
      IdentityToken.PasswordResetJourneyOpener,
      IdentityToken.VerificationCodeGenerator,
      IdentityToken.IdentifierGenerator,
      IdentityToken.PasswordHasher,
      IdentityToken.MessageSender,
      IdentityToken.Clock,
      IdentityToken.PasswordResetPolicy,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      unitOfWork: UnitOfWork,
      journeyOpener: VerificationJourneyOpener,
      codes: VerificationCodeGenerator,
      identifiers: IdentifierGenerator,
      passwordHasher: PasswordHasher,
      messages: MessageSender,
      clock: Clock,
      policy: PasswordResetPolicy,
    ): RequestPasswordResetUseCase =>
      new RequestPasswordResetUseCase({
        accounts,
        journeys,
        unitOfWork,
        journeyOpener,
        codes,
        identifiers,
        passwordHasher,
        messages,
        clock,
        policy,
      }),
  },
  {
    provide: VerifyPasswordResetCodeUseCase,
    inject: [
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.SecretHasher,
      IdentityToken.Clock,
    ],
    useFactory: (
      journeys: VerificationJourneyRepository,
      secretHasher: SecretHasher,
      clock: Clock,
    ): VerifyPasswordResetCodeUseCase =>
      new VerifyPasswordResetCodeUseCase({ journeys, secretHasher, clock }),
  },
  {
    provide: ConfirmPasswordResetUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.VerificationJourneyRepository,
      IdentityToken.SessionRepository,
      IdentityToken.UnitOfWork,
      IdentityToken.PasswordHasher,
      IdentityToken.Clock,
    ],
    useFactory: (
      accounts: AccountRepository,
      journeys: VerificationJourneyRepository,
      sessions: SessionRepository,
      unitOfWork: UnitOfWork,
      passwordHasher: PasswordHasher,
      clock: Clock,
    ): ConfirmPasswordResetUseCase =>
      new ConfirmPasswordResetUseCase({
        accounts,
        journeys,
        sessions,
        unitOfWork,
        passwordHasher,
        clock,
      }),
  },
  {
    provide: AuthenticateSessionUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.SessionRepository,
      IdentityToken.SecretHasher,
      IdentityToken.Clock,
      IdentityToken.SessionPolicy,
    ],
    useFactory: (
      accounts: AccountRepository,
      sessions: SessionRepository,
      secretHasher: SecretHasher,
      clock: Clock,
      policy: SessionPolicy,
    ): AuthenticateSessionUseCase =>
      new AuthenticateSessionUseCase({
        accounts,
        sessions,
        secretHasher,
        clock,
        policy,
      }),
  },
  {
    provide: RevokeSessionUseCase,
    inject: [
      IdentityToken.SessionRepository,
      IdentityToken.SecretHasher,
      IdentityToken.Clock,
    ],
    useFactory: (
      sessions: SessionRepository,
      secretHasher: SecretHasher,
      clock: Clock,
    ): RevokeSessionUseCase =>
      new RevokeSessionUseCase({ sessions, secretHasher, clock }),
  },
  {
    provide: OpenSessionUseCase,
    inject: [
      IdentityToken.AccountRepository,
      IdentityToken.PasswordHasher,
      SessionOpener,
    ],
    useFactory: (
      accounts: AccountRepository,
      passwordHasher: PasswordHasher,
      sessionOpener: SessionOpener,
    ): OpenSessionUseCase =>
      new OpenSessionUseCase({ accounts, passwordHasher, sessionOpener }),
  },
];
