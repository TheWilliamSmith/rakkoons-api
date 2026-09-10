import { EmailAddress } from '../../domain/value-objects/email-address';
import { VerificationCode } from '../../domain/value-objects/verification-code';
import { EmailMessageSender } from './email-message-sender';
import { EmailTransport, OutboundEmail } from './outbound-email';

const RECIPIENT = EmailAddress.create('william@rakkoons.fr');
const CODE = VerificationCode.create('429861');
const CODE_TTL_MINUTES = 10;

class RecordingTransport implements EmailTransport {
  readonly sent: OutboundEmail[] = [];

  send(email: OutboundEmail): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }
}

class FailingTransport implements EmailTransport {
  send(): Promise<void> {
    return Promise.reject(new Error('resend unavailable'));
  }
}

class SilentLogger {
  readonly errors: string[] = [];

  setContext(): void {
    return;
  }

  error(_details: unknown, message: string): void {
    this.errors.push(message);
  }
}

function build(transport: EmailTransport): {
  sender: EmailMessageSender;
  logger: SilentLogger;
} {
  const logger = new SilentLogger();
  const config = { get: (): number => CODE_TTL_MINUTES };

  return {
    sender: new EmailMessageSender(transport, config as never, logger as never),
    logger,
  };
}

describe('EmailMessageSender', () => {
  it('remet au transport un message adressé au destinataire', async () => {
    const transport = new RecordingTransport();
    const { sender } = build(transport);

    await sender.sendRegistrationCode(RECIPIENT, CODE);

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].recipient).toBe('william@rakkoons.fr');
    expect(transport.sent[0].text).toContain('429861');
  });

  it('journalise et absorbe un échec du transport', async () => {
    const { sender, logger } = build(new FailingTransport());

    await expect(
      sender.sendRegistrationCode(RECIPIENT, CODE),
    ).resolves.toBeUndefined();
    expect(logger.errors).toEqual(['email dispatch failed']);
  });
});
