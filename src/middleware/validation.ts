import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../common/utils/AppError.js';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Middleware factory for validating request data against a Zod schema
 */
export function validateRequest(
    schema: ZodSchema,
    source: ValidationSource = 'body'
) {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                const message = result.error.issues
                    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                    .join(', ');
                throw new AppError(message, 400);
            }

            // Replace the source with validated & transformed data
            // Note: req.query and req.params are read-only in newer Express versions
            if (source === 'body') {
                req.body = result.data;
            } else {
                // Store validated query/params data for handlers to use
                (req as any).validated = result.data;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}
