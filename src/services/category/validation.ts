import { z } from 'zod';

const createCategorySchema = z.object({
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

    taxApplicable: z
        .boolean()
        .default(false),

    taxPercentage: z
        .number()
        .min(0, 'Tax percentage must be at least 0')
        .max(100, 'Tax percentage must be at most 100')
        .optional(),
}).refine(
    (data) => {
        // If tax is applicable, percentage must be provided
        if (data.taxApplicable && data.taxPercentage == null) {
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
    // Set taxPercentage to null when taxApplicable is not true
    taxPercentage: data.taxApplicable === true ? data.taxPercentage : null,
}));

const updateCategorySchema = z.object({
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
        .optional(),

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
        // If updating taxApplicable to true, ensure taxPercentage exists
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

const listCategoriesSchema = z.object({
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
});

type CreateCategoryDto = z.infer<typeof createCategorySchema>;
type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
type ListCategoriesQuery = z.infer<typeof listCategoriesSchema>;

export {
    createCategorySchema,
    type CreateCategoryDto,
    updateCategorySchema,
    type UpdateCategoryDto,
    listCategoriesSchema,
    type ListCategoriesQuery,
}