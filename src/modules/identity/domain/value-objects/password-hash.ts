export class PasswordHash {
  private constructor(private readonly value: string) {}

  static fromStoredValue(value: string): PasswordHash {
    return new PasswordHash(value);
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
