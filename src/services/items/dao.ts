import { ItemModel, type Item } from './schema.js';
import type { CreateItemDto, UpdateItemDto } from './validation.js';
import { AppError, NotFoundError } from '../../common/utils/AppError.js';

export async function createItemDao(data: CreateItemDto): Promise<Item> {
    try {
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );
        const item = await ItemModel.create(cleanData);
        return item;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Item with name "${data.name}" already exists in this category/subcategory`, 409);
        }
        throw error;
    }
}

export async function findAllItemsDao(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
): Promise<Item[]> {
    const items = await ItemModel.find(filter)
        .populate('categoryId')
        .populate({
            path: 'subcategoryId',
            populate: { path: 'categoryId' },
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    return items as Item[];
}

export async function countItemsDao(filter: Record<string, unknown>): Promise<number> {
    return ItemModel.countDocuments(filter);
}

export async function findItemByIdDao(id: string): Promise<Item> {
    const item = await ItemModel.findById(id)
        .populate('categoryId')
        .populate({
            path: 'subcategoryId',
            populate: { path: 'categoryId' },
        })
        .lean();

    if (!item) {
        throw NotFoundError('Item not found', id);
    }

    return item as Item;
}

export async function updateItemDao(id: string, data: Omit<UpdateItemDto, 'categoryId' | 'subcategoryId'>): Promise<Item> {
    try {
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );

        const updated = await ItemModel.findByIdAndUpdate(
            id,
            { $set: cleanData },
            { new: true, runValidators: true }
        )
            .populate('categoryId')
            .populate({
                path: 'subcategoryId',
                populate: { path: 'categoryId' },
            })
            .lean();

        if (!updated) {
            throw NotFoundError('Item not found', id);
        }

        return updated as Item;
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            throw new AppError(`Item with name "${data.name}" already exists in this category/subcategory`, 409);
        }
        throw error;
    }
}

export async function softDeleteItemDao(id: string): Promise<void> {
    const result = await ItemModel.findByIdAndUpdate(id, { isActive: false });
    if (!result) {
        throw NotFoundError('Item not found', id);
    }
}

export async function findItemsByCategoryIdDao(categoryId: string): Promise<Item[]> {
    const items = await ItemModel.find({
        categoryId,
        isActive: true,
    } as Record<string, unknown>)
        .populate('categoryId')
        .lean();

    return items as Item[];
}

export async function findItemsBySubcategoryIdDao(subcategoryId: string): Promise<Item[]> {
    const items = await ItemModel.find({
        subcategoryId,
        isActive: true,
    } as Record<string, unknown>)
        .populate({
            path: 'subcategoryId',
            populate: { path: 'categoryId' },
        })
        .lean();

    return items as Item[];
}
