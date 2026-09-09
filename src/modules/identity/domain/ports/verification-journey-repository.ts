import { VerificationJourney } from '../verification/verification-journey';

export interface VerificationJourneyRepository {
  findById(id: string): Promise<VerificationJourney | null>;
  add(journey: VerificationJourney): Promise<void>;
  save(journey: VerificationJourney): Promise<void>;
}
