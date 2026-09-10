import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env } from '../../../config/env.validation';
import { RequestWithCaller } from './authenticated-caller';
import { SubjectRateLimiter } from './subject-rate-limiter';

const SECONDS_PER_HOUR = 3600;
const EMAIL_CHANGE_KEY = 'account-email-change';

@Injectable()
export class EmailChangeThrottlerGuard implements CanActivate {
  constructor(
    private readonly limiter: SubjectRateLimiter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCaller>();

    await this.limiter.consume(
      EMAIL_CHANGE_KEY,
      request.caller?.accountId,
      this.config.get('RATE_LIMIT_EMAIL_CHANGE_PER_ACCOUNT_HOURLY', {
        infer: true,
      }),
      SECONDS_PER_HOUR,
    );

    return true;
  }
}
