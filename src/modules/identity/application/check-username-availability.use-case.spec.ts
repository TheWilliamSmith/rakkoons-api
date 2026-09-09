import {
  IdentityTestContext,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { InvalidUsernameError } from '../domain/errors/invalid-username.error';

describe('CheckUsernameAvailabilityUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  it('déclare disponible un nom que personne ne porte', async () => {
    await expect(
      context.checkUsernameAvailability().execute({ username: 'rakkoonette' }),
    ).resolves.toEqual({ isAvailable: true });
  });

  it('déclare indisponible un nom déjà porté, quelle que soit la casse', async () => {
    await context.registerAccount().execute({
      username: 'rakkoonette',
      email: 'william@rakkoons.fr',
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });

    await expect(
      context.checkUsernameAvailability().execute({ username: 'RakkoonEtte' }),
    ).resolves.toEqual({ isAvailable: false });
  });

  it('refuse un nom qui ne respecte pas les contraintes', async () => {
    await expect(
      context.checkUsernameAvailability().execute({ username: 'ra' }),
    ).rejects.toThrow(InvalidUsernameError);
  });
});
