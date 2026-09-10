import { EmailCopy, welcomeLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function registrationConfirmedEmail(username: string): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.registrationConfirmed,
    detail: welcomeLine(username),
  });
}
