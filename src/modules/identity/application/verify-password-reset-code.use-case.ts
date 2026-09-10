import { DomainError } from '../../../shared/domain/domain-error';
import { Clock } from '../domain/ports/clock';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import {
  loadPasswordResetJourney,
  parsePasswordResetCode,
} from './password-reset-journey';

export interface VerifyPasswordResetCodeInput {
  journeyId: string | null;
  code: string;
}

interface VerifyPasswordResetCodeDependencies {
  journeys: VerificationJourneyRepository;
  secretHasher: SecretHasher;
  clock: Clock;
}

export class VerifyPasswordResetCodeUseCase {
  constructor(
    private readonly dependencies: VerifyPasswordResetCodeDependencies,
  ) {}

  async execute(input: VerifyPasswordResetCodeInput): Promise<void> {
    const code = parsePasswordResetCode(input.code);
    const journey = await loadPasswordResetJourney(
      this.dependencies.journeys,
      input.journeyId,
    );

    const submittedAt = this.dependencies.clock.now();
    const rejection = await this.verify(journey, code, submittedAt);

    await this.dependencies.journeys.save(journey);

    if (rejection !== null) {
      throw rejection;
    }
  }

  private async verify(
    journey: VerificationJourney,
    code: VerificationCode,
    submittedAt: Date,
  ): Promise<DomainError | null> {
    try {
      await journey.verifyCode(
        code,
        this.dependencies.secretHasher,
        submittedAt,
      );
      return null;
    } catch (rejection) {
      if (rejection instanceof DomainError) {
        return rejection;
      }
      throw rejection;
    }
  }
}
