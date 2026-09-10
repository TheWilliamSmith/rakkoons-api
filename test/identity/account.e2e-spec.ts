import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const ACCOUNT = '/api/v1/account';
const PASSWORD = 'MotDePasseQuiGagne1!';
const NEW_PASSWORD = 'NouveauMotDePasse2?';
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

interface AccountSession {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

describe('Gestion du compte (e2e)', () => {
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

  async function activate(username = USERNAME, email = EMAIL): Promise<void> {
    const registration = await request(harness.server())
      .post(`${AUTH}/sign-up`)
      .send({ username, email, password: PASSWORD, hasAcceptedTerms: true });

    await request(harness.server())
      .post(`${AUTH}/sign-up/verify`)
      .set(
        'Cookie',
        `rk_signup=${valueOf(cookieNamed(registration, 'rk_signup'))}`,
      )
      .send({ code: harness.messages.codes.get(email) })
      .expect(200);
  }

  async function signIn(email = EMAIL): Promise<string> {
    const session = await request(harness.server())
      .post(`${AUTH}/sign-in`)
      .send({ email, password: PASSWORD })
      .expect(200);

    return valueOf(cookieNamed(session, SESSION_COOKIE));
  }

  function asCaller(token: string, path: string, method: 'get' | 'delete') {
    return request(harness.server())
      [method](`${ACCOUNT}${path}`)
      .set('Cookie', `${SESSION_COOKIE}=${token}`);
  }

  async function listSessions(token: string): Promise<AccountSession[]> {
    const response = await asCaller(token, '/sessions', 'get').expect(200);

    return response.body as AccountSession[];
  }

  describe('lecture du compte', () => {
    it('répond 200 avec exactement les champs attendus', async () => {
      await activate();
      const token = await signIn();

      const response = await asCaller(token, '', 'get').expect(200);

      expect(Object.keys(response.body as object).sort()).toEqual([
        'createdAt',
        'deletionScheduledAt',
        'email',
        'pendingEmail',
        'username',
      ]);
      expect((response.body as { username: string }).username).toBe(USERNAME);
      expect((response.body as { email: string }).email).toBe(EMAIL);
    });

    it('ne divulgue ni empreinte ni identifiant technique', async () => {
      await activate();
      const token = await signIn();

      const body = JSON.stringify(
        (await asCaller(token, '', 'get').expect(200)).body,
      );

      expect(body).not.toContain('argon2');
      expect(body).not.toContain(token);
    });

    it('refuse sans session avec 401 unauthenticated', async () => {
      const response = await request(harness.server()).get(ACCOUNT).expect(401);

      expect(response.body).toEqual({ error: { reason: 'unauthenticated' } });
    });
  });

  describe('changement de nom', () => {
    it('renomme le compte et répond 204', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .patch(`${ACCOUNT}/username`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ username: 'rakkoonette2' })
        .expect(204);

      expect(
        ((await asCaller(token, '', 'get')).body as { username: string })
          .username,
      ).toBe('rakkoonette2');
    });

    it('accepte le nom actuel sans effet', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .patch(`${ACCOUNT}/username`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ username: USERNAME })
        .expect(204);
    });

    it('refuse un nom déjà pris avec 409 username-taken', async () => {
      await activate('autrekoon', 'autre@rakkoons.fr');
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .patch(`${ACCOUNT}/username`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ username: 'AutreKoon' })
        .expect(409);

      expect(response.body).toEqual({ error: { reason: 'username-taken' } });
    });

    it('refuse un nom mal formé avec 422 invalid-username', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .patch(`${ACCOUNT}/username`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ username: 'ra' })
        .expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-username' } });
    });

    it('rejette un identifiant de compte fourni en entrée', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .patch(`${ACCOUNT}/username`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ username: 'rakkoonette2', accountId: 'quelqu-un-d-autre' })
        .expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });
  });

  describe('changement de mot de passe', () => {
    it('répond 204, ne pose aucun cookie et coupe les autres sessions', async () => {
      await activate();
      const other = await signIn();
      const current = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/password`)
        .set('Cookie', `${SESSION_COOKIE}=${current}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      expect(cookieNamed(response, SESSION_COOKIE)).toBeNull();
      await asCaller(current, '', 'get').expect(200);
      await asCaller(other, '', 'get').expect(401);
    });

    it('refuse un mot de passe actuel faux avec 403 invalid-credentials', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/password`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({
          currentPassword: 'MauvaisMotDePasse1!',
          newPassword: NEW_PASSWORD,
        })
        .expect(403);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
      await request(harness.server())
        .post(`${AUTH}/sign-in`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
    });

    it('refuse un nouveau mot de passe hors politique avec 422', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/password`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ currentPassword: PASSWORD, newPassword: 'sanschiffre' })
        .expect(422);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });

    it('refuse un nouveau mot de passe identique à l actuel avec 422', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .post(`${ACCOUNT}/password`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD })
        .expect(422);
    });
  });

  describe('liste des sessions', () => {
    it('ne rend aucune valeur exploitable pour s authentifier', async () => {
      await activate();
      const token = await signIn();

      const sessions = await listSessions(token);

      expect(sessions).toHaveLength(1);
      expect(Object.keys(sessions[0] ?? {}).sort()).toEqual([
        'createdAt',
        'id',
        'isCurrent',
        'lastUsedAt',
      ]);
      expect(JSON.stringify(sessions)).not.toContain(token);
    });

    it('marque la session courante et trie du plus récent usage au plus ancien', async () => {
      await activate();
      await signIn();
      const current = await signIn();

      const sessions = await listSessions(current);

      expect(sessions.filter((session) => session.isCurrent)).toHaveLength(1);
      expect(sessions[0]?.isCurrent).toBe(true);
    });

    it('ne rend que les sessions du compte appelant', async () => {
      await activate('autrekoon', 'autre@rakkoons.fr');
      await signIn('autre@rakkoons.fr');
      await activate();
      const token = await signIn();

      expect(await listSessions(token)).toHaveLength(1);
    });
  });

  describe('révocation d une session', () => {
    it('révoque une autre session du compte et répond 204', async () => {
      await activate();
      const other = await signIn();
      const current = await signIn();
      const revoked = (await listSessions(current)).find(
        (session) => !session.isCurrent,
      );

      await asCaller(current, `/sessions/${revoked?.id}`, 'delete').expect(204);

      await asCaller(other, '', 'get').expect(401);
      await asCaller(current, '', 'get').expect(200);
    });

    it('efface le cookie quand la session courante est révoquée', async () => {
      await activate();
      const current = await signIn();
      const [session] = await listSessions(current);

      const response = await asCaller(
        current,
        `/sessions/${session?.id}`,
        'delete',
      ).expect(204);

      expect(cookieNamed(response, SESSION_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      await asCaller(current, '', 'get').expect(401);
    });

    it('répond à l identique pour une session inconnue et celle d un autre compte', async () => {
      await activate('autrekoon', 'autre@rakkoons.fr');
      const foreignToken = await signIn('autre@rakkoons.fr');
      const [foreign] = await listSessions(foreignToken);
      await activate();
      const token = await signIn();

      const unknown = await asCaller(
        token,
        '/sessions/3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        'delete',
      ).expect(404);
      const other = await asCaller(
        token,
        `/sessions/${foreign?.id}`,
        'delete',
      ).expect(404);

      expect(other.body).toEqual(unknown.body);
      expect(other.body).toEqual({ error: { reason: 'not-found' } });
      await asCaller(foreignToken, '', 'get').expect(200);
    });
  });
});
