import { z } from 'zod';
import { DiscountType, PricingType } from '../../common/types/pricing.js';
import { objectIdSchema } from '../subcategory/validation.js';
import type { Item } from './schema.js';
import type { Category } from '../category/schema.js';
import type { Subcategory } from '../subcategory/schema.js';

const timeSchema = z.string().regex(
    /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    { message: 'Time must be in HH:MM format (e.g., "08:30")' }
);

const staticPricingConfigSchema = z.object({
    type: z.literal(PricingType.STATIC),
    price: z.number().min(0, 'Price must be at least 0'),
});

const tieredPricingConfigSchema = z.object({
    type: z.literal(PricingType.TIERED),
    tiers: z.array(
        z.object({
            maxQuantity: z.number().int().positive('maxQuantity must be positive'),
            price: z.number().min(0, 'Price must be at least 0'),
        })
    )
        .min(1, 'At least one tier is required')
        .refine(
            (tiers) => {
                // Validate tiers are in ascending order by maxQuantity
                for (let i = 1; i < tiers.length; i++) {
                    if (tiers[i]!.maxQuantity <= tiers[i - 1]!.maxQuantity) {
                        return false;
                    }
                }
                return true;
            },
            { message: 'Tiers must be in ascending order by maxQuantity' }
        ),
});

const complimentaryPricingConfigSchema = z.object({
    type: z.literal(PricingType.COMPLIMENTARY),
});

const discountedPricingConfigSchema = z.object({
    type: z.literal(PricingType.DISCOUNTED),
    basePrice: z.number().min(0, 'Base price must be at least 0'),
    discount: z.object({
        type: z.enum([DiscountType.FLAT, DiscountType.PERCENTAGE]),
        value: z.number().min(0, 'Discount value must be at least 0'),
    }).refine(
        (discount) => {
            if (discount.type === DiscountType.PERCENTAGE) {
                return discount.value <= 100;
            }
            return true;
        },
        { message: 'Percentage discount cannot exceed 100%' }
    ),
});

const dynamicPricingConfigSchema = z.object({
    type: z.literal(PricingType.DYNAMIC),
    windows: z.array(
        z.object({
            startTime: timeSchema,
            endTime: timeSchema,
            price: z.number().min(0, 'Price must be at least 0'),
        })
            .refine(
                (window) => window.startTime < window.endTime,
                { message: 'startTime must be before endTime' }
            )
    )
        .min(1, 'At least one time window is required'),
});

/**
 * Union of all pricing configs
 */
const pricingConfigSchema = z.discriminatedUnion('type', [
    staticPricingConfigSchema,
    tieredPricingConfigSchema,
    complimentaryPricingConfigSchema,
    discountedPricingConfigSchema,
    dynamicPricingConfigSchema,
]);

const addonSchema = z.object({
    name: z.string().min(1, 'Addon name is required').max(255),
    price: z.number().min(0, 'Addon price must be at least 0'),
    isMandatory: z.boolean().default(false),
    addonGroup: z.string().max(100).optional(),
    isActive: z.boolean().default(true),
});

export const createItemSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255).trim(),
    description: z.string().max(1000).optional(),
    image: z.string().url('Image must be a valid URL').optional(),

    // XOR: EITHER categoryId OR subcategoryId
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.optional(),

    pricingType: z.nativeEnum(PricingType),
    pricingConfig: pricingConfigSchema,

    // Tax (nullable = inherit)
    taxApplicable: z.boolean().optional().nullable(),
    taxPercentage: z.number().min(0).max(100).optional().nullable(),

    isBookable: z.boolean().default(false),

    addons: z.array(addonSchema).default([]),
})
    .refine(
        (data) => {
            // ⭐ XOR Validation: Must have exactly ONE parent
            const hasCategory = data.categoryId != null;
            const hasSubcategory = data.subcategoryId != null;
            return hasCategory !== hasSubcategory; // XOR logic
        },
        {
            message: 'Item must belong to exactly one: categoryId OR subcategoryId (not both, not neither)',
            path: ['categoryId'],
        }
    )
    .refine(
        (data) => {
            // Tax validation: If taxApplicable is true, taxPercentage required
            if (data.taxApplicable === true && data.taxPercentage == null) {
                return false;
            }
            return true;
        },
        {
            message: 'taxPercentage is required when taxApplicable is true',
            path: ['taxPercentage'],
        }
    )
    .refine(
        (data) => {
            // Pricing config must match pricing type
            return data.pricingConfig.type === data.pricingType;
        },
        {
            message: 'pricingConfig.type must match pricingType',
            path: ['pricingConfig'],
        }
    )
    .transform((data) => {
        // Auto-nullify taxPercentage when taxApplicable is not true (including null/undefined for inheritance)
        if (data.taxApplicable !== true) {
            data.taxPercentage = null;
        }
        return data;
    });

export const updateItemSchema = z.object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().max(1000).optional().nullable(),
    image: z.string().url().optional().nullable(),

    categoryId: objectIdSchema.optional().nullable(),
    subcategoryId: objectIdSchema.optional().nullable(),

    pricingType: z.nativeEnum(PricingType).optional(),
    pricingConfig: pricingConfigSchema.optional(),

    taxApplicable: z.boolean().optional().nullable(),
    taxPercentage: z.number().min(0).max(100).optional().nullable(),

    isBookable: z.boolean().optional(),
    isActive: z.boolean().optional(),

    addons: z.array(addonSchema).optional(),
})
    .refine(
        (data) => {
            // If both categoryId and subcategoryId are provided, they can't both be non-null
            if (data.categoryId != null && data.subcategoryId != null) {
                return false;
            }
            return true;
        },
        {
            message: 'Cannot update item to belong to both category and subcategory',
            path: ['categoryId'],
        }
    )
    .refine(
        (data) => {
            if (data.taxApplicable === true && data.taxPercentage == null) {
                return false;
            }
            return true;
        },
        {
            message: 'taxPercentage is required when taxApplicable is true',
            path: ['taxPercentage'],
        }
    )
    .refine(
        (data) => {
            // If updating pricing, type and config must match
            if (data.pricingType && data.pricingConfig) {
                return data.pricingConfig.type === data.pricingType;
            }
            return true;
        },
        {
            message: 'pricingConfig.type must match pricingType',
            path: ['pricingConfig'],
        }
    )
    .transform((data) => {
        if (data.taxApplicable === false) {
            data.taxPercentage = null;
        }
        return data;
    });

export const listItemsSchema = z.object({
    page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
    limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(100)),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
    active: z.string().optional().transform((val) => val === undefined ? undefined : val === 'true'),
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.optional(),
    pricingType: z.nativeEnum(PricingType).optional(),
    isBookable: z.string().optional().transform((val) => val === undefined ? undefined : val === 'true'),
});

export const priceCalculationSchema = z.object({
    quantity: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
    time: timeSchema.optional(),
    addonIds: z.string().optional().transform((val) => val ? val.split(',') : []).optional(),
});

// Type for populated item (with category/subcategory populated)
export interface PopulatedItem extends Omit<Item, 'categoryId' | 'subcategoryId'> {
    categoryId?: Category | null;
    subcategoryId?: (Subcategory & { categoryId?: Category }) | null;
}

export type CreateItemDto = z.infer<typeof createItemSchema>;
export type UpdateItemDto = z.infer<typeof updateItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsSchema>;
export type PriceCalculationQuery = z.infer<typeof priceCalculationSchema>;