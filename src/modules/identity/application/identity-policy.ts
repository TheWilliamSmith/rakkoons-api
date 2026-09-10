export interface VerificationPolicy {
  readonly journeyLifetime: number;
  readonly codeLifetime: number;
  readonly maxVerificationAttempts: number;
}

export interface RegistrationPolicy extends VerificationPolicy {
  readonly termsVersion: string;
}

export type PasswordResetPolicy = VerificationPolicy;

export type SignInCodePolicy = VerificationPolicy;

export interface SessionPolicy {
  readonly slidingLifetime: number;
  readonly absoluteLifetime: number;
}
