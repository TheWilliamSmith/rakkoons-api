import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { DomainError } from '../domain/domain-error';
import { DOMAIN_ERROR_HTTP_MAP, HttpFailure } from './domain-error-http-map';
import { FailureBody, FailureReason } from './failure-reason';

const UNEXPECTED_FAILURE: HttpFailure = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  reason: FailureReason.Unavailable,
};

const VALIDATION_FAILURE: HttpFailure = {
  status: HttpStatus.UNPROCESSABLE_ENTITY,
  reason: FailureReason.InvalidCredentials,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const failure = this.resolve(exception);

    if (failure.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception }, failure.reason);
    } else {
      this.logger.warn(failure.reason);
    }

    const body: FailureBody = { error: { reason: failure.reason } };

    response.status(failure.status).json(body);
  }

  private resolve(exception: unknown): HttpFailure {
    if (exception instanceof DomainError) {
      return DOMAIN_ERROR_HTTP_MAP[exception.name] ?? UNEXPECTED_FAILURE;
    }

    if (exception instanceof HttpException) {
      const status: number = exception.getStatus();

      if (status === Number(HttpStatus.UNPROCESSABLE_ENTITY)) {
        return VALIDATION_FAILURE;
      }

      return { status, reason: FailureReason.Unavailable };
    }

    return UNEXPECTED_FAILURE;
  }
}
