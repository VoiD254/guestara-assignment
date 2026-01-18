import mongoose from 'mongoose';
import type { PaginatedResponse } from '../../common/types/index.js';
import { AppError, ConflictError } from '../../common/utils/AppError.js';
import { findItemByIdDao } from '../items/dao.js';
import { findAvailabilitiesByItemIdDao, getDayOfWeekFromDate, DayOfWeek } from '../availability/index.js';

import {
    createBookingDao,
    findConflictingBookingDao,
    findAllBookingsDao,
    countBookingsDao,
    findBookingById,
    findBookingsByItemAndDateDao,
    updateBookingStatusDao,
    BookingStatus,
} from './dao.js';

import {
    createBookingSchema,
    listBookingsSchema,
    availableSlotsSchema,
    type CreateBookingDto,
    type ListBookingsQuery,
    type AvailableSlotsQuery,
} from './validation.js';
import type { Booking } from './schema.js';
import type { AvailableSlot, AvailableSlotsResponse } from '../../common/types/booking.js';

async function createBooking(data: CreateBookingDto): Promise<Booking> {
    const item = await findItemByIdDao(data.itemId);
    if (!item.isBookable) {
        throw new AppError('Item is not bookable', 400);
    }

    // Check availability rules
    const bookingDate = new Date(data.bookingDate);
    const dayOfWeek = getDayOfWeekFromDate(bookingDate);
    const availabilities = await findAvailabilitiesByItemIdDao(data.itemId);

    const dayAvailabilities = availabilities.filter(
        (av) => av.dayOfWeek === dayOfWeek && av.isActive
    );

    const isWithinAvailability = dayAvailabilities.some(
        (av) => data.startTime >= av.startTime && data.endTime <= av.endTime
    );

    if (!isWithinAvailability) {
        throw new AppError(
            `Item not available on ${dayOfWeek} from ${data.startTime} to ${data.endTime}. Check availability rules.`,
            400
        );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check for booking conflicts (with session lock)
        const conflict = await findConflictingBookingDao(
            data.itemId,
            bookingDate,
            data.startTime,
            data.endTime,
            session
        );

        if (conflict) {
            await session.abortTransaction();
            session.endSession();
            throw ConflictError(
                `Time slot already booked. Conflicting booking: ${conflict.startTime}-${conflict.endTime}`
            );
        }

        const booking = await createBookingDao(
            {
                itemId: data.itemId,
                bookingDate,
                startTime: data.startTime,
                endTime: data.endTime,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
            },
            session
        );

        await session.commitTransaction();
        session.endSession();
        return booking;
    } catch (error) {
        // Only abort if session is still active (not already aborted)
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        throw error;
    }
}

async function findAllBookings(query: ListBookingsQuery): Promise<PaginatedResponse<Booking>> {
    const { page, limit, itemId, bookingDate, status, customerName } = query;

    const filter: Record<string, unknown> = {};
    if (itemId) filter.itemId = itemId;
    if (bookingDate) filter.bookingDate = new Date(bookingDate);
    if (status) filter.status = status;
    if (customerName) filter.customerName = { $regex: customerName, $options: 'i' };

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
        findAllBookingsDao(filter, skip, limit),
        countBookingsDao(filter),
    ]);

    return {
        success: true,
        data: bookings,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

async function cancelBooking(id: string): Promise<Booking> {
    const booking = await findBookingById(id);

    if (booking.status === BookingStatus.CANCELLED) {
        throw new AppError('Booking is already cancelled', 400);
    }

    return updateBookingStatusDao(id, BookingStatus.CANCELLED);
}

async function getAvailableSlots(itemId: string, query: AvailableSlotsQuery): Promise<AvailableSlotsResponse> {
    const item = await findItemByIdDao(itemId);
    if (!item.isBookable) {
        throw new AppError('Item is not bookable', 400);
    }

    const date = new Date(query.date);
    const dayOfWeek = getDayOfWeekFromDate(date);

    // Get availability rules for this day
    const allAvailabilities = await findAvailabilitiesByItemIdDao(itemId);
    const dayAvailabilities = allAvailabilities.filter(
        (av) => av.dayOfWeek === dayOfWeek && av.isActive
    );

    if (dayAvailabilities.length === 0) {
        return {
            itemId,
            date: query.date,
            dayOfWeek,
            availabilityRules: [],
            bookedSlots: [],
            availableSlots: [],
        };
    }

    // Get existing bookings for this date
    const bookings = await findBookingsByItemAndDateDao(itemId, date);

    return {
        itemId,
        date: query.date,
        dayOfWeek,
        availabilityRules: dayAvailabilities.map((av) => ({
            startTime: av.startTime,
            endTime: av.endTime,
        })),
        bookedSlots: bookings.map((b) => ({
            startTime: b.startTime,
            endTime: b.endTime,
            customerName: b.customerName,
        })),
        availableSlots: calculateAvailableSlots(dayAvailabilities, bookings),
    };
}

function calculateAvailableSlots(availabilities: { startTime: string; endTime: string }[], bookings: { startTime: string; endTime: string }[]): AvailableSlot[] {
    const available: AvailableSlot[] = [];

    for (const av of availabilities) {
        // Check if this availability window overlaps with any booking
        const hasConflict = bookings.some(
            (b) =>
                (b.startTime >= av.startTime && b.startTime < av.endTime) ||
                (b.endTime > av.startTime && b.endTime <= av.endTime) ||
                (b.startTime <= av.startTime && b.endTime >= av.endTime)
        );

        if (!hasConflict) {
            available.push({
                startTime: av.startTime,
                endTime: av.endTime,
            });
        }
    }

    return available;
}

export {
    // CRUD
    createBooking,
    findAllBookings,
    findBookingById,
    cancelBooking,
    getAvailableSlots,
    // Enums
    BookingStatus,
    // Validation
    createBookingSchema,
    listBookingsSchema,
    availableSlotsSchema,
    // Types
    type CreateBookingDto,
    type ListBookingsQuery,
    type AvailableSlotsQuery,
};
