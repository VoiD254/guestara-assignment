import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateRequest } from '../middleware/validation.js';
import {
    createBooking,
    findAllBookings,
    findBookingById,
    cancelBooking,
    getAvailableSlots,
    createBookingSchema,
    listBookingsSchema,
    availableSlotsSchema,
    type ListBookingsQuery,
    type AvailableSlotsQuery,
} from '../services/booking/index.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Booking ID
 *         itemId:
 *           type: string
 *           description: ID of the booked item
 *         bookingDate:
 *           type: string
 *           format: date
 *           example: "2026-01-25"
 *         startTime:
 *           type: string
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           example: "10:00"
 *         customerName:
 *           type: string
 *           example: "John Doe"
 *         customerEmail:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         customerPhone:
 *           type: string
 *           example: "+1234567890"
 *         status:
 *           type: string
 *           enum: [confirmed, cancelled]
 *           example: "confirmed"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateBookingRequest:
 *       type: object
 *       required:
 *         - itemId
 *         - bookingDate
 *         - startTime
 *         - endTime
 *         - customerName
 *       properties:
 *         itemId:
 *           type: string
 *           description: ID of the item to book
 *           example: "507f1f77bcf86cd799439011"
 *         bookingDate:
 *           type: string
 *           format: date
 *           pattern: "^\\d{4}-\\d{2}-\\d{2}$"
 *           description: Date in YYYY-MM-DD format (cannot be in the past)
 *           example: "2026-01-25"
 *         startTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           description: Start time in HH:MM format
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
 *           description: End time in HH:MM format (must be after startTime)
 *           example: "10:00"
 *         customerName:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Customer's name
 *           example: "John Doe"
 *         customerEmail:
 *           type: string
 *           format: email
 *           description: Customer's email (optional)
 *           example: "john@example.com"
 *         customerPhone:
 *           type: string
 *           maxLength: 20
 *           description: Customer's phone number (optional)
 *           example: "+1234567890"
 *     AvailableSlotsResponse:
 *       type: object
 *       properties:
 *         itemId:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         dayOfWeek:
 *           type: string
 *           enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *         availabilityRules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *         bookedSlots:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               customerName:
 *                 type: string
 *         availableSlots:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     PaginatedBookings:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Booking'
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
 * /api/v1/bookings/createBooking:
 *   post:
 *     summary: Create a booking (with conflict prevention)
 *     description: |
 *       Creates a new booking with **MongoDB transaction-based conflict prevention**.
 *       
 *       **Validation steps:**
 *       1. Item must be bookable (`isBookable: true`)
 *       2. Booking time must fall within an active availability rule for that day
 *       3. No existing confirmed booking can overlap with the requested time slot
 *       
 *       **Conflict Prevention:**
 *       Uses MongoDB transactions to atomically check for conflicts and create the booking,
 *       preventing race conditions in concurrent booking scenarios.
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *           examples:
 *             meetingRoom:
 *               summary: Book meeting room
 *               value:
 *                 itemId: "507f1f77bcf86cd799439011"
 *                 bookingDate: "2026-01-25"
 *                 startTime: "09:00"
 *                 endTime: "10:00"
 *                 customerName: "John Doe"
 *                 customerEmail: "john@example.com"
 *             yogaClass:
 *               summary: Book yoga class
 *               value:
 *                 itemId: "507f1f77bcf86cd799439012"
 *                 bookingDate: "2026-01-26"
 *                 startTime: "08:00"
 *                 endTime: "09:00"
 *                 customerName: "Jane Smith"
 *                 customerPhone: "+1987654321"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: |
 *           Validation error:
 *           - Item not bookable
 *           - Booking time outside availability rules
 *           - Booking date in the past
 *           - startTime not before endTime
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
 *                   example: "Item not available on MON from 09:00 to 10:00. Check availability rules."
 *       409:
 *         description: |
 *           **Conflict** - Time slot already booked.
 *           Another booking exists that overlaps with the requested time.
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
 *                   example: "Time slot already booked. Conflicting booking: 09:00-10:00"
 *       404:
 *         description: Item not found
 */
