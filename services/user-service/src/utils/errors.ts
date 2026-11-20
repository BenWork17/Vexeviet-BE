/** Raised with an explicit status so the controller does not have to guess. */
export class UserServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UserServiceError';
    this.statusCode = statusCode;
  }
}
