export const INVALID_CREDENTIALS_ERROR = Symbol("InvalidCredentialsError");

export class InvalidCredentialsError extends Error {
  constructor(message: string = "Invalid email or password") {
    super(message);
    this.name = "InvalidCredentialsError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isInvalidCredentialsError(
    error: unknown,
  ): error is InvalidCredentialsError {
    return (
      error instanceof InvalidCredentialsError ||
      (error !== null &&
        typeof error === "object" &&
        INVALID_CREDENTIALS_ERROR in error)
    );
  }
}