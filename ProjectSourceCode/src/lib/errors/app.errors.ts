/**
 * Custom application error classes
 * Used for proper HTTP status code mapping in error handler
 * Uses symbolic methods for type identification (more robust than instanceof)
 */

// Symbols for error type identification
const DUPLICATE_USER_ERROR = Symbol("DuplicateUserError");
const INVALID_CREDENTIALS_ERROR = Symbol("InvalidCredentialsError");
const USER_NOT_FOUND_ERROR = Symbol("UserNotFoundError");

export class DuplicateUserError extends Error {
	private readonly [DUPLICATE_USER_ERROR] = true;

	constructor(message: string = "User with this email already exists") {
		super(message);
		this.name = "DuplicateUserError";
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
