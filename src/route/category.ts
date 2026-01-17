import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateRequest } from '../middleware/validation.js';
import {
    createCategory,
    findAllCategories,
    findCategoryById,
    updateCategory,
    softDeleteCategory,
    createCategorySchema,
    updateCategorySchema,
    listCategoriesSchema,
    type ListCategoriesQuery,
} from '../services/category/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/categories/createCategory:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Beverages
 *               image:
 *                 type: string
 *                 example: https://example.com/beverages.jpg
 *               description:
 *                 type: string
 *                 example: Hot and cold drinks
 *               taxApplicable:
 *                 type: boolean
 *                 example: true
 *               taxPercentage:
 *                 type: number
 *                 example: 5
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Category already exists
 */
router.post(
    '/createCategory',
    validateRequest(createCategorySchema),
    asyncHandler(async (req, res) => {
        const category = await createCategory(req.body);
        res.status(201).json({
            success: true,
            data: category,
        });
    })
);

/**
 * @swagger
 * /api/v1/categories/getAllCategories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get(
    '/getAllCategories',
    validateRequest(listCategoriesSchema, 'query'),
    asyncHandler(async (req, res) => {
        const result = await findAllCategories((req as any).validated as ListCategoriesQuery);
        res.json(result);
    })
);

/**
 * @swagger
 * /api/v1/categories/getCategoryById/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get(
    '/getCategoryById/:id',
    asyncHandler(async (req, res) => {
        const category = await findCategoryById(String(req.params.id));
        res.json({
            success: true,
            data: category,
        });
    })
);

/**
 * @swagger
 * /api/v1/categories/updateCategory/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               taxPercentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.patch(
    '/updateCategory/:id',
    validateRequest(updateCategorySchema),
    asyncHandler(async (req, res) => {
        const category = await updateCategory(String(req.params.id), req.body);
        res.json({
            success: true,
            data: category,
        });
    })
);

/**
 * @swagger
 * /api/v1/categories/softDeleteCategory/{id}:
 *   patch:
 *     summary: Soft delete a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 */
router.patch(
    '/softDeleteCategory/:id',
    asyncHandler(async (req, res) => {
        await softDeleteCategory(String(req.params.id));
        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    })
);

export default router;
