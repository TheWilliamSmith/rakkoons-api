import request from 'supertest';
import { AUTH, AuthE2eHarness } from './auth-e2e-harness';

const ACCOUNT = '/api/v1/account';
const PASSWORD = 'MotDePasseQuiGagne1!';
const NEW_PASSWORD = 'NouveauMotDePasse2?';
const EMAIL = 'william@rakkoons.fr';
const OTHER_EMAIL = 'autre@rakkoons.fr';
const NEW_EMAIL = 'nouvelle@rakkoons.fr';
const USERNAME = 'rakkoonette';
const SIGNUP_COOKIE = 'rk_signup';
const SESSION_COOKIE = 'rk_session';
const EMAIL_CHANGE_COOKIE = 'rk_email_change';
const PASSWORD_RESET_COOKIE = 'rk_password_reset';
const RESEND_PER_JOURNEY_LIMIT = 3;

function cookiesOf(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : [];
}

function valueOf(response: request.Response, name: string): string {
  const cookie = cookiesOf(response).find((c) => c.startsWith(`${name}=`));
  return (cookie ?? '').split(';')[0].split('=')[1] ?? '';
}

describe('Renvoi de code (e2e)', () => {
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

  async function signUp(username = USERNAME, email = EMAIL): Promise<string> {
    const registration = await request(harness.server())
      .post(`${AUTH}/sign-up`)
      .send({ username, email, password: PASSWORD, hasAcceptedTerms: true })
      .expect(201);

    return valueOf(registration, SIGNUP_COOKIE);
  }

  async function activate(username = USERNAME, email = EMAIL): Promise<void> {
    const journey = await signUp(username, email);

    await request(harness.server())
      .post(`${AUTH}/sign-up/verify`)
      .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
      .send({ code: harness.messages.codes.get(email) })
      .expect(200);
  }

  async function signIn(email = EMAIL): Promise<string> {
    const session = await request(harness.server())
      .post(`${AUTH}/sign-in`)
      .send({ email, password: PASSWORD })
      .expect(200);

    return valueOf(session, SESSION_COOKIE);
  }

  async function requestPasswordReset(email = EMAIL): Promise<string> {
    const reset = await request(harness.server())
      .post(`${AUTH}/password-reset`)
      .send({ email })
      .expect(204);

    return valueOf(reset, PASSWORD_RESET_COOKIE);
  }

  async function requestEmailChange(session: string): Promise<string> {
    const change = await request(harness.server())
      .post(`${ACCOUNT}/email`)
      .set('Cookie', `${SESSION_COOKIE}=${session}`)
      .send({ email: NEW_EMAIL, currentPassword: PASSWORD })
      .expect(204);

    return valueOf(change, EMAIL_CHANGE_COOKIE);
  }

  describe('inscription', () => {
    it('envoie un code différent et invalide le précédent', async () => {
      const journey = await signUp();
      const first = harness.messages.codes.get(EMAIL);

      await request(harness.server())
        .post(`${AUTH}/sign-up/resend`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .expect(204);

      const second = harness.messages.codes.get(EMAIL);

      expect(second).not.toBe(first);
      await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .send({ code: first })
        .expect(400);
      await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .send({ code: second })
        .expect(200);
    });

    it('refuse un renvoi sans cookie de parcours', async () => {
      const blocked = await request(harness.server())
        .post(`${AUTH}/sign-up/resend`)
        .expect(400);

      expect(blocked.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('refuse un renvoi une fois le compte activé', async () => {
      const journey = await signUp();
      await request(harness.server())
        .post(`${AUTH}/sign-up/verify`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .send({ code: harness.messages.codes.get(EMAIL) })
        .expect(200);

      await request(harness.server())
        .post(`${AUTH}/sign-up/resend`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .expect(400);
    });

    it('coupe les renvois au seuil configuré pour un même parcours', async () => {
      const journey = await signUp();

      for (let call = 0; call < RESEND_PER_JOURNEY_LIMIT; call += 1) {
        await request(harness.server())
          .post(`${AUTH}/sign-up/resend`)
          .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
          .expect(204);
      }

      const blocked = await request(harness.server())
        .post(`${AUTH}/sign-up/resend`)
        .set('Cookie', `${SIGNUP_COOKIE}=${journey}`)
        .expect(429);

      expect(blocked.body).toEqual({ error: { reason: 'rate-limited' } });
    });
  });

  describe('réinitialisation de mot de passe', () => {
    it('envoie un code différent et invalide le précédent', async () => {
      await activate();
      const journey = await requestPasswordReset();
      const first = harness.messages.passwordResetCodes.get(EMAIL);

      await request(harness.server())
        .post(`${AUTH}/password-reset/resend`)
        .set('Cookie', `${PASSWORD_RESET_COOKIE}=${journey}`)
        .expect(204);

      const second = harness.messages.passwordResetCodes.get(EMAIL);

      expect(second).not.toBe(first);
      await request(harness.server())
        .post(`${AUTH}/password-reset/verify`)
        .set('Cookie', `${PASSWORD_RESET_COOKIE}=${journey}`)
        .send({ code: first })
        .expect(422);
      await request(harness.server())
        .post(`${AUTH}/password-reset/verify`)
        .set('Cookie', `${PASSWORD_RESET_COOKIE}=${journey}`)
        .send({ code: second })
        .expect(204);
      await request(harness.server())
        .post(`${AUTH}/password-reset/confirm`)
        .set('Cookie', `${PASSWORD_RESET_COOKIE}=${journey}`)
        .send({ password: NEW_PASSWORD })
        .expect(204);
    });

    it('répond comme un succès pour un parcours leurre', async () => {
      const journey = await requestPasswordReset('inconnue@rakkoons.fr');

      await request(harness.server())
        .post(`${AUTH}/password-reset/resend`)
        .set('Cookie', `${PASSWORD_RESET_COOKIE}=${journey}`)
        .expect(204);

      expect(harness.messages.passwordResetCodes.size).toBe(0);
    });

    it('répond comme un succès sans cookie de parcours', async () => {
      await request(harness.server())
        .post(`${AUTH}/password-reset/resend`)
        .expect(204);

      expect(harness.messages.passwordResetCodes.size).toBe(0);
    });
  });

  describe('changement d adresse', () => {
    it('envoie le code à l adresse en attente et invalide le précédent', async () => {
      await activate();
      const session = await signIn();
      const journey = await requestEmailChange(session);
      const first = harness.messages.emailChangeCodes.get(NEW_EMAIL);

      await request(harness.server())
        .post(`${ACCOUNT}/email/resend`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${session}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .expect(204);

      const second = harness.messages.emailChangeCodes.get(NEW_EMAIL);

      expect(second).not.toBe(first);
      expect(harness.messages.emailChangeCodes.has(EMAIL)).toBe(false);
      await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${session}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .send({ code: first })
        .expect(422);
      await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${session}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .send({ code: second })
        .expect(204);
    });

    it('refuse le parcours d un autre compte', async () => {
      await activate('autrekoon', OTHER_EMAIL);
      const otherSession = await signIn(OTHER_EMAIL);
      const otherJourney = await requestEmailChange(otherSession);

      await activate();
      const session = await signIn();

      const blocked = await request(harness.server())
        .post(`${ACCOUNT}/email/resend`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${session}`,
          `${EMAIL_CHANGE_COOKIE}=${otherJourney}`,
        ])
        .expect(422);

      expect(blocked.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('exige une session', async () => {
      await request(harness.server())
        .post(`${ACCOUNT}/email/resend`)
        .expect(401);
    });
  });

  describe('annulation du changement d adresse', () => {
    it('efface l adresse en attente et invalide le code envoyé', async () => {
      await activate();
      const session = await signIn();
      const journey = await requestEmailChange(session);
      const code = harness.messages.emailChangeCodes.get(NEW_EMAIL);

      await request(harness.server())
        .delete(`${ACCOUNT}/email`)
        .set('Cookie', `${SESSION_COOKIE}=${session}`)
        .expect(204);

      const account = await request(harness.server())
        .get(ACCOUNT)
        .set('Cookie', `${SESSION_COOKIE}=${session}`)
        .expect(200);

      expect(
        (account.body as { pendingEmail: string | null }).pendingEmail,
      ).toBeNull();
      expect((account.body as { email: string }).email).toBe(EMAIL);
      await request(harness.server())
        .post(`${ACCOUNT}/email/verify`)
        .set('Cookie', [
          `${SESSION_COOKIE}=${session}`,
          `${EMAIL_CHANGE_COOKIE}=${journey}`,
        ])
        .send({ code })
        .expect(422);
    });

    it('refuse une annulation sans changement en attente', async () => {
      await activate();
      const session = await signIn();

      const blocked = await request(harness.server())
        .delete(`${ACCOUNT}/email`)
        .set('Cookie', `${SESSION_COOKIE}=${session}`)
        .expect(422);

      expect(blocked.body).toEqual({ error: { reason: 'invalid-code' } });
    });

    it('exige une session', async () => {
      await request(harness.server()).delete(`${ACCOUNT}/email`).expect(401);
    });
  });
});
