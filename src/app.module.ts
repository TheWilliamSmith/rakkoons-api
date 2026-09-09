import { Module, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/env.config';
import { type Env } from './config/env.validation';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ThrottlerName } from './modules/identity/presentation/throttling';
import { AllExceptionsFilter } from './shared/presentation/all-exceptions.filter';

const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.refreshToken',
];

const IGNORED_PRETTY_LOG_PATHS = [
  'pid',
  'hostname',
  'req.headers',
  'req.remoteAddress',
  'req.remotePort',
  'res.headers',
  'req.query',
  'req.params',
].join(',');

const ALL_ROUTES = [{ path: '/{*path}', method: RequestMethod.ALL }];

const MILLISECONDS_PER_SECOND = 1000;

const PRETTY_LOG_MESSAGE_FORMAT =
  '{if req}{req.method} {req.url} {res.statusCode} ({responseTime}ms) {end}{msg}';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const environment = config.get('NODE_ENV', { infer: true });

        return {
          forRoutes: ALL_ROUTES,
          pinoHttp: {
            level: environment === 'production' ? 'info' : 'debug',
            redact: { paths: REDACTED_LOG_PATHS, remove: true },
            ...(environment !== 'development'
              ? {}
              : {
                  transport: {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: IGNORED_PRETTY_LOG_PATHS,
                      messageFormat: PRETTY_LOG_MESSAGE_FORMAT,
                    },
                  },
                }),
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const ttl =
          config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }) *
          MILLISECONDS_PER_SECOND;

        return {
          throttlers: [
            {
              name: ThrottlerName.UsernameAvailability,
              ttl,
              limit: config.get('RATE_LIMIT_USERNAME_AVAILABILITY', {
                infer: true,
              }),
            },
            {
              name: ThrottlerName.SignUp,
              ttl,
              limit: config.get('RATE_LIMIT_SIGN_UP', { infer: true }),
            },
            {
              name: ThrottlerName.SignUpVerify,
              ttl,
              limit: config.get('RATE_LIMIT_SIGN_UP_VERIFY', { infer: true }),
            },
            {
              name: ThrottlerName.SignIn,
              ttl,
              limit: config.get('RATE_LIMIT_SIGN_IN_PER_IP', { infer: true }),
            },
          ],
        };
      },
    }),
    PrismaModule,
    IdentityModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
