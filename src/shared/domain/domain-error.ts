export abstract class DomainError extends Error {
  protected constructor() {
    super(new.target.name);
    this.name = new.target.name;
  }
}
