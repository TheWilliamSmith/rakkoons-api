import { DomainError } from '../../../../shared/domain/domain-error';

export class InvalidUsernameError extends DomainError {
  constructor() {
    super();
  }
}
