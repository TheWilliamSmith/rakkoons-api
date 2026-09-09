import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../../domain/ports/password-hasher';
import { PasswordHash } from '../../domain/value-objects/password-hash';
import { PlainPassword } from '../../domain/value-objects/plain-password';

const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const DECOY_PASSWORD = 'decoy-password-for-constant-time';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  private decoyHash: Promise<string> | null = null;

  async hash(password: PlainPassword): Promise<PasswordHash> {
    return PasswordHash.fromStoredValue(
      await argon2.hash(password.reveal(), ARGON2_OPTIONS),
    );
  }

  matches(password: PlainPassword, hash: PasswordHash): Promise<boolean> {
    return argon2.verify(hash.toString(), password.reveal());
  }

  async verifyDecoy(): Promise<void> {
    this.decoyHash ??= argon2.hash(DECOY_PASSWORD, ARGON2_OPTIONS);

    await argon2.verify(await this.decoyHash, DECOY_PASSWORD);
  }
}
