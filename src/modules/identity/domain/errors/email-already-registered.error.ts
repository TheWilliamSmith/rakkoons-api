import { DomainError } from '../../../../shared/domain/domain-error';

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super();
  }
}
