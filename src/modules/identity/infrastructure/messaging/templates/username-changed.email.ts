import { EmailCopy, newUsernameLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function usernameChangedEmail(username: string): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.usernameChanged,
    detail: newUsernameLine(username),
  });
}
