import type { NextFunction, Request, RequestHandler, Response } from 'express';

/*
 * Wraps async route handlers to catch promise rejections
 * and forward them to Express error middleware
 */
export const asyncHandler =
    (fn: RequestHandler) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);
