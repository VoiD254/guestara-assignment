import {
    setupTestDatabase,
    clearTestDatabase,
    closeTestDatabase,
    createMockCategory,
    createMockItem,
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
import { PricingType } from '../src/common/types/pricing.js';

describe('Item Service', () => {
    let categoryId: string;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    beforeEach(async () => {
        await clearTestDatabase();
        const category = await createCategory(createMockCategory({
            name: 'Test Category',
            taxApplicable: true,
            taxPercentage: 10,
        }));
        categoryId = (category as any)._id.toString();
    });

    afterAll(async () => {
        await closeTestDatabase();
    });

    describe('createItem', () => {
        it('should create a static pricing item', async () => {
            const itemData = createMockItem(categoryId, {
                name: 'Cappuccino',
                pricingType: PricingType.STATIC,
                pricingConfig: { type: PricingType.STATIC, price: 200 },
            });
            const item = await createItem(itemData);

            expect(item).toBeDefined();
            expect(item.name).toBe('Cappuccino');
            expect(item.pricingType).toBe('static');
        });

        it('should create a tiered pricing item', async () => {
            const itemData = createMockItem(categoryId, {
                name: 'Meeting Room',
                pricingType: PricingType.TIERED,
                pricingConfig: {
                    type: PricingType.TIERED,
                    tiers: [
                        { maxQuantity: 1, price: 300 },
                        { maxQuantity: 2, price: 500 },
                    ],
                },
                isBookable: true,
            });
            const item = await createItem(itemData);

            expect(item.pricingType).toBe('tiered');
            expect(item.isBookable).toBe(true);
        });

        it('should create item with addons', async () => {
            const itemData = createMockItem(categoryId, {
                name: 'Coffee',
                addons: [
                    { name: 'Extra Shot', price: 50, isMandatory: false },
                    { name: 'Whipped Cream', price: 30, isMandatory: false },
                ],
            });
            const item = await createItem(itemData);

            expect(item.addons).toHaveLength(2);
        });
    });

    describe('calculateItemPrice', () => {
        it('should calculate static price correctly', async () => {
            const item = await createItem(createMockItem(categoryId, {
                name: 'Coffee',
                pricingType: PricingType.STATIC,
                pricingConfig: { type: PricingType.STATIC, price: 200 },
                taxApplicable: false,
            }));
            const itemId = (item as any)._id.toString();

            const price = await calculateItemPrice(itemId, {});

            expect(price.basePrice).toBe(200);
            expect(price.pricingRule).toBe('static');
        });

        it('should calculate tiered price based on quantity', async () => {
            const item = await createItem(createMockItem(categoryId, {
                name: 'Room',
                pricingType: PricingType.TIERED,
                pricingConfig: {
                    type: PricingType.TIERED,
                    tiers: [
                        { maxQuantity: 1, price: 100 },
                        { maxQuantity: 3, price: 250 },
                    ],
                },
                taxApplicable: false,
            }));
            const itemId = (item as any)._id.toString();

            const price1 = await calculateItemPrice(itemId, { quantity: 1 });
            expect(price1.basePrice).toBe(100);

            const price2 = await calculateItemPrice(itemId, { quantity: 2 });
            expect(price2.basePrice).toBe(250);
        });

        it('should return 0 for complimentary items', async () => {
            const item = await createItem(createMockItem(categoryId, {
                name: 'Free Item',
                pricingType: PricingType.COMPLIMENTARY,
                pricingConfig: { type: PricingType.COMPLIMENTARY },
            }));
            const itemId = (item as any)._id.toString();

            const price = await calculateItemPrice(itemId, {});

            expect(price.basePrice).toBe(0);
        });

        it('should include tax from category inheritance', async () => {
            const item = await createItem(createMockItem(categoryId, {
                name: 'Taxed Item',
                pricingType: PricingType.STATIC,
                pricingConfig: { type: PricingType.STATIC, price: 100 },
                taxApplicable: null,
                taxPercentage: null,
            }));
            const itemId = (item as any)._id.toString();

            const price = await calculateItemPrice(itemId, {});

            expect(price.tax.taxApplicable).toBe(true);
            expect(price.tax.taxPercentage).toBe(10);
            expect(price.tax.amount).toBe(10);
            expect(price.grandTotal).toBe(110);
        });
    });

    describe('findAllItems', () => {
        it('should return paginated items', async () => {
            await createItem(createMockItem(categoryId, { name: 'Item 1' }));
            await createItem(createMockItem(categoryId, { name: 'Item 2' }));

            const result = await findAllItems({
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
                active: undefined,
                isBookable: undefined,
            });

            expect(result.data).toHaveLength(2);
        });

        it('should filter by isBookable', async () => {
            await createItem(createMockItem(categoryId, { name: 'Bookable', isBookable: true }));
            await createItem(createMockItem(categoryId, { name: 'Not Bookable', isBookable: false }));

            const result = await findAllItems({
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
                active: undefined,
                isBookable: true,
            });

            expect(result.data).toHaveLength(1);
            expect(result.data).toBeDefined();
            expect((result.data as any)[0]!.name).toBe('Bookable');
        });
    });

    describe('softDeleteItem', () => {
        it('should set isActive to false', async () => {
            const item = await createItem(createMockItem(categoryId));
            const itemId = (item as any)._id.toString();

            await softDeleteItem(itemId);

            const found = await findItemById(itemId);
            expect(found.isActive).toBe(false);
        });
    });
});
