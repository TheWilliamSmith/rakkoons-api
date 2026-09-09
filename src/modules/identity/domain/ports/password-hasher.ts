import { PasswordHash } from '../value-objects/password-hash';
import { PlainPassword } from '../value-objects/plain-password';

export interface PasswordHasher {
  hash(password: PlainPassword): Promise<PasswordHash>;
  matches(password: PlainPassword, hash: PasswordHash): Promise<boolean>;
  verifyDecoy(): Promise<void>;
}
