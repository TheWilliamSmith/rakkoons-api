import { DomainError } from '../../../../shared/domain/domain-error';

export class CredentialsRejectedError extends DomainError {
  constructor() {
    super();
  }
}
