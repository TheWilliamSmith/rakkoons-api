export interface RegistrationPolicy {
  readonly journeyLifetime: number;
  readonly codeLifetime: number;
  readonly maxVerificationAttempts: number;
  readonly termsVersion: string;
}

export interface SessionPolicy {
  readonly slidingLifetime: number;
  readonly absoluteLifetime: number;
}
