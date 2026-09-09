import { SecretGenerator } from '@identity/domain/ports/secret-generator';

export class SequentialSecretGenerator implements SecretGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `secret-${this.counter}`;
  }
}
