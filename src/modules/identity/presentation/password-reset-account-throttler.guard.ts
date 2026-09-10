import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { type Env } from '../../../config/env.validation';
import { EmailRateLimiter } from './email-rate-limiter';

const THROTTLER_KEY = 'password-reset-account';

@Injectable()
export class PasswordResetAccountThrottlerGuard implements CanActivate {
  constructor(
    private readonly limiter: EmailRateLimiter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request<unknown, unknown, { email?: unknown }>>();

    await this.limiter.consume(
      THROTTLER_KEY,
      request.body?.email,
      this.config.get('RATE_LIMIT_PASSWORD_RESET_PER_ACCOUNT', { infer: true }),
    );

    return true;
  }
}
