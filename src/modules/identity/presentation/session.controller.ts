import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { RevokeSessionUseCase } from '../application/revoke-session.use-case';
import {
  type AuthenticatedCaller,
  CurrentCaller,
} from './authenticated-caller';
import { SessionResponseDto } from './dto/session.dto';
import { IdentityCookies, SESSION_COOKIE } from './identity-cookies';
import { SessionGuard } from './session.guard';

@ApiTags('auth')
@Controller('auth')
export class SessionController {
  constructor(
    private readonly revokeSession: RevokeSessionUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Get('session')
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionGuard)
  readSession(
    @CurrentCaller() caller: AuthenticatedCaller,
  ): SessionResponseDto {
    return { id: caller.accountId, username: caller.username };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.revokeSession.execute({
      sessionIdentifier: this.cookies.read(request, SESSION_COOKIE),
    });

    this.cookies.clear(response, SESSION_COOKIE);
  }
}
