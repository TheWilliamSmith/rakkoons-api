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
import { ConfirmPasswordResetUseCase } from '../application/confirm-password-reset.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case';
import { VerifyPasswordResetCodeUseCase } from '../application/verify-password-reset-code.use-case';
import { PasswordResetAttemptsExhaustedError } from '../domain/errors/password-reset-attempts-exhausted.error';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
} from './dto/password-reset.dto';
import { IdentityCookies, PASSWORD_RESET_COOKIE } from './identity-cookies';
import { PasswordResetAccountThrottlerGuard } from './password-reset-account-throttler.guard';
import { ThrottlerName, throttleOnly } from './throttling';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  constructor(
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly verifyPasswordResetCode: VerifyPasswordResetCodeUseCase,
    private readonly confirmPasswordReset: ConfirmPasswordResetUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Post('password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @throttleOnly(ThrottlerName.PasswordReset)
  @UseGuards(PasswordResetAccountThrottlerGuard)
  async request(
    @Body() body: RequestPasswordResetDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journey = await this.requestPasswordReset.execute(body);

    this.cookies.set(
      response,
      PASSWORD_RESET_COOKIE,
      journey.journeyId,
      journey.journeyExpiresAt,
    );
  }

  @Post('password-reset/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @throttleOnly(ThrottlerName.PasswordResetVerify)
  async verify(
    @Body() body: VerifyPasswordResetDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journeyId = this.cookies.read(request, PASSWORD_RESET_COOKIE);

    try {
      await this.verifyPasswordResetCode.execute({
        journeyId,
        code: body.code,
      });
    } catch (rejection) {
      if (rejection instanceof PasswordResetAttemptsExhaustedError) {
        this.cookies.clear(response, PASSWORD_RESET_COOKIE);
      }
      throw rejection;
    }
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @throttleOnly(ThrottlerName.PasswordResetConfirm)
  async confirm(
    @Body() body: ConfirmPasswordResetDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journeyId = this.cookies.read(request, PASSWORD_RESET_COOKIE);

    await this.confirmPasswordReset.execute({
      journeyId,
      password: body.password,
    });

    this.cookies.clear(response, PASSWORD_RESET_COOKIE);
  }
}
