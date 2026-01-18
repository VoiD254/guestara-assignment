import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateRequest } from '../middleware/validation.js';
import {
    createItem,
    findAllItems,
    findItemById,
    updateItem,
    softDeleteItem,
    calculateItemPrice,
    createItemSchema,
    updateItemSchema,
    listItemsSchema,
    priceCalculationSchema,
    type ListItemsQuery,
    type PriceCalculationQuery,
} from '../services/items/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/items/createItem:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pricingType
 *               - pricingConfig
 *             properties:
 *               name:
 *                 type: string
 *                 example: Cappuccino
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 description: Required if subcategoryId not provided (XOR)
 *               subcategoryId:
 *                 type: string
 *                 description: Required if categoryId not provided (XOR)
 *               pricingType:
 *                 type: string
 *                 enum: [static, tiered, complimentary, discounted, dynamic]
 *               pricingConfig:
 *                 type: object
 *               taxApplicable:
 *                 type: boolean
 *                 nullable: true
 *               taxPercentage:
 *                 type: number
 *               isBookable:
 *                 type: boolean
 *               addons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     isMandatory:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Item already exists
 */
router.post(
    '/createItem',
    validateRequest(createItemSchema),
    asyncHandler(async (req, res) => {
        const item = await createItem(req.body);
        res.status(201).json({
            success: true,
            data: item,
        });
    })
);

/**
 * @swagger
 * /api/v1/items/getAllItems:
 *   get:
 *     summary: Get all items with filtering and pagination
 *     tags: [Items]
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
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: subcategoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: pricingType
 *         schema:
 *           type: string
 *           enum: [static, tiered, complimentary, discounted, dynamic]
 *       - in: query
 *         name: isBookable
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of items with pagination
 */
router.get(
    '/getAllItems',
    validateRequest(listItemsSchema, 'query'),
    asyncHandler(async (req, res) => {
        const result = await findAllItems((req as unknown as { validated: ListItemsQuery }).validated);
        res.json(result);
    })
);

/**
 * @swagger
 * /api/v1/items/getItemById/{id}:
 *   get:
 *     summary: Get an item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
router.get(
    '/getItemById/:id',
    asyncHandler(async (req, res) => {
        const item = await findItemById(String(req.params.id));
        res.json({
            success: true,
            data: item,
        });
    })
);

/**
 * @swagger
 * /api/v1/items/getItemPrice/{id}:
 *   get:
 *     summary: Calculate price for an item (KEY ENDPOINT)
 *     tags: [Items]
 *     description: |
 *       Calculates the full price breakdown including:
 *       - Base price (based on pricing type)
 *       - Addons (selected + mandatory)
 *       - Tax (with inheritance from category/subcategory)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: quantity
 *         schema:
 *           type: integer
 *         description: Required for tiered pricing
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           example: "10:30"
 *         description: Required for dynamic pricing (HH:MM format)
 *       - in: query
 *         name: addonIds
 *         schema:
 *           type: string
 *         description: Comma-separated addon IDs or names
 *     responses:
 *       200:
 *         description: Price breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 itemId:
 *                   type: string
 *                 itemName:
 *                   type: string
 *                 pricingRule:
 *                   type: string
 *                 basePrice:
 *                   type: number
 *                 addons:
 *                   type: array
 *                 addonTotal:
 *                   type: number
 *                 subtotal:
 *                   type: number
 *                 tax:
 *                   type: object
 *                   properties:
 *                     applicable:
 *                       type: boolean
 *                     percentage:
 *                       type: number
 *                     amount:
 *                       type: number
 *                     inheritedFrom:
 *                       type: string
 *                       enum: [item, subcategory, category]
 *                 grandTotal:
 *                   type: number
 *       400:
 *         description: Invalid pricing options
 *       404:
 *         description: Item not found
 */
router.get(
    '/getItemPrice/:id',
    validateRequest(priceCalculationSchema, 'query'),
    asyncHandler(async (req, res) => {
        const priceBreakdown = await calculateItemPrice(
            String(req.params.id),
            (req as unknown as { validated: PriceCalculationQuery }).validated
        );
        res.json({
            success: true,
            data: priceBreakdown,
        });
    })
);

/**
 * @swagger
 * /api/v1/items/updateItem/{id}:
 *   patch:
 *     summary: Update an item
 *     tags: [Items]
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
 *               description:
 *                 type: string
 *               pricingType:
 *                 type: string
 *               pricingConfig:
 *                 type: object
 *               taxApplicable:
 *                 type: boolean
 *               taxPercentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Item not found
 */
router.patch(
    '/updateItem/:id',
    validateRequest(updateItemSchema),
    asyncHandler(async (req, res) => {
        const item = await updateItem(String(req.params.id), req.body);
        res.json({
            success: true,
            data: item,
        });
    })
);

/**
 * @swagger
 * /api/v1/items/softDeleteItem/{id}:
 *   patch:
 *     summary: Soft delete an item
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 */
router.patch(
    '/softDeleteItem/:id',
    asyncHandler(async (req, res) => {
        await softDeleteItem(String(req.params.id));
        res.json({
            success: true,
            message: 'Item deleted successfully',
        });
    })
);

export default router;
