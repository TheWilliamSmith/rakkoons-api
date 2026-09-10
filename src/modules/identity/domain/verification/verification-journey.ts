import { SecretHasher } from '../ports/secret-hasher';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import {
  OpenVerificationJourneyParameters,
  VerificationJourneyState,
} from './verification-journey-state';
import { VerificationPurpose } from './verification-purpose';
import { rejectionsFor } from './verification-rejections';

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
      verifiedAt: null,
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

  get verifiedAt(): Date | null {
    return this.state.verifiedAt === null
      ? null
      : new Date(this.state.verifiedAt);
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

  isVerified(): boolean {
    return this.state.verifiedAt !== null;
  }

  async submitCode(
    code: VerificationCode,
    hasher: SecretHasher,
    submittedAt: Date,
  ): Promise<void> {
    await this.checkCode(code, hasher, submittedAt);
    this.state.consumedAt = submittedAt;
  }

  async verifyCode(
    code: VerificationCode,
    hasher: SecretHasher,
    submittedAt: Date,
  ): Promise<void> {
    await this.checkCode(code, hasher, submittedAt);
    this.state.verifiedAt = submittedAt;
  }

  consumeVerified(consumedAt: Date): void {
    if (
      !this.isVerified() ||
      this.isConsumed() ||
      this.hasExpired(consumedAt)
    ) {
      throw rejectionsFor(this.state.purpose).rejected();
    }

    this.state.consumedAt = consumedAt;
  }

  private async checkCode(
    code: VerificationCode,
    hasher: SecretHasher,
    submittedAt: Date,
  ): Promise<void> {
    const rejections = rejectionsFor(this.state.purpose);

    if (this.isConsumed() || this.hasExpired(submittedAt)) {
      throw rejections.rejected();
    }

    if (this.state.attemptsLeft <= 0) {
      throw rejections.exhausted();
    }

    this.state.attemptsLeft -= 1;

    if (await hasher.matches(code.reveal(), this.state.codeHash)) {
      return;
    }

    if (this.state.attemptsLeft <= 0) {
      this.state.consumedAt = submittedAt;
      throw rejections.exhausted();
    }

    throw rejections.rejected();
  }

  private hasExpired(instant: Date): boolean {
    return (
      instant.getTime() >= this.state.expiresAt.getTime() ||
      instant.getTime() >= this.state.codeExpiresAt.getTime()
    );
  }
}
