export const RESOURCE_NOT_FOUND_ERROR = Symbol("ResourceNotFoundError");

export class ResourceNotFoundError extends Error {
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
