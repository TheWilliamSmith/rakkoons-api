import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env } from '../../../config/env.validation';
import { AccountNotActivatedError } from '../domain/errors/account-not-activated.error';
import { CredentialsRejectedError } from '../domain/errors/credentials-rejected.error';
import { type AccountRepository } from '../domain/ports/account-repository';
import { type Clock } from '../domain/ports/clock';
import { type SecretHasher } from '../domain/ports/secret-hasher';
import { type SessionRepository } from '../domain/ports/session-repository';
import { IdentityToken } from '../identity.tokens';
import { IdentityCookies, SESSION_COOKIE } from './identity-cookies';
import { RequestWithCaller } from './authenticated-caller';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly cookies: IdentityCookies,
    @Inject(IdentityToken.SessionRepository)
    private readonly sessions: SessionRepository,
    @Inject(IdentityToken.AccountRepository)
    private readonly accounts: AccountRepository,
    @Inject(IdentityToken.SecretHasher)
    private readonly secretHasher: SecretHasher,
    @Inject(IdentityToken.Clock)
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCaller>();
    const identifier = this.cookies.read(request, SESSION_COOKIE);

    if (identifier === null) {
      throw new CredentialsRejectedError();
    }

    const digest = await this.secretHasher.hash(identifier);
    const session = await this.sessions.findByIdentifierHash(digest.toString());
    const now = this.clock.now();

    if (session === null || !session.isUsableAt(now)) {
      throw new CredentialsRejectedError();
    }

    const account = await this.accounts.findById(session.accountId);

    if (account === null) {
      throw new CredentialsRejectedError();
    }

    if (!account.isActive()) {
      throw new AccountNotActivatedError();
    }

    session.extend(now, this.slidingLifetime());
    await this.sessions.save(session);

    request.caller = { accountId: account.id };

    return true;
  }

  private slidingLifetime(): number {
    return (
      this.config.get('SESSION_SLIDING_LIFETIME_DAYS', { infer: true }) *
      MILLISECONDS_PER_DAY
    );
  }
}
