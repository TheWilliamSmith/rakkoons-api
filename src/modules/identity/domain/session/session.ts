import { PasswordHash } from '../value-objects/password-hash';

interface SessionState {
  id: string;
  accountId: string;
  identifierHash: PasswordHash;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface OpenSessionParameters {
  id: string;
  accountId: string;
  identifierHash: PasswordHash;
  slidingLifetime: number;
  absoluteLifetime: number;
  openedAt: Date;
}

export class Session {
  private constructor(private readonly state: SessionState) {}

  static open(parameters: OpenSessionParameters): Session {
    const openedAtTime = parameters.openedAt.getTime();

    return new Session({
      id: parameters.id,
      accountId: parameters.accountId,
      identifierHash: parameters.identifierHash,
      expiresAt: new Date(openedAtTime + parameters.slidingLifetime),
      absoluteExpiresAt: new Date(openedAtTime + parameters.absoluteLifetime),
      revokedAt: null,
      createdAt: parameters.openedAt,
      lastUsedAt: parameters.openedAt,
    });
  }

  static restore(state: SessionState): Session {
    return new Session({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get accountId(): string {
    return this.state.accountId;
  }

  get identifierHash(): PasswordHash {
    return this.state.identifierHash;
  }

  get expiresAt(): Date {
    return new Date(this.state.expiresAt);
  }

  get absoluteExpiresAt(): Date {
    return new Date(this.state.absoluteExpiresAt);
  }

  get revokedAt(): Date | null {
    return this.state.revokedAt === null
      ? null
      : new Date(this.state.revokedAt);
  }

  get createdAt(): Date {
    return new Date(this.state.createdAt);
  }

  get lastUsedAt(): Date {
    return new Date(this.state.lastUsedAt);
  }

  isUsableAt(instant: Date): boolean {
    return (
      this.state.revokedAt === null &&
      instant.getTime() < this.state.expiresAt.getTime() &&
      instant.getTime() < this.state.absoluteExpiresAt.getTime()
    );
  }

  extend(usedAt: Date, slidingLifetime: number): void {
    const extended = new Date(usedAt.getTime() + slidingLifetime);

    this.state.expiresAt =
      extended.getTime() > this.state.absoluteExpiresAt.getTime()
        ? new Date(this.state.absoluteExpiresAt)
        : extended;
    this.state.lastUsedAt = usedAt;
  }

  revoke(revokedAt: Date): void {
    this.state.revokedAt = revokedAt;
  }
}
