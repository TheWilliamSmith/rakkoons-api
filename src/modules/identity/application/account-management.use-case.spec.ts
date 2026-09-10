import {
  IdentityTestContext,
  TEST_CODE,
  TEST_NEW_PASSWORD,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { CurrentPasswordRejectedError } from '../domain/errors/current-password-rejected.error';
import { InvalidUsernameError } from '../domain/errors/invalid-username.error';
import { PasswordUnchangedError } from '../domain/errors/password-unchanged.error';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { SessionNotFoundError } from '../domain/errors/session-not-found.error';

const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';

describe('gestion du compte', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function activate(username = USERNAME, email = EMAIL): Promise<string> {
    const registration = await context.registerAccount().execute({
      username,
      email,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });

    const journey = await context.journeys.findById(registration.journeyId);

    return journey?.accountId ?? '';
  }

  async function signIn(email = EMAIL): Promise<{ id: string; token: string }> {
    const opened = await context
      .openSession()
      .execute({ email, password: TEST_PASSWORD });
    const caller = await context
      .authenticateSession()
      .execute({ sessionIdentifier: opened.sessionIdentifier });

    return { id: caller.sessionId, token: opened.sessionIdentifier };
  }

  describe('lecture', () => {
    it('ne rend que le nom, l adresse et la date de création', async () => {
      const accountId = await activate();

      const account = await context.readAccount().execute({ accountId });

      expect(Object.keys(account).sort()).toEqual([
        'createdAt',
        'deletionScheduledAt',
        'email',
        'pendingEmail',
        'username',
      ]);
      expect(account.username).toBe(USERNAME);
      expect(account.email).toBe(EMAIL);
    });

    it('ne divulgue ni empreinte ni statut interne', async () => {
      const accountId = await activate();

      const serialized = JSON.stringify(
        await context.readAccount().execute({ accountId }),
      );

      expect(serialized).not.toContain('hashed:');
      expect(serialized).not.toContain('active');
      expect(serialized).not.toContain(accountId);
    });
  });

  describe('changement de nom', () => {
    it('renomme le compte', async () => {
      const accountId = await activate();

      await context
        .changeUsername()
        .execute({ accountId, username: 'rakkoonette2' });

      expect(
        (await context.readAccount().execute({ accountId })).username,
      ).toBe('rakkoonette2');
    });

    it('accepte le nom actuel sans effet', async () => {
      const accountId = await activate();

      await expect(
        context.changeUsername().execute({ accountId, username: USERNAME }),
      ).resolves.toBeUndefined();
      expect(
        (await context.readAccount().execute({ accountId })).username,
      ).toBe(USERNAME);
    });

    it('refuse un nom mal formé', async () => {
      const accountId = await activate();

      await expect(
        context.changeUsername().execute({ accountId, username: 'ra' }),
      ).rejects.toThrow(InvalidUsernameError);
    });
  });

  describe('changement de mot de passe', () => {
    it('refuse un mot de passe actuel faux et ne modifie rien', async () => {
      const accountId = await activate();
      const current = await signIn();

      await expect(
        context.changePassword().execute({
          accountId,
          currentSessionId: current.id,
          currentPassword: 'MauvaisMotDePasse1!',
          newPassword: TEST_NEW_PASSWORD,
        }),
      ).rejects.toThrow(CurrentPasswordRejectedError);

      await expect(
        context
          .openSession()
          .execute({ email: EMAIL, password: TEST_PASSWORD }),
      ).resolves.toBeDefined();
    });

    it('refuse un mot de passe actuel mal formé comme un mot de passe faux', async () => {
      const accountId = await activate();
      const current = await signIn();

      await expect(
        context.changePassword().execute({
          accountId,
          currentSessionId: current.id,
          currentPassword: 'court',
          newPassword: TEST_NEW_PASSWORD,
        }),
      ).rejects.toThrow(CurrentPasswordRejectedError);
    });

    it('refuse un nouveau mot de passe identique à l actuel', async () => {
      const accountId = await activate();
      const current = await signIn();

      await expect(
        context.changePassword().execute({
          accountId,
          currentSessionId: current.id,
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_PASSWORD,
        }),
      ).rejects.toThrow(PasswordUnchangedError);
    });

    it('révoque les autres sessions et conserve la courante', async () => {
      const accountId = await activate();
      const other = await signIn();
      const current = await signIn();

      await context.changePassword().execute({
        accountId,
        currentSessionId: current.id,
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: current.token }),
      ).resolves.toBeDefined();
      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: other.token }),
      ).rejects.toThrow(SessionNotEstablishedError);
    });

    it('laisse ouvrir une session avec le nouveau mot de passe seulement', async () => {
      const accountId = await activate();
      const current = await signIn();

      await context.changePassword().execute({
        accountId,
        currentSessionId: current.id,
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

      await expect(
        context
          .openSession()
          .execute({ email: EMAIL, password: TEST_NEW_PASSWORD }),
      ).resolves.toBeDefined();
      await expect(
        context
          .openSession()
          .execute({ email: EMAIL, password: TEST_PASSWORD }),
      ).rejects.toThrow();
    });
  });

  describe('sessions', () => {
    it('ne rend aucune valeur exploitable pour s authentifier', async () => {
      const accountId = await activate();
      const current = await signIn();

      const sessions = await context
        .listAccountSessions()
        .execute({ accountId, currentSessionId: current.id });

      expect(sessions).toHaveLength(1);
      expect(Object.keys(sessions[0] ?? {}).sort()).toEqual([
        'createdAt',
        'id',
        'isCurrent',
        'lastUsedAt',
      ]);
      expect(JSON.stringify(sessions)).not.toContain(current.token);
      expect(JSON.stringify(sessions)).not.toContain('hashed:');
    });

    it('marque la session courante', async () => {
      const accountId = await activate();
      await signIn();
      const current = await signIn();

      const sessions = await context
        .listAccountSessions()
        .execute({ accountId, currentSessionId: current.id });

      expect(sessions.filter((session) => session.isCurrent)).toHaveLength(1);
    });

    it('ne rend que les sessions du compte appelant', async () => {
      const otherAccountId = await activate('autrekoon', 'autre@rakkoons.fr');
      await signIn('autre@rakkoons.fr');
      const accountId = await activate();
      const current = await signIn();

      const sessions = await context
        .listAccountSessions()
        .execute({ accountId, currentSessionId: current.id });

      expect(sessions).toHaveLength(1);
      expect(accountId).not.toBe(otherAccountId);
    });

    it('écarte les sessions révoquées et expirées', async () => {
      const accountId = await activate();
      const revoked = await signIn();
      const current = await signIn();

      await context
        .revokeSession()
        .execute({ sessionIdentifier: revoked.token });

      expect(
        await context
          .listAccountSessions()
          .execute({ accountId, currentSessionId: current.id }),
      ).toHaveLength(1);
    });
  });

  describe('révocation d une session', () => {
    it('révoque une session du compte appelant', async () => {
      const accountId = await activate();
      const other = await signIn();
      const current = await signIn();

      const outcome = await context.revokeAccountSession().execute({
        accountId,
        sessionId: other.id,
        currentSessionId: current.id,
      });

      expect(outcome.revokedCurrentSession).toBe(false);
      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: other.token }),
      ).rejects.toThrow(SessionNotEstablishedError);
    });

    it('signale la révocation de la session courante', async () => {
      const accountId = await activate();
      const current = await signIn();

      const outcome = await context.revokeAccountSession().execute({
        accountId,
        sessionId: current.id,
        currentSessionId: current.id,
      });

      expect(outcome.revokedCurrentSession).toBe(true);
    });

    it('refuse à l identique une session inconnue et celle d un autre compte', async () => {
      await activate('autrekoon', 'autre@rakkoons.fr');
      const foreign = await signIn('autre@rakkoons.fr');
      const accountId = await activate();
      const current = await signIn();

      const rejections = [
        context.revokeAccountSession().execute({
          accountId,
          sessionId: foreign.id,
          currentSessionId: current.id,
        }),
        context.revokeAccountSession().execute({
          accountId,
          sessionId: 'jamais-emise',
          currentSessionId: current.id,
        }),
      ];

      for (const rejection of rejections) {
        await expect(rejection).rejects.toThrow(SessionNotFoundError);
      }

      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: foreign.token }),
      ).resolves.toBeDefined();
    });
  });
});
