import type { Item, Addon } from './schema.js';
import type { PaginatedResponse } from '../../common/types/index.js';
import { PricingType, type PriceBreakdown, type PriceCalculationOptions, type DiscountedPricingConfig } from '../../common/types/pricing.js';
import { InheritedFrom } from '../../common/types/category.js';
import { AppError } from '../../common/utils/AppError.js';

import {
    createItemDao,
    findAllItemsDao,
    countItemsDao,
    findItemByIdDao,
    updateItemDao,
    softDeleteItemDao,
    findItemsByCategoryIdDao,
    findItemsBySubcategoryIdDao,
} from './dao.js';

import {
    createItemSchema,
    updateItemSchema,
    listItemsSchema,
    priceCalculationSchema,
    type CreateItemDto,
    type UpdateItemDto,
    type ListItemsQuery,
    type PriceCalculationQuery,
    type PopulatedItem,
} from './validation.js';

import { findCategoryById } from '../category/index.js';
import { findSubcategoryById } from '../subcategory/index.js';
import { calculateBasePrice, validatePricingOptions } from './pricing/index.js';

async function createItem(data: CreateItemDto): Promise<Item> {
    // Validate parent exists and is active
    if (data.categoryId) {
        const category = await findCategoryById(data.categoryId);
        if (!category.isActive) {
            throw new AppError('Cannot create item under inactive category', 400);
        }
    }

    if (data.subcategoryId) {
        const subcategory = await findSubcategoryById(data.subcategoryId);
        if (!subcategory.isActive) {
            throw new AppError('Cannot create item under inactive subcategory', 400);
        }
    }

    return createItemDao(data);
}

