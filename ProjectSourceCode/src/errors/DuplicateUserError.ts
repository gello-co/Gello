export const DUPLICATE_USER_ERROR = Symbol("DuplicateUserError");

export class DuplicateUserError extends Error {
  constructor(message: string = "User with this email already exists") {
    super(message);
    this.name = "DuplicateUserError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isDuplicateUserError(error: unknown): error is DuplicateUserError {
    return (
      error instanceof DuplicateUserError ||
      (error !== null &&
        typeof error === "object" &&
        DUPLICATE_USER_ERROR in error)
    );
  }
}