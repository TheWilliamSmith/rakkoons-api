export const FailureReason = {
  InvalidCredentials: 'invalid-credentials',
  InvalidCode: 'invalid-code',
  Unauthenticated: 'unauthenticated',
  InvalidUsername: 'invalid-username',
  NotFound: 'not-found',
  UsernameTaken: 'username-taken',
  EmailTaken: 'email-taken',
  Unavailable: 'unavailable',
} as const;

export type FailureReason = (typeof FailureReason)[keyof typeof FailureReason];

export interface FailureBody {
  error: { reason: FailureReason };
}
