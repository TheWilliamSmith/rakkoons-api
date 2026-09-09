import { SecretHasher } from '@identity/domain/ports/secret-hasher';
import { PasswordHash } from '@identity/domain/value-objects/password-hash';

const HASH_PREFIX = 'hashed:';

export class TrivialSecretHasher implements SecretHasher {
  hash(secret: string): Promise<PasswordHash> {
    return Promise.resolve(
      PasswordHash.fromStoredValue(`${HASH_PREFIX}${secret}`),
    );
  }

  matches(secret: string, hash: PasswordHash): Promise<boolean> {
    return Promise.resolve(`${HASH_PREFIX}${secret}` === hash.toString());
  }
}
