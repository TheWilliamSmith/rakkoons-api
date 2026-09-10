import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
  TEST_PASSWORD_RESET_POLICY,
  TEST_INSTANT,
} from '@test/identity/identity-test-context';
import { MessageDeliveryFailedError } from '../domain/errors/message-delivery-failed.error';

const EMAIL = 'william@rakkoons.fr';

const SIGN_UP_INPUT = {
  username: 'rakkoonette',
  email: EMAIL,
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('RequestPasswordResetUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function activateAccount(): Promise<void> {
    const registration = await context.registerAccount().execute(SIGN_UP_INPUT);
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });
  }

  it('ouvre un parcours et envoie un code au compte actif', async () => {
    await activateAccount();

    const output = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    const journey = await context.journeys.findById(output.journeyId);

    expect(journey?.attemptsLeft).toBe(5);
    expect(journey?.isVerified()).toBe(false);
    expect(context.messages.passwordResetCodes).toEqual([
      { recipient: EMAIL, code: TEST_CODE },
    ]);
  });

  it('rend un parcours indiscernable sur une adresse inconnue, sans rien écrire', async () => {
    const output = await context.requestPasswordReset().execute({
      email: 'inconnu@rakkoons.fr',
    });

    expect(typeof output.journeyId).toBe('string');
    expect(output.journeyExpiresAt).toEqual(
      new Date(
        TEST_INSTANT.getTime() + TEST_PASSWORD_RESET_POLICY.journeyLifetime,
      ),
    );
    expect(await context.journeys.findById(output.journeyId)).toBeNull();
    expect(context.messages.passwordResetCodes).toHaveLength(0);
  });

  it('rend un parcours indiscernable sur une adresse mal formée', async () => {
    const output = await context
      .requestPasswordReset()
      .execute({ email: 'pas-une-adresse' });

    expect(typeof output.journeyId).toBe('string');
    expect(context.messages.passwordResetCodes).toHaveLength(0);
  });

  it('n envoie aucun code à un compte encore en attente d activation', async () => {
    await context.registerAccount().execute(SIGN_UP_INPUT);

    const output = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    expect(await context.journeys.findById(output.journeyId)).toBeNull();
    expect(context.messages.passwordResetCodes).toHaveLength(0);
  });

  it('invalide le parcours précédent quand un nouveau code est demandé', async () => {
    await activateAccount();
    const first = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    const second = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    expect(
      (await context.journeys.findById(first.journeyId))?.isConsumed(),
    ).toBe(true);
    expect(
      (await context.journeys.findById(second.journeyId))?.isConsumed(),
    ).toBe(false);
    expect(context.messages.passwordResetCodes).toHaveLength(2);
  });

  it('remonte l échec d envoi du message', async () => {
    await activateAccount();
    context.messages.sendPasswordResetCode = (): Promise<void> =>
      Promise.reject(new MessageDeliveryFailedError());

    await expect(
      context.requestPasswordReset().execute({ email: EMAIL }),
    ).rejects.toThrow(MessageDeliveryFailedError);
  });

  it('consulte le hacheur même sans compte, pour ne pas trahir par le temps', async () => {
    await context
      .requestPasswordReset()
      .execute({ email: 'inconnu@rakkoons.fr' });

    expect(context.passwordHasher.decoyVerifications).toBe(1);
  });
});
