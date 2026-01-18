import { Router } from "express";
import { validateRequest } from "../middleware/validation.js";
import {
    createSubcategory,
    createSubcategorySchema,
    findAllSubcategories,
    findSubcategoryById,
    findSubcategoriesByCategoryId,
    listSubcategoriesSchema,
    resolveTax,
    softDeleteSubcategory,
    updateSubcategory,
    updateSubcategorySchema
} from "../services/subcategory/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Subcategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Subcategory ID
 *         categoryId:
 *           type: string
 *           description: Parent category ID
 *         name:
 *           type: string
 *           description: Subcategory name (unique within category)
 *         image:
 *           type: string
 *           description: Image URL
 *         description:
 *           type: string
 *           description: Subcategory description
 *         taxApplicable:
 *           type: boolean
 *           nullable: true
 *           description: Tax applicable (null = inherit from category)
 *         taxPercentage:
 *           type: number
 *           nullable: true
 *           description: Tax percentage (null = inherit from category)
 *         isActive:
 *           type: boolean
 *           description: Active status (soft delete)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateSubcategoryRequest:
 *       type: object
 *       required:
 *         - categoryId
 *         - name
 *       properties:
 *         categoryId:
 *           type: string
 *           description: Parent category ID
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: "Hot Beverages"
 *         image:
 *           type: string
 *           format: uri
 *           example: "https://example.com/hot-beverages.jpg"
 *         description:
 *           type: string
 *           example: "Coffee, tea, and hot chocolate"
 *         taxApplicable:
 *           type: boolean
 *           nullable: true
 *           description: Set to null to inherit from category
 *           example: null
 *         taxPercentage:
 *           type: number
 *           nullable: true
 *           description: Set to null to inherit from category
 *           example: null
 *     UpdateSubcategoryRequest:
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
 *           nullable: true
 *         taxPercentage:
 *           type: number
 *           nullable: true
 *         isActive:
 *           type: boolean
 *     TaxInfo:
 *       type: object
 *       properties:
 *         taxApplicable:
 *           type: boolean
 *         taxPercentage:
 *           type: number
 *         inheritedFrom:
 *           type: string
 *           enum: [subcategory, category]
 *           description: Source of the tax settings
 *     PaginatedSubcategories:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Subcategory'
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
 * /api/v1/subcategories/createSubcategory:
 *   post:
 *     summary: Create a new subcategory
 *     description: |
 *       Creates a new subcategory under a category.
 *       
 *       **Tax Inheritance:**
 *       - Set `taxApplicable` and `taxPercentage` to `null` to inherit from parent category
 *       - If you set `taxApplicable: true`, you must provide `taxPercentage`
 *       - Tax settings here are inherited by items that don't define their own
 *     tags: [Subcategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubcategoryRequest'
 *           examples:
 *             inheritTax:
 *               summary: Inherit tax from category
 *               value:
 *                 categoryId: "507f1f77bcf86cd799439011"
 *                 name: "Hot Beverages"
 *                 description: "Coffee, tea, and hot chocolate"
 *                 taxApplicable: null
 *                 taxPercentage: null
 *             ownTax:
 *               summary: Define own tax
 *               value:
 *                 categoryId: "507f1f77bcf86cd799439011"
 *                 name: "Premium Coffee"
 *                 taxApplicable: true
 *                 taxPercentage: 12
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subcategory'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Parent category not found
 *       409:
 *         description: Subcategory with this name already exists in the category
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
 *     summary: Get all subcategories with pagination
 *     description: |
 *       Retrieves all subcategories with pagination, sorting, and filtering.
 *       Can filter by parent category.
 *     tags: [Subcategories]
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
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *     responses:
 *       200:
 *         description: Paginated list of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSubcategories'
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
 *     description: Retrieves a single subcategory by its ID
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Subcategory details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subcategory'
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
 *     description: Retrieves all active subcategories belonging to a specific category
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: List of subcategories for the category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subcategory'
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
 *     summary: Get resolved tax information (with inheritance)
 *     description: |
 *       Returns the effective tax settings for a subcategory.
 *       
 *       **Tax Inheritance Logic:**
 *       1. If subcategory has its own tax settings → use them
 *       2. Otherwise → inherit from parent category
 *       
 *       The response includes `inheritedFrom` to indicate the source.
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Tax information with inheritance source
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TaxInfo'
 *             example:
 *               success: true
 *               data:
 *                 taxApplicable: true
 *                 taxPercentage: 8
 *                 inheritedFrom: "category"
 *       404:
 *         description: Subcategory not found
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
 *     description: |
 *       Updates a subcategory. Only provided fields will be updated.
 *       
 *       **Important:** Changing tax settings will affect all items that inherit from this subcategory.
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubcategoryRequest'
 *           example:
 *             taxApplicable: true
 *             taxPercentage: 12
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subcategory'
 *       400:
 *         description: Validation error
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
 *     description: |
 *       Soft deletes a subcategory by setting `isActive` to `false`.
 *       
 *       **Rules:**
 *       - Cannot delete if there are active items under this subcategory
 *       - The subcategory remains in the database for audit purposes
 *     tags: [Subcategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID to deactivate
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
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
 *                   example: "Subcategory deleted successfully"
 *       400:
 *         description: Cannot delete - has active items
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
