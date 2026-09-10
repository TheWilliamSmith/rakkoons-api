import { DomainError } from '../../../../shared/domain/domain-error';

export class AccountDeletionNotScheduledError extends DomainError {
  constructor() {
    super();
  }
}
