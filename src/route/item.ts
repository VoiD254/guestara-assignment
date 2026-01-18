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
 * components:
 *   schemas:
 *     Addon:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Extra Shot"
 *         price:
 *           type: number
 *           example: 50
 *         isMandatory:
 *           type: boolean
 *           example: false
 *         addonGroup:
 *           type: string
 *           example: "Coffee Extras"
 *         isActive:
 *           type: boolean
 *     Item:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         image:
 *           type: string
 *         categoryId:
 *           type: string
 *           nullable: true
 *         subcategoryId:
 *           type: string
 *           nullable: true
 *         pricingType:
 *           type: string
 *           enum: [static, tiered, complimentary, discounted, dynamic]
 *         pricingConfig:
 *           type: object
 *         taxApplicable:
 *           type: boolean
 *           nullable: true
 *         taxPercentage:
 *           type: number
 *           nullable: true
 *         isBookable:
 *           type: boolean
 *         addons:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Addon'
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PricingConfigStatic:
 *       type: object
 *       required: [type, price]
 *       properties:
 *         type:
 *           type: string
 *           enum: [static]
 *         price:
 *           type: number
 *           example: 200
 *     PricingConfigTiered:
 *       type: object
 *       required: [type, tiers]
 *       properties:
 *         type:
 *           type: string
 *           enum: [tiered]
 *         tiers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               maxQuantity:
 *                 type: number
 *               price:
 *                 type: number
 *           example:
 *             - maxQuantity: 1
 *               price: 300
 *             - maxQuantity: 2
 *               price: 500
 *     PricingConfigComplimentary:
 *       type: object
 *       required: [type]
 *       properties:
 *         type:
 *           type: string
 *           enum: [complimentary]
 *     PricingConfigDiscounted:
 *       type: object
 *       required: [type, basePrice, discount]
 *       properties:
 *         type:
 *           type: string
 *           enum: [discounted]
 *         basePrice:
 *           type: number
 *           example: 500
 *         discount:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [percentage, flat]
 *             value:
 *               type: number
 *           example:
 *             type: percentage
 *             value: 20
 *     PricingConfigDynamic:
 *       type: object
 *       required: [type, windows]
 *       properties:
 *         type:
 *           type: string
 *           enum: [dynamic]
 *         windows:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 example: "08:00"
 *               endTime:
 *                 type: string
 *                 example: "11:00"
 *               price:
 *                 type: number
 *                 example: 199
 *     PriceBreakdown:
 *       type: object
 *       properties:
 *         itemId:
 *           type: string
 *         itemName:
 *           type: string
 *         pricingRule:
 *           type: string
 *           enum: [static, tiered, complimentary, discounted, dynamic]
 *         basePrice:
 *           type: number
 *           description: Base price after applying pricing rule
 *         addons:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *         addonTotal:
 *           type: number
 *         subtotal:
 *           type: number
 *           description: basePrice + addonTotal
 *         tax:
 *           type: object
 *           properties:
 *             taxApplicable:
 *               type: boolean
 *             taxPercentage:
 *               type: number
 *             amount:
 *               type: number
 *             inheritedFrom:
 *               type: string
 *               enum: [item, subcategory, category]
 *         grandTotal:
 *           type: number
 *           description: Final payable price (subtotal + tax)
 *     CreateItemRequest:
 *       type: object
 *       required:
 *         - name
 *         - pricingType
 *         - pricingConfig
 *       properties:
 *         name:
 *           type: string
 *           example: "Cappuccino"
 *         description:
 *           type: string
 *           example: "Italian coffee with steamed milk"
 *         image:
 *           type: string
 *           format: uri
 *         categoryId:
 *           type: string
 *           description: Required if subcategoryId not provided (XOR constraint)
 *         subcategoryId:
 *           type: string
 *           description: Required if categoryId not provided (XOR constraint)
 *         pricingType:
 *           type: string
 *           enum: [static, tiered, complimentary, discounted, dynamic]
 *         pricingConfig:
 *           oneOf:
 *             - $ref: '#/components/schemas/PricingConfigStatic'
 *             - $ref: '#/components/schemas/PricingConfigTiered'
 *             - $ref: '#/components/schemas/PricingConfigComplimentary'
 *             - $ref: '#/components/schemas/PricingConfigDiscounted'
 *             - $ref: '#/components/schemas/PricingConfigDynamic'
 *         taxApplicable:
 *           type: boolean
 *           nullable: true
 *           description: null to inherit from parent
 *         taxPercentage:
 *           type: number
 *           nullable: true
 *         isBookable:
 *           type: boolean
 *           default: false
 *         addons:
 *           type: array
 *           items:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               isMandatory:
 *                 type: boolean
 *                 default: false
 *               addonGroup:
 *                 type: string
 *     PaginatedItems:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Item'
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
 * /api/v1/items/createItem:
 *   post:
 *     summary: Create a new item
 *     description: |
 *       Creates a new item with pricing configuration.
 *       
 *       **XOR Constraint:** Item must belong to either a category OR a subcategory (not both, not neither).
 *       
 *       **Pricing Types:**
 *       - `static`: Fixed price
 *       - `tiered`: Price based on quantity/duration
 *       - `complimentary`: Always free
 *       - `discounted`: Base price with discount (flat or percentage)
 *       - `dynamic`: Price based on time windows
 *       
 *       **Tax Inheritance:** Set `taxApplicable` to `null` to inherit from parent subcategory/category.
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateItemRequest'
 *           examples:
 *             staticPricing:
 *               summary: Static pricing (Coffee)
 *               value:
 *                 name: "Cappuccino"
 *                 subcategoryId: "507f1f77bcf86cd799439011"
 *                 pricingType: "static"
 *                 pricingConfig:
 *                   type: "static"
 *                   price: 200
 *                 addons:
 *                   - name: "Extra Shot"
 *                     price: 50
 *                     isMandatory: false
 *             tieredPricing:
 *               summary: Tiered pricing (Meeting Room)
 *               value:
 *                 name: "Meeting Room"
 *                 categoryId: "507f1f77bcf86cd799439011"
 *                 pricingType: "tiered"
 *                 pricingConfig:
 *                   type: "tiered"
 *                   tiers:
 *                     - maxQuantity: 1
 *                       price: 300
 *                     - maxQuantity: 2
 *                       price: 500
 *                 isBookable: true
 *             dynamicPricing:
 *               summary: Dynamic pricing (Breakfast)
 *               value:
 *                 name: "Breakfast Combo"
 *                 categoryId: "507f1f77bcf86cd799439011"
 *                 pricingType: "dynamic"
 *                 pricingConfig:
 *                   type: "dynamic"
 *                   windows:
 *                     - startTime: "08:00"
 *                       endTime: "11:00"
 *                       price: 199
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: |
 *           Validation error:
 *           - XOR constraint violated
 *           - pricingConfig.type must match pricingType
 *           - taxPercentage required when taxApplicable is true
 *       409:
 *         description: Item with this name already exists
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
 *     description: |
 *       Retrieves all items with advanced filtering options.
 *       Supports search by name, filtering by category/subcategory, pricing type, and bookable status.
 *     tags: [Items]
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
 *         description: Search by name (partial match)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: subcategoryId
 *         schema:
 *           type: string
 *         description: Filter by subcategory
 *       - in: query
 *         name: pricingType
 *         schema:
 *           type: string
 *           enum: [static, tiered, complimentary, discounted, dynamic]
 *         description: Filter by pricing type
 *       - in: query
 *         name: isBookable
 *         schema:
 *           type: boolean
 *         description: Filter by bookable status
 *     responses:
 *       200:
 *         description: Paginated list of items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedItems'
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
 *     description: Retrieves a single item by its ID with populated category/subcategory
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
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
 *     summary: Calculate price for an item ( KEY ENDPOINT)
 *     description: |
 *       **This is the required pricing endpoint from the assignment.**
 *       
 *       Calculates the full price breakdown including:
 *       - **Base price** (based on pricing type and parameters)
 *       - **Addons** (selected + mandatory)
 *       - **Tax** (with 3-level inheritance: item → subcategory → category)
 *       - **Grand total** (final payable price)
 *       
 *       **Pricing Type Parameters:**
 *       - `static`: No additional params needed
 *       - `tiered`: Requires `quantity` parameter
 *       - `complimentary`: Always returns 0
 *       - `discounted`: No additional params (discount pre-configured)
 *       - `dynamic`: Requires `time` parameter (HH:MM format)
 *       
 *       **Tax Inheritance:** Shows which level the tax was inherited from.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *       - in: query
 *         name: quantity
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Required for tiered pricing
 *         example: 2
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *         description: Required for dynamic pricing (HH:MM format)
 *         example: "10:30"
 *       - in: query
 *         name: addonIds
 *         schema:
 *           type: string
 *         description: Comma-separated addon IDs or names
 *         example: "Extra Shot,Oat Milk"
 *     responses:
 *       200:
 *         description: Price breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PriceBreakdown'
 *             example:
 *               success: true
 *               data:
 *                 itemId: "507f1f77bcf86cd799439011"
 *                 itemName: "Cappuccino"
 *                 pricingRule: "static"
 *                 basePrice: 200
 *                 addons:
 *                   - id: "Extra Shot"
 *                     name: "Extra Shot"
 *                     price: 50
 *                 addonTotal: 50
 *                 subtotal: 250
 *                 tax:
 *                   taxApplicable: true
 *                   taxPercentage: 8
 *                   amount: 20
 *                   inheritedFrom: "category"
 *                 grandTotal: 270
 *       400:
 *         description: |
 *           Invalid pricing options:
 *           - quantity required for tiered pricing
 *           - quantity exceeds max tier
 *           - time required for dynamic pricing
 *           - item not available at specified time
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
 *     description: |
 *       Updates an item. Only provided fields will be updated.
 *       
 *       **Important:** Changing pricing configuration or tax settings takes effect immediately.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
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
 *               isBookable:
 *                 type: boolean
 *           example:
 *             pricingConfig:
 *               type: "static"
 *               price: 250
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
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
 *     description: |
 *       Soft deletes an item by setting `isActive` to `false`.
 *       The item remains in the database for audit purposes.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID to deactivate
 *     responses:
 *       200:
 *         description: Item deleted successfully
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
 *                   example: "Item deleted successfully"
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
