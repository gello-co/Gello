export const VALIDATION_ERROR = Symbol("ValidationError");

export class ValidationError extends Error {
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