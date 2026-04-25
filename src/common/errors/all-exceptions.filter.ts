import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { DomainError, DomainErrorCode } from './domain.error';

const DOMAIN_ERROR_HTTP_MAP: Record<DomainErrorCode, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ALREADY_EXISTS: HttpStatus.CONFLICT,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  VALIDATION_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,
  BUSINESS_RULE_VIOLATION: HttpStatus.BAD_REQUEST,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, message } = this.resolveException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, req: request }, message);
    } else {
      this.logger.warn({ req: request }, message);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveException(exception: unknown): {
    status: HttpStatus;
    message: string;
  } {
    if (exception instanceof DomainError) {
      return {
        status: DOMAIN_ERROR_HTTP_MAP[exception.code],
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string }).message ?? exception.message);

      return { status: exception.getStatus(), message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
