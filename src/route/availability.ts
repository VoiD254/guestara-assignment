import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateRequest } from '../middleware/validation.js';
import {
    createAvailability,
    findAllAvailabilities,
    findAvailabilityById,
    updateAvailability,
    softDeleteAvailability,
    createAvailabilitySchema,
    updateAvailabilitySchema,
    listAvailabilitiesSchema,
    type ListAvailabilitiesQuery,
} from '../services/availability/index.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Availability:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Availability ID
 *         itemId:
 *           type: string
 *           description: ID of the bookable item
 *         dayOfWeek:
 *           type: string
 *           enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *           description: Day of week
 *         startTime:
 *           type: string
 *           example: "09:00"
 *           description: Start time (HH:MM format)
 *         endTime:
 *           type: string
 *           example: "17:00"
 *           description: End time (HH:MM format)
 *         isActive:
 *           type: boolean
 *           description: Whether this availability rule is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateAvailabilityRequest:
 *       type: object
 *       required:
 *         - itemId
 *         - dayOfWeek
 *         - startTime
 *         - endTime
 *       properties:
 *         itemId:
 *           type: string
 *           description: ID of the bookable item
 *           example: "507f1f77bcf86cd799439011"
 *         dayOfWeek:
 *           type: string
 *           enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *           example: "MON"
 *         startTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           example: "09:00"
 *           description: Start time in HH:MM format
 *         endTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           example: "17:00"
 *           description: End time in HH:MM format (must be after startTime)
 *     UpdateAvailabilityRequest:
 *       type: object
 *       properties:
 *         dayOfWeek:
 *           type: string
 *           enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *         startTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           example: "10:00"
 *         endTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           example: "18:00"
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/availabilities/createAvailability:
 *   post:
 *     summary: Create availability rule for an item
 *     description: |
 *       Creates a new availability rule for a bookable item.
 *       The item must have `isBookable: true` before creating availability rules.
 *       Each rule defines when the item is available for booking on a specific day of the week.
 *     tags: [Availability]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAvailabilityRequest'
 *           examples:
 *             weekday:
 *               summary: Monday 9am-5pm
 *               value:
 *                 itemId: "507f1f77bcf86cd799439011"
 *                 dayOfWeek: "MON"
 *                 startTime: "09:00"
 *                 endTime: "17:00"
 *             weekend:
 *               summary: Saturday 10am-2pm
 *               value:
 *                 itemId: "507f1f77bcf86cd799439011"
 *                 dayOfWeek: "SAT"
 *                 startTime: "10:00"
 *                 endTime: "14:00"
 *     responses:
 *       201:
 *         description: Availability created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Availability'
 *       400:
 *         description: |
 *           Validation error or item not bookable.
 *           - Item must have isBookable: true
 *           - startTime must be before endTime
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
 *                   example: "Item is not bookable. Set isBookable to true first."
 *       404:
 *         description: Item not found
 */
router.post(
    '/createAvailability',
    validateRequest(createAvailabilitySchema),
    asyncHandler(async (req, res) => {
        const availability = await createAvailability(req.body);
        res.status(201).json({
            success: true,
            data: availability,
        });
    })
);

/**
 * @swagger
 * /api/v1/availabilities/getAllAvailabilities:
 *   get:
 *     summary: Get all availability rules
 *     description: |
 *       Retrieves all availability rules with optional filtering.
 *       Can filter by item, day of week, or active status.
 *     tags: [Availability]
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter by item ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: dayOfWeek
 *         schema:
 *           type: string
 *           enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *         description: Filter by day of week
 *         example: "MON"
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *         example: true
 *     responses:
 *       200:
 *         description: List of availability rules
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
 *                     $ref: '#/components/schemas/Availability'
 */
router.get(
    '/getAllAvailabilities',
    validateRequest(listAvailabilitiesSchema, 'query'),
    asyncHandler(async (req, res) => {
        const availabilities = await findAllAvailabilities((req as unknown as { validated: ListAvailabilitiesQuery }).validated);
        res.json({
            success: true,
            data: availabilities,
        });
    })
);

/**
 * @swagger
 * /api/v1/availabilities/getAvailabilityById/{id}:
 *   get:
 *     summary: Get availability by ID
 *     description: Retrieves a single availability rule by its ID
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Availability details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Availability'
 *       404:
 *         description: Availability not found
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
 *                   example: "Availability not found"
 */
router.get(
    '/getAvailabilityById/:id',
    asyncHandler(async (req, res) => {
        const availability = await findAvailabilityById(String(req.params.id));
        res.json({
            success: true,
            data: availability,
        });
    })
);

/**
 * @swagger
 * /api/v1/availabilities/updateAvailability/{id}:
 *   patch:
 *     summary: Update availability
 *     description: |
 *       Updates an existing availability rule.
 *       Only provided fields will be updated.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAvailabilityRequest'
 *           example:
 *             startTime: "10:00"
 *             endTime: "18:00"
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Availability'
 *       400:
 *         description: Validation error (e.g., startTime after endTime)
 *       404:
 *         description: Availability not found
 */
router.patch(
    '/updateAvailability/:id',
    validateRequest(updateAvailabilitySchema),
    asyncHandler(async (req, res) => {
        const availability = await updateAvailability(String(req.params.id), req.body);
        res.json({
            success: true,
            data: availability,
        });
    })
);

/**
 * @swagger
 * /api/v1/availabilities/softDeleteAvailability/{id}:
 *   patch:
 *     summary: Soft delete availability (deactivate)
 *     description: |
 *       Soft deletes an availability rule by setting `isActive` to `false`.
 *       The rule remains in the database but will not be used for availability checks.
 *       This follows the "no hard deletes" policy.
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID to deactivate
 *     responses:
 *       200:
 *         description: Availability deactivated successfully
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
 *                   example: "Availability deactivated successfully"
 *       404:
 *         description: Availability not found
 */
router.patch(
    '/softDeleteAvailability/:id',
    asyncHandler(async (req, res) => {
        await softDeleteAvailability(String(req.params.id));
        res.json({
            success: true,
            message: 'Availability deactivated successfully',
        });
    })
);

export default router;
