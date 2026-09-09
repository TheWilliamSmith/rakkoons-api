import { PasswordHasher } from '@identity/domain/ports/password-hasher';
import { PasswordHash } from '@identity/domain/value-objects/password-hash';
import { PlainPassword } from '@identity/domain/value-objects/plain-password';

const HASH_PREFIX = 'hashed:';

export class TrivialPasswordHasher implements PasswordHasher {
  decoyVerifications = 0;

  hash(password: PlainPassword): Promise<PasswordHash> {
    return Promise.resolve(
      PasswordHash.fromStoredValue(`${HASH_PREFIX}${password.reveal()}`),
    );
  }

  matches(password: PlainPassword, hash: PasswordHash): Promise<boolean> {
    return Promise.resolve(
      `${HASH_PREFIX}${password.reveal()}` === hash.toString(),
    );
  }

  verifyDecoy(): Promise<void> {
    this.decoyVerifications += 1;
    return Promise.resolve();
  }
}
