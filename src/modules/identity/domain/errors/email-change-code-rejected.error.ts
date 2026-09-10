import { DomainError } from '../../../../shared/domain/domain-error';

export class EmailChangeCodeRejectedError extends DomainError {
  constructor() {
    super();
  }
}
