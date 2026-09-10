import { DomainError } from '../../../../shared/domain/domain-error';

export class PasswordResetAttemptsExhaustedError extends DomainError {
  constructor() {
    super();
  }
}
