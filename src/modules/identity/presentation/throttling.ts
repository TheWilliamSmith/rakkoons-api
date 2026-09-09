import { SkipThrottle } from '@nestjs/throttler';

export const ThrottlerName = {
  UsernameAvailability: 'username-availability',
  SignUp: 'sign-up',
  SignUpVerify: 'sign-up-verify',
  SignIn: 'sign-in',
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
