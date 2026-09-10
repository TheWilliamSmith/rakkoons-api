import { AuthenticateSessionUseCase } from '@identity/application/authenticate-session.use-case';
import { CancelAccountDeletionUseCase } from '@identity/application/cancel-account-deletion.use-case';
import { ConfirmEmailChangeUseCase } from '@identity/application/confirm-email-change.use-case';
import { PurgeDueAccountsUseCase } from '@identity/application/purge-due-accounts.use-case';
import { ReadNotificationPreferencesUseCase } from '@identity/application/read-notification-preferences.use-case';
import { RequestEmailChangeUseCase } from '@identity/application/request-email-change.use-case';
import { ScheduleAccountDeletionUseCase } from '@identity/application/schedule-account-deletion.use-case';
import { UpdateNotificationPreferencesUseCase } from '@identity/application/update-notification-preferences.use-case';
import { ChangePasswordUseCase } from '@identity/application/change-password.use-case';
import { ChangeUsernameUseCase } from '@identity/application/change-username.use-case';
import { ListAccountSessionsUseCase } from '@identity/application/list-account-sessions.use-case';
import { ReadAccountUseCase } from '@identity/application/read-account.use-case';
import { RevokeAccountSessionUseCase } from '@identity/application/revoke-account-session.use-case';
import { CheckUsernameAvailabilityUseCase } from '@identity/application/check-username-availability.use-case';
import { ConfirmPasswordResetUseCase } from '@identity/application/confirm-password-reset.use-case';
import { ConfirmRegistrationUseCase } from '@identity/application/confirm-registration.use-case';
import {
  PasswordResetPolicy,
  RegistrationPolicy,
  AccountDeletionPolicy,
  EmailChangePolicy,
  SessionPolicy,
  SignInCodePolicy,
  VerificationPolicy,
} from '@identity/application/identity-policy';
import { OpenSessionUseCase } from '@identity/application/open-session.use-case';
import { RegisterAccountUseCase } from '@identity/application/register-account.use-case';
import { RequestPasswordResetUseCase } from '@identity/application/request-password-reset.use-case';
import { RequestSignInCodeUseCase } from '@identity/application/request-sign-in-code.use-case';
import { RevokeSessionUseCase } from '@identity/application/revoke-session.use-case';
import { SessionOpener } from '@identity/application/session-opener';
import { VerificationJourneyOpener } from '@identity/application/verification-journey-opener';
import { VerifyPasswordResetCodeUseCase } from '@identity/application/verify-password-reset-code.use-case';
import { VerifySignInCodeUseCase } from '@identity/application/verify-sign-in-code.use-case';
import { AllowingSignInCodeThrottle } from './in-memory/allowing-sign-in-code-throttle';
import { DirectUnitOfWork } from './in-memory/direct-unit-of-work';
import { FixedVerificationCodeGenerator } from './in-memory/fixed-verification-code-generator';
import { FrozenClock } from './in-memory/frozen-clock';
import { InMemoryAccountRepository } from './in-memory/in-memory-account-repository';
import { InMemorySessionRepository } from './in-memory/in-memory-session-repository';
import { InMemoryVerificationJourneyRepository } from './in-memory/in-memory-verification-journey-repository';
import { RecordingMessageSender } from './in-memory/recording-message-sender';
import { SequentialIdentifierGenerator } from './in-memory/sequential-identifier-generator';
import { SequentialSecretGenerator } from './in-memory/sequential-secret-generator';
import { TrivialPasswordHasher } from './in-memory/trivial-password-hasher';
import { TrivialSecretHasher } from './in-memory/trivial-secret-hasher';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const TEST_CODE = '429861';
export const TEST_PASSWORD = 'MotDePasseQuiGagne1!';
export const TEST_NEW_PASSWORD = 'NouveauMotDePasse2?';
export const TEST_INSTANT = new Date('2026-01-01T10:00:00.000Z');

export const TEST_REGISTRATION_POLICY: RegistrationPolicy = {
  journeyLifetime: 15 * MINUTE,
  codeLifetime: 10 * MINUTE,
  maxVerificationAttempts: 5,
  termsVersion: '2026-01',
};

