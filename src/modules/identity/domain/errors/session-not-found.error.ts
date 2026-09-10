import { DomainError } from '../../../../shared/domain/domain-error';

export class SessionNotFoundError extends DomainError {
  constructor() {
    super();
  }
}
