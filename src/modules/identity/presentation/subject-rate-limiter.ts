import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { type Env } from '../../../config/env.validation';

const MILLISECONDS_PER_SECOND = 1000;

@Injectable()
export class SubjectRateLimiter {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async consume(
    bucket: string,
    subject: unknown,
    limit: number,
    windowSeconds?: number,
  ): Promise<void> {
    if (typeof subject !== 'string' || subject.length === 0) {
      return;
    }

    const seconds =
      windowSeconds === undefined
        ? this.config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true })
        : windowSeconds;
    const window = seconds * MILLISECONDS_PER_SECOND;

    const record = await this.storage.increment(
      `${bucket}:${fingerprint(subject)}`,
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
