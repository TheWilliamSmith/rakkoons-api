import { DomainError } from '../../../../shared/domain/domain-error';

export class PasswordTooShortError extends DomainError {
  constructor() {
    super();
  }
}
