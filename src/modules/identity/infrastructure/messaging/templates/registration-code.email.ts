import { EmailCopy } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderCodeEmail } from './email-layout';

export function registrationCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderCodeEmail({
    copy: EmailCopy.registrationCode,
    code,
    validityMinutes,
  });
}
