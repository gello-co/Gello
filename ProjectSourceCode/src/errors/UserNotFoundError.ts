export const USER_NOT_FOUND_ERROR = Symbol("UserNotFoundError");
export class UserNotFoundError extends Error {
  constructor(message: string = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isUserNotFoundError(error: unknown): error is UserNotFoundError {
    return (
      error instanceof UserNotFoundError ||
      (error !== null &&
        typeof error === "object" &&
        USER_NOT_FOUND_ERROR in error)
    );
  }
}
