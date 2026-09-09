import { DomainError } from '../../../../shared/domain/domain-error';

export class VerificationAttemptsExhaustedError extends DomainError {
  constructor() {
    super();
  }
}
