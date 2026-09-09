import { PasswordTooShortError } from '../errors/password-too-short.error';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 256;
const REDACTED = '[redacted]';
const NODE_INSPECT = Symbol.for('nodejs.util.inspect.custom');

export class PlainPassword {
  private constructor(private readonly value: string) {}

  static create(raw: string): PlainPassword {
    if (raw.length < MIN_PASSWORD_LENGTH || raw.length > MAX_PASSWORD_LENGTH) {
      throw new PasswordTooShortError();
    }

    return new PlainPassword(raw);
  }

  reveal(): string {
    return this.value;
  }

  toJSON(): string {
    return REDACTED;
  }

  toString(): string {
    return REDACTED;
  }

  [NODE_INSPECT](): string {
    return REDACTED;
  }
}
