import { Clock } from '../domain/ports/clock';
import { SessionRepository } from '../domain/ports/session-repository';

export interface ListAccountSessionsInput {
  accountId: string;
  currentSessionId: string;
}

export interface AccountSessionSummary {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  isCurrent: boolean;
}

interface ListAccountSessionsDependencies {
  sessions: SessionRepository;
  clock: Clock;
}

export class ListAccountSessionsUseCase {
  constructor(private readonly dependencies: ListAccountSessionsDependencies) {}

  async execute(
    input: ListAccountSessionsInput,
  ): Promise<AccountSessionSummary[]> {
    const sessions = await this.dependencies.sessions.listActiveForAccount(
      input.accountId,
      this.dependencies.clock.now(),
    );

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      isCurrent: session.id === input.currentSessionId,
    }));
  }
}
