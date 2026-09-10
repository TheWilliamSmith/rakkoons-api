import { DomainError } from '../../../../shared/domain/domain-error';

export class SignInAttemptsExhaustedError extends DomainError {
  constructor() {
    super();
  }
}
