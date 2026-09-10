import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticateSessionUseCase } from './application/authenticate-session.use-case';
import { CancelAccountDeletionUseCase } from './application/cancel-account-deletion.use-case';
import { ConfirmEmailChangeUseCase } from './application/confirm-email-change.use-case';
import { ReadNotificationPreferencesUseCase } from './application/read-notification-preferences.use-case';
import { RequestEmailChangeUseCase } from './application/request-email-change.use-case';
import { ScheduleAccountDeletionUseCase } from './application/schedule-account-deletion.use-case';
import { UpdateNotificationPreferencesUseCase } from './application/update-notification-preferences.use-case';
import { ChangePasswordUseCase } from './application/change-password.use-case';
import { ChangeUsernameUseCase } from './application/change-username.use-case';
import { ListAccountSessionsUseCase } from './application/list-account-sessions.use-case';
import { ReadAccountUseCase } from './application/read-account.use-case';
import { RevokeAccountSessionUseCase } from './application/revoke-account-session.use-case';
import { CheckUsernameAvailabilityUseCase } from './application/check-username-availability.use-case';
import { ConfirmPasswordResetUseCase } from './application/confirm-password-reset.use-case';
import { ConfirmRegistrationUseCase } from './application/confirm-registration.use-case';
import {
  AccountDeletionPolicy,
  EmailChangePolicy,
  PasswordResetPolicy,
  RegistrationPolicy,
  SessionPolicy,
  SignInCodePolicy,
} from './application/identity-policy';
import { OpenSessionUseCase } from './application/open-session.use-case';
import { RegisterAccountUseCase } from './application/register-account.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { RequestSignInCodeUseCase } from './application/request-sign-in-code.use-case';
import { RevokeSessionUseCase } from './application/revoke-session.use-case';
import { VerifyPasswordResetCodeUseCase } from './application/verify-password-reset-code.use-case';
import { VerifySignInCodeUseCase } from './application/verify-sign-in-code.use-case';
import { IdentityToken } from './identity.tokens';
import { IDENTITY_ADAPTERS } from './identity.adapters';
import { IDENTITY_USE_CASE_PROVIDERS } from './identity.use-cases';
import { AccountPurgeScheduler } from './infrastructure/scheduling/account-purge.scheduler';
import { AccountController } from './presentation/account.controller';
import { EmailChangeThrottlerGuard } from './presentation/account-email-throttler.guard';
import {
  PasswordChangeThrottlerGuard,
  UsernameChangeThrottlerGuard,
} from './presentation/account-throttler.guard';
import { AuthController } from './presentation/auth.controller';
import { SubjectRateLimiter } from './presentation/subject-rate-limiter';
import { IdentityCookies } from './presentation/identity-cookies';
import { PasswordResetAccountThrottlerGuard } from './presentation/password-reset-account-throttler.guard';
import { PasswordResetController } from './presentation/password-reset.controller';
import { SessionController } from './presentation/session.controller';
import { SessionGuard } from './presentation/session.guard';
import { SignInCodeController } from './presentation/sign-in-code.controller';
import { SignInAccountThrottlerGuard } from './presentation/sign-in-account-throttler.guard';
import { type Env } from '../../config/env.validation';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * MILLISECONDS_PER_MINUTE;

@Module({
  controllers: [
    AuthController,
    PasswordResetController,
    SignInCodeController,
    SessionController,
    AccountController,
  ],
  providers: [
    ...IDENTITY_ADAPTERS,
    ...IDENTITY_USE_CASE_PROVIDERS,
    IdentityCookies,
    SessionGuard,
    SubjectRateLimiter,
    SignInAccountThrottlerGuard,
    PasswordResetAccountThrottlerGuard,
    UsernameChangeThrottlerGuard,
    PasswordChangeThrottlerGuard,
    EmailChangeThrottlerGuard,
    AccountPurgeScheduler,
    {
      provide: IdentityToken.RegistrationPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): RegistrationPolicy => ({
        journeyLifetime:
          config.get('SIGNUP_JOURNEY_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        codeLifetime:
          config.get('SIGNUP_CODE_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        maxVerificationAttempts: config.get('VERIFICATION_MAX_ATTEMPTS', {
          infer: true,
        }),
        termsVersion: config.get('TERMS_VERSION', { infer: true }),
      }),
    },
    {
      provide: IdentityToken.SignInCodePolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): SignInCodePolicy => ({
        journeyLifetime:
          config.get('SIGNIN_JOURNEY_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        codeLifetime:
          config.get('SIGNIN_CODE_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        maxVerificationAttempts: config.get('VERIFICATION_MAX_ATTEMPTS', {
          infer: true,
        }),
      }),
    },
    {
      provide: IdentityToken.EmailChangePolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): EmailChangePolicy => ({
        journeyLifetime:
          config.get('EMAIL_CHANGE_JOURNEY_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        codeLifetime:
          config.get('EMAIL_CHANGE_CODE_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        maxVerificationAttempts: config.get('VERIFICATION_MAX_ATTEMPTS', {
          infer: true,
        }),
      }),
    },
    {
      provide: IdentityToken.AccountDeletionPolicy,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<Env, true>,
      ): AccountDeletionPolicy => ({
        gracePeriod:
          config.get('ACCOUNT_DELETION_GRACE_DAYS', { infer: true }) *
          MILLISECONDS_PER_DAY,
      }),
    },
    {
      provide: IdentityToken.PasswordResetPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PasswordResetPolicy => ({
        journeyLifetime:
          config.get('PASSWORD_RESET_JOURNEY_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        codeLifetime:
          config.get('PASSWORD_RESET_CODE_TTL_MINUTES', { infer: true }) *
          MILLISECONDS_PER_MINUTE,
        maxVerificationAttempts: config.get('VERIFICATION_MAX_ATTEMPTS', {
          infer: true,
        }),
      }),
    },
    {
      provide: IdentityToken.SessionPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): SessionPolicy => ({
        slidingLifetime:
          config.get('SESSION_SLIDING_LIFETIME_DAYS', { infer: true }) *
          MILLISECONDS_PER_DAY,
        absoluteLifetime:
          config.get('SESSION_ABSOLUTE_LIFETIME_DAYS', { infer: true }) *
          MILLISECONDS_PER_DAY,
      }),
    },
  ],
  exports: [
    SessionGuard,
    CheckUsernameAvailabilityUseCase,
    RegisterAccountUseCase,
    ConfirmRegistrationUseCase,
    OpenSessionUseCase,
    RequestPasswordResetUseCase,
    VerifyPasswordResetCodeUseCase,
    ConfirmPasswordResetUseCase,
    RequestSignInCodeUseCase,
    VerifySignInCodeUseCase,
    AuthenticateSessionUseCase,
    RevokeSessionUseCase,
    ReadAccountUseCase,
    ChangeUsernameUseCase,
    ChangePasswordUseCase,
    ListAccountSessionsUseCase,
    RevokeAccountSessionUseCase,
    RequestEmailChangeUseCase,
    ConfirmEmailChangeUseCase,
    ReadNotificationPreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
    ScheduleAccountDeletionUseCase,
    CancelAccountDeletionUseCase,
  ],
})
export class IdentityModule {}
