import mongoose from 'mongoose';
import { BookingModel, type Booking } from './schema.js';
import { NotFoundError } from '../../common/utils/AppError.js';
import { BookingStatus, type BookingCreateData } from '../../common/types/booking.js';

export async function createBookingDao(
    data: BookingCreateData,
    session: mongoose.ClientSession
): Promise<Booking> {
    // Clean undefined values to satisfy exactOptionalPropertyTypes
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
    );

    const result = await BookingModel.create(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [cleanData as any],
        { session }
    );
    const booking = result[0];
    if (!booking) {
        throw new Error('Failed to create booking');
    }
    return booking;
}

export async function findConflictingBookingDao(
    itemId: string,
    bookingDate: Date,
    startTime: string,
    endTime: string,
    session: mongoose.ClientSession
): Promise<Booking | null> {
    const conflict = await BookingModel.findOne({
        itemId,
        bookingDate,
        status: BookingStatus.CONFIRMED,
        $or: [
            // New booking starts during existing booking
            { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
            // New booking ends during existing booking
            { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
            // New booking completely contains existing booking
            { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
        ],
    } as Record<string, unknown>).session(session);

    return conflict as Booking | null;
}

export async function findAllBookingsDao(
    filter: Record<string, unknown>,
    skip: number,
    limit: number
): Promise<Booking[]> {
    const bookings = await BookingModel.find(filter)
        .populate('itemId')
        .sort({ bookingDate: -1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true });

    return bookings as Booking[];
}

export async function countBookingsDao(filter: Record<string, unknown>): Promise<number> {
    return BookingModel.countDocuments(filter);
}

export async function findBookingById(id: string): Promise<Booking> {
    const booking = await BookingModel.findById(id)
        .populate('itemId')
        .lean({ virtuals: true });

    if (!booking) {
        throw NotFoundError('Booking not found', id);
    }

    return booking as Booking;
}

export async function findBookingsByItemAndDateDao(
    itemId: string,
    bookingDate: Date
): Promise<Booking[]> {
    const bookings = await BookingModel.find({
        itemId,
        bookingDate,
        status: BookingStatus.CONFIRMED,
    } as Record<string, unknown>)
        .sort({ startTime: 1 })
        .lean();

    return bookings as Booking[];
}

export async function updateBookingStatusDao(id: string, status: BookingStatus): Promise<Booking> {
    const updated = await BookingModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    )
        .populate('itemId')
        .lean();

    if (!updated) {
        throw NotFoundError('Booking not found', id);
    }

    return updated as Booking;
}

export { BookingStatus };
