import { UnitOfWork } from '@identity/domain/ports/unit-of-work';

export class DirectUnitOfWork implements UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