async function findAllItems(query: ListItemsQuery): Promise<PaginatedResponse<Item>> {
    const { page, limit, sortBy, order, search, active, categoryId, subcategoryId, pricingType, isBookable } = query;

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

    if (subcategoryId) {
        filter.subcategoryId = subcategoryId;
    }

    if (pricingType) {
        filter.pricingType = pricingType;
    }

    if (isBookable !== undefined) {
        filter.isBookable = isBookable;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch from DAO
    const [items, total] = await Promise.all([
        findAllItemsDao(filter, sort, skip, limit),
        countItemsDao(filter),
    ]);

    return {
        success: true,
        data: items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

async function findItemById(id: string): Promise<Item> {
    return findItemByIdDao(id);
}

async function updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    const existing = await findItemByIdDao(id);

    // Validate parent change
    if (data.categoryId) {
        const category = await findCategoryById(data.categoryId);
        if (!category.isActive) {
            throw new AppError('Cannot move item to inactive category', 400);
        }
    }

    if (data.subcategoryId) {
        const subcategory = await findSubcategoryById(data.subcategoryId);
        if (!subcategory.isActive) {
            throw new AppError('Cannot move item to inactive subcategory', 400);
        }
    }

    // Validate XOR constraint after update
    const newCategoryId = data.categoryId !== undefined ? data.categoryId : (existing as PopulatedItem).categoryId;
    const newSubcategoryId = data.subcategoryId !== undefined ? data.subcategoryId : (existing as PopulatedItem).subcategoryId;

    if (newCategoryId && newSubcategoryId) {
        throw new AppError('Item cannot belong to both category and subcategory', 400);
    }
    if (!newCategoryId && !newSubcategoryId) {
        throw new AppError('Item must belong to either category or subcategory', 400);
    }

    // Validate tax logic
    if (data.taxApplicable === true) {
        const hasPercentage = data.taxPercentage != null || existing.taxPercentage != null;
        if (!hasPercentage) {
            throw new AppError('taxPercentage is required when taxApplicable is true', 400);
        }
    }

    return updateItemDao(id, data);
}

async function softDeleteItem(id: string): Promise<void> {
    await findItemByIdDao(id); // Verify exists
    await softDeleteItemDao(id);
}

function resolveTax(item: PopulatedItem) {
    // 1. Item has explicit tax? Use it
    if (item.taxApplicable !== null && item.taxApplicable !== undefined) {
        return {
            taxApplicable: item.taxApplicable,
            taxPercentage: item.taxPercentage ?? 0,
            inheritedFrom: InheritedFrom.ITEM,
        };
    }

    // 2. Has subcategory with explicit tax? Use it
    if (item.subcategoryId) {
        const subcategory = item.subcategoryId;
        if (subcategory.taxApplicable !== null && subcategory.taxApplicable !== undefined) {
            return {
                taxApplicable: subcategory.taxApplicable,
                taxPercentage: subcategory.taxPercentage ?? 0,
                inheritedFrom: InheritedFrom.SUBCATEGORY,
            };
        }

        // 3. Fall back to subcategory's category
        if (subcategory.categoryId) {
            const category = subcategory.categoryId;
            return {
                taxApplicable: category.taxApplicable,
                taxPercentage: category.taxPercentage ?? 0,
                inheritedFrom: InheritedFrom.CATEGORY,
            };
        }
    }

    // 3. Fall back to category
    if (item.categoryId) {
        const category = item.categoryId;
        return {
            taxApplicable: category.taxApplicable,
            taxPercentage: category.taxPercentage ?? 0,
            inheritedFrom: InheritedFrom.CATEGORY,
        };
    }

    // Default: no tax
    return {
        taxApplicable: false,
        taxPercentage: 0,
        inheritedFrom: InheritedFrom.CATEGORY,
    };
}

async function calculateItemPrice(id: string, options: PriceCalculationQuery): Promise<PriceBreakdown> {
    const item = await findItemByIdDao(id) as unknown as PopulatedItem;

    if (!item.isActive) {
        throw new AppError('Cannot calculate price for inactive item', 400);
    }

    validatePricingOptions(item.pricingType, options as PriceCalculationOptions);

    // Calculate price (for discounted items, this returns the discounted price)
    const calculatedPrice = calculateBasePrice(item.pricingConfig, options as PriceCalculationOptions);

    // For discounted items, basePrice should be the original (non-discounted) price
    let basePrice: number;
    let discountInfo: PriceBreakdown['discount'];

    if (item.pricingType === PricingType.DISCOUNTED) {
        const config = item.pricingConfig as DiscountedPricingConfig;
        basePrice = config.basePrice;
        discountInfo = {
            type: config.discount.type,
            value: config.discount.value,
            discountedPrice: calculatedPrice,
        };
    } else {
        basePrice = calculatedPrice;
        discountInfo = undefined;
    }

    const effectivePrice = discountInfo ? discountInfo.discountedPrice : basePrice;

    const addonDetails: Array<{ id: string; name: string; price: number }> = [];
    let addonTotal = 0;

    if (options.addonIds && options.addonIds.length > 0) {
        for (const addonId of options.addonIds) {
            const addon = item.addons.find((a: Addon) => a.name === addonId || (a as unknown as { _id?: { toString(): string } })._id?.toString() === addonId);
            if (!addon) {
                throw new AppError(`Addon "${addonId}" not found in this item`, 400);
            }
            if (!addon.isActive) {
                throw new AppError(`Addon "${addon.name}" is not active`, 400);
            }
            addonDetails.push({
                id: addonId,
                name: addon.name,
                price: addon.price,
            });
            addonTotal += addon.price;
        }
    }

    // Add mandatory addons
    for (const addon of item.addons) {
        if (addon.isMandatory && addon.isActive) {
            const alreadyIncluded = addonDetails.some((a) => a.name === addon.name);
            if (!alreadyIncluded) {
                addonDetails.push({
                    id: addon.name,
                    name: addon.name,
                    price: addon.price,
                });
                addonTotal += addon.price;
            }
        }
    }

    const subtotal = effectivePrice + addonTotal;

    // Resolve tax
    const taxInfo = resolveTax(item);
    const taxAmount = taxInfo.taxApplicable ? subtotal * (taxInfo.taxPercentage / 100) : 0;

    const grandTotal = subtotal + taxAmount;

    return {
        itemId: (item as unknown as { _id: { toString(): string } })._id.toString(),
        itemName: item.name,
        pricingRule: item.pricingType,
        basePrice,
        ...(discountInfo && { discount: discountInfo }),
        addons: addonDetails,
        addonTotal,
        subtotal,
        tax: {
            taxApplicable: taxInfo.taxApplicable!,
            taxPercentage: taxInfo.taxPercentage!,
            amount: Math.round(taxAmount * 100) / 100, // Round to 2 decimals
            inheritedFrom: taxInfo.inheritedFrom,
        },
        grandTotal: Math.round(grandTotal * 100) / 100,
    };
}

export {
    // CRUD
    createItem,
    findAllItems,
    findItemById,
    updateItem,
    softDeleteItem,
    // Tax
    resolveTax,
    // Price
    calculateItemPrice,
    // DAO re-exports
    findItemsByCategoryIdDao,
    findItemsBySubcategoryIdDao,
    // Validation schemas
    createItemSchema,
    updateItemSchema,
    listItemsSchema,
    priceCalculationSchema,
    // Types
    type CreateItemDto,
    type UpdateItemDto,
    type ListItemsQuery,
    type PriceCalculationQuery,
};
