import { DomainError } from '../../../../shared/domain/domain-error';

export class AccountNotActivatedError extends DomainError {
  constructor() {
    super();
  }
}
