export const FailureReason = {
  InvalidCredentials: 'invalid-credentials',
  InvalidCode: 'invalid-code',
  UsernameTaken: 'username-taken',
  Unavailable: 'unavailable',
} as const;

export type FailureReason = (typeof FailureReason)[keyof typeof FailureReason];

export interface FailureBody {
  error: { reason: FailureReason };
}
