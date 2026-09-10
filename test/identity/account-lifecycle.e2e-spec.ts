import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const ACCOUNT = '/api/v1/account';
const PASSWORD = 'MotDePasseQuiGagne1!';
const EMAIL = 'william@rakkoons.fr';
const NEW_EMAIL = 'nouvelle@rakkoons.fr';
const USERNAME = 'rakkoonette';
const SESSION_COOKIE = 'rk_session';
const EMAIL_CHANGE_COOKIE = 'rk_email_change';

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

interface AccountBody {
  username: string;
  email: string;
  createdAt: string;
  pendingEmail: string | null;
  deletionScheduledAt: string | null;
}

describe('Cycle de vie du compte (e2e)', () => {
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

  async function readAccount(token: string): Promise<AccountBody> {
    const response = await request(harness.server())
      .get(ACCOUNT)
      .set('Cookie', `${SESSION_COOKIE}=${token}`)
      .expect(200);

    return response.body as AccountBody;
  }

  function requestEmailChange(token: string, email = NEW_EMAIL): request.Test {
    return request(harness.server())
      .post(`${ACCOUNT}/email`)
      .set('Cookie', `${SESSION_COOKIE}=${token}`)
      .send({ email, currentPassword: PASSWORD });
  }

  describe('lecture étendue', () => {
    it('expose les cinq champs, dont les deux nouveaux à null', async () => {
      await activate();
      const token = await signIn();

      const account = await readAccount(token);

      expect(Object.keys(account).sort()).toEqual([
        'createdAt',
        'deletionScheduledAt',
        'email',
        'pendingEmail',
        'username',
      ]);
      expect(account.pendingEmail).toBeNull();
      expect(account.deletionScheduledAt).toBeNull();
    });
  });

  describe('changement d adresse', () => {
    it('répond 204, pose le cookie de parcours et n a rien changé', async () => {
      await activate();
      const token = await signIn();

      const response = await requestEmailChange(token).expect(204);
      const cookie = cookieNamed(response, EMAIL_CHANGE_COOKIE) ?? '';

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(harness.messages.emailChangeCodes.has(NEW_EMAIL)).toBe(true);

      const account = await readAccount(token);
      expect(account.email).toBe(EMAIL);
      expect(account.pendingEmail).toBe(NEW_EMAIL);
    });

    it('refuse un mot de passe actuel faux avec 403', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/email`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ email: NEW_EMAIL, currentPassword: 'MauvaisMotDePasse1!' })
        .expect(403);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
    });

    it('refuse une adresse déjà prise avec 409 email-taken', async () => {
      await activate('autrekoon', NEW_EMAIL);
      await activate();
      const token = await signIn();

      const response = await requestEmailChange(token).expect(409);

      expect(response.body).toEqual({ error: { reason: 'email-taken' } });
    });

    it('bascule l adresse, efface le cookie et prévient l ancienne', async () => {
      await activate();
      const token = await signIn();
      const requested = await requestEmailChange(token).expect(204);
      const journey = valueOf(cookieNamed(requested, EMAIL_CHANGE_COOKIE));

      const response = await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${token}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .send({ code: harness.messages.emailChangeCodes.get(NEW_EMAIL) })
        .expect(204);

      expect(cookieNamed(response, EMAIL_CHANGE_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      expect(harness.messages.emailChangeNotices.get(EMAIL)).toBe(NEW_EMAIL);

      const account = await readAccount(token);
      expect(account.email).toBe(NEW_EMAIL);
      expect(account.pendingEmail).toBeNull();
    });

    it('refuse un code faux avec 422 invalid-code', async () => {
      await activate();
      const token = await signIn();
      const requested = await requestEmailChange(token).expect(204);
      const journey = valueOf(cookieNamed(requested, EMAIL_CHANGE_COOKIE));

      const response = await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${token}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .send({ code: '000000' })
        .expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse à l identique quand le cookie de parcours manque', async () => {
      await activate();
      const token = await signIn();
      await requestEmailChange(token).expect(204);

      const response = await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ code: '000000' })
        .expect(422);

      expect(response.body).toEqual({ error: { reason: 'invalid-code' } });
    });
  });

  describe('notifications', () => {
    it('répond 200 avec les trois catégories actives', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .get(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(200);

      expect(response.body).toEqual({
        product: true,
        security: true,
        reminders: true,
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('ne modifie que les clés envoyées', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .patch(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ reminders: false })
        .expect(204);

      const response = await request(harness.server())
        .get(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(200);

      expect(response.body).toEqual({
        product: true,
        security: true,
        reminders: false,
      });
    });

    it('ignore silencieusement une tentative de couper les alertes de sécurité', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .patch(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ security: false })
        .expect(204);

      const response = await request(harness.server())
        .get(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(200);

      expect((response.body as { security: boolean }).security).toBe(true);
    });

    it('rejette une clé non déclarée', async () => {
      await activate();
      const token = await signIn();

      await request(harness.server())
        .patch(`${ACCOUNT}/notifications`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ marketing: true })
        .expect(422);
    });
  });

  describe('suppression différée', () => {
    it('répond 204, efface le cookie de session et programme l échéance', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/deletion`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);

      expect(cookieNamed(response, SESSION_COOKIE)).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      await request(harness.server())
        .get(ACCOUNT)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(401);

      expect(
        (await readAccount(await signIn())).deletionScheduledAt,
      ).not.toBeNull();
    });

    it('refuse un mot de passe actuel faux avec 403', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .post(`${ACCOUNT}/deletion`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .send({ currentPassword: 'MauvaisMotDePasse1!' })
        .expect(403);

      expect(response.body).toEqual({
        error: { reason: 'invalid-credentials' },
      });
      expect((await readAccount(token)).deletionScheduledAt).toBeNull();
    });

    it('annule une suppression programmée après reconnexion', async () => {
      await activate();
      await request(harness.server())
        .post(`${ACCOUNT}/deletion`)
        .set('Cookie', `${SESSION_COOKIE}=${await signIn()}`)
        .send({ currentPassword: PASSWORD })
        .expect(204);

      const token = await signIn();

      await request(harness.server())
        .delete(`${ACCOUNT}/deletion`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(204);

      expect((await readAccount(token)).deletionScheduledAt).toBeNull();
    });

    it('refuse une annulation sans suppression programmée avec 404', async () => {
      await activate();
      const token = await signIn();

      const response = await request(harness.server())
        .delete(`${ACCOUNT}/deletion`)
        .set('Cookie', `${SESSION_COOKIE}=${token}`)
        .expect(404);

      expect(response.body).toEqual({ error: { reason: 'not-found' } });
    });
  });
});
