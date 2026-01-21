import { z } from 'zod';
import { objectIdSchema } from '../subcategory/validation.js';

const timeSchema = z.string().regex(
    /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    { message: 'Time must be in HH:MM format (e.g., "09:00")' }
);

const dateSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    { message: 'Date must be in YYYY-MM-DD format (e.g., "2025-01-20")' }
);

export const createBookingSchema = z.object({
    itemId: objectIdSchema,
    bookingDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    customerName: z.string().min(1, 'Customer name is required').max(255),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().max(20).optional(),
}).refine(
    (data) => data.startTime < data.endTime,
    {
        message: 'startTime must be before endTime',
        path: ['endTime'],
    }
).refine(
    (data) => {
        // Ensure booking is not in the past
        const bookingDate = new Date(data.bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookingDate >= today;
    },
    {
        message: 'Cannot book dates in the past',
        path: ['bookingDate'],
    }
);

export const listBookingsSchema = z.object({
    page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
    limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(100)),
    itemId: objectIdSchema.optional(),
    bookingDate: dateSchema.optional(),
    status: z.enum(['confirmed', 'cancelled']).optional(),
    customerName: z.string().optional(),
});

export const availableSlotsSchema = z.object({
    date: dateSchema.optional().default(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]!;
    }),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsSchema>;
export type AvailableSlotsQuery = z.infer<typeof availableSlotsSchema>;
