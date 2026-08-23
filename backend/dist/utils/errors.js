export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details, code = 'VALIDATION_ERROR') {
        super(message, 400, code, details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden action', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}
