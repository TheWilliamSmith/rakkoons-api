import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './shared/infrastructure/prisma/prisma.service';

describe('AppModule', () => {
  it('expose le client Prisma à toute l application', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const prisma = moduleRef.get(PrismaService);

    expect(prisma).toBeDefined();
    expect(typeof prisma.account.findUnique).toBe('function');

    await moduleRef.close();
  });
});
