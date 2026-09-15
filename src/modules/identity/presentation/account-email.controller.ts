import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { CancelEmailChangeUseCase } from '../application/cancel-email-change.use-case';
import { ConfirmEmailChangeUseCase } from '../application/confirm-email-change.use-case';
import { RequestEmailChangeUseCase } from '../application/request-email-change.use-case';
import { ResendEmailChangeCodeUseCase } from '../application/resend-email-change-code.use-case';
import { EmailChangeThrottlerGuard } from './account-email-throttler.guard';
import {
  type AuthenticatedCaller,
  CurrentCaller,
} from './authenticated-caller';
import { RequestEmailChangeDto, VerifyEmailChangeDto } from './dto/account.dto';
import { EMAIL_CHANGE_COOKIE, IdentityCookies } from './identity-cookies';
import { EmailChangeResendThrottlerGuard } from './resend-throttler.guard';
import { SessionGuard } from './session.guard';

@ApiTags('account')
@Controller('account/email')
@UseGuards(SessionGuard)
export class AccountEmailController {
  constructor(
    private readonly requestEmailChange: RequestEmailChangeUseCase,
    private readonly confirmEmailChange: ConfirmEmailChangeUseCase,
    private readonly resendEmailChangeCode: ResendEmailChangeCodeUseCase,
    private readonly cancelEmailChange: CancelEmailChangeUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EmailChangeThrottlerGuard)
  async request(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: RequestEmailChangeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journey = await this.requestEmailChange.execute({
      accountId: caller.accountId,
      email: body.email,
      currentPassword: body.currentPassword,
    });

    this.cookies.set(
      response,
      EMAIL_CHANGE_COOKIE,
      journey.journeyId,
      journey.journeyExpiresAt,
    );
  }

  @Post('verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: VerifyEmailChangeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.confirmEmailChange.execute({
      accountId: caller.accountId,
      journeyId: this.cookies.read(request, EMAIL_CHANGE_COOKIE),
      code: body.code,
    });

    this.cookies.clear(response, EMAIL_CHANGE_COOKIE);
  }

  @Post('resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EmailChangeResendThrottlerGuard)
  async resend(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Req() request: Request,
  ): Promise<void> {
    await this.resendEmailChangeCode.execute({
      accountId: caller.accountId,
      journeyId: this.cookies.read(request, EMAIL_CHANGE_COOKIE),
    });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.cancelEmailChange.execute({ accountId: caller.accountId });

    this.cookies.clear(response, EMAIL_CHANGE_COOKIE);
  }
}
