import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { type Env } from './config/env.validation';

const API_PREFIX = 'api';
const DEFAULT_API_VERSION = '1';
const SWAGGER_PATH = 'api/docs';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    methods: ALLOWED_METHODS,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  if (!isProduction) {
    const documentConfig = new DocumentBuilder()
      .setTitle('Rakkoons API Swagger')
      .setDescription('API documentation for Rakkoons')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      SWAGGER_PATH,
      app,
      SwaggerModule.createDocument(app, documentConfig),
    );
  }

  await app.listen(port);

  logger.log(`Server is running on port ${port}`);
}

void bootstrap();
