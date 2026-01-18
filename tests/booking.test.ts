import {
    setupTestDatabase,
    clearTestDatabase,
    closeTestDatabase,
    createMockCategory,
    createMockItem,
    createMockAvailability,
    createMockBooking,
} from './utils/testUtils.js';
import { createCategory } from '../src/services/category/index.js';
import { createItem } from '../src/services/items/index.js';
import { createAvailability } from '../src/services/availability/index.js';
import {
    createBooking,
    findAllBookings,
    findBookingById,
    cancelBooking,
    getAvailableSlots,
    BookingStatus,
} from '../src/services/booking/index.js';
import { DayOfWeek } from '../src/common/types/availibility.js';

describe('Booking Service', () => {
    let categoryId: string;
    let bookableItemId: string;
    let nonBookableItemId: string;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    beforeEach(async () => {
        await clearTestDatabase();

        // Create category
        const category = await createCategory(createMockCategory({ name: 'Services' }));
        categoryId = (category as any)._id.toString();

        // Create bookable item
        const bookableItem = await createItem(createMockItem(categoryId, {
            name: 'Meeting Room',
            isBookable: true,
        }));
        bookableItemId = (bookableItem as any)._id.toString();

        // Create non-bookable item
        const nonBookableItem = await createItem(createMockItem(categoryId, {
            name: 'Coffee',
            isBookable: false,
        }));
        nonBookableItemId = (nonBookableItem as any)._id.toString();

        // Create availability for MON and TUE
        await createAvailability(createMockAvailability(bookableItemId, { dayOfWeek: DayOfWeek.MON }));
        await createAvailability(createMockAvailability(bookableItemId, { dayOfWeek: DayOfWeek.TUE }));
    });

    afterAll(async () => {
        await closeTestDatabase();
    });

    describe('createBooking', () => {
        it('should create a booking successfully', async () => {
            const bookingData = {
                itemId: bookableItemId,
                bookingDate: '2026-01-26', // Monday
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
            };

            const booking = await createBooking(bookingData);

            expect(booking).toBeDefined();
            expect(booking.customerName).toBe('John Doe');
            expect(booking.status).toBe(BookingStatus.CONFIRMED);
        });

        it('should fail if item is not bookable', async () => {
            const bookingData = {
                itemId: nonBookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            };

            await expect(createBooking(bookingData)).rejects.toThrow(/not bookable/i);
        });

        it('should fail if booking is outside availability hours', async () => {
            const bookingData = {
                itemId: bookableItemId,
                bookingDate: '2026-01-26', // Monday
                startTime: '20:00', // Outside 09:00-17:00
                endTime: '21:00',
                customerName: 'John Doe',
            };

            await expect(createBooking(bookingData)).rejects.toThrow(/not available/i);
        });

        it('should fail if no availability exists for the day', async () => {
            const bookingData = {
                itemId: bookableItemId,
                bookingDate: '2026-01-25', // Sunday - no availability
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            };

            await expect(createBooking(bookingData)).rejects.toThrow(/not available/i);
        });
    });

    describe('Conflict Prevention (CRITICAL)', () => {
        it('should prevent double booking of same time slot', async () => {
            // First booking
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            // Second booking - same slot
            await expect(createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'Jane Smith',
            })).rejects.toThrow(/already booked/i);
        });

        it('should prevent overlapping booking (starts during existing)', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            // Overlapping - starts at 10:30
            await expect(createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:30',
                endTime: '12:00',
                customerName: 'Jane Smith',
            })).rejects.toThrow(/already booked/i);
        });

        it('should prevent overlapping booking (ends during existing)', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            // Overlapping - ends at 10:30
            await expect(createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '09:30',
                endTime: '10:30',
                customerName: 'Jane Smith',
            })).rejects.toThrow(/already booked/i);
        });

        it('should allow adjacent time slots (no overlap)', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            // Adjacent - starts exactly when previous ends
            const booking2 = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '11:00',
                endTime: '12:00',
                customerName: 'Jane Smith',
            });

            expect(booking2).toBeDefined();
            expect(booking2.startTime).toBe('11:00');
        });

        it('should allow booking same slot on different days', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26', // Monday
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            // Same time slot but different day (Tuesday)
            const booking2 = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-27', // Tuesday
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'Jane Smith',
            });

            expect(booking2).toBeDefined();
        });
    });

    describe('cancelBooking', () => {
        it('should cancel a booking', async () => {
            const booking = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });
            const bookingId = (booking as any)._id.toString();

            const cancelled = await cancelBooking(bookingId);

            expect(cancelled.status).toBe(BookingStatus.CANCELLED);
        });

        it('should allow rebooking cancelled slot', async () => {
            const booking = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });
            const bookingId = (booking as any)._id.toString();

            await cancelBooking(bookingId);

            // Should now be able to book the same slot
            const newBooking = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'Jane Smith',
            });

            expect(newBooking).toBeDefined();
        });

        it('should fail when cancelling already cancelled booking', async () => {
            const booking = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });
            const bookingId = (booking as any)._id.toString();

            await cancelBooking(bookingId);

            await expect(cancelBooking(bookingId)).rejects.toThrow(/already cancelled/i);
        });
    });

    describe('findAllBookings', () => {
        it('should return paginated bookings', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '14:00',
                endTime: '15:00',
                customerName: 'Jane Smith',
            });

            const result = await findAllBookings({ page: 1, limit: 10 });

            expect(result.data).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
        });

        it('should filter by status', async () => {
            const booking = await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });
            const bookingId = (booking as any)._id.toString();
            await cancelBooking(bookingId);

            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '14:00',
                endTime: '15:00',
                customerName: 'Jane Smith',
            });

            const confirmed = await findAllBookings({ page: 1, limit: 10, status: BookingStatus.CONFIRMED });
            expect(confirmed.data).toBeDefined();
            expect((confirmed.data as any)[0]!.customerName).toBe('Jane Smith');
        });
    });

    describe('getAvailableSlots', () => {
        it('should return availability and booked slots', async () => {
            await createBooking({
                itemId: bookableItemId,
                bookingDate: '2026-01-26',
                startTime: '10:00',
                endTime: '11:00',
                customerName: 'John Doe',
            });

            const slots = await getAvailableSlots(bookableItemId, { date: '2026-01-26' });

            expect(slots.dayOfWeek).toBe('MON');
            expect(slots.availabilityRules).toHaveLength(1);
            expect(slots.bookedSlots).toHaveLength(1);
            expect(slots.bookedSlots[0]!.customerName).toBe('John Doe');
        });

        it('should return empty for day without availability', async () => {
            const slots = await getAvailableSlots(bookableItemId, { date: '2026-01-25' }); // Sunday

            expect(slots.availabilityRules).toHaveLength(0);
            expect(slots.bookedSlots).toHaveLength(0);
        });
    });
});
