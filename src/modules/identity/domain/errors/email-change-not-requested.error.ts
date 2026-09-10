import { DomainError } from '../../../../shared/domain/domain-error';

export class EmailChangeNotRequestedError extends DomainError {
  constructor() {
    super();
  }
}
