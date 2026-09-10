import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const PASSWORD = 'MotDePasseQuiGagne1!';
const EMAIL = 'william@rakkoons.fr';
const UNKNOWN_EMAIL = 'inconnu@rakkoons.fr';
const USERNAME = 'rakkoonette';
const SIGNIN_COOKIE = 'rk_signin';

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

describe('Connexion par code (e2e)', () => {
  const harness = new AuthE2eHarness();

  beforeAll(async () => {
    await harness.start();
  });

  beforeEach(async () => {
    await harness.reset();
    harness.forgetRateLimits();
  });

  afterAll(async () => {
    await harness.reset();
    await harness.stop();
  });

  function signUp(email = EMAIL, username = USERNAME): request.Test {
    return request(harness.server()).post(`${AUTH}/sign-up`).send({
      username,
      email,
      password: PASSWORD,
      hasAcceptedTerms: true,
    });
  }

  async function activate(): Promise<void> {
    const registration = await signUp();

    await request(harness.server())
      .post(`${AUTH}/sign-up/verify`)
      .set(
        'Cookie',
        `rk_signup=${valueOf(cookieNamed(registration, 'rk_signup'))}`,
      )
      .send({ code: harness.messages.codes.get(EMAIL) })
      .expect(200);
  }

  function requestCode(email = EMAIL): request.Test {
    return request(harness.server())
      .post(`${AUTH}/sign-in/code/request`)
      .send({ email });
  }

  function verify(journey: string, code: string): request.Test {
    return request(harness.server())
      .post(`${AUTH}/sign-in/code/verify`)
      .set('Cookie', `${SIGNIN_COOKIE}=${journey}`)
      .send({ code });
  }

  describe('demande de code', () => {
    it('répond 200 avec un corps vide et pose le cookie de parcours', async () => {
      await activate();

      const response = await requestCode().expect(200);
      const cookie = cookieNamed(response, SIGNIN_COOKIE) ?? '';

      expect(response.body).toEqual({});
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('répond identiquement pour une adresse connue et une adresse inconnue', async () => {
      await activate();

      const known = await requestCode().expect(200);
      const unknown = await requestCode(UNKNOWN_EMAIL).expect(200);

      expect(unknown.status).toBe(known.status);
      expect(unknown.body).toEqual(known.body);

      const knownCookie = cookieNamed(known, SIGNIN_COOKIE) ?? '';
      const unknownCookie = cookieNamed(unknown, SIGNIN_COOKIE) ?? '';

      expect(attributesOf(unknownCookie)).toEqual(attributesOf(knownCookie));
      expect(harness.messages.signInCodes.has(UNKNOWN_EMAIL)).toBe(false);
    });

    it('n ouvre aucune session', async () => {
      await activate();

      await requestCode().expect(200);

      expect(cookieNamed(await requestCode(), 'rk_session')).toBeNull();
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('reste en 200 sans envoyer quand la limite par adresse est franchie', async () => {
      await activate();

      await requestCode().expect(200);
      const throttled = await requestCode().expect(200);

      expect(throttled.body).toEqual({});
      expect(cookieNamed(throttled, SIGNIN_COOKIE)).not.toBeNull();
      expect(harness.messages.signInCodes.size).toBe(1);
    });

    it('ne renvoie jamais le code dans la réponse', async () => {
      await activate();

      const response = await requestCode().expect(200);
      const code = harness.messages.signInCodes.get(EMAIL) ?? '';

      expect(code).toHaveLength(6);
      expect(JSON.stringify(response.body)).not.toContain(code);
      expect(JSON.stringify(response.headers)).not.toContain(code);
    });
  });

  describe('vérification du code', () => {
    it('répond 200, efface le parcours et pose la session avec ses quatre attributs', async () => {
      await activate();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      const response = await verify(
        journey,
        harness.messages.signInCodes.get(EMAIL) ?? '',
      ).expect(200);

      const session = cookieNamed(response, 'rk_session') ?? '';

      expect(response.body).toEqual({});
      expect(session).toContain('HttpOnly');
      expect(session).toContain('Secure');
      expect(session).toContain('SameSite=Lax');
      expect(session).toContain('Path=/');
      expect(cookieNamed(response, SIGNIN_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
    });

    it('active un compte en attente et ouvre la session', async () => {
      await signUp();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      await verify(
        journey,
        harness.messages.signInCodes.get(EMAIL) ?? '',
      ).expect(200);

      const account = await harness.prisma.account.findFirst({
        select: { status: true },
      });

      expect(account?.status).toBe('ACTIVE');
      expect(await harness.prisma.session.count()).toBe(1);
    });

    it('refuse un code faux avec 400 et invalid-code', async () => {
      await activate();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      const response = await verify(journey, '000000').expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
      expect(cookieNamed(response, 'rk_session')).toBeNull();
    });

    it('refuse exactement pareil quand le cookie manque', async () => {
      await activate();
      await requestCode().expect(200);

      const response = await request(harness.server())
        .post(`${AUTH}/sign-in/code/verify`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse exactement pareil un parcours ouvert pour une adresse inconnue', async () => {
      const requested = await requestCode(UNKNOWN_EMAIL).expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      const response = await verify(journey, '000000').expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('épuise le parcours à la cinquième tentative et efface le cookie', async () => {
      await activate();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));
      const code = harness.messages.signInCodes.get(EMAIL) ?? '';

      for (let attempt = 0; attempt < 4; attempt += 1) {
        await verify(journey, '000000').expect(400);
      }

      const exhausted = await verify(journey, '000000').expect(400);

      expect(cookieNamed(exhausted, SIGNIN_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      await verify(journey, code).expect(400);
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('refuse un code de connexion sur la confirmation d inscription', async () => {
      await signUp();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      const response = await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `rk_signup=${journey}`)
        .send({ code: harness.messages.signInCodes.get(EMAIL) })
        .expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse un code d inscription sur la vérification de connexion', async () => {
      const registration = await signUp();
      const signUpJourney = valueOf(cookieNamed(registration, 'rk_signup'));

      const response = await verify(
        signUpJourney,
        harness.messages.codes.get(EMAIL) ?? '',
      ).expect(400);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
      expect(await harness.prisma.session.count()).toBe(0);
    });

    it('laisse la connexion par mot de passe intacte', async () => {
      await activate();
      const requested = await requestCode().expect(200);
      const journey = valueOf(cookieNamed(requested, SIGNIN_COOKIE));

      await verify(
        journey,
        harness.messages.signInCodes.get(EMAIL) ?? '',
      ).expect(200);

      await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
    });
  });
});

function attributesOf(cookie: string): string[] {
  return cookie
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim().split('=')[0])
    .sort();
}
