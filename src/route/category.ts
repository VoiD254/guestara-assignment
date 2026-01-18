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
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Category ID
 *         name:
 *           type: string
 *           description: Category name (unique)
 *         image:
 *           type: string
 *           description: Image URL
 *         description:
 *           type: string
 *           description: Category description
 *         taxApplicable:
 *           type: boolean
 *           description: Whether tax is applicable
 *         taxPercentage:
 *           type: number
 *           description: Tax percentage (required if taxApplicable is true)
 *         isActive:
 *           type: boolean
 *           description: Active status (soft delete)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateCategoryRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: "Beverages"
 *         image:
 *           type: string
 *           format: uri
 *           example: "https://example.com/beverages.jpg"
 *         description:
 *           type: string
 *           example: "Hot and cold drinks"
 *         taxApplicable:
 *           type: boolean
 *           example: true
 *           description: Set to true to enable tax for this category
 *         taxPercentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 8
 *           description: Required when taxApplicable is true
 *     UpdateCategoryRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         image:
 *           type: string
 *         description:
 *           type: string
 *         taxApplicable:
 *           type: boolean
 *         taxPercentage:
 *           type: number
 *         isActive:
 *           type: boolean
 *     PaginatedCategories:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

/**
 * @swagger
 * /api/v1/categories/createCategory:
 *   post:
 *     summary: Create a new category
 *     description: |
 *       Creates a new category. Category names must be unique.
 *       
 *       **Tax Rules:**
 *       - If `taxApplicable` is true, `taxPercentage` is required
 *       - Tax settings here are inherited by subcategories and items that don't define their own
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *           examples:
 *             withTax:
 *               summary: Category with tax
 *               value:
 *                 name: "Beverages"
 *                 image: "https://example.com/beverages.jpg"
 *                 description: "Hot and cold drinks"
 *                 taxApplicable: true
 *                 taxPercentage: 8
 *             noTax:
 *               summary: Category without tax
 *               value:
 *                 name: "Free Items"
 *                 taxApplicable: false
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: |
 *           Validation error:
 *           - name is required
 *           - taxPercentage required when taxApplicable is true
 *       409:
 *         description: Category with this name already exists
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
 *     summary: Get all categories with pagination
 *     description: |
 *       Retrieves all categories with pagination, sorting, and filtering.
 *       Supports search by name and filtering by active status.
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name (partial match, case-insensitive)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Paginated list of categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedCategories'
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
 *     description: Retrieves a single category by its ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Category not found"
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
 *     description: |
 *       Updates a category. Only provided fields will be updated.
 *       
 *       **Important:** Changing `taxApplicable` or `taxPercentage` will affect
 *       all subcategories and items that inherit tax from this category.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategoryRequest'
 *           example:
 *             taxPercentage: 10
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
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
 *     description: |
 *       Soft deletes a category by setting `isActive` to `false`.
 *       
 *       **Rules:**
 *       - Cannot delete if there are active subcategories
 *       - Cannot delete if there are active items directly under this category
 *       - The category remains in the database for audit purposes
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID to deactivate
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       400:
 *         description: Cannot delete - has active subcategories or items
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
