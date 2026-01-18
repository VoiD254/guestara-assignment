import type { Category } from './schema.js';
import type { PaginatedResponse } from '../../common/types/index.js';
import { findAllCategoriesDao, countCategoriesDao, createCategory, findCategoryById, updateCategory, softDeleteCategory as softDeleteCategoryDao } from './dao.js';
import { createCategorySchema, updateCategorySchema, listCategoriesSchema, type ListCategoriesQuery } from './validation.js';
import { findSubcategoriesByCategoryId } from '../subcategory/dao.js';
import { findItemsByCategoryIdDao } from '../items/dao.js';
import { AppError } from '../../common/utils/AppError.js';

async function findAllCategories(query: ListCategoriesQuery): Promise<PaginatedResponse<Category>> {
    const { page, limit, sortBy, order, search, active } = query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }

    if (active !== undefined) {
        filter.isActive = active;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch data from DAO
    const [categories, total] = await Promise.all([
        findAllCategoriesDao(filter, sort, skip, limit),
        countCategoriesDao(filter),
    ]);

    return {
        success: true,
        data: categories,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

async function softDeleteCategory(id: string): Promise<void> {
    await findCategoryById(id);

    const subcategories = await findSubcategoriesByCategoryId(id);
    if (subcategories.length > 0) {
        throw new AppError(`Cannot delete category with ${subcategories.length} active subcategorie(s). Delete or deactivate them first.`, 400);
    }

    const items = await findItemsByCategoryIdDao(id);
    if (items.length > 0) {
        throw new AppError(`Cannot delete category with ${items.length} active item(s). Delete or deactivate them first.`, 400);
    }

    await softDeleteCategoryDao(id);
}

export {
    findAllCategories,
    createCategory,
    findCategoryById,
    updateCategory,
    softDeleteCategory,
    createCategorySchema,
    updateCategorySchema,
    listCategoriesSchema,
    type ListCategoriesQuery
}