import { DomainError } from '../../../../shared/domain/domain-error';
import { PasswordResetAttemptsExhaustedError } from '../errors/password-reset-attempts-exhausted.error';
import { PasswordResetCodeRejectedError } from '../errors/password-reset-code-rejected.error';
import { VerificationAttemptsExhaustedError } from '../errors/verification-attempts-exhausted.error';
import { VerificationCodeRejectedError } from '../errors/verification-code-rejected.error';
import { VerificationPurpose } from './verification-purpose';

export interface VerificationRejections {
  rejected(): DomainError;
  exhausted(): DomainError;
}

const REJECTIONS: Record<VerificationPurpose, VerificationRejections> = {
  [VerificationPurpose.SignUp]: {
    rejected: (): DomainError => new VerificationCodeRejectedError(),
    exhausted: (): DomainError => new VerificationAttemptsExhaustedError(),
  },
  [VerificationPurpose.PasswordReset]: {
    rejected: (): DomainError => new PasswordResetCodeRejectedError(),
    exhausted: (): DomainError => new PasswordResetAttemptsExhaustedError(),
  },
};

export function rejectionsFor(
  purpose: VerificationPurpose,
): VerificationRejections {
  return REJECTIONS[purpose];
}
