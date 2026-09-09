export const VerificationPurpose = {
  SignUp: 'sign-up',
  PasswordReset: 'password-reset',
} as const;

export type VerificationPurpose =
  (typeof VerificationPurpose)[keyof typeof VerificationPurpose];
