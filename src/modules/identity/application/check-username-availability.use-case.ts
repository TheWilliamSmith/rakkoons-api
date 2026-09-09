import { AccountRepository } from '../domain/ports/account-repository';
import { Username } from '../domain/value-objects/username';

export interface CheckUsernameAvailabilityInput {
  username: string;
}

export interface CheckUsernameAvailabilityOutput {
  isAvailable: boolean;
}

export class CheckUsernameAvailabilityUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(
    input: CheckUsernameAvailabilityInput,
  ): Promise<CheckUsernameAvailabilityOutput> {
    const username = Username.create(input.username);

    return { isAvailable: await this.accounts.isUsernameAvailable(username) };
  }
}
