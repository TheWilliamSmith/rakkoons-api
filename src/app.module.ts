import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/env.config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        ...(process.env.NODE_ENV !== 'production' && {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore:
                'pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers,req.query,req.params',
              messageFormat:
                'http.verbose > {req.id} {req.method} {req.url} {res.statusCode} ({responseTime}ms)',
            },
          },
        }),
      },
    }),
  ],
})
export class AppModule {}
