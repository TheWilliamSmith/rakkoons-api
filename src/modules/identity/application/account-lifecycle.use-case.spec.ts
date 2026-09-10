import {
  IdentityTestContext,
  TEST_CODE,
  TEST_DELETION_POLICY,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { AccountDeletionNotScheduledError } from '../domain/errors/account-deletion-not-scheduled.error';
import { CurrentPasswordRejectedError } from '../domain/errors/current-password-rejected.error';
import { EmailAlreadyRegisteredError } from '../domain/errors/email-already-registered.error';
import { EmailChangeCodeRejectedError } from '../domain/errors/email-change-code-rejected.error';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';

const EMAIL = 'william@rakkoons.fr';
const NEW_EMAIL = 'nouvelle@rakkoons.fr';

describe('cycle de vie du compte', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function activate(
    username = 'rakkoonette',
    email = EMAIL,
  ): Promise<string> {
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

  describe('changement d adresse', () => {
    it('envoie le code à la nouvelle adresse sans rien changer encore', async () => {
      const accountId = await activate();

      await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });

      const account = await context.readAccount().execute({ accountId });

      expect(account.email).toBe(EMAIL);
      expect(account.pendingEmail).toBe(NEW_EMAIL);
      expect(context.messages.emailChangeCodes).toEqual([
        { recipient: NEW_EMAIL, code: TEST_CODE },
      ]);
      expect(context.messages.emailChangeNotices).toHaveLength(0);
    });

    it('exige le mot de passe actuel', async () => {
      const accountId = await activate();

      await expect(
        context.requestEmailChange().execute({
          accountId,
          email: NEW_EMAIL,
          currentPassword: 'MauvaisMotDePasse1!',
        }),
      ).rejects.toThrow(CurrentPasswordRejectedError);
      expect(context.messages.emailChangeCodes).toHaveLength(0);
    });

    it('refuse une adresse déjà prise', async () => {
      await activate('autrekoon', NEW_EMAIL);
      const accountId = await activate();

      await expect(
        context.requestEmailChange().execute({
          accountId,
          email: NEW_EMAIL,
          currentPassword: TEST_PASSWORD,
        }),
      ).rejects.toThrow(EmailAlreadyRegisteredError);
    });

    it('bascule l adresse et prévient l ancienne', async () => {
      const accountId = await activate();
      const requested = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });

      await context.confirmEmailChange().execute({
        accountId,
        journeyId: requested.journeyId,
        code: TEST_CODE,
      });

      const account = await context.readAccount().execute({ accountId });

      expect(account.email).toBe(NEW_EMAIL);
      expect(account.pendingEmail).toBeNull();
      expect(context.messages.emailChangeNotices).toEqual([
        { recipient: EMAIL, newAddress: NEW_EMAIL },
      ]);
    });

    it('refuse un code faux sans basculer', async () => {
      const accountId = await activate();
      const requested = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });

      await expect(
        context.confirmEmailChange().execute({
          accountId,
          journeyId: requested.journeyId,
          code: '000000',
        }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
      expect((await context.readAccount().execute({ accountId })).email).toBe(
        EMAIL,
      );
    });

    it('refuse le parcours d un autre compte', async () => {
      const otherId = await activate('autrekoon', 'autre@rakkoons.fr');
      const requested = await context.requestEmailChange().execute({
        accountId: otherId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });
      const accountId = await activate();

      await expect(
        context.confirmEmailChange().execute({
          accountId,
          journeyId: requested.journeyId,
          code: TEST_CODE,
        }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
    });

    it('invalide le code précédent quand un nouveau est demandé', async () => {
      const accountId = await activate();
      const first = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });

      await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });

      await expect(
        context
          .confirmEmailChange()
          .execute({ accountId, journeyId: first.journeyId, code: TEST_CODE }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
    });
  });

  describe('notifications', () => {
    it('active les trois catégories à la création', async () => {
      const accountId = await activate();

      expect(
        await context.readNotificationPreferences().execute({ accountId }),
      ).toEqual({ product: true, security: true, reminders: true });
    });

    it('ne modifie que les clés envoyées', async () => {
      const accountId = await activate();

      await context
        .updateNotificationPreferences()
        .execute({ accountId, preferences: { product: false } });

      expect(
        await context.readNotificationPreferences().execute({ accountId }),
      ).toEqual({ product: false, security: true, reminders: true });
    });

    it('ignore une tentative de couper les alertes de sécurité', async () => {
      const accountId = await activate();

      await context.updateNotificationPreferences().execute({
        accountId,
        preferences: { security: false, reminders: false },
      });

      const preferences = await context
        .readNotificationPreferences()
        .execute({ accountId });

      expect(preferences.security).toBe(true);
      expect(preferences.reminders).toBe(false);
    });
  });

  describe('suppression différée', () => {
    it('programme la suppression et coupe toutes les sessions', async () => {
      const accountId = await activate();
      const session = await context
        .openSession()
        .execute({ email: EMAIL, password: TEST_PASSWORD });

      await context
        .scheduleAccountDeletion()
        .execute({ accountId, currentPassword: TEST_PASSWORD });

      const account = await context.readAccount().execute({ accountId });

      expect(account.deletionScheduledAt).toEqual(
        new Date(
          context.clock.now().getTime() + TEST_DELETION_POLICY.gracePeriod,
        ),
      );
      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: session.sessionIdentifier }),
      ).rejects.toThrow(SessionNotEstablishedError);
      expect(context.messages.deletionNotices).toHaveLength(1);
    });

    it('exige le mot de passe actuel', async () => {
      const accountId = await activate();

      await expect(
        context.scheduleAccountDeletion().execute({
          accountId,
          currentPassword: 'MauvaisMotDePasse1!',
        }),
      ).rejects.toThrow(CurrentPasswordRejectedError);
      expect(
        (await context.readAccount().execute({ accountId }))
          .deletionScheduledAt,
      ).toBeNull();
    });

    it('laisse se reconnecter pendant la fenêtre pour annuler', async () => {
      const accountId = await activate();
      await context
        .scheduleAccountDeletion()
        .execute({ accountId, currentPassword: TEST_PASSWORD });

      await expect(
        context
          .openSession()
          .execute({ email: EMAIL, password: TEST_PASSWORD }),
      ).resolves.toBeDefined();

      await context.cancelAccountDeletion().execute({ accountId });

      expect(
        (await context.readAccount().execute({ accountId }))
          .deletionScheduledAt,
      ).toBeNull();
    });

    it('refuse une annulation sans suppression programmée', async () => {
      const accountId = await activate();

      await expect(
        context.cancelAccountDeletion().execute({ accountId }),
      ).rejects.toThrow(AccountDeletionNotScheduledError);
    });

    it('efface le compte une fois l échéance atteinte', async () => {
      const accountId = await activate();
      await context
        .scheduleAccountDeletion()
        .execute({ accountId, currentPassword: TEST_PASSWORD });

      context.clock.advanceBy(TEST_DELETION_POLICY.gracePeriod);
      const outcome = await context.purgeDueAccounts().execute();

      expect(outcome.purgedCount).toBe(1);
      expect(context.accounts.count()).toBe(0);
    });

    it('laisse intact un compte dont l échéance n est pas atteinte', async () => {
      const accountId = await activate();
      await context
        .scheduleAccountDeletion()
        .execute({ accountId, currentPassword: TEST_PASSWORD });

      context.clock.advanceBy(TEST_DELETION_POLICY.gracePeriod - 1000);

      expect((await context.purgeDueAccounts().execute()).purgedCount).toBe(0);
      expect(context.accounts.count()).toBe(1);
    });

    it('n efface jamais un compte sans suppression programmée', async () => {
      await activate();

      context.clock.advanceBy(TEST_DELETION_POLICY.gracePeriod * 10);

      expect((await context.purgeDueAccounts().execute()).purgedCount).toBe(0);
      expect(context.accounts.count()).toBe(1);
    });
  });
});
