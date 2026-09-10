import { Clock } from '../domain/ports/clock';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { SessionRepository } from '../domain/ports/session-repository';

export interface RevokeSessionInput {
  sessionIdentifier: string | null;
}

interface RevokeSessionDependencies {
  sessions: SessionRepository;
  secretHasher: SecretHasher;
  clock: Clock;
}

export class RevokeSessionUseCase {
  constructor(private readonly dependencies: RevokeSessionDependencies) {}

  async execute(input: RevokeSessionInput): Promise<void> {
    if (input.sessionIdentifier === null) {
      return;
    }

    const digest = await this.dependencies.secretHasher.hash(
      input.sessionIdentifier,
    );
    const session = await this.dependencies.sessions.findByIdentifierHash(
      digest.toString(),
    );

    if (session === null) {
      return;
    }

    session.revoke(this.dependencies.clock.now());
    await this.dependencies.sessions.save(session);
  }
}
