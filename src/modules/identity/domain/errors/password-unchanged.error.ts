import { DomainError } from '../../../../shared/domain/domain-error';

export class PasswordUnchangedError extends DomainError {
  constructor() {
    super();
  }
}
