export const VerificationPurpose = {
  SignUp: 'sign-up',
  SignIn: 'sign-in',
  PasswordReset: 'password-reset',
  EmailChange: 'email-change',
} as const;

export type VerificationPurpose =
  (typeof VerificationPurpose)[keyof typeof VerificationPurpose];
