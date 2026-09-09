import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Rakkoons API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('répond avec un code d erreur stable sur une route inconnue', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      path: '/api/v1/unknown',
    });
  });

  it('ne renvoie aucun message destiné à l utilisateur dans une erreur', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/unknown');

    expect(response.body).not.toHaveProperty('message');
    expect(response.body).not.toHaveProperty('stack');
  });
});