export const TEST_PASSWORD_RESET_POLICY: PasswordResetPolicy = {
  journeyLifetime: 15 * MINUTE,
  codeLifetime: 15 * MINUTE,
  maxVerificationAttempts: 5,
};

export const TEST_SIGN_IN_CODE_POLICY: SignInCodePolicy = {
  journeyLifetime: 15 * MINUTE,
  codeLifetime: 10 * MINUTE,
  maxVerificationAttempts: 5,
};

export const TEST_EMAIL_CHANGE_POLICY: EmailChangePolicy = {
  journeyLifetime: 15 * MINUTE,
  codeLifetime: 15 * MINUTE,
  maxVerificationAttempts: 5,
};

export const TEST_DELETION_POLICY: AccountDeletionPolicy = {
  gracePeriod: 30 * DAY,
};

export const TEST_SESSION_POLICY: SessionPolicy = {
  slidingLifetime: 14 * DAY,
  absoluteLifetime: 60 * DAY,
};

export class IdentityTestContext {
  readonly accounts = new InMemoryAccountRepository();
  readonly journeys = new InMemoryVerificationJourneyRepository();
  readonly sessions = new InMemorySessionRepository();
  readonly passwordHasher = new TrivialPasswordHasher();
  readonly secretHasher = new TrivialSecretHasher();
  readonly codes = new FixedVerificationCodeGenerator(TEST_CODE);
  readonly identifiers = new SequentialIdentifierGenerator();
  readonly secrets = new SequentialSecretGenerator();
  readonly messages = new RecordingMessageSender();
  readonly unitOfWork = new DirectUnitOfWork();
  readonly clock = new FrozenClock(TEST_INSTANT);
  readonly signInCodeThrottle = new AllowingSignInCodeThrottle();

