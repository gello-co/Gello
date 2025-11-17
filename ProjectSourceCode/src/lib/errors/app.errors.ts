/**
 * Custom application error classes
 * Used for proper HTTP status code mapping in error handler
 * Uses symbolic methods for type identification (more robust than instanceof)
 */

// Symbols for error type identification
const DUPLICATE_USER_ERROR = Symbol("DuplicateUserError");
const INVALID_CREDENTIALS_ERROR = Symbol("InvalidCredentialsError");
const USER_NOT_FOUND_ERROR = Symbol("UserNotFoundError");
const VALIDATION_ERROR = Symbol("ValidationError");
const RESOURCE_NOT_FOUND_ERROR = Symbol("ResourceNotFoundError");

export class DuplicateUserError extends Error {
  private readonly [DUPLICATE_USER_ERROR] = true;

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

export class InvalidCredentialsError extends Error {
  private readonly [INVALID_CREDENTIALS_ERROR] = true;

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

export class UserNotFoundError extends Error {
  private readonly [USER_NOT_FOUND_ERROR] = true;

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

export class ValidationError extends Error {
  private readonly [VALIDATION_ERROR] = true;

  constructor(message: string = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isValidationError(error: unknown): error is ValidationError {
    return (
      error instanceof ValidationError ||
      (error !== null && typeof error === "object" && VALIDATION_ERROR in error)
    );
  }
}

export class ResourceNotFoundError extends Error {
  private readonly [RESOURCE_NOT_FOUND_ERROR] = true;

  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "ResourceNotFoundError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isResourceNotFoundError(
    error: unknown,
  ): error is ResourceNotFoundError {
    return (
      error instanceof ResourceNotFoundError ||
      (error !== null &&
        typeof error === "object" &&
        RESOURCE_NOT_FOUND_ERROR in error)
    );
  }
}
