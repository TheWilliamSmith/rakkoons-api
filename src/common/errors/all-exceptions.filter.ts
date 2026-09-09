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

const HTTP_STATUS_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
  [HttpStatus.CONFLICT]: 'ALREADY_EXISTS',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

const UNEXPECTED_ERROR_CODE = 'INTERNAL_ERROR';

interface ErrorResponseBody {
  statusCode: HttpStatus;
  code: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, code } = this.resolveException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception }, code);
    } else {
      this.logger.warn(code);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: HttpStatus;
    code: string;
  } {
    if (exception instanceof DomainError) {
      return {
        status: DOMAIN_ERROR_HTTP_MAP[exception.code],
        code: exception.code,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      return {
        status,
        code: HTTP_STATUS_ERROR_CODES[status] ?? UNEXPECTED_ERROR_CODE,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: UNEXPECTED_ERROR_CODE,
    };
  }
}
