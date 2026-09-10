import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const PASSWORD = 'MotDePasseQuiGagne1!';
const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';
const SESSION_COOKIE = 'rk_session';

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

function attributesOf(cookie: string | null): string[] {
  return (cookie ?? '')
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim().split('=')[0].toLowerCase())
    .filter((attribute) => attribute !== 'expires' && attribute !== 'max-age')
    .sort();
}

describe('Session et déconnexion (e2e)', () => {
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

  async function signIn(): Promise<request.Response> {
    await activate();

    return request(harness.server())
      .post(`${AUTH}/sign-in`)
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200);
  }

  function readSession(identifier: string): request.Test {
    return request(harness.server())
      .get(`${AUTH}/session`)
      .set('Cookie', `${SESSION_COOKIE}=${identifier}`);
  }

  function signOut(identifier: string | null): request.Test {
    const call = request(harness.server()).post(`${AUTH}/sign-out`);

    return identifier === null
      ? call
      : call.set('Cookie', `${SESSION_COOKIE}=${identifier}`);
  }

  describe('lecture de session', () => {
    it('répond 200 avec l identité et rien de plus', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const response = await readSession(identifier).expect(200);
      const body = response.body as { id: string; username: string };

      expect(Object.keys(body).sort()).toEqual(['id', 'username']);
      expect(body.username).toBe(USERNAME);
      expect(typeof body.id).toBe('string');
    });

    it('ne renvoie ni empreinte, ni adresse, ni identifiant de session', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const response = await readSession(identifier).expect(200);
      const body = JSON.stringify(response.body);

      expect(body).not.toContain(EMAIL);
      expect(body).not.toContain(identifier);
      expect(body).not.toContain(PASSWORD);
      expect(body).not.toContain('argon2');
    });

    it('interdit la mise en cache de la réponse', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const response = await readSession(identifier).expect(200);

      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('répond à l identique sans cookie, sur un cookie inconnu et après déconnexion', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));
      await signOut(identifier).expect(204);

      const attempts = await Promise.all([
        request(harness.server()).get(`${AUTH}/session`),
        readSession('jamais-emis'),
        readSession(identifier),
      ]);

      for (const attempt of attempts) {
        expect(attempt.status).toBe(401);
        expect(attempt.body).toEqual({
          error: { reason: 'unauthenticated' },
        });
      }
    });

    it('garde l échéance glissante sous la durée absolue après usage', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      await readSession(identifier).expect(200);

      const stored = await harness.prisma.session.findFirstOrThrow({
        select: { expiresAt: true, absoluteExpiresAt: true, lastUsedAt: true },
      });

      expect(stored.expiresAt.getTime()).toBeLessThanOrEqual(
        stored.absoluteExpiresAt.getTime(),
      );
      expect(stored.lastUsedAt.getTime()).toBeLessThanOrEqual(
        stored.expiresAt.getTime(),
      );
    });
  });

  describe('déconnexion', () => {
    it('répond 204 et révoque réellement la session', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const response = await signOut(identifier).expect(204);

      expect(response.body).toEqual({});
      expect(
        (
          await harness.prisma.session.findFirstOrThrow({
            select: { revokedAt: true },
          })
        ).revokedAt,
      ).not.toBeNull();
      await readSession(identifier).expect(401);
    });

    it('répond le même statut sans cookie qu avec cookie', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const withCookie = await signOut(identifier);
      const withoutCookie = await signOut(null);
      const unknownCookie = await signOut('jamais-emis');

      expect(withoutCookie.status).toBe(withCookie.status);
      expect(unknownCookie.status).toBe(withCookie.status);
      expect(withoutCookie.body).toEqual(withCookie.body);
    });

    it('efface le cookie avec les mêmes attributs que ceux qui l ont posé', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      const cleared = await signOut(identifier).expect(204);
      const clearedCookie = cookieNamed(cleared, SESSION_COOKIE);

      expect(attributesOf(clearedCookie)).toEqual(
        attributesOf(cookieNamed(session, SESSION_COOKIE)),
      );
      expect(valueOf(clearedCookie)).toBe('');
      expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('refuse la déconnexion en GET', async () => {
      const session = await signIn();
      const identifier = valueOf(cookieNamed(session, SESSION_COOKIE));

      await request(harness.server())
        .get(`${AUTH}/sign-out`)
        .set('Cookie', `${SESSION_COOKIE}=${identifier}`)
        .expect(404);

      await readSession(identifier).expect(200);
    });

    it('ne révoque que la session présentée', async () => {
      const first = await signIn();
      const second = await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      await signOut(valueOf(cookieNamed(first, SESSION_COOKIE))).expect(204);

      await readSession(valueOf(cookieNamed(second, SESSION_COOKIE))).expect(
        200,
      );
    });
  });
});
