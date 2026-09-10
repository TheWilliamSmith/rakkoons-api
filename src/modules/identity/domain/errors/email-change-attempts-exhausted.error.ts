import { DomainError } from '../../../../shared/domain/domain-error';

export class EmailChangeAttemptsExhaustedError extends DomainError {
  constructor() {
    super();
  }
}
