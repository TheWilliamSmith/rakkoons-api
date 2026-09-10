import { DomainError } from '../../../../shared/domain/domain-error';
import { EmailChangeAttemptsExhaustedError } from '../errors/email-change-attempts-exhausted.error';
import { EmailChangeCodeRejectedError } from '../errors/email-change-code-rejected.error';
import { PasswordResetAttemptsExhaustedError } from '../errors/password-reset-attempts-exhausted.error';
import { PasswordResetCodeRejectedError } from '../errors/password-reset-code-rejected.error';
import { SignInAttemptsExhaustedError } from '../errors/sign-in-attempts-exhausted.error';
import { SignInCodeRejectedError } from '../errors/sign-in-code-rejected.error';
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
  [VerificationPurpose.SignIn]: {
    rejected: (): DomainError => new SignInCodeRejectedError(),
    exhausted: (): DomainError => new SignInAttemptsExhaustedError(),
  },
  [VerificationPurpose.EmailChange]: {
    rejected: (): DomainError => new EmailChangeCodeRejectedError(),
    exhausted: (): DomainError => new EmailChangeAttemptsExhaustedError(),
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
