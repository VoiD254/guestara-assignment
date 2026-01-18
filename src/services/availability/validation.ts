import { z } from 'zod';
import { DayOfWeek } from '../../common/types/availibility.js';
import { objectIdSchema } from '../subcategory/validation.js';

const timeSchema = z.string().regex(
    /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    { message: 'Time must be in HH:MM format (e.g., "09:00")' }
);

export const createAvailabilitySchema = z.object({
    itemId: objectIdSchema,
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: timeSchema,
    endTime: timeSchema,
}).refine(
    (data) => data.startTime < data.endTime,
    {
        message: 'startTime must be before endTime',
        path: ['endTime'],
    }
);

export const updateAvailabilitySchema = z.object({
    dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    isActive: z.boolean().optional(),
}).refine(
    (data) => {
        if (data.startTime && data.endTime) {
            return data.startTime < data.endTime;
        }
        return true;
    },
    {
        message: 'startTime must be before endTime',
        path: ['endTime'],
    }
);

export const listAvailabilitiesSchema = z.object({
    itemId: objectIdSchema.optional(),
    dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
    active: z.string().optional().transform((val) => val === 'true').pipe(z.boolean()).optional(),
});

export type CreateAvailabilityDto = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityDto = z.infer<typeof updateAvailabilitySchema>;
export type ListAvailabilitiesQuery = z.infer<typeof listAvailabilitiesSchema>;
