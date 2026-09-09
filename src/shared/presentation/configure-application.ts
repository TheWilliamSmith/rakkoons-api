import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

const API_PREFIX = 'api';
const DEFAULT_API_VERSION = '1';

export function configureApplication(
  application: NestExpressApplication,
): void {
  application.set('etag', false);

  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  application.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });
  application.setGlobalPrefix(API_PREFIX);
}
