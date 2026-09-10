import { SessionNotFoundError } from '../domain/errors/session-not-found.error';
import { Clock } from '../domain/ports/clock';
import { SessionRepository } from '../domain/ports/session-repository';

export interface RevokeAccountSessionInput {
  accountId: string;
  sessionId: string;
  currentSessionId: string;
}

export interface RevokeAccountSessionOutput {
  revokedCurrentSession: boolean;
}

interface RevokeAccountSessionDependencies {
  sessions: SessionRepository;
  clock: Clock;
}

export class RevokeAccountSessionUseCase {
  constructor(
    private readonly dependencies: RevokeAccountSessionDependencies,
  ) {}

  async execute(
    input: RevokeAccountSessionInput,
  ): Promise<RevokeAccountSessionOutput> {
    const session = await this.dependencies.sessions.findByIdForAccount(
      input.sessionId,
      input.accountId,
    );

    if (session === null) {
      throw new SessionNotFoundError();
    }

    session.revoke(this.dependencies.clock.now());
    await this.dependencies.sessions.save(session);

    return { revokedCurrentSession: session.id === input.currentSessionId };
  }
}
