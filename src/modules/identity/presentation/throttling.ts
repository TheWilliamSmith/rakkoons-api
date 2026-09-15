import { SkipThrottle } from '@nestjs/throttler';

export const ThrottlerName = {
  UsernameAvailability: 'username-availability',
  SignUp: 'sign-up',
  SignUpVerify: 'sign-up-verify',
  SignUpResend: 'sign-up-resend',
  SignIn: 'sign-in',
  SignInCodeVerify: 'sign-in-code-verify',
  PasswordReset: 'password-reset',
  PasswordResetVerify: 'password-reset-verify',
  PasswordResetConfirm: 'password-reset-confirm',
  PasswordResetResend: 'password-reset-resend',
} as const;

export type ThrottlerName = (typeof ThrottlerName)[keyof typeof ThrottlerName];

const ALL_THROTTLERS = Object.values(ThrottlerName);

export function throttleOnly(
  active: ThrottlerName,
): MethodDecorator & ClassDecorator {
  return SkipThrottle(
    Object.fromEntries(
      ALL_THROTTLERS.filter((name) => name !== active).map((name) => [
        name,
        true,
      ]),
    ),
  );
}
