import { HttpStatus } from '@nestjs/common';
import { FailureReason } from './failure-reason';

export interface HttpFailure {
  status: HttpStatus;
  reason: FailureReason;
}

export const DOMAIN_ERROR_HTTP_MAP: Record<string, HttpFailure> = {
  UsernameAlreadyTakenError: {
    status: HttpStatus.CONFLICT,
    reason: FailureReason.UsernameTaken,
  },
  CredentialsRejectedError: {
    status: HttpStatus.UNAUTHORIZED,
    reason: FailureReason.InvalidCredentials,
  },
  AccountNotActivatedError: {
    status: HttpStatus.UNAUTHORIZED,
    reason: FailureReason.InvalidCredentials,
  },
  InvalidEmailAddressError: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    reason: FailureReason.InvalidCredentials,
  },
  InvalidUsernameError: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    reason: FailureReason.InvalidCredentials,
  },
  PasswordTooShortError: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    reason: FailureReason.InvalidCredentials,
  },
  TermsNotAcceptedError: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    reason: FailureReason.InvalidCredentials,
  },
  InvalidVerificationCodeError: {
    status: HttpStatus.BAD_REQUEST,
    reason: FailureReason.InvalidCode,
  },
  VerificationCodeRejectedError: {
    status: HttpStatus.BAD_REQUEST,
    reason: FailureReason.InvalidCode,
  },
  VerificationJourneyNotFoundError: {
    status: HttpStatus.BAD_REQUEST,
    reason: FailureReason.InvalidCode,
  },
  VerificationAttemptsExhaustedError: {
    status: HttpStatus.BAD_REQUEST,
    reason: FailureReason.InvalidCode,
  },
  AccountAlreadyActivatedError: {
    status: HttpStatus.BAD_REQUEST,
    reason: FailureReason.InvalidCode,
  },
  EmailAlreadyRegisteredError: {
    status: HttpStatus.CONFLICT,
    reason: FailureReason.EmailTaken,
  },
};
