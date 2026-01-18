import type { Subcategory } from './schema.js';
import type { PaginatedResponse } from '../../common/types/index.js';
import {
    findAllSubcategoriesDao,
    countSubcategoriesDao,
    createSubcategoryDao,
    findSubcategoryById,
    findSubcategoriesByCategoryId,
    updateSubcategoryDao,
    softDeleteSubcategoryDao,
} from './dao.js';
import {
    createSubcategorySchema,
    updateSubcategorySchema,
    listSubcategoriesSchema,
    type CreateSubcategoryDto,
    type UpdateSubcategoryDto,
    type ListSubcategoriesQuery,
} from './validation.js';
import { findCategoryById } from '../category/index.js';
import { findItemsBySubcategoryIdDao } from '../items/dao.js';
import { AppError } from '../../common/utils/AppError.js';
import { InheritedFrom } from '../../common/types/category.js';

async function createSubcategory(data: CreateSubcategoryDto): Promise<Subcategory> {
    const category = await findCategoryById(data.categoryId);
    if (!category.isActive) {
        throw new AppError('Cannot create subcategory under inactive category', 400);
    }

    return createSubcategoryDao(data);
}

async function findAllSubcategories(query: ListSubcategoriesQuery): Promise<PaginatedResponse<Subcategory>> {
    const { page, limit, sortBy, order, search, active, categoryId } = query;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }

    if (active !== undefined) {
        filter.isActive = active;
    }

    if (categoryId) {
        filter.categoryId = categoryId;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch data from DAO
    const [subcategories, total] = await Promise.all([
        findAllSubcategoriesDao(filter, sort, skip, limit),
        countSubcategoriesDao(filter),
    ]);

    return {
        success: true,
        data: subcategories,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

async function updateSubcategory(id: string, data: UpdateSubcategoryDto): Promise<Subcategory> {
    const existing = await findSubcategoryById(id);

    // If changing category, validate new category exists and is active
    if (data.categoryId && data.categoryId !== existing.categoryId.toString()) {
        const newCategory = await findCategoryById(data.categoryId);
        if (!newCategory.isActive) {
            throw new AppError('Cannot move subcategory to inactive category', 400);
        }
    }

    // Validate tax logic
    if (data.taxApplicable === true) {
        const hasPercentage = data.taxPercentage != null || existing.taxPercentage != null;
        if (!hasPercentage) {
            throw new AppError('taxPercentage is required when taxApplicable is true', 400);
        }
    }

    // Normalize: set taxPercentage to null when taxApplicable is explicitly false
    const normalizedData = { ...data };
    if (data.taxApplicable === false) {
        normalizedData.taxPercentage = null;
    }

    return updateSubcategoryDao(id, normalizedData);
}

async function softDeleteSubcategory(id: string): Promise<void> {
    await findSubcategoryById(id);

    // Check for active items under this subcategory
    const items = await findItemsBySubcategoryIdDao(id);
    if (items.length > 0) {
        throw new AppError(`Cannot delete subcategory with ${items.length} active item(s). Delete or deactivate them first.`, 400);
    }

    await softDeleteSubcategoryDao(id);
}

/**
 * Get tax information (with inheritance from category)
 * This is a KEY method for tax inheritance logic
 */
async function resolveTax(subcategoryId: string): Promise<{
    taxApplicable: boolean;
    taxPercentage: number;
    inheritedFrom: InheritedFrom;
}> {
    const subcategory = await findSubcategoryById(subcategoryId);

    // If subcategory has explicit tax settings, use them
    if (subcategory.taxApplicable !== null && subcategory.taxApplicable !== undefined) {
        return {
            taxApplicable: subcategory.taxApplicable,
            taxPercentage: subcategory.taxPercentage ?? 0,
            inheritedFrom: InheritedFrom.SUBCATEGORY,
        };
    }

    // Otherwise, inherit from category
    const category = await findCategoryById(subcategory.categoryId?._id?.toString() ?? '');

    return {
        taxApplicable: category.taxApplicable,
        taxPercentage: category.taxPercentage ?? 0,
        inheritedFrom: InheritedFrom.CATEGORY,
    };
}

export {
    createSubcategory,
    findAllSubcategories,
    updateSubcategory,
    softDeleteSubcategory,
    resolveTax,
    findSubcategoryById,
    findSubcategoriesByCategoryId,
    createSubcategorySchema,
    updateSubcategorySchema,
    listSubcategoriesSchema,
    type CreateSubcategoryDto,
    type UpdateSubcategoryDto,
    type ListSubcategoriesQuery,
};
