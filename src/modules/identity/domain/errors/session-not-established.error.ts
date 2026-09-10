import { DomainError } from '../../../../shared/domain/domain-error';

export class SessionNotEstablishedError extends DomainError {
  constructor() {
    super();
  }
}
