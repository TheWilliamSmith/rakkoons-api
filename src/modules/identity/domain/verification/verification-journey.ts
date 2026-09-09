import { VerificationAttemptsExhaustedError } from '../errors/verification-attempts-exhausted.error';
import { VerificationCodeRejectedError } from '../errors/verification-code-rejected.error';
import { SecretHasher } from '../ports/secret-hasher';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import { VerificationPurpose } from './verification-purpose';

interface VerificationJourneyState {
  id: string;
  purpose: VerificationPurpose;
  accountId: string | null;
  codeHash: PasswordHash;
  attemptsLeft: number;
  codeExpiresAt: Date;
  expiresAt: Date;
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

export class VerificationJourney {
  private constructor(private readonly state: VerificationJourneyState) {}

  static open(
    parameters: OpenVerificationJourneyParameters,
  ): VerificationJourney {
    return new VerificationJourney({
      id: parameters.id,
      purpose: parameters.purpose,
      accountId: parameters.accountId,
      codeHash: parameters.codeHash,
      attemptsLeft: parameters.maxAttempts,
      codeExpiresAt: parameters.codeExpiresAt,
      expiresAt: parameters.expiresAt,
      consumedAt: null,
      createdAt: parameters.openedAt,
    });
  }

  static restore(state: VerificationJourneyState): VerificationJourney {
    return new VerificationJourney({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get purpose(): VerificationPurpose {
    return this.state.purpose;
  }

  get accountId(): string | null {
    return this.state.accountId;
  }

  get codeHash(): PasswordHash {
    return this.state.codeHash;
  }

  get attemptsLeft(): number {
    return this.state.attemptsLeft;
  }

  get codeExpiresAt(): Date {
    return new Date(this.state.codeExpiresAt);
  }

  get expiresAt(): Date {
    return new Date(this.state.expiresAt);
  }

  get consumedAt(): Date | null {
    return this.state.consumedAt === null
      ? null
      : new Date(this.state.consumedAt);
  }

  get createdAt(): Date {
    return new Date(this.state.createdAt);
  }

  isConsumed(): boolean {
    return this.state.consumedAt !== null;
  }

  async submitCode(
    code: VerificationCode,
    hasher: SecretHasher,
    submittedAt: Date,
  ): Promise<void> {
    if (this.isConsumed() || this.hasExpired(submittedAt)) {
      throw new VerificationCodeRejectedError();
    }

    if (this.state.attemptsLeft <= 0) {
      throw new VerificationAttemptsExhaustedError();
    }

    this.state.attemptsLeft -= 1;

    const matches = await hasher.matches(code.reveal(), this.state.codeHash);

    if (matches) {
      this.state.consumedAt = submittedAt;
      return;
    }

    if (this.state.attemptsLeft <= 0) {
      this.state.consumedAt = submittedAt;
      throw new VerificationAttemptsExhaustedError();
    }

    throw new VerificationCodeRejectedError();
  }

  private hasExpired(instant: Date): boolean {
    return (
      instant.getTime() >= this.state.expiresAt.getTime() ||
      instant.getTime() >= this.state.codeExpiresAt.getTime()
    );
  }
}
