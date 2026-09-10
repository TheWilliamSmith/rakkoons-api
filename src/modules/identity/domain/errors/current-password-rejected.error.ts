import { DomainError } from '../../../../shared/domain/domain-error';

export class CurrentPasswordRejectedError extends DomainError {
  constructor() {
    super();
  }
}
