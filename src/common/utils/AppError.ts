export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const NotFoundError = (resource: string, id?: string) =>
    new AppError(
        `${resource}${id ? ` with id '${id}'` : ''} not found`,
        404
    );

export const ValidationError = (message: string) =>
    new AppError(message, 400);

export const ConflictError = (message: string) =>
    new AppError(message, 409);

export const UnauthorizedError = (message: string = 'Unauthorized') =>
    new AppError(message, 401);