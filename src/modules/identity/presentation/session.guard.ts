import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticateSessionUseCase } from '../application/authenticate-session.use-case';
import { RequestWithCaller } from './authenticated-caller';
import { IdentityCookies, SESSION_COOKIE } from './identity-cookies';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly cookies: IdentityCookies,
    private readonly authenticateSession: AuthenticateSessionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCaller>();

    request.caller = await this.authenticateSession.execute({
      sessionIdentifier: this.cookies.read(request, SESSION_COOKIE),
    });

    return true;
  }
}
