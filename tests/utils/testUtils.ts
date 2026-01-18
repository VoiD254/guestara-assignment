import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PricingType } from '../../src/common/types/pricing.js';
import { DayOfWeek } from '../../src/common/types/availibility.js';

let mongoServer: MongoMemoryReplSet;

/**
 * Connect to in-memory MongoDB replica set for testing (supports transactions)
 */
export async function setupTestDatabase(): Promise<void> {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}

/**
 * Clear all collections in the test database
 */
export async function clearTestDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        const collection = collections[key];
        await collection!.deleteMany({});
    }
}

/**
 * Close database connection and stop in-memory server
 */
export async function closeTestDatabase(): Promise<void> {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
}

/**
 * Create a mock category for testing
 */
export function createMockCategory(overrides: Record<string, any> = {}) {
    return {
        name: 'Test Category',
        description: 'A test category',
        image: 'https://example.com/image.jpg',
        taxApplicable: true,
        taxPercentage: 10,
        ...overrides,
    };
}

/**
 * Create a mock subcategory for testing
 */
export function createMockSubcategory(categoryId: string, overrides: Record<string, any> = {}) {
    return {
        categoryId,
        name: 'Test Subcategory',
        description: 'A test subcategory',
        taxApplicable: null,
        taxPercentage: null,
        ...overrides,
    };
}

/**
 * Create a mock item for testing
 */
export function createMockItem(categoryId: string, overrides: Record<string, any> = {}) {
    return {
        name: 'Test Item',
        description: 'A test item',
        categoryId,
        pricingType: PricingType.STATIC,
        pricingConfig: {
            type: PricingType.STATIC,
            price: 100,
        } as any,
        taxApplicable: null,
        taxPercentage: null,
        isBookable: false,
        addons: [],
        ...overrides,
    };
}

/**
 * Create a mock availability for testing
 */
export function createMockAvailability(itemId: string, overrides: Record<string, any> = {}) {
    return {
        itemId,
        dayOfWeek: DayOfWeek.MON,
        startTime: '09:00',
        endTime: '17:00',
        ...overrides,
    };
}

/**
 * Create a mock booking for testing
 */
export function createMockBooking(itemId: string, overrides: Record<string, any> = {}) {
    return {
        itemId,
        bookingDate: new Date('2026-01-26'),
        startTime: '10:00',
        endTime: '11:00',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        ...overrides,
    };
}

