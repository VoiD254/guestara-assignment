import {
    setupTestDatabase,
    clearTestDatabase,
    closeTestDatabase,
    createMockCategory,
    createMockItem,
    createMockAvailability,
} from './utils/testUtils.js';
import { createCategory } from '../src/services/category/index.js';
import {
    createItem,
    findAllItems,
    findItemById,
    updateItem,
    softDeleteItem,
    calculateItemPrice,
} from '../src/services/items/index.js';
import {
    createAvailability,
    findAllAvailabilities,
    findAvailabilityById,
    updateAvailability,
    softDeleteAvailability,
} from '../src/services/availability/index.js';
import { PricingType } from '../src/common/types/pricing.js';
import { DayOfWeek } from '../src/common/types/availibility.js';

describe('Availability Service', () => {
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
    });

    afterAll(async () => {
        await closeTestDatabase();
    });

    describe('createAvailability', () => {
        it('should create availability for bookable item', async () => {
            const availabilityData = createMockAvailability(bookableItemId);
            const availability = await createAvailability(availabilityData);

            expect(availability).toBeDefined();
            expect(availability.dayOfWeek).toBe('MON');
            expect(availability.startTime).toBe('09:00');
            expect(availability.endTime).toBe('17:00');
            expect(availability.isActive).toBe(true);
        });

        it('should fail if item is not bookable', async () => {
            const availabilityData = createMockAvailability(nonBookableItemId);

            await expect(createAvailability(availabilityData)).rejects.toThrow(/not bookable/i);
        });

        it('should fail if startTime is after endTime', async () => {
            const availabilityData = createMockAvailability(bookableItemId, {
                startTime: '17:00',
                endTime: '09:00',
            });

            await expect(createAvailability(availabilityData)).rejects.toThrow();
        });

        it('should create availability for different days of week', async () => {
            const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

            for (const day of days) {
                const availability = await createAvailability(
                    createMockAvailability(bookableItemId, { dayOfWeek: day })
                );
                expect(availability.dayOfWeek).toBe(day);
            }

            const allAvailabilities = await findAllAvailabilities({ active: undefined });
            expect(allAvailabilities).toHaveLength(5);
        });
    });

    describe('findAllAvailabilities', () => {
        beforeEach(async () => {
            await createAvailability(createMockAvailability(bookableItemId, { dayOfWeek: 'MON' }));
            await createAvailability(createMockAvailability(bookableItemId, { dayOfWeek: 'TUE' }));
            await createAvailability(createMockAvailability(bookableItemId, { dayOfWeek: 'WED' }));
        });

        it('should return all availabilities', async () => {
            const availabilities = await findAllAvailabilities({ active: undefined });
            expect(availabilities).toHaveLength(3);
        });

        it('should filter by itemId', async () => {
            const availabilities = await findAllAvailabilities({ active: undefined, itemId: bookableItemId });
            expect(availabilities).toHaveLength(3);
        });

        it('should filter by dayOfWeek', async () => {
            const availabilities = await findAllAvailabilities({ active: undefined, dayOfWeek: DayOfWeek.MON });
            expect(availabilities).toHaveLength(1);
            expect(availabilities[0]!.dayOfWeek).toBe(DayOfWeek.MON);
        });
    });

    describe('updateAvailability', () => {
        it('should update availability times', async () => {
            const availability = await createAvailability(createMockAvailability(bookableItemId));
            const availabilityId = (availability as any)._id.toString();

            const updated = await updateAvailability(availabilityId, {
                startTime: '08:00',
                endTime: '18:00',
            });

            expect(updated.startTime).toBe('08:00');
            expect(updated.endTime).toBe('18:00');
        });
    });

    describe('softDeleteAvailability', () => {
        it('should set isActive to false', async () => {
            const availability = await createAvailability(createMockAvailability(bookableItemId));
            const availabilityId = (availability as any)._id.toString();

            await softDeleteAvailability(availabilityId);

            const found = await findAvailabilityById(availabilityId);
            expect(found.isActive).toBe(false);
        });
    });
});
