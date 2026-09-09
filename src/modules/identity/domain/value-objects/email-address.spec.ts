import { InvalidEmailAddressError } from '../errors/invalid-email-address.error';
import { EmailAddress } from './email-address';

describe('EmailAddress', () => {
  it('normalise la casse et les espaces de bord', () => {
    expect(EmailAddress.create('  William@Rakkoons.FR ').toString()).toBe(
      'william@rakkoons.fr',
    );
  });

  it('considère égales deux adresses qui ne diffèrent que par la casse', () => {
    expect(
      EmailAddress.create('william@rakkoons.fr').equals(
        EmailAddress.create('WILLIAM@RAKKOONS.FR'),
      ),
    ).toBe(true);
  });

  it('refuse une adresse sans arobase', () => {
    expect(() => EmailAddress.create('william.rakkoons.fr')).toThrow(
      InvalidEmailAddressError,
    );
  });

  it('refuse une adresse sans domaine de premier niveau', () => {
    expect(() => EmailAddress.create('william@rakkoons')).toThrow(
      InvalidEmailAddressError,
    );
  });

  it('refuse une adresse plus longue que la limite', () => {
    const local = 'a'.repeat(250);

    expect(() => EmailAddress.create(`${local}@rakkoons.fr`)).toThrow(
      InvalidEmailAddressError,
    );
  });
});
