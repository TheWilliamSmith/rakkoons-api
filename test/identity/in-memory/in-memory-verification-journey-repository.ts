import { VerificationJourneyRepository } from '@identity/domain/ports/verification-journey-repository';
import { VerificationJourney } from '@identity/domain/verification/verification-journey';
import { VerificationPurpose } from '@identity/domain/verification/verification-purpose';
import { VerificationJourneyState } from '@identity/domain/verification/verification-journey-state';

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

  consumeActiveForAccount(
    accountId: string,
    purpose: VerificationPurpose,
    consumedAt: Date,
  ): Promise<void> {
    for (const [id, journey] of this.journeys) {
      if (
        journey.accountId === accountId &&
        journey.purpose === purpose &&
        !journey.isConsumed()
      ) {
        this.journeys.set(id, consume(journey, consumedAt));
      }
    }

    return Promise.resolve();
  }

  count(): number {
    return this.journeys.size;
  }
}

function consume(
  journey: VerificationJourney,
  consumedAt: Date,
): VerificationJourney {
  const state: VerificationJourneyState = {
    id: journey.id,
    purpose: journey.purpose,
    accountId: journey.accountId,
    codeHash: journey.codeHash,
    attemptsLeft: journey.attemptsLeft,
    codeExpiresAt: journey.codeExpiresAt,
    expiresAt: journey.expiresAt,
    verifiedAt: journey.verifiedAt,
    consumedAt,
    createdAt: journey.createdAt,
  };

  return VerificationJourney.restore(state);
}
