import type { Availability } from './schema.js';
import { DayOfWeek } from '../../common/types/availibility.js';
import { AppError } from '../../common/utils/AppError.js';
import { findItemByIdDao } from '../items/dao.js';

import {
    createAvailabilityDao,
    findAllAvailabilitiesDao,
    findAvailabilitiesByItemIdDao,
    updateAvailabilityDao,
    softDeleteAvailabilityDao,
    findAvailabilityById,
} from './dao.js';

import {
    createAvailabilitySchema,
    updateAvailabilitySchema,
    listAvailabilitiesSchema,
    type CreateAvailabilityDto,
    type UpdateAvailabilityDto,
    type ListAvailabilitiesQuery,
} from './validation.js';

async function createAvailability(data: CreateAvailabilityDto): Promise<Availability> {
    // Validate that item exists and is bookable
    const item = await findItemByIdDao(data.itemId);
    if (!item.isBookable) {
        throw new AppError('Item is not bookable. Set isBookable to true first.', 400);
    }

    return createAvailabilityDao(data);
}

async function findAllAvailabilities(query: ListAvailabilitiesQuery): Promise<Availability[]> {
    const filter: Record<string, unknown> = {};

    if (query.itemId) filter.itemId = query.itemId;
    if (query.dayOfWeek) filter.dayOfWeek = query.dayOfWeek;
    if (query.active !== undefined) filter.isActive = query.active;

    return findAllAvailabilitiesDao(filter);
}

async function updateAvailability(id: string, data: UpdateAvailabilityDto): Promise<Availability> {
    const existing = await findAvailabilityById(id);

    // Validate time range if both times are provided
    if (data.startTime && data.endTime) {
        if (data.startTime >= data.endTime) {
            throw new AppError('startTime must be before endTime', 400);
        }
    }

    // If only one time is provided, check against existing value
    if (data.startTime && !data.endTime) {
        if (data.startTime >= existing.endTime) {
            throw new AppError('startTime must be before existing endTime', 400);
        }
    }
    if (data.endTime && !data.startTime) {
        if (existing.startTime >= data.endTime) {
            throw new AppError('Existing startTime must be before new endTime', 400);
        }
    }

    return updateAvailabilityDao(id, data);
}

async function softDeleteAvailability(id: string): Promise<void> {
    await findAvailabilityById(id);
    await softDeleteAvailabilityDao(id);
}

// Helper to get day of week from date
function getDayOfWeekFromDate(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [DayOfWeek.SUN, DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI, DayOfWeek.SAT];
    const dayIndex = date.getDay();
    const day = days[dayIndex];
    if (!day) {
        throw new Error(`Invalid day index: ${dayIndex}`);
    }
    return day;
}

export {
    // CRUD
    createAvailability,
    findAllAvailabilities,
    findAvailabilityById,
    updateAvailability,
    softDeleteAvailability,
    // DAO exports for other services
    findAvailabilitiesByItemIdDao,
    // Helpers
    getDayOfWeekFromDate,
    // Enums
    DayOfWeek,
    // Validation
    createAvailabilitySchema,
    updateAvailabilitySchema,
    listAvailabilitiesSchema,
    // Types
    type CreateAvailabilityDto,
    type UpdateAvailabilityDto,
    type ListAvailabilitiesQuery,
};
