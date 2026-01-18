import { AvailabilityModel, type Availability } from './schema.js';
import type { CreateAvailabilityDto, UpdateAvailabilityDto } from './validation.js';
import { NotFoundError } from '../../common/utils/AppError.js';

export async function createAvailabilityDao(data: CreateAvailabilityDto): Promise<Availability> {
    const availability = await AvailabilityModel.create(data);
    return availability;
}

export async function findAllAvailabilitiesDao(
    filter: Record<string, unknown>
): Promise<Availability[]> {
    const availabilities = await AvailabilityModel.find(filter)
        .populate('itemId')
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();

    return availabilities as Availability[];
}

export async function findAvailabilityById(id: string): Promise<Availability> {
    const availability = await AvailabilityModel.findById(id)
        .populate('itemId')
        .lean();

    if (!availability) {
        throw NotFoundError('Availability not found', id);
    }

    return availability as Availability;
}

export async function findAvailabilitiesByItemIdDao(itemId: string): Promise<Availability[]> {
    const availabilities = await AvailabilityModel.find({
        itemId,
        isActive: true,
    } as Record<string, unknown>)
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();

    return availabilities as Availability[];
}

export async function updateAvailabilityDao(id: string, data: UpdateAvailabilityDto): Promise<Availability> {
    const updated = await AvailabilityModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    )
        .populate('itemId')
        .lean();

    if (!updated) {
        throw NotFoundError('Availability not found', id);
    }

    return updated as Availability;
}

export async function softDeleteAvailabilityDao(id: string): Promise<void> {
    const result = await AvailabilityModel.findByIdAndUpdate(id, { isActive: false });
    if (!result) {
        throw NotFoundError('Availability not found', id);
    }
}
