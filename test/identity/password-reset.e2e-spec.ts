import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const PASSWORD = 'MotDePasseQuiGagne1!';
const NEW_PASSWORD = 'NouveauMotDePasse2?';
const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';
const RESET_COOKIE = 'rk_password_reset';

function cookiesOf(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : [];
}

function cookieNamed(response: request.Response, name: string): string | null {
  return cookiesOf(response).find((c) => c.startsWith(`${name}=`)) ?? null;
}

function valueOf(cookie: string | null): string {
  return (cookie ?? '').split(';')[0].split('=')[1] ?? '';
}

describe('Parcours de réinitialisation de mot de passe (e2e)', () => {
  const harness = new AuthE2eHarness();

  beforeAll(async () => {
    await harness.start();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.reset();
    await harness.stop();
  });

  async function activate(): Promise<void> {
    const registration = await request(harness.server())
      .post(`${AUTH}/sign-up`)
      .send({
        username: USERNAME,
        email: EMAIL,
        password: PASSWORD,
        hasAcceptedTerms: true,
      });

    await request(harness.server())
      .post(`${AUTH}/sign-up/verify`)
      .set(
        'Cookie',
        `rk_signup=${valueOf(cookieNamed(registration, 'rk_signup'))}`,
      )
      .send({ code: harness.messages.codes.get(EMAIL) })
      .expect(200);
  }

  function requestReset(email = EMAIL): request.Test {
    return request(harness.server())
      .post(`${AUTH}/password-reset`)
      .send({ email });
  }

  function verify(journey: string, code: string): request.Test {
    return request(harness.server())
      .post(`${AUTH}/password-reset/verify`)
      .set('Cookie', `${RESET_COOKIE}=${journey}`)
      .send({ code });
  }

  function confirm(journey: string, password: string): request.Test {
    return request(harness.server())
      .post(`${AUTH}/password-reset/confirm`)
      .set('Cookie', `${RESET_COOKIE}=${journey}`)
      .send({ password });
  }

  async function openVerifiedReset(): Promise<string> {
    const requested = await requestReset().expect(204);
    const journey = valueOf(cookieNamed(requested, RESET_COOKIE));

    await verify(
      journey,
      harness.messages.passwordResetCodes.get(EMAIL) ?? '',
    ).expect(204);

    return journey;
  }

  describe('demande de code', () => {
    it('répond 204 et pose le cookie avec les quatre attributs requis', async () => {
      await activate();

      const response = await requestReset().expect(204);
      const cookie = cookieNamed(response, RESET_COOKIE) ?? '';

      expect(response.body).toEqual({});
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('répond à l identique sur une adresse inconnue et n envoie rien', async () => {
      await activate();

      const known = await requestReset().expect(204);
      const unknown = await requestReset('inconnu@rakkoons.fr').expect(204);

      expect(unknown.body).toEqual(known.body);
      expect(cookieNamed(unknown, RESET_COOKIE)).not.toBeNull();
      expect(
        harness.messages.passwordResetCodes.has('inconnu@rakkoons.fr'),
      ).toBe(false);
    });

    it('n envoie aucun code à un compte encore en attente d activation', async () => {
      await request(harness.server()).post(`${AUTH}/sign-up`).send({
        username: USERNAME,
        email: EMAIL,
        password: PASSWORD,
        hasAcceptedTerms: true,
      });

      const response = await requestReset().expect(204);

      expect(cookieNamed(response, RESET_COOKIE)).not.toBeNull();
      expect(harness.messages.passwordResetCodes.size).toBe(0);
    });

    it('répond 503 unavailable quand l envoi échoue vraiment', async () => {
      await activate();
      harness.messages.deliveryFails = true;

      const response = await requestReset().expect(503);

      expect(response.body).toEqual({ error: { reason: 'unavailable' } });
    });

    it('invalide le code précédent au renvoi', async () => {
      await activate();
      const first = await requestReset().expect(204);
      const firstJourney = valueOf(cookieNamed(first, RESET_COOKIE));
      const firstCode = harness.messages.passwordResetCodes.get(EMAIL) ?? '';

      await requestReset().expect(204);

      await verify(firstJourney, firstCode).expect(422);
    });
  });

  describe('vérification du code', () => {
    it('répond 204 et laisse le cookie en place', async () => {
      await activate();
      const requested = await requestReset().expect(204);
      const journey = valueOf(cookieNamed(requested, RESET_COOKIE));

      const response = await verify(
        journey,
        harness.messages.passwordResetCodes.get(EMAIL) ?? '',
      ).expect(204);

      expect(response.body).toEqual({});
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('refuse un code faux avec 422 et invalid-code', async () => {
      await activate();
      const requested = await requestReset().expect(204);
      const journey = valueOf(cookieNamed(requested, RESET_COOKIE));

      const response = await verify(journey, '000000').expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse exactement pareil quand le cookie manque', async () => {
      await activate();
      await requestReset().expect(204);

      const response = await request(harness.server())
        .post(`${AUTH}/password-reset/verify`)
        .send({ code: '000000' })
        .expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse exactement pareil un parcours inventé', async () => {
      await activate();

      const response = await verify(
        '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        '000000',
      ).expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('épuise le parcours à la cinquième tentative et efface le cookie', async () => {
      await activate();
      const requested = await requestReset().expect(204);
      const journey = valueOf(cookieNamed(requested, RESET_COOKIE));
      const code = harness.messages.passwordResetCodes.get(EMAIL) ?? '';

      for (let attempt = 0; attempt < 4; attempt += 1) {
        await verify(journey, '000000').expect(422);
      }

      const exhausted = await verify(journey, '000000').expect(422);

      expect(cookieNamed(exhausted, RESET_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      await verify(journey, code).expect(422);
    });
  });

  describe('pose du nouveau mot de passe', () => {
    it('répond 204, efface le cookie et n ouvre aucune session', async () => {
      await activate();
      const journey = await openVerifiedReset();

      const response = await confirm(journey, NEW_PASSWORD).expect(204);

      expect(response.body).toEqual({});
      expect(cookieNamed(response, 'rk_session')).toBeNull();
      expect(cookieNamed(response, RESET_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('laisse se connecter avec le nouveau mot de passe et refuse l ancien', async () => {
      await activate();
      const journey = await openVerifiedReset();
      await confirm(journey, NEW_PASSWORD).expect(204);

      await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: NEW_PASSWORD })
        .expect(200);

      await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(401);
    });

    it('révoque les sessions ouvertes avant la réinitialisation', async () => {
      await activate();
      await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      const journey = await openVerifiedReset();
      await confirm(journey, NEW_PASSWORD).expect(204);

      const sessions = await harness.prisma.session.findMany({
        select: { revokedAt: true },
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].revokedAt).not.toBeNull();
    });

    it('refuse 422 invalid-code quand le code n a pas été vérifié', async () => {
      await activate();
      const requested = await requestReset().expect(204);
      const journey = valueOf(cookieNamed(requested, RESET_COOKIE));

      const response = await confirm(journey, NEW_PASSWORD).expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse 422 invalid-code sur un second usage du même parcours', async () => {
      await activate();
      const journey = await openVerifiedReset();
      await confirm(journey, NEW_PASSWORD).expect(204);

      const response = await confirm(journey, 'EncoreUnAutre3!').expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse un mot de passe hors politique avec 422 invalid-credentials', async () => {
      await activate();
      const journey = await openVerifiedReset();

      const response = await confirm(journey, 'sanschiffre').expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });

    it('rejette une propriété non déclarée au lieu de l ignorer', async () => {
      await activate();
      const journey = await openVerifiedReset();

      const response = await request(harness.server())
        .post(`${AUTH}/password-reset/confirm`)
        .set('Cookie', `${RESET_COOKIE}=${journey}`)
        .send({ password: NEW_PASSWORD, accountId: 'quelqu-un-d-autre' })
        .expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });

    it('ne renvoie jamais le mot de passe', async () => {
      await activate();
      const journey = await openVerifiedReset();

      const response = await confirm(journey, NEW_PASSWORD);

      expect(JSON.stringify(response.body)).not.toContain(NEW_PASSWORD);
      expect(JSON.stringify(response.headers)).not.toContain(NEW_PASSWORD);
    });
  });
});
