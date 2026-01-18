import { Router } from 'express';
import categoryRoutes from './category.js';
import subcategoryRoutes from './subcategory.js';
import itemRoutes from './item.js';

const router = Router();

// API info endpoint
router.get('/', (_req, res) => {
    res.json({
        message: 'Guestara Menu Management API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            categories: '/api/v1/categories',
            subcategories: '/api/v1/subcategories',
            items: '/api/v1/items',
            // bookings: '/api/v1/bookings',
        },
    });
});

router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/items', itemRoutes);

export default router;
