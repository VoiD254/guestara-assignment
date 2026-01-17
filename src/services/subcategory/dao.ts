import { SubcategoryModel, type Subcategory } from './schema.js';
import type { CreateSubcategoryDto, UpdateSubcategoryDto } from './validation.js';
import { AppError, NotFoundError } from '../../common/utils/AppError.js';

export async function createSubcategoryDao(data: CreateSubcategoryDto): Promise<Subcategory> {
    try {
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );

        const subcategory = await SubcategoryModel.create(cleanData);

        return subcategory;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Subcategory with name ${data.name} already exists in this category`, 409);
        }

        throw error;
    }
}

export async function findAllSubcategoriesDao(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
): Promise<Subcategory[]> {
    const subcategories = await SubcategoryModel.find(filter)
        .populate('categoryId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    return subcategories as Subcategory[];
}

export async function countSubcategoriesDao(filter: Record<string, unknown>): Promise<number> {
    return SubcategoryModel.countDocuments(filter);
}

export async function findSubcategoryById(id: string): Promise<Subcategory> {
    const subcategory = await SubcategoryModel.findById(id)
        .populate('categoryId')
        .lean();

    if (!subcategory) {
        throw NotFoundError(`Subcategory not found`, id);
    }

    return subcategory as Subcategory;
}

export async function findSubcategoriesByCategoryId(categoryId: string): Promise<Subcategory[]> {
    const subcategories = await SubcategoryModel.find({
        categoryId,
        isActive: true
    } as Record<string, unknown>)
        .populate('categoryId')
        .lean();

    return subcategories as Subcategory[];
}

export async function updateSubcategoryDao(id: string, data: Omit<UpdateSubcategoryDto, 'categoryId'>): Promise<Subcategory> {
    try {
        const updated = await SubcategoryModel.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        )
            .populate('categoryId')
            .lean();

        if (!updated) {
            throw NotFoundError(`${data.name} subcategory not found`, id);
        }

        return updated as Subcategory;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Subcategory with name ${data.name} already exists in this category`, 409);
        }
        throw error;
    }
}

export async function softDeleteSubcategoryDao(id: string): Promise<void> {
    await SubcategoryModel.findByIdAndUpdate(id, { isActive: false });
}
