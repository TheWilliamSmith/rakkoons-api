import { DomainError } from '../../../../shared/domain/domain-error';

export class InvalidEmailAddressError extends DomainError {
  constructor() {
    super();
  }
}
