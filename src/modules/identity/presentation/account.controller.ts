import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { CancelAccountDeletionUseCase } from '../application/cancel-account-deletion.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { ChangeUsernameUseCase } from '../application/change-username.use-case';
import { ListAccountSessionsUseCase } from '../application/list-account-sessions.use-case';
import { ReadAccountUseCase } from '../application/read-account.use-case';
import { ReadNotificationPreferencesUseCase } from '../application/read-notification-preferences.use-case';
import { ScheduleAccountDeletionUseCase } from '../application/schedule-account-deletion.use-case';
import { UpdateNotificationPreferencesUseCase } from '../application/update-notification-preferences.use-case';
import { RevokeAccountSessionUseCase } from '../application/revoke-account-session.use-case';
import {
  PasswordChangeThrottlerGuard,
  UsernameChangeThrottlerGuard,
} from './account-throttler.guard';
import {
  type AuthenticatedCaller,
  CurrentCaller,
} from './authenticated-caller';
import {
  AccountResponseDto,
  AccountSessionDto,
  ChangePasswordDto,
  ChangeUsernameDto,
  NotificationPreferencesDto,
  NotificationPreferencesResponseDto,
  ScheduleAccountDeletionDto,
} from './dto/account.dto';
import { IdentityCookies, SESSION_COOKIE } from './identity-cookies';
import { SessionGuard } from './session.guard';

@ApiTags('account')
@Controller('account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(
    private readonly readAccount: ReadAccountUseCase,
    private readonly changeUsername: ChangeUsernameUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly listSessions: ListAccountSessionsUseCase,
    private readonly revokeAccountSession: RevokeAccountSessionUseCase,
    private readonly readNotificationPreferences: ReadNotificationPreferencesUseCase,
    private readonly updateNotificationPreferences: UpdateNotificationPreferencesUseCase,
    private readonly scheduleAccountDeletion: ScheduleAccountDeletionUseCase,
    private readonly cancelAccountDeletion: CancelAccountDeletionUseCase,
    private readonly cookies: IdentityCookies,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async read(
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<AccountResponseDto> {
    const account = await this.readAccount.execute({
      accountId: caller.accountId,
    });

    return {
      username: account.username,
      email: account.email,
      createdAt: account.createdAt.toISOString(),
      pendingEmail: account.pendingEmail,
      deletionScheduledAt:
        account.deletionScheduledAt === null
          ? null
          : account.deletionScheduledAt.toISOString(),
    };
  }

  @Get('notifications')
  @Header('Cache-Control', 'no-store')
  readNotifications(
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.readNotificationPreferences.execute({
      accountId: caller.accountId,
    });
  }

  @Patch('notifications')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateNotifications(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: NotificationPreferencesDto,
  ): Promise<void> {
    await this.updateNotificationPreferences.execute({
      accountId: caller.accountId,
      preferences: body,
    });
  }

  @Post('deletion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async scheduleDeletion(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: ScheduleAccountDeletionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.scheduleAccountDeletion.execute({
      accountId: caller.accountId,
      currentPassword: body.currentPassword,
    });

    this.cookies.clear(response, SESSION_COOKIE);
  }

  @Delete('deletion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelDeletion(
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<void> {
    await this.cancelAccountDeletion.execute({ accountId: caller.accountId });
  }

  @Patch('username')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UsernameChangeThrottlerGuard)
  async rename(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: ChangeUsernameDto,
  ): Promise<void> {
    await this.changeUsername.execute({
      accountId: caller.accountId,
      username: body.username,
    });
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PasswordChangeThrottlerGuard)
  async replacePassword(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.changePassword.execute({
      accountId: caller.accountId,
      currentSessionId: caller.sessionId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  }

  @Get('sessions')
  @Header('Cache-Control', 'no-store')
  async sessions(
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<AccountSessionDto[]> {
    const sessions = await this.listSessions.execute({
      accountId: caller.accountId,
      currentSessionId: caller.sessionId,
    });

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      isCurrent: session.isCurrent,
    }));
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentCaller() caller: AuthenticatedCaller,
    @Param('id') sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const outcome = await this.revokeAccountSession.execute({
      accountId: caller.accountId,
      sessionId,
      currentSessionId: caller.sessionId,
    });

    if (outcome.revokedCurrentSession) {
      this.cookies.clear(response, SESSION_COOKIE);
    }
  }
}
