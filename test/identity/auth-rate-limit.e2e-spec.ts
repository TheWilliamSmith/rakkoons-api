import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const AVAILABILITY_LIMIT = 5;

describe('Limitation de débit sur l authentification (e2e)', () => {
  const harness = new AuthE2eHarness();

  beforeAll(async () => {
    await harness.start();
    await harness.reset();
  });

  afterAll(async () => {
    await harness.reset();
    await harness.stop();
  });

  it('coupe la disponibilité d un nom au delà du seuil configuré', async () => {
    for (let call = 0; call < AVAILABILITY_LIMIT; call += 1) {
      await request(harness.server())
        .get(`${AUTH}/username-availability`)
        .query({ username: 'rakkoonette' })
        .expect(200);
    }

    const blocked = await request(harness.server())
      .get(`${AUTH}/username-availability`)
      .query({ username: 'rakkoonette' })
      .expect(429);

    expect(blocked.body).toEqual({ error: { reason: 'unavailable' } });
  });

  it('ne bloque pas l inscription au seuil de la disponibilité', async () => {
    await request(harness.server())
      .post(`${AUTH}/sign-up`)
      .send({
        username: 'autrekoon',
        email: 'autre@rakkoons.fr',
        password: 'MotDePasseQuiGagne1',
        hasAcceptedTerms: true,
      })
      .expect(201);
  });
});
