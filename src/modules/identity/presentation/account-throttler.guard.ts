import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env } from '../../../config/env.validation';
import { RequestWithCaller } from './authenticated-caller';
import { SubjectRateLimiter } from './subject-rate-limiter';

const SECONDS_PER_HOUR = 3600;
const USERNAME_CHANGE_KEY = 'account-username-change';
const PASSWORD_CHANGE_KEY = 'account-password-change';

function callerOf(context: ExecutionContext): string | undefined {
  return context.switchToHttp().getRequest<RequestWithCaller>().caller
    ?.accountId;
}

@Injectable()
export class UsernameChangeThrottlerGuard implements CanActivate {
  constructor(
    private readonly limiter: SubjectRateLimiter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.limiter.consume(
      USERNAME_CHANGE_KEY,
      callerOf(context),
      this.config.get('RATE_LIMIT_USERNAME_CHANGE_PER_ACCOUNT_HOURLY', {
        infer: true,
      }),
      SECONDS_PER_HOUR,
    );

    return true;
  }
}

@Injectable()
export class PasswordChangeThrottlerGuard implements CanActivate {
  constructor(
    private readonly limiter: SubjectRateLimiter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.limiter.consume(
      PASSWORD_CHANGE_KEY,
      callerOf(context),
      this.config.get('RATE_LIMIT_PASSWORD_CHANGE_PER_ACCOUNT_HOURLY', {
        infer: true,
      }),
      SECONDS_PER_HOUR,
    );

    return true;
  }
}
