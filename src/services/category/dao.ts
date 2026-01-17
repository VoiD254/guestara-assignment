import { CategoryModel, type Category } from './schema.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './validation.js';
import { AppError, NotFoundError } from '../../common/utils/AppError.js';

export async function createCategory(data: CreateCategoryDto): Promise<Category> {
    try {
        // Strip undefined values to satisfy exactOptionalPropertyTypes
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );
        const category = await CategoryModel.create(cleanData);
        return category;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Category with name ${data.name} already exists`, 409);
        }
        throw error;
    }
}

export async function findAllCategoriesDao(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
): Promise<Category[]> {
    const categories = await CategoryModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
    return categories as Category[];
}

export async function countCategoriesDao(filter: Record<string, unknown>): Promise<number> {
    return CategoryModel.countDocuments(filter);
}

export async function findCategoryById(id: string): Promise<Category> {
    const category = await CategoryModel.findById(id).lean();

    if (!category) {
        throw NotFoundError('Category not found', id);
    }

    return category as Category;
}

export async function updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
    const existing = await findCategoryById(id);

    if (data.taxApplicable === true && data.taxPercentage == null && existing.taxPercentage == null) {
        throw new AppError('taxPercentage is required when taxApplicable is true', 400);
    }

    try {
        const updated = await CategoryModel.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) {
            throw NotFoundError('Category not found', id);
        }

        return updated as Category;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Category with name ${data.name} already exists`, 409);
        }
        throw error;
    }
}

export async function softDeleteCategory(id: string): Promise<void> {
    await CategoryModel.findByIdAndUpdate(id, { isActive: false });
}
