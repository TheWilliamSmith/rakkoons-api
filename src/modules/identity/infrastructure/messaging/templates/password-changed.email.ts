import { EmailCopy, revokedSessionsLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function passwordChangedEmail(): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.passwordChanged,
    detail: revokedSessionsLine(),
  });
}
