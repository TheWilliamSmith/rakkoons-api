import {
  IdentityTestContext,
  TEST_CODE,
  TEST_NEXT_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { EmailChangeCodeRejectedError } from '../domain/errors/email-change-code-rejected.error';
import { EmailChangeNotRequestedError } from '../domain/errors/email-change-not-requested.error';
import { PasswordResetCodeRejectedError } from '../domain/errors/password-reset-code-rejected.error';
import { VerificationCodeRejectedError } from '../domain/errors/verification-code-rejected.error';

const USERNAME = 'rakkoonette';
const EMAIL = 'william@rakkoons.fr';
const NEW_EMAIL = 'nouvelle@rakkoons.fr';

describe('renvoi de code', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function register(username = USERNAME, email = EMAIL): Promise<string> {
    const registration = await context.registerAccount().execute({
      username,
      email,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });

    return registration.journeyId;
  }

  async function activate(username = USERNAME, email = EMAIL): Promise<string> {
    const journeyId = await register(username, email);
    await context.confirmRegistration().execute({ journeyId, code: TEST_CODE });

    const journey = await context.journeys.findById(journeyId);

    return journey?.accountId ?? '';
  }

  describe('inscription', () => {
    it('envoie un nouveau code à l adresse du compte', async () => {
      const journeyId = await register();
      context.codes.useNext(TEST_NEXT_CODE);

      await context.resendRegistrationCode().execute({ journeyId });

      expect(context.messages.registrationCodes).toEqual([
        { recipient: EMAIL, code: TEST_CODE },
        { recipient: EMAIL, code: TEST_NEXT_CODE },
      ]);
    });

    it('rend le code précédent inutilisable', async () => {
      const journeyId = await register();
      context.codes.useNext(TEST_NEXT_CODE);
      await context.resendRegistrationCode().execute({ journeyId });

      await expect(
        context.confirmRegistration().execute({ journeyId, code: TEST_CODE }),
      ).rejects.toThrow(VerificationCodeRejectedError);
    });

    it('laisse le nouveau code confirmer l inscription', async () => {
      const journeyId = await register();
      context.codes.useNext(TEST_NEXT_CODE);
      await context.resendRegistrationCode().execute({ journeyId });

      await context
        .confirmRegistration()
        .execute({ journeyId, code: TEST_NEXT_CODE });

      expect(context.messages.registrationConfirmations).toHaveLength(1);
    });

    it('garde la fenêtre du parcours ouverte par la demande initiale', async () => {
      const journeyId = await register();
      const opened = await context.journeys.findById(journeyId);
      context.clock.advanceBy(60 * 1000);

      await context.resendRegistrationCode().execute({ journeyId });

      expect((await context.journeys.findById(journeyId))?.expiresAt).toEqual(
        opened?.expiresAt,
      );
    });

    it('refuse un renvoi sans parcours', async () => {
      await expect(
        context.resendRegistrationCode().execute({ journeyId: null }),
      ).rejects.toThrow(VerificationCodeRejectedError);
      expect(context.messages.registrationCodes).toHaveLength(0);
    });

    it('refuse un parcours inconnu', async () => {
      await expect(
        context.resendRegistrationCode().execute({ journeyId: 'inconnu' }),
      ).rejects.toThrow(VerificationCodeRejectedError);
    });

    it('refuse un parcours ouvert pour un autre usage', async () => {
      await activate();
      const reset = await context
        .requestPasswordReset()
        .execute({ email: EMAIL });

      await expect(
        context
          .resendRegistrationCode()
          .execute({ journeyId: reset.journeyId }),
      ).rejects.toThrow(VerificationCodeRejectedError);
    });

    it('refuse un renvoi une fois le compte activé', async () => {
      const journeyId = await register();
      await context
        .confirmRegistration()
        .execute({ journeyId, code: TEST_CODE });

      await expect(
        context.resendRegistrationCode().execute({ journeyId }),
      ).rejects.toThrow(VerificationCodeRejectedError);
    });
  });

  describe('réinitialisation de mot de passe', () => {
    it('envoie un nouveau code à l adresse du compte', async () => {
      await activate();
      const reset = await context
        .requestPasswordReset()
        .execute({ email: EMAIL });
      context.codes.useNext(TEST_NEXT_CODE);

      await context
        .resendPasswordResetCode()
        .execute({ journeyId: reset.journeyId });

      expect(context.messages.passwordResetCodes).toEqual([
        { recipient: EMAIL, code: TEST_CODE },
        { recipient: EMAIL, code: TEST_NEXT_CODE },
      ]);
    });

    it('rend le code précédent inutilisable', async () => {
      await activate();
      const reset = await context
        .requestPasswordReset()
        .execute({ email: EMAIL });
      context.codes.useNext(TEST_NEXT_CODE);
      await context
        .resendPasswordResetCode()
        .execute({ journeyId: reset.journeyId });

      await expect(
        context
          .verifyPasswordResetCode()
          .execute({ journeyId: reset.journeyId, code: TEST_CODE }),
      ).rejects.toThrow(PasswordResetCodeRejectedError);
    });

    it('reste muet pour un parcours leurre', async () => {
      const decoy = await context
        .requestPasswordReset()
        .execute({ email: 'inconnue@rakkoons.fr' });

      await expect(
        context
          .resendPasswordResetCode()
          .execute({ journeyId: decoy.journeyId }),
      ).resolves.toBeUndefined();
      expect(context.messages.passwordResetCodes).toHaveLength(0);
    });

    it('reste muet sans parcours', async () => {
      await expect(
        context.resendPasswordResetCode().execute({ journeyId: null }),
      ).resolves.toBeUndefined();
      expect(context.messages.passwordResetCodes).toHaveLength(0);
    });

    it('reste muet pour un parcours ouvert pour un autre usage', async () => {
      const journeyId = await register();

      await expect(
        context.resendPasswordResetCode().execute({ journeyId }),
      ).resolves.toBeUndefined();
      expect(context.messages.passwordResetCodes).toHaveLength(0);
    });

    it('refuse un renvoi après vérification du code', async () => {
      await activate();
      const reset = await context
        .requestPasswordReset()
        .execute({ email: EMAIL });
      await context
        .verifyPasswordResetCode()
        .execute({ journeyId: reset.journeyId, code: TEST_CODE });

      await expect(
        context
          .resendPasswordResetCode()
          .execute({ journeyId: reset.journeyId }),
      ).rejects.toThrow(PasswordResetCodeRejectedError);
    });
  });

  describe('changement d adresse', () => {
    it('envoie le nouveau code à l adresse en attente', async () => {
      const accountId = await activate();
      const requested = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });
      context.codes.useNext(TEST_NEXT_CODE);

      await context
        .resendEmailChangeCode()
        .execute({ accountId, journeyId: requested.journeyId });

      expect(context.messages.emailChangeCodes).toEqual([
        { recipient: NEW_EMAIL, code: TEST_CODE },
        { recipient: NEW_EMAIL, code: TEST_NEXT_CODE },
      ]);
    });

    it('rend le code précédent inutilisable', async () => {
      const accountId = await activate();
      const requested = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });
      context.codes.useNext(TEST_NEXT_CODE);
      await context
        .resendEmailChangeCode()
        .execute({ accountId, journeyId: requested.journeyId });

      await expect(
        context.confirmEmailChange().execute({
          accountId,
          journeyId: requested.journeyId,
          code: TEST_CODE,
        }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
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
        context
          .resendEmailChangeCode()
          .execute({ accountId, journeyId: requested.journeyId }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
      expect(context.messages.emailChangeCodes).toHaveLength(1);
    });

    it('refuse un renvoi sans parcours', async () => {
      const accountId = await activate();

      await expect(
        context.resendEmailChangeCode().execute({ accountId, journeyId: null }),
      ).rejects.toThrow(EmailChangeCodeRejectedError);
    });

    it('refuse un renvoi après annulation du changement', async () => {
      const accountId = await activate();
      const requested = await context.requestEmailChange().execute({
        accountId,
        email: NEW_EMAIL,
        currentPassword: TEST_PASSWORD,
      });
      await context.cancelEmailChange().execute({ accountId });

      await expect(
        context
          .resendEmailChangeCode()
          .execute({ accountId, journeyId: requested.journeyId }),
      ).rejects.toThrow(EmailChangeNotRequestedError);
    });

    it('refuse un renvoi après confirmation du changement', async () => {
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

      await expect(
        context
          .resendEmailChangeCode()
          .execute({ accountId, journeyId: requested.journeyId }),
      ).rejects.toThrow(EmailChangeNotRequestedError);
    });
  });
});
