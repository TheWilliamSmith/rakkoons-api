import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { type Env } from '../../../config/env.validation';
import { RequestWithCaller } from './authenticated-caller';
import {
  IdentityCookies,
  PASSWORD_RESET_COOKIE,
  SIGNUP_COOKIE,
} from './identity-cookies';
import { SubjectRateLimiter } from './subject-rate-limiter';

const SECONDS_PER_HOUR = 3600;
const JOURNEY_RESEND_KEY = 'journey-resend';
const EMAIL_CHANGE_RESEND_KEY = 'account-email-change-resend';

@Injectable()
class JourneyResendThrottler {
  constructor(
    private readonly limiter: SubjectRateLimiter,
    private readonly cookies: IdentityCookies,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async consume(context: ExecutionContext, cookieName: string): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();

    await this.limiter.consume(
      JOURNEY_RESEND_KEY,
      this.cookies.read(request, cookieName),
      this.config.get('RATE_LIMIT_RESEND_PER_JOURNEY_HOURLY', { infer: true }),
      SECONDS_PER_HOUR,
    );
  }
}

@Injectable()
export class SignUpResendThrottlerGuard implements CanActivate {
  constructor(private readonly throttler: JourneyResendThrottler) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.throttler.consume(context, SIGNUP_COOKIE);

    return true;
  }
}

@Injectable()
export class PasswordResetResendThrottlerGuard implements CanActivate {
  constructor(private readonly throttler: JourneyResendThrottler) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.throttler.consume(context, PASSWORD_RESET_COOKIE);

    return true;
  }
}

@Injectable()
export class EmailChangeResendThrottlerGuard implements CanActivate {
  constructor(
    private readonly limiter: SubjectRateLimiter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCaller>();

    await this.limiter.consume(
      EMAIL_CHANGE_RESEND_KEY,
      request.caller?.accountId,
      this.config.get('RATE_LIMIT_EMAIL_CHANGE_RESEND_PER_ACCOUNT_HOURLY', {
        infer: true,
      }),
      SECONDS_PER_HOUR,
    );

    return true;
  }
}

export const RESEND_THROTTLER_PROVIDERS = [
  JourneyResendThrottler,
  SignUpResendThrottlerGuard,
  PasswordResetResendThrottlerGuard,
  EmailChangeResendThrottlerGuard,
];
