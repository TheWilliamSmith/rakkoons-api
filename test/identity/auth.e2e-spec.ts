import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const PASSWORD = 'MotDePasseQuiGagne1';
const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';

const SIGN_UP_BODY = {
  username: USERNAME,
  email: EMAIL,
  password: PASSWORD,
  hasAcceptedTerms: true,
};

function cookiesOf(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : [];
}

function cookieNamed(response: request.Response, name: string): string | null {
  return cookiesOf(response).find((c) => c.startsWith(`${name}=`)) ?? null;
}

function valueOf(cookie: string): string {
  return cookie.split(';')[0].split('=')[1];
}

describe('Parcours d authentification (e2e)', () => {
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

  function signUp(overrides: Partial<typeof SIGN_UP_BODY> = {}): request.Test {
    return request(harness.server())
      .post(`${AUTH}/sign-up`)
      .send({ ...SIGN_UP_BODY, ...overrides });
  }

  async function activate(email = EMAIL): Promise<void> {
    const registration = await signUp({ email });
    const journeyCookie = cookieNamed(registration, 'rk_signup');

    await request(harness.server())
      .post(`${AUTH}/sign-up/verify`)
      .set('Cookie', `rk_signup=${valueOf(journeyCookie ?? '')}`)
      .send({ code: harness.messages.codes.get(email) })
      .expect(200);
  }

  describe('disponibilité d un nom', () => {
    it('répond 200 avec la disponibilité', async () => {
      const response = await request(harness.server())
        .get(`${AUTH}/username-availability`)
        .query({ username: USERNAME })
        .expect(200);

      expect(response.body).toEqual({ isAvailable: true });
    });

    it('répond indisponible une fois le nom pris', async () => {
      await signUp();

      const response = await request(harness.server())
        .get(`${AUTH}/username-availability`)
        .query({ username: 'RakkoonEtte' })
        .expect(200);

      expect(response.body).toEqual({ isAvailable: false });
    });
  });

  describe('inscription', () => {
    it('répond 201 avec un corps vide et pose le cookie de parcours', async () => {
      const response = await signUp().expect(201);

      expect(response.body).toEqual({});
      expect(cookieNamed(response, 'rk_signup')).not.toBeNull();
    });

    it('pose le cookie de parcours avec les quatre attributs requis', async () => {
      const cookie = cookieNamed(await signUp(), 'rk_signup') ?? '';

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('refuse un nom déjà pris avec 409 et username-taken', async () => {
      await signUp();

      const response = await signUp({ email: 'autre@rakkoons.fr' }).expect(409);

      expect(response.body).toEqual({ error: { reason: 'username-taken' } });
    });

    it('répond comme une inscription réussie sur une adresse déjà enregistrée', async () => {
      const first = await signUp();
      const second = await signUp({ username: 'autrekoon' }).expect(201);

      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(cookieNamed(second, 'rk_signup')).not.toBeNull();
      expect(harness.messages.codes.size).toBe(1);
      expect(harness.messages.existingAccountNotices).toEqual([EMAIL]);
      expect(await harness.prisma.account.count()).toBe(1);
    });

    it('refuse un mot de passe trop court avec 422 et invalid-credentials', async () => {
      const response = await signUp({ password: 'court' }).expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });

    it('rejette une propriété non déclarée au lieu de l ignorer', async () => {
      const response = await request(harness.server())
        .post(`${AUTH}/sign-up`)
        .send({ ...SIGN_UP_BODY, role: 'ADMIN' })
        .expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
      expect(await harness.prisma.account.count()).toBe(0);
    });

    it('ne renvoie jamais le mot de passe', async () => {
      const response = await signUp();

      expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
      expect(JSON.stringify(response.headers)).not.toContain(PASSWORD);
    });
  });

  describe('confirmation d inscription', () => {
    it('répond 200, efface le parcours et n ouvre aucune session', async () => {
      const registration = await signUp();
      const journey = valueOf(cookieNamed(registration, 'rk_signup') ?? '');

      const response = await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `rk_signup=${journey}`)
        .send({ code: harness.messages.codes.get(EMAIL) })
        .expect(200);

      expect(response.body).toEqual({});
      expect(cookieNamed(response, 'rk_session')).toBeNull();
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('refuse un code faux avec 400 et invalid-code', async () => {
      const registration = await signUp();
      const journey = valueOf(cookieNamed(registration, 'rk_signup') ?? '');

      const response = await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `rk_signup=${journey}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse exactement pareil quand le cookie manque', async () => {
      const response = await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('épuise le parcours à la cinquième tentative et efface le cookie', async () => {
      const registration = await signUp();
      const journey = valueOf(cookieNamed(registration, 'rk_signup') ?? '');
      const submit = (code: string): request.Test =>
        request(harness.server())
          .post(`${AUTH}/sign-up/verify`)
          .set('Cookie', `rk_signup=${journey}`)
          .send({ code });

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const rejected = await submit('000000').expect(400);
        expect(cookieNamed(rejected, 'rk_signup')).toBeNull();
      }

      const exhausted = await submit('000000').expect(400);

      expect(exhausted.body).toEqual({ error: { reason: 'invalid-code' } });
      expect(cookieNamed(exhausted, 'rk_signup')).toContain(
        'Expires=Thu, 01 Jan 1970',
      );

      const afterExhaustion = await submit(
        harness.messages.codes.get(EMAIL) ?? '',
      ).expect(400);

      expect(afterExhaustion.body).toEqual({
        error: { reason: 'invalid-code' },
      });
      expect(await harness.prisma.session.count()).toBe(0);
    });
  });

  describe('connexion', () => {
    it('répond 200 et pose le cookie de session avec les quatre attributs', async () => {
      await activate();

      const response = await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      const cookie = cookieNamed(response, 'rk_session') ?? '';

      expect(response.body).toEqual({});
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('ne renvoie jamais le mot de passe', async () => {
      await activate();

      const response = await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD });

      expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
      expect(JSON.stringify(response.headers)).not.toContain(PASSWORD);
    });

    it('échoue à l identique sur adresse inconnue, mot de passe faux et compte en attente', async () => {
      await signUp({ username: 'attente', email: 'attente@rakkoons.fr' });
      await activate();

      const attempts = await Promise.all([
        request(harness.server())
          .post(`${AUTH}/sign-in`)
          .send({ email: 'inconnu@rakkoons.fr', password: PASSWORD }),
        request(harness.server())
          .post(`${AUTH}/sign-in`)
          .send({ email: EMAIL, password: 'MauvaisMotDePasse1' }),
        request(harness.server())
          .post(`${AUTH}/sign-in`)
          .send({ email: 'attente@rakkoons.fr', password: PASSWORD }),
      ]);

      for (const attempt of attempts) {
        expect(attempt.status).toBe(401);
        expect(attempt.body).toEqual({
          error: { reason: 'invalid-credentials' },
        });
        expect(cookieNamed(attempt, 'rk_session')).toBeNull();
      }
    });
  });
});
