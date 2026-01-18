import {
    setupTestDatabase,
    clearTestDatabase,
    closeTestDatabase,
    createMockCategory,
} from './utils/testUtils.js';
import { CategoryModel } from '../src/services/category/schema.js';
import {
    createCategory,
    findAllCategories,
    findCategoryById,
    updateCategory,
    softDeleteCategory,
} from '../src/services/category/index.js';

describe('Category Service', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterEach(async () => {
        await clearTestDatabase();
    });

    afterAll(async () => {
        await closeTestDatabase();
    });

    describe('createCategory', () => {
        it('should create a category successfully', async () => {
            const categoryData = createMockCategory();
            const category = await createCategory(categoryData);

            expect(category).toBeDefined();
            expect(category.name).toBe(categoryData.name);
            expect(category.taxApplicable).toBe(true);
            expect(category.taxPercentage).toBe(10);
            expect(category.isActive).toBe(true);
        });

        it('should fail if name is missing', async () => {
            const categoryData = createMockCategory({ name: '' });

            await expect(createCategory(categoryData)).rejects.toThrow();
        });

        it('should fail if taxApplicable is true but taxPercentage is missing', async () => {
            const categoryData = createMockCategory({
                taxApplicable: true,
                taxPercentage: null,
            });

            await expect(createCategory(categoryData)).rejects.toThrow();
        });

        it('should fail if category name already exists', async () => {
            const categoryData = createMockCategory();
            await createCategory(categoryData);

            await expect(createCategory(categoryData)).rejects.toThrow();
        });
    });

    describe('findAllCategories', () => {
        it('should return paginated categories', async () => {
            // Create 3 categories
            await createCategory(createMockCategory({ name: 'Category 1' }));
            await createCategory(createMockCategory({ name: 'Category 2' }));
            await createCategory(createMockCategory({ name: 'Category 3' }));

            const result = await findAllCategories({
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
                active: true,
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.pagination.total).toBe(3);
        });

        it('should filter by search term', async () => {
            await createCategory(createMockCategory({ name: 'Beverages' }));
            await createCategory(createMockCategory({ name: 'Food' }));

            const result = await findAllCategories({
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
                search: 'Bev',
                active: true,
            });

            expect(result.data).toBeDefined();
            expect((result.data as any)[0]!.name).toBe('Beverages');
        });

        it('should filter by active status', async () => {
            const cat1 = await createCategory(createMockCategory({ name: 'Active Category' }));
            await createCategory(createMockCategory({ name: 'Inactive Category' }));
            await softDeleteCategory((cat1 as any)._id.toString());

            const result = await findAllCategories({
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
                active: true,
            });

            expect(result.data).toBeDefined();
            expect((result.data as any)[0]!.name).toBe('Inactive Category');
        });
    });

    describe('findCategoryById', () => {
        it('should find category by ID', async () => {
            const created = await createCategory(createMockCategory());
            const categoryId = (created as any)._id.toString();

            const found = await findCategoryById(categoryId);

            expect(found).toBeDefined();
            expect(found.name).toBe(created.name);
        });

        it('should throw error if category not found', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await expect(findCategoryById(fakeId)).rejects.toThrow('Category not found');
        });
    });

    describe('updateCategory', () => {
        it('should update category', async () => {
            const created = await createCategory(createMockCategory());
            const categoryId = (created as any)._id.toString();

            const updated = await updateCategory(categoryId, {
                name: 'Updated Name',
                taxPercentage: 15,
            });

            expect(updated.name).toBe('Updated Name');
            expect(updated.taxPercentage).toBe(15);
        });

        it('should throw error if category not found', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await expect(updateCategory(fakeId, { name: 'Test', taxPercentage: null })).rejects.toThrow();
        });
    });

    describe('softDeleteCategory', () => {
        it('should soft delete category (set isActive to false)', async () => {
            const created = await createCategory(createMockCategory());
            const categoryId = (created as any)._id.toString();

            await softDeleteCategory(categoryId);

            const found = await CategoryModel.findById(categoryId);
            expect(found?.isActive).toBe(false);
        });
    });
});
