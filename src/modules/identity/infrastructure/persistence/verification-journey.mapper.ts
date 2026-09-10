import { PasswordHash } from '../../domain/value-objects/password-hash';
import { VerificationJourney } from '../../domain/verification/verification-journey';
import { VerificationPurpose } from '../../domain/verification/verification-purpose';

export interface VerificationJourneyRecord {
  id: string;
  purpose: 'SIGN_UP' | 'PASSWORD_RESET';
  accountId: string | null;
  codeHash: string;
  attemptsLeft: number;
  codeExpiresAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}

const PURPOSE_TO_DOMAIN: Record<
  VerificationJourneyRecord['purpose'],
  VerificationPurpose
> = {
  SIGN_UP: VerificationPurpose.SignUp,
  PASSWORD_RESET: VerificationPurpose.PasswordReset,
};

const PURPOSE_TO_RECORD: Record<
  VerificationPurpose,
  VerificationJourneyRecord['purpose']
> = {
  [VerificationPurpose.SignUp]: 'SIGN_UP',
  [VerificationPurpose.PasswordReset]: 'PASSWORD_RESET',
};

export const VERIFICATION_JOURNEY_SELECTION = {
  id: true,
  purpose: true,
  accountId: true,
  codeHash: true,
  attemptsLeft: true,
  codeExpiresAt: true,
  expiresAt: true,
  verifiedAt: true,
  consumedAt: true,
  createdAt: true,
} as const;

export class VerificationJourneyMapper {
  static toRecordPurpose(
    purpose: VerificationPurpose,
  ): VerificationJourneyRecord['purpose'] {
    return PURPOSE_TO_RECORD[purpose];
  }

  static toDomain(record: VerificationJourneyRecord): VerificationJourney {
    return VerificationJourney.restore({
      id: record.id,
      purpose: PURPOSE_TO_DOMAIN[record.purpose],
      accountId: record.accountId,
      codeHash: PasswordHash.fromStoredValue(record.codeHash),
      attemptsLeft: record.attemptsLeft,
      codeExpiresAt: record.codeExpiresAt,
      expiresAt: record.expiresAt,
      verifiedAt: record.verifiedAt,
      consumedAt: record.consumedAt,
      createdAt: record.createdAt,
    });
  }

  static toRecord(journey: VerificationJourney): VerificationJourneyRecord {
    return {
      id: journey.id,
      purpose: PURPOSE_TO_RECORD[journey.purpose],
      accountId: journey.accountId,
      codeHash: journey.codeHash.toString(),
      attemptsLeft: journey.attemptsLeft,
      codeExpiresAt: journey.codeExpiresAt,
      expiresAt: journey.expiresAt,
      verifiedAt: journey.verifiedAt,
      consumedAt: journey.consumedAt,
      createdAt: journey.createdAt,
    };
  }
}
