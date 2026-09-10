import { EmailCopy, revokedSessionsLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function passwordResetCompletedEmail(): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.passwordResetCompleted,
    detail: revokedSessionsLine(),
  });
}
