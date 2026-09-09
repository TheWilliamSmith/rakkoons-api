import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckUsernameAvailabilityUseCase } from './application/check-username-availability.use-case';
import { ConfirmRegistrationUseCase } from './application/confirm-registration.use-case';
import {
  RegistrationPolicy,
  SessionPolicy,
} from './application/identity-policy';
import { OpenSessionUseCase } from './application/open-session.use-case';
import { RegisterAccountUseCase } from './application/register-account.use-case';
import { IdentityToken } from './identity.tokens';
import { IDENTITY_ADAPTERS } from './identity.adapters';
import { IDENTITY_USE_CASE_PROVIDERS } from './identity.use-cases';
import { AuthController } from './presentation/auth.controller';
import { IdentityCookies } from './presentation/identity-cookies';
import { SessionGuard } from './presentation/session.guard';
import { SignInAccountThrottlerGuard } from './presentation/sign-in-account-throttler.guard';
import { type Env } from '../../config/env.validation';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * MILLISECONDS_PER_MINUTE;

@Module({
  controllers: [AuthController],
  providers: [
    ...IDENTITY_ADAPTERS,
    ...IDENTITY_USE_CASE_PROVIDERS,
    IdentityCookies,
    SessionGuard,
    SignInAccountThrottlerGuard,
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
  ],
})
export class IdentityModule {}
