import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { type Env } from '../../../../config/env.validation';
import { SignInCodeThrottle } from '../../domain/ports/sign-in-code-throttle';
import { EmailAddress } from '../../domain/value-objects/email-address';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const FIRST_HIT = 1;
const SINGLE_REQUEST = 1;

const IntervalBucket = 'sign-in-code-interval';
const HourlyBucket = 'sign-in-code-hourly';
const OriginPairBucket = 'sign-in-code-origin-pair';
const OriginSpreadBucket = 'sign-in-code-origin-spread';

@Injectable()
export class ThrottlerSignInCodeThrottle implements SignInCodeThrottle {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async allowsCodeFor(
    recipient: EmailAddress,
    origin: string,
  ): Promise<boolean> {
    const address = fingerprint(recipient.toString());

    const withinInterval = await this.hit(
      IntervalBucket,
      address,
      this.config.get('SIGNIN_CODE_MIN_INTERVAL_SECONDS', { infer: true }),
      SINGLE_REQUEST,
    );

    const withinHourly = await this.hit(
      HourlyBucket,
      address,
      SECONDS_PER_HOUR,
      this.config.get('RATE_LIMIT_SIGNIN_CODE_PER_ACCOUNT_HOURLY', {
        infer: true,
      }),
    );

    const withinSpread = await this.allowsOriginSpread(origin, address);

    return withinInterval && withinHourly && withinSpread;
  }

  private async allowsOriginSpread(
    origin: string,
    address: string,
  ): Promise<boolean> {
    const pair = await this.storage.increment(
      `${OriginPairBucket}:${fingerprint(origin)}:${address}`,
      SECONDS_PER_HOUR * MILLISECONDS_PER_SECOND,
      Number.MAX_SAFE_INTEGER,
      0,
      OriginPairBucket,
    );

    if (pair.totalHits !== FIRST_HIT) {
      return true;
    }

    return this.hit(
      OriginSpreadBucket,
      fingerprint(origin),
      SECONDS_PER_HOUR,
      this.config.get('RATE_LIMIT_SIGNIN_CODE_ADDRESSES_PER_ORIGIN_HOURLY', {
        infer: true,
      }),
    );
  }

  private async hit(
    bucket: string,
    subject: string,
    windowSeconds: number,
    limit: number,
  ): Promise<boolean> {
    const window = windowSeconds * MILLISECONDS_PER_SECOND;
    const record = await this.storage.increment(
      `${bucket}:${subject}`,
      window,
      limit,
      window,
      bucket,
    );

    return !record.isBlocked;
  }
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
