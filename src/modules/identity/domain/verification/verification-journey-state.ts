import { PasswordHash } from '../value-objects/password-hash';
import { VerificationPurpose } from './verification-purpose';

export interface VerificationJourneyState {
  id: string;
  purpose: VerificationPurpose;
  accountId: string | null;
  codeHash: PasswordHash;
  attemptsLeft: number;
  codeExpiresAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface OpenVerificationJourneyParameters {
  id: string;
  purpose: VerificationPurpose;
  accountId: string | null;
  codeHash: PasswordHash;
  maxAttempts: number;
  codeExpiresAt: Date;
  expiresAt: Date;
  openedAt: Date;
}
