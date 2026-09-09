import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { CheckUsernameAvailabilityUseCase } from '../application/check-username-availability.use-case';
import { ConfirmRegistrationUseCase } from '../application/confirm-registration.use-case';
import { OpenSessionUseCase } from '../application/open-session.use-case';
import { RegisterAccountUseCase } from '../application/register-account.use-case';
import { VerificationAttemptsExhaustedError } from '../domain/errors/verification-attempts-exhausted.error';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import {
  UsernameAvailabilityQueryDto,
  UsernameAvailabilityResponseDto,
} from './dto/username-availability.dto';
import { VerifySignUpDto } from './dto/verify-sign-up.dto';
import {
  IdentityCookies,
  SESSION_COOKIE,
  SIGNUP_COOKIE,
} from './identity-cookies';
import { SignInAccountThrottlerGuard } from './sign-in-account-throttler.guard';
import { ThrottlerName, throttleOnly } from './throttling';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly checkUsernameAvailability: CheckUsernameAvailabilityUseCase,
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly confirmRegistration: ConfirmRegistrationUseCase,
    private readonly openSession: OpenSessionUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Get('username-availability')
  @throttleOnly(ThrottlerName.UsernameAvailability)
  async usernameAvailability(
    @Query() query: UsernameAvailabilityQueryDto,
  ): Promise<UsernameAvailabilityResponseDto> {
    return this.checkUsernameAvailability.execute({
      username: query.username,
    });
  }

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @throttleOnly(ThrottlerName.SignUp)
  async signUp(
    @Body() body: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journey = await this.registerAccount.execute(body);

    this.cookies.set(
      response,
      SIGNUP_COOKIE,
      journey.journeyId,
      journey.journeyExpiresAt,
    );
  }

  @Post('sign-up/verify')
  @HttpCode(HttpStatus.OK)
  @throttleOnly(ThrottlerName.SignUpVerify)
  async verifySignUp(
    @Body() body: VerifySignUpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const journeyId = this.cookies.read(request, SIGNUP_COOKIE);

    try {
      await this.confirmRegistration.execute({ journeyId, code: body.code });
    } catch (rejection) {
      if (rejection instanceof VerificationAttemptsExhaustedError) {
        this.cookies.clear(response, SIGNUP_COOKIE);
      }
      throw rejection;
    }

    this.cookies.clear(response, SIGNUP_COOKIE);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @throttleOnly(ThrottlerName.SignIn)
  @UseGuards(SignInAccountThrottlerGuard)
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const session = await this.openSession.execute(body);

    this.cookies.set(
      response,
      SESSION_COOKIE,
      session.sessionIdentifier,
      session.expiresAt,
    );
  }
}
