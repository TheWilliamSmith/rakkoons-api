import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedCaller {
  accountId: string;
  username: string;
}

export interface RequestWithCaller extends Request {
  caller?: AuthenticatedCaller;
}

export const CurrentCaller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedCaller => {
    const request = context.switchToHttp().getRequest<RequestWithCaller>();

    if (request.caller === undefined) {
      throw new Error('Session guard did not run before the handler');
    }

    return request.caller;
  },
);
