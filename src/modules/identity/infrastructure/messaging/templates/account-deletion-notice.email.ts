import { EmailCopy, deletionDeadlineLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function accountDeletionNoticeEmail(deadline: string): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.accountDeletionNotice,
    detail: deletionDeadlineLine(deadline),
  });
}