  registerAccount(): RegisterAccountUseCase {
    return new RegisterAccountUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      passwordHasher: this.passwordHasher,
      journeyOpener: this.journeyOpener(TEST_REGISTRATION_POLICY),
      codes: this.codes,
      identifiers: this.identifiers,
      messages: this.messages,
      clock: this.clock,
      policy: TEST_REGISTRATION_POLICY,
    });
  }

  confirmRegistration(): ConfirmRegistrationUseCase {
    return new ConfirmRegistrationUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      secretHasher: this.secretHasher,
      messages: this.messages,
      clock: this.clock,
    });
  }

  requestPasswordReset(): RequestPasswordResetUseCase {
    return new RequestPasswordResetUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      journeyOpener: this.journeyOpener(TEST_PASSWORD_RESET_POLICY),
      codes: this.codes,
      identifiers: this.identifiers,
      passwordHasher: this.passwordHasher,
      messages: this.messages,
      clock: this.clock,
      policy: TEST_PASSWORD_RESET_POLICY,
    });
  }

  verifyPasswordResetCode(): VerifyPasswordResetCodeUseCase {
    return new VerifyPasswordResetCodeUseCase({
      journeys: this.journeys,
      secretHasher: this.secretHasher,
      clock: this.clock,
    });
  }

  confirmPasswordReset(): ConfirmPasswordResetUseCase {
    return new ConfirmPasswordResetUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      sessions: this.sessions,
      unitOfWork: this.unitOfWork,
      passwordHasher: this.passwordHasher,
      messages: this.messages,
      clock: this.clock,
    });
  }

  openSession(): OpenSessionUseCase {
    return new OpenSessionUseCase({
      accounts: this.accounts,
      passwordHasher: this.passwordHasher,
      sessionOpener: this.sessionOpener(),
    });
  }

  requestSignInCode(): RequestSignInCodeUseCase {
    return new RequestSignInCodeUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      journeyOpener: this.journeyOpener(TEST_SIGN_IN_CODE_POLICY),
      codes: this.codes,
      secrets: this.secrets,
      throttle: this.signInCodeThrottle,
      messages: this.messages,
      clock: this.clock,
    });
  }

  verifySignInCode(): VerifySignInCodeUseCase {
    return new VerifySignInCodeUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      sessionOpener: this.sessionOpener(),
      secretHasher: this.secretHasher,
      clock: this.clock,
    });
  }

  authenticateSession(): AuthenticateSessionUseCase {
    return new AuthenticateSessionUseCase({
      accounts: this.accounts,
      sessions: this.sessions,
      secretHasher: this.secretHasher,
      clock: this.clock,
      policy: TEST_SESSION_POLICY,
    });
  }

  revokeSession(): RevokeSessionUseCase {
    return new RevokeSessionUseCase({
      sessions: this.sessions,
      secretHasher: this.secretHasher,
      clock: this.clock,
    });
  }

  readAccount(): ReadAccountUseCase {
    return new ReadAccountUseCase(this.accounts);
  }

  changeUsername(): ChangeUsernameUseCase {
    return new ChangeUsernameUseCase({
      accounts: this.accounts,
      messages: this.messages,
      clock: this.clock,
    });
  }

  changePassword(): ChangePasswordUseCase {
    return new ChangePasswordUseCase({
      accounts: this.accounts,
      sessions: this.sessions,
      unitOfWork: this.unitOfWork,
      passwordHasher: this.passwordHasher,
      messages: this.messages,
      clock: this.clock,
    });
  }

  listAccountSessions(): ListAccountSessionsUseCase {
    return new ListAccountSessionsUseCase({
      sessions: this.sessions,
      clock: this.clock,
    });
  }

  revokeAccountSession(): RevokeAccountSessionUseCase {
    return new RevokeAccountSessionUseCase({
      sessions: this.sessions,
      clock: this.clock,
    });
  }

  requestEmailChange(): RequestEmailChangeUseCase {
    return new RequestEmailChangeUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      journeyOpener: this.journeyOpener(TEST_EMAIL_CHANGE_POLICY),
      codes: this.codes,
      passwordHasher: this.passwordHasher,
      messages: this.messages,
      clock: this.clock,
    });
  }

  confirmEmailChange(): ConfirmEmailChangeUseCase {
    return new ConfirmEmailChangeUseCase({
      accounts: this.accounts,
      journeys: this.journeys,
      unitOfWork: this.unitOfWork,
      secretHasher: this.secretHasher,
      messages: this.messages,
      clock: this.clock,
    });
  }

  readNotificationPreferences(): ReadNotificationPreferencesUseCase {
    return new ReadNotificationPreferencesUseCase(this.accounts);
  }

  updateNotificationPreferences(): UpdateNotificationPreferencesUseCase {
    return new UpdateNotificationPreferencesUseCase({
      accounts: this.accounts,
      clock: this.clock,
    });
  }

  scheduleAccountDeletion(): ScheduleAccountDeletionUseCase {
    return new ScheduleAccountDeletionUseCase({
      accounts: this.accounts,
      sessions: this.sessions,
      unitOfWork: this.unitOfWork,
      passwordHasher: this.passwordHasher,
      messages: this.messages,
      clock: this.clock,
      policy: TEST_DELETION_POLICY,
    });
  }

  cancelAccountDeletion(): CancelAccountDeletionUseCase {
    return new CancelAccountDeletionUseCase({
      accounts: this.accounts,
      messages: this.messages,
      clock: this.clock,
    });
  }

  purgeDueAccounts(): PurgeDueAccountsUseCase {
    return new PurgeDueAccountsUseCase({
      accounts: this.accounts,
      unitOfWork: this.unitOfWork,
      clock: this.clock,
    });
  }

  private sessionOpener(): SessionOpener {
    return new SessionOpener({
      sessions: this.sessions,
      secretHasher: this.secretHasher,
      identifiers: this.identifiers,
      secrets: this.secrets,
      clock: this.clock,
      policy: TEST_SESSION_POLICY,
    });
  }

  checkUsernameAvailability(): CheckUsernameAvailabilityUseCase {
    return new CheckUsernameAvailabilityUseCase(this.accounts);
  }

  private journeyOpener(policy: VerificationPolicy): VerificationJourneyOpener {
    return new VerificationJourneyOpener({
      secretHasher: this.secretHasher,
      identifiers: this.identifiers,
      policy,
    });
  }
}
