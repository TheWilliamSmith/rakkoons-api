import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { Request } from 'express';
import { type Env } from '../../../config/env.validation';

const MILLISECONDS_PER_SECOND = 1000;
const THROTTLER_KEY = 'sign-in-account';

@Injectable()
export class SignInAccountThrottlerGuard implements CanActivate {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request<unknown, unknown, { email?: unknown }>>();
    const email = request.body?.email;

    if (typeof email !== 'string' || email.length === 0) {
      return true;
    }

    const window =
      this.config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }) *
      MILLISECONDS_PER_SECOND;
    const limit = this.config.get('RATE_LIMIT_SIGN_IN_PER_ACCOUNT', {
      infer: true,
    });

    const record = await this.storage.increment(
      `${THROTTLER_KEY}:${this.fingerprint(email)}`,
      window,
      limit,
      window,
      THROTTLER_KEY,
    );

    if (record.isBlocked) {
      throw new ThrottlerException();
    }

    return true;
  }

  private fingerprint(email: string): string {
    return createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');
  }
}
