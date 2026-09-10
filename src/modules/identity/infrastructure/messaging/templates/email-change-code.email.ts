import { EmailCopy } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderCodeEmail } from './email-layout';

export function emailChangeCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderCodeEmail({
    copy: EmailCopy.emailChangeCode,
    code,
    validityMinutes,
  });
}
