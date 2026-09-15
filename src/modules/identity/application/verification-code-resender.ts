import { SecretHasher } from '../domain/ports/secret-hasher';
import { VerificationCodeGenerator } from '../domain/ports/verification-code-generator';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationPolicy } from './identity-policy';

interface VerificationCodeResenderDependencies {
  journeys: VerificationJourneyRepository;
  secretHasher: SecretHasher;
  codes: VerificationCodeGenerator;
  policy: VerificationPolicy;
}

export class VerificationCodeResender {
  constructor(
    private readonly dependencies: VerificationCodeResenderDependencies,
  ) {}

  async load(
    journeyId: string | null,
    purpose: VerificationPurpose,
  ): Promise<VerificationJourney | null> {
    if (journeyId === null) {
      return null;
    }

    const journey = await this.dependencies.journeys.findById(journeyId);

    if (journey === null || journey.purpose !== purpose) {
      return null;
    }

    return journey;
  }

  async renew(
    journey: VerificationJourney,
    renewedAt: Date,
  ): Promise<VerificationCode> {
    const code = this.dependencies.codes.generate();

    journey.renewCode(
      await this.dependencies.secretHasher.hash(code.reveal()),
      new Date(renewedAt.getTime() + this.dependencies.policy.codeLifetime),
      renewedAt,
    );

    await this.dependencies.journeys.save(journey);

    return code;
  }
}
