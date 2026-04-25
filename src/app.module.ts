import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/env.config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd"T"HH:MM:ss.lo',
            ignore:
              'pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers,req.query,req.params',
            messageFormat:
              'http.verbose > {req.id} {req.method} {req.url} {res.statusCode} ({responseTime}ms)',
          },
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
