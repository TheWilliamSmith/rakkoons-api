import { Resend } from 'resend';
import { EmailTransport, OutboundEmail } from './outbound-email';

export class ResendEmailTransport implements EmailTransport {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly replyTo: string | undefined,
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(email: OutboundEmail): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(this.replyTo === undefined ? {} : { replyTo: this.replyTo }),
    });

    if (error !== null) {
      throw new Error(`${error.name}: ${error.message}`);
    }
  }
}
