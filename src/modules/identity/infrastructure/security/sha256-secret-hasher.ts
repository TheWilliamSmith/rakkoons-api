import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../domain/ports/secret-hasher';
import { PasswordHash } from '../../domain/value-objects/password-hash';

const DIGEST_ALGORITHM = 'sha256';
const DIGEST_ENCODING = 'hex';

@Injectable()
export class Sha256SecretHasher implements SecretHasher {
  hash(secret: string): Promise<PasswordHash> {
    return Promise.resolve(PasswordHash.fromStoredValue(this.digest(secret)));
  }

  matches(secret: string, hash: PasswordHash): Promise<boolean> {
    const candidate = Buffer.from(this.digest(secret), DIGEST_ENCODING);
    const expected = Buffer.from(hash.toString(), DIGEST_ENCODING);

    if (candidate.length !== expected.length) {
      return Promise.resolve(false);
    }

    return Promise.resolve(timingSafeEqual(candidate, expected));
  }

  private digest(secret: string): string {
    return createHash(DIGEST_ALGORITHM).update(secret).digest(DIGEST_ENCODING);
  }
}
