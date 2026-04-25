import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  const logger = new Logger('RakkoonsAPI');

  logger.log(`Server is running on port ${port}`);
  await app.listen(port);
}

void bootstrap();
