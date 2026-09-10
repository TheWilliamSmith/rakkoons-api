import { EmailCopy } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function accountDeletionCancelledEmail(): EmailContent {
  return renderNoticeEmail({ copy: EmailCopy.accountDeletionCancelled });
}
