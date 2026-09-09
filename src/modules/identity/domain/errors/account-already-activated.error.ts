import { DomainError } from '../../../../shared/domain/domain-error';

export class AccountAlreadyActivatedError extends DomainError {
  constructor() {
    super();
  }
}
