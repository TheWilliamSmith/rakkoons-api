import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { RequestSignInCodeUseCase } from '../application/request-sign-in-code.use-case';
import { VerifySignInCodeUseCase } from '../application/verify-sign-in-code.use-case';
import { SignInAttemptsExhaustedError } from '../domain/errors/sign-in-attempts-exhausted.error';
import {
  RequestSignInCodeDto,
  VerifySignInCodeDto,
} from './dto/sign-in-code.dto';
import {
  IdentityCookies,
  SESSION_COOKIE,
  SIGNIN_COOKIE,
} from './identity-cookies';
import { ThrottlerName, throttleOnly } from './throttling';

const UNKNOWN_ORIGIN = 'unknown';

@ApiTags('auth')
@Controller('auth')
export class SignInCodeController {
  constructor(
    private readonly requestSignInCode: RequestSignInCodeUseCase,
    private readonly verifySignInCode: VerifySignInCodeUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Post('sign-in/code/request')
  @HttpCode(HttpStatus.OK)
  async request(
    @Body() body: RequestSignInCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journey = await this.requestSignInCode.execute({
      email: body.email,
      origin: request.ip ?? UNKNOWN_ORIGIN,
    });

    this.cookies.set(
      response,
      SIGNIN_COOKIE,
      journey.journeyId,
      journey.journeyExpiresAt,
    );
  }

  @Post('sign-in/code/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @throttleOnly(ThrottlerName.SignInCodeVerify)
  async verify(
    @Body() body: VerifySignInCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journeyId = this.cookies.read(request, SIGNIN_COOKIE);

    const session = await this.openSession(journeyId, body.code, response);

    this.cookies.clear(response, SIGNIN_COOKIE);
    this.cookies.set(
      response,
      SESSION_COOKIE,
      session.sessionIdentifier,
      session.expiresAt,
    );
  }

  private async openSession(
    journeyId: string | null,
    code: string,
    response: Response,
  ): ReturnType<VerifySignInCodeUseCase['execute']> {
    try {
      return await this.verifySignInCode.execute({ journeyId, code });
    } catch (rejection) {
      if (rejection instanceof SignInAttemptsExhaustedError) {
        this.cookies.clear(response, SIGNIN_COOKIE);
      }
      throw rejection;
    }
  }
}
