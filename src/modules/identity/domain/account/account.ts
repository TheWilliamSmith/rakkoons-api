import { AccountAlreadyActivatedError } from '../errors/account-already-activated.error';
import { CredentialsRejectedError } from '../errors/credentials-rejected.error';
import { TermsNotAcceptedError } from '../errors/terms-not-accepted.error';
import { PasswordHasher } from '../ports/password-hasher';
import { EmailAddress } from '../value-objects/email-address';
import { PasswordHash } from '../value-objects/password-hash';
import { PlainPassword } from '../value-objects/plain-password';
import { Username } from '../value-objects/username';
import { AccountStatus } from './account-status';

interface AccountState {
  id: string;
  username: Username;
  email: EmailAddress;
  passwordHash: PasswordHash;
  status: AccountStatus;
  termsAcceptedAt: Date;
  termsVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterAccountParameters {
  id: string;
  username: Username;
  email: EmailAddress;
  passwordHash: PasswordHash;
  hasAcceptedTerms: boolean;
  termsVersion: string;
  registeredAt: Date;
}

export class Account {
  private constructor(private readonly state: AccountState) {}

  static register(parameters: RegisterAccountParameters): Account {
    if (!parameters.hasAcceptedTerms) {
      throw new TermsNotAcceptedError();
    }

    return new Account({
      id: parameters.id,
      username: parameters.username,
      email: parameters.email,
      passwordHash: parameters.passwordHash,
      status: AccountStatus.Pending,
      termsAcceptedAt: parameters.registeredAt,
      termsVersion: parameters.termsVersion,
      createdAt: parameters.registeredAt,
      updatedAt: parameters.registeredAt,
    });
  }

  static restore(state: AccountState): Account {
    return new Account({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get username(): Username {
    return this.state.username;
  }

  get email(): EmailAddress {
    return this.state.email;
  }

  get passwordHash(): PasswordHash {
    return this.state.passwordHash;
  }

  get status(): AccountStatus {
    return this.state.status;
  }

  get termsAcceptedAt(): Date {
    return new Date(this.state.termsAcceptedAt);
  }

  get termsVersion(): string {
    return this.state.termsVersion;
  }

  get createdAt(): Date {
    return new Date(this.state.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.state.updatedAt);
  }

  isActive(): boolean {
    return this.state.status === AccountStatus.Active;
  }

  activate(activatedAt: Date): void {
    if (this.isActive()) {
      throw new AccountAlreadyActivatedError();
    }

    this.state.status = AccountStatus.Active;
    this.state.updatedAt = activatedAt;
  }

  confirmEmailPossession(confirmedAt: Date): void {
    if (this.isActive()) {
      return;
    }

    this.state.status = AccountStatus.Active;
    this.state.updatedAt = confirmedAt;
  }

  changePassword(passwordHash: PasswordHash, changedAt: Date): void {
    this.state.passwordHash = passwordHash;
    this.state.updatedAt = changedAt;
  }

  async verifyCredentials(
    password: PlainPassword,
    hasher: PasswordHasher,
  ): Promise<void> {
    const matches = await hasher.matches(password, this.state.passwordHash);

    if (!matches) {
      throw new CredentialsRejectedError();
    }
  }
}
