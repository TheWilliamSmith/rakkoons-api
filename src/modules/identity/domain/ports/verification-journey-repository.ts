import { VerificationJourney } from '../verification/verification-journey';
import { VerificationPurpose } from '../verification/verification-purpose';

export interface VerificationJourneyRepository {
  findById(id: string): Promise<VerificationJourney | null>;
  add(journey: VerificationJourney): Promise<void>;
  save(journey: VerificationJourney): Promise<void>;
  consumeActiveForAccount(
    accountId: string,
    purpose: VerificationPurpose,
    consumedAt: Date,
  ): Promise<void>;
}