router.post(
    '/createBooking',
    validateRequest(createBookingSchema),
    asyncHandler(async (req, res) => {
        const booking = await createBooking(req.body);
        res.status(201).json({
            success: true,
            data: booking,
        });
    })
);

/**
 * @swagger
 * /api/v1/bookings/getAllBookings:
 *   get:
 *     summary: Get all bookings with pagination
 *     description: |
 *       Retrieves all bookings with pagination and optional filtering.
 *       Results are sorted by booking date (descending) and start time.
 *     tags: [Bookings]
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
 *         description: Number of items per page
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter by item ID
 *       - in: query
 *         name: bookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date (YYYY-MM-DD)
 *         example: "2026-01-25"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, cancelled]
 *         description: Filter by booking status
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *         description: Search by customer name (partial match, case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBookings'
 */
router.get(
    '/getAllBookings',
    validateRequest(listBookingsSchema, 'query'),
    asyncHandler(async (req, res) => {
        const result = await findAllBookings((req as unknown as { validated: ListBookingsQuery }).validated);
        res.json(result);
    })
);

/**
 * @swagger
 * /api/v1/bookings/getBookingById/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Retrieves a single booking by its ID with populated item details
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
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
 *                   example: "Booking not found"
 */
router.get(
    '/getBookingById/:id',
    asyncHandler(async (req, res) => {
        const booking = await findBookingById(String(req.params.id));
        res.json({
            success: true,
            data: booking,
        });
    })
);

/**
 * @swagger
 * /api/v1/bookings/cancelBooking/{id}:
 *   patch:
 *     summary: Cancel a booking
 *     description: |
 *       Cancels a booking by setting its status to `cancelled`.
 *       This is a soft cancellation - the booking record remains for audit purposes.
 *       The time slot becomes available for new bookings.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID to cancel
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Booking is already cancelled
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
 *                   example: "Booking is already cancelled"
 *       404:
 *         description: Booking not found
 */
router.patch(
    '/cancelBooking/:id',
    asyncHandler(async (req, res) => {
        const booking = await cancelBooking(String(req.params.id));
        res.json({
            success: true,
            data: booking,
        });
    })
);

/**
 * @swagger
 * /api/v1/bookings/getAvailableSlots/{itemId}:
 *   get:
 *     summary: Get available time slots for an item
 *     description: |
 *       Returns availability information for a specific item on a given date.
 *       
 *       **Response includes:**
 *       - Availability rules for that day of the week
 *       - Already booked slots (with customer names)
 *       - Available slots (windows not yet booked)
 *       
 *       If no availability rules exist for the requested day, empty arrays are returned.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID to check availability for
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD format)
 *         example: "2026-01-25"
 *     responses:
 *       200:
 *         description: Available slots information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AvailableSlotsResponse'
 *             example:
 *               success: true
 *               data:
 *                 itemId: "507f1f77bcf86cd799439011"
 *                 date: "2026-01-25"
 *                 dayOfWeek: "SAT"
 *                 availabilityRules:
 *                   - startTime: "09:00"
 *                     endTime: "17:00"
 *                 bookedSlots:
 *                   - startTime: "09:00"
 *                     endTime: "10:00"
 *                     customerName: "John Doe"
 *                 availableSlots:
 *                   - startTime: "10:00"
 *                     endTime: "17:00"
 *       400:
 *         description: Item not bookable
 *       404:
 *         description: Item not found
 */
router.get(
    '/getAvailableSlots/:itemId',
    validateRequest(availableSlotsSchema, 'query'),
    asyncHandler(async (req, res) => {
        const slots = await getAvailableSlots(
            String(req.params.itemId),
            (req as unknown as { validated: AvailableSlotsQuery }).validated
        );
        res.json({
            success: true,
            data: slots,
        });
    })
);

export default router;
