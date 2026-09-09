import { VerificationJourneyRepository } from '@identity/domain/ports/verification-journey-repository';
import { VerificationJourney } from '@identity/domain/verification/verification-journey';

export class InMemoryVerificationJourneyRepository implements VerificationJourneyRepository {
  private readonly journeys = new Map<string, VerificationJourney>();

  findById(id: string): Promise<VerificationJourney | null> {
    return Promise.resolve(this.journeys.get(id) ?? null);
  }

  add(journey: VerificationJourney): Promise<void> {
    this.journeys.set(journey.id, journey);
    return Promise.resolve();
  }

  save(journey: VerificationJourney): Promise<void> {
    this.journeys.set(journey.id, journey);
    return Promise.resolve();
  }

  count(): number {
    return this.journeys.size;
  }
}
