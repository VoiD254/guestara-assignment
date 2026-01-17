import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid ObjectId' }
);

const createSubcategorySchema = z.object({
    categoryId: objectIdSchema,

    name: z
        .string()
        .min(1, 'Name is required')
        .max(255, 'Name must be less than 255 characters')
        .trim(),

    image: z
        .string()
        .url('Image must be a valid URL')
        .optional(),

    description: z
        .string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional(),

    /**
     * Tax settings
     * - undefined/null: Inherit from category
     * - true: Apply tax (tax_percentage required)
     * - false: No tax
     */
    taxApplicable: z
        .boolean()
        .optional()
        .nullable(),

    taxPercentage: z
        .number()
        .min(0, 'Tax percentage must be at least 0')
        .max(100, 'Tax percentage must be at most 100')
        .optional()
        .nullable(),
}).refine(
    (data) => {
        // If tax is explicitly set to true, percentage must be provided
        if (data.taxApplicable === true && data.taxPercentage == null) {
            return false;
        }
        return true;
    },
    {
        message: 'tax_percentage is required when tax_applicable is true',
        path: ['tax_percentage'],
    }
).transform((data) => ({
    ...data,
    // Set taxPercentage to null when taxApplicable is not true
    taxPercentage: data.taxApplicable === true ? data.taxPercentage : null,
}));

const updateSubcategorySchema = z.object({
    categoryId: objectIdSchema.optional(),

    name: z
        .string()
        .min(1, 'Name must not be empty')
        .max(255, 'Name must be less than 255 characters')
        .trim()
        .optional(),

    image: z
        .string()
        .url('Image must be a valid URL')
        .optional()
        .nullable(),

    description: z
        .string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional()
        .nullable(),

    taxApplicable: z
        .boolean()
        .optional()
        .nullable(),

    taxPercentage: z
        .number()
        .min(0, 'Tax percentage must be at least 0')
        .max(100, 'Tax percentage must be at most 100')
        .optional()
        .nullable(),

    isActive: z
        .boolean()
        .optional(),
}).refine(
    (data) => {
        // If updating tax_applicable to true, ensure tax_percentage exists
        if (data.taxApplicable === true && data.taxPercentage == null) {
            return false;
        }
        return true;
    },
    {
        message: 'taxPercentage is required when taxApplicable is true',
        path: ['taxPercentage'],
    }
).transform((data) => ({
    ...data,
    // Set taxPercentage to null when taxApplicable is explicitly false
    // (undefined means no update to taxPercentage)
    taxPercentage: data.taxApplicable === false ? null : data.taxPercentage,
}));

const listSubcategoriesSchema = z.object({
    page: z
        .string()
        .optional()
        .default('1')
        .transform(Number)
        .pipe(z.number().int().positive()),

    limit: z
        .string()
        .optional()
        .default('10')
        .transform(Number)
        .pipe(z.number().int().positive().max(100)),

    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('createdAt'),

    order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc'),

    search: z
        .string()
        .optional(),

    active: z
        .string()
        .optional()
        .transform((val) => val === undefined ? undefined : val === 'true'),

    categoryId: objectIdSchema.optional(),
});

type CreateSubcategoryDto = z.infer<typeof createSubcategorySchema>;
type UpdateSubcategoryDto = z.infer<typeof updateSubcategorySchema>;
type ListSubcategoriesQuery = z.infer<typeof listSubcategoriesSchema>;

enum InheritedFrom {
    CATEGORY = 'category',
    SUBCATEGORY = 'subcategory',
}

export {
    createSubcategorySchema,
    type CreateSubcategoryDto,
    updateSubcategorySchema,
    type UpdateSubcategoryDto,
    listSubcategoriesSchema,
    type ListSubcategoriesQuery,
    InheritedFrom
}