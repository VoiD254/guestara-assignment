import { Router } from "express";
import { validateRequest } from "../middleware/validation.js";
import { createSubcategory, createSubcategorySchema, findAllSubcategories, findSubcategoryById, findSubcategoriesByCategoryId, listSubcategoriesSchema, resolveTax, softDeleteSubcategory, updateSubcategory, updateSubcategorySchema } from "../services/subcategory/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

/**
 * @swagger
 * /api/v1/subcategories/createSubcategory:
 *   post:
 *     summary: Create a new subcategory
 *     tags: [Subcategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *             properties:
 *               category_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               name:
 *                 type: string
 *                 example: Hot Beverages
 *               image:
 *                 type: string
 *                 example: https://example.com/hot-beverages.jpg
 *               description:
 *                 type: string
 *                 example: Coffee, tea, and hot chocolate
 *               tax_applicable:
 *                 type: boolean
 *                 nullable: true
 *                 example: null
 *               tax_percentage:
 *                 type: number
 *                 nullable: true
 *                 example: null
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Subcategory already exists
 */
router.post(
    '/createSubcategory',
    validateRequest(createSubcategorySchema),
    asyncHandler(async (req, res) => {
        const subcategory = await createSubcategory(req.body);
        res.status(201).json({
            success: true,
            data: subcategory,
        });
    })
);

/**
 * @swagger
 * /api/v1/subcategories/getAllSubcategories:
 *   get:
 *     summary: Get all subcategories
 *     tags: [Subcategories]
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
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Filter by parent category
 *     responses:
 *       200:
 *         description: List of subcategories
 */
router.get(
    '/getAllSubcategories',
    validateRequest(listSubcategoriesSchema, 'query'),
    asyncHandler(async (req, res) => {
        const result = await findAllSubcategories((req as any).validated);
        res.json(result);
    })
);

/**
 * @swagger
 * /api/v1/subcategories/getSubcategoryById/{id}:
 *   get:
 *     summary: Get a subcategory by ID
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subcategory details
 *       404:
 *         description: Subcategory not found
 */
router.get(
    '/getSubcategoryById/:id',
    asyncHandler(async (req, res) => {
        const subcategory = await findSubcategoryById(String(req.params.id));
        res.json({
            success: true,
            data: subcategory,
        });
    })
);

/**
 * @swagger
 * /api/v1/subcategories/getSubcategoriesByCategoryId/{categoryId}:
 *   get:
 *     summary: Get all subcategories for a specific category
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     responses:
 *       200:
 *         description: List of subcategories for the category
 *       404:
 *         description: Category not found
 */
router.get(
    '/getSubcategoriesByCategoryId/:categoryId',
    asyncHandler(async (req, res) => {
        const subcategories = await findSubcategoriesByCategoryId(String(req.params.categoryId));
        res.json({
            success: true,
            data: subcategories,
        });
    })
);

/**
 * @swagger
 * /api/v1/subcategories/getTax/{id}:
 *   get:
 *     summary: Get tax information for subcategory (with inheritance)
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tax information with inheritance source
 */
router.get(
    '/getTax/:id',
    asyncHandler(async (req, res) => {
        const taxInfo = await resolveTax(String(req.params.id));
        res.json({
            success: true,
            data: taxInfo,
        });
    })
);

/**
 * @swagger
 * /api/v1/subcategories/updateSubcategory/{id}:
 *   patch:
 *     summary: Update a subcategory
 *     tags: [Subcategories]
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
 *               tax_percentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *       404:
 *         description: Subcategory not found
 */
router.patch(
    '/updateSubcategory/:id',
    validateRequest(updateSubcategorySchema),
    asyncHandler(async (req, res) => {
        const subcategory = await updateSubcategory(String(req.params.id), req.body);
        res.json({
            success: true,
            data: subcategory,
        });
    })
);

/**
 * @swagger
 * /api/v1/subcategories/softDeleteSubcategory/{id}:
 *   patch:
 *     summary: Soft delete a subcategory
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
 *       404:
 *         description: Subcategory not found
 */
router.patch(
    '/softDeleteSubcategory/:id',
    asyncHandler(async (req, res) => {
        await softDeleteSubcategory(String(req.params.id));
        res.json({
            success: true,
            message: 'Subcategory deleted successfully',
        });
    })
);

export default router;
