export const VerificationPurpose = {
  SignUp: 'sign-up',
  SignIn: 'sign-in',
  PasswordReset: 'password-reset',
} as const;

export type VerificationPurpose =
  (typeof VerificationPurpose)[keyof typeof VerificationPurpose];
