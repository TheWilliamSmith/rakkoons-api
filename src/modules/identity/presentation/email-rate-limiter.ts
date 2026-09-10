import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { type Env } from '../../../config/env.validation';

const MILLISECONDS_PER_SECOND = 1000;

@Injectable()
export class EmailRateLimiter {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async consume(bucket: string, email: unknown, limit: number): Promise<void> {
    if (typeof email !== 'string' || email.length === 0) {
      return;
    }

    const window =
      this.config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }) *
      MILLISECONDS_PER_SECOND;

    const record = await this.storage.increment(
      `${bucket}:${fingerprint(email)}`,
      window,
      limit,
      window,
      bucket,
    );

    if (record.isBlocked) {
      throw new ThrottlerException();
    }
  }
}

function fingerprint(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}
