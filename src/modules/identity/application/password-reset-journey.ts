import { PasswordResetCodeRejectedError } from '../domain/errors/password-reset-code-rejected.error';
import { VerificationJourneyRepository } from '../domain/ports/verification-journey-repository';
import { VerificationCode } from '../domain/value-objects/verification-code';
import { VerificationJourney } from '../domain/verification/verification-journey';
import { VerificationPurpose } from '../domain/verification/verification-purpose';

export async function loadPasswordResetJourney(
  journeys: VerificationJourneyRepository,
  journeyId: string | null,
): Promise<VerificationJourney> {
  if (journeyId === null) {
    throw new PasswordResetCodeRejectedError();
  }

  const journey = await journeys.findById(journeyId);

  if (
    journey === null ||
    journey.purpose !== VerificationPurpose.PasswordReset
  ) {
    throw new PasswordResetCodeRejectedError();
  }

  return journey;
}

export function parsePasswordResetCode(raw: string): VerificationCode {
  try {
    return VerificationCode.create(raw);
  } catch {
    throw new PasswordResetCodeRejectedError();
  }
}
