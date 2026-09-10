import { EmailCopy } from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { renderCodeEmail } from './email-layout';

export function signInCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderCodeEmail({
    copy: EmailCopy.signInCode,
    code,
    validityMinutes,
  });
}
