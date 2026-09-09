import { InvalidUsernameError } from '../errors/invalid-username.error';

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;

export class Username {
  private constructor(private readonly value: string) {}

  static create(raw: string): Username {
    const normalized = raw.trim().toLowerCase();

    if (
      normalized.length < MIN_USERNAME_LENGTH ||
      normalized.length > MAX_USERNAME_LENGTH ||
      !USERNAME_PATTERN.test(normalized)
    ) {
      throw new InvalidUsernameError();
    }

    return new Username(normalized);
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
