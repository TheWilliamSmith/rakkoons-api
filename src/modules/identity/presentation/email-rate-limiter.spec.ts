import { ThrottlerException } from '@nestjs/throttler';
import { EmailRateLimiter } from './email-rate-limiter';

const WINDOW_SECONDS = 60;
const LIMIT = 3;
const BUCKET = 'password-reset-account';
const EMAIL = 'william@rakkoons.fr';

class CountingStorage {
  readonly hits = new Map<string, number>();

  increment(key: string): Promise<{ isBlocked: boolean }> {
    const total = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, total);

    return Promise.resolve({ isBlocked: total > LIMIT });
  }
}

function build(): { limiter: EmailRateLimiter; storage: CountingStorage } {
  const storage = new CountingStorage();
  const config = { get: (): number => WINDOW_SECONDS };

  return {
    limiter: new EmailRateLimiter(storage as never, config as never),
    storage,
  };
}

describe('EmailRateLimiter', () => {
  it('bloque au delà du seuil pour une même adresse', async () => {
    const { limiter } = build();

    for (let call = 0; call < LIMIT; call += 1) {
      await expect(
        limiter.consume(BUCKET, EMAIL, LIMIT),
      ).resolves.toBeUndefined();
    }

    await expect(limiter.consume(BUCKET, EMAIL, LIMIT)).rejects.toThrow(
      ThrottlerException,
    );
  });

  it('compte ensemble les écritures d une même adresse quelle que soit la casse', async () => {
    const { limiter, storage } = build();

    await limiter.consume(BUCKET, EMAIL, LIMIT);
    await limiter.consume(BUCKET, ' William@Rakkoons.FR ', LIMIT);

    expect(storage.hits.size).toBe(1);
  });

  it('ne stocke jamais l adresse en clair', async () => {
    const { limiter, storage } = build();

    await limiter.consume(BUCKET, EMAIL, LIMIT);

    expect([...storage.hits.keys()][0]).not.toContain(EMAIL);
  });

  it('sépare les compteurs de deux adresses', async () => {
    const { limiter, storage } = build();

    await limiter.consume(BUCKET, EMAIL, LIMIT);
    await limiter.consume(BUCKET, 'autre@rakkoons.fr', LIMIT);

    expect(storage.hits.size).toBe(2);
  });

  it('laisse passer une requête sans adresse exploitable', async () => {
    const { limiter, storage } = build();

    await expect(
      limiter.consume(BUCKET, undefined, LIMIT),
    ).resolves.toBeUndefined();
    expect(storage.hits.size).toBe(0);
  });
});
