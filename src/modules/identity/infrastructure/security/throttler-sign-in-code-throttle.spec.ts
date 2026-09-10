import { EmailAddress } from '../../domain/value-objects/email-address';
import { ThrottlerSignInCodeThrottle } from './throttler-sign-in-code-throttle';

const MIN_INTERVAL_SECONDS = 60;
const PER_ACCOUNT_HOURLY = 5;
const ADDRESSES_PER_ORIGIN_HOURLY = 3;
const ORIGIN = '203.0.113.7';

const LIMITS: Record<string, number> = {
  SIGNIN_CODE_MIN_INTERVAL_SECONDS: MIN_INTERVAL_SECONDS,
  RATE_LIMIT_SIGNIN_CODE_PER_ACCOUNT_HOURLY: PER_ACCOUNT_HOURLY,
  RATE_LIMIT_SIGNIN_CODE_ADDRESSES_PER_ORIGIN_HOURLY:
    ADDRESSES_PER_ORIGIN_HOURLY,
};

class CountingStorage {
  readonly hits = new Map<string, number>();

  increment(
    key: string,
    _ttl: number,
    limit: number,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const totalHits = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, totalHits);

    return Promise.resolve({
      totalHits,
      timeToExpire: 0,
      isBlocked: totalHits > limit,
      timeToBlockExpire: 0,
    });
  }
}

function build(): {
  throttle: ThrottlerSignInCodeThrottle;
  storage: CountingStorage;
} {
  const storage = new CountingStorage();
  const config = { get: (key: string): number => LIMITS[key] };

  return {
    throttle: new ThrottlerSignInCodeThrottle(storage, config as never),
    storage,
  };
}

function address(local: string): EmailAddress {
  return EmailAddress.create(`${local}@rakkoons.fr`);
}

describe('ThrottlerSignInCodeThrottle', () => {
  it('autorise une première demande', async () => {
    const { throttle } = build();

    expect(await throttle.allowsCodeFor(address('william'), ORIGIN)).toBe(true);
  });

  it('refuse une seconde demande immédiate pour la même adresse', async () => {
    const { throttle } = build();
    await throttle.allowsCodeFor(address('william'), ORIGIN);

    expect(await throttle.allowsCodeFor(address('william'), ORIGIN)).toBe(
      false,
    );
  });

  it('refuse au delà du plafond horaire par adresse', async () => {
    const { throttle } = build();

    for (let call = 0; call < PER_ACCOUNT_HOURLY; call += 1) {
      await throttle.allowsCodeFor(address('william'), ORIGIN);
    }

    expect(await throttle.allowsCodeFor(address('william'), ORIGIN)).toBe(
      false,
    );
  });

  it('refuse quand une même origine vise trop d adresses différentes', async () => {
    const { throttle } = build();

    for (let victim = 0; victim < ADDRESSES_PER_ORIGIN_HOURLY; victim += 1) {
      expect(
        await throttle.allowsCodeFor(address(`cible${victim}`), ORIGIN),
      ).toBe(true);
    }

    expect(await throttle.allowsCodeFor(address('cible-de-trop'), ORIGIN)).toBe(
      false,
    );
  });

  it('ne compte qu une fois une adresse déjà vue depuis la même origine', async () => {
    const { throttle, storage } = build();

    await throttle.allowsCodeFor(address('william'), ORIGIN);
    await throttle.allowsCodeFor(address('william'), ORIGIN);

    expect(storage.hits.get(spreadKey(storage))).toBe(1);
  });

  it('sépare les compteurs de deux origines', async () => {
    const { throttle } = build();

    for (let victim = 0; victim < ADDRESSES_PER_ORIGIN_HOURLY; victim += 1) {
      await throttle.allowsCodeFor(address(`cible${victim}`), ORIGIN);
    }

    expect(
      await throttle.allowsCodeFor(address('cible-de-trop'), '198.51.100.4'),
    ).toBe(true);
  });

  it('ne stocke jamais l adresse ni l origine en clair', async () => {
    const { throttle, storage } = build();

    await throttle.allowsCodeFor(address('william'), ORIGIN);

    for (const key of storage.hits.keys()) {
      expect(key).not.toContain('william@rakkoons.fr');
      expect(key).not.toContain(ORIGIN);
    }
  });
});

function spreadKey(storage: CountingStorage): string {
  return (
    [...storage.hits.keys()].find((key) =>
      key.startsWith('sign-in-code-origin-spread:'),
    ) ?? ''
  );
}
