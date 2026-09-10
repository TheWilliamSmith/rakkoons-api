import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { type Env } from '../../../config/env.validation';

export const SIGNUP_COOKIE = 'rk_signup';
export const SESSION_COOKIE = 'rk_session';
export const PASSWORD_RESET_COOKIE = 'rk_password_reset';

@Injectable()
export class IdentityCookies {
  constructor(private readonly config: ConfigService<Env, true>) {}

  set(response: Response, name: string, value: string, expiresAt: Date): void {
    response.cookie(name, value, { ...this.options(), expires: expiresAt });
  }

  clear(response: Response, name: string): void {
    response.clearCookie(name, this.options());
  }

  read(request: Request, name: string): string | null {
    const header = request.headers.cookie;

    if (header === undefined) {
      return null;
    }

    for (const part of header.split(';')) {
      const separator = part.indexOf('=');

      if (separator !== -1 && part.slice(0, separator).trim() === name) {
        return decodeURIComponent(part.slice(separator + 1).trim());
      }
    }

    return null;
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
    };
  }
}
