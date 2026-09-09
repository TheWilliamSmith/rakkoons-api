import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { UsernameAlreadyTakenError } from '../../domain/errors/username-already-taken.error';

const UNIQUE_VIOLATION_CODE = 'P2002';
const USERNAME_MARKER = '"username"';
const EMAIL_MARKER = '"email"';

interface KnownRequestError {
  code: string;
  meta?: unknown;
}

function asUniqueViolation(error: unknown): KnownRequestError | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const candidate = error as KnownRequestError;

  return candidate.code === UNIQUE_VIOLATION_CODE ? candidate : null;
}

export function translateUniqueViolation(error: unknown): never {
  const violation = asUniqueViolation(error);

  if (violation !== null) {
    const details = JSON.stringify(violation.meta ?? '');

    if (details.includes(USERNAME_MARKER)) {
      throw new UsernameAlreadyTakenError();
    }

    if (details.includes(EMAIL_MARKER)) {
      throw new EmailAlreadyRegisteredError();
    }
  }

  throw error;
}
