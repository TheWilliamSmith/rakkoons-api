import { IdentifierGenerator } from '../domain/ports/identifier-generator';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationPolicy } from './identity-policy';

interface VerificationJourneyOpenerDependencies {
  secretHasher: SecretHasher;
  identifiers: IdentifierGenerator;
  policy: VerificationPolicy;
}

export class VerificationJourneyOpener {
  constructor(
    private readonly dependencies: VerificationJourneyOpenerDependencies,
  ) {}

  async open(
    purpose: VerificationPurpose,
    accountId: string | null,
    secret: string,
    openedAt: Date,
  ): Promise<VerificationJourney> {
    const codeHash = await this.dependencies.secretHasher.hash(secret);
    const openedAtTime = openedAt.getTime();

    return VerificationJourney.open({
      id: this.dependencies.identifiers.generate(),
      purpose,
      accountId,
      codeHash,
      maxAttempts: this.dependencies.policy.maxVerificationAttempts,
      codeExpiresAt: new Date(
        openedAtTime + this.dependencies.policy.codeLifetime,
      ),
      expiresAt: new Date(
        openedAtTime + this.dependencies.policy.journeyLifetime,
      ),
      openedAt,
    });
  }
}
