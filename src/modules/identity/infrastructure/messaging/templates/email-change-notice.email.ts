import { EmailCopy, newAddressLine } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderNoticeEmail } from './email-layout';

export function emailChangeNoticeEmail(newAddress: string): EmailContent {
  return renderNoticeEmail({
    copy: EmailCopy.emailChangeNotice,
    detail: newAddressLine(newAddress),
  });
}
