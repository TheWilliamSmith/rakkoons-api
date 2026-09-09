import { PasswordHash } from '../value-objects/password-hash';

export interface SecretHasher {
  hash(secret: string): Promise<PasswordHash>;
  matches(secret: string, hash: PasswordHash): Promise<boolean>;
}
