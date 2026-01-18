import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import configuration from '../../configuration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if running from dist (compiled) or src (development)
const isProduction = __dirname.includes('/dist/');
const basePath = isProduction
    ? path.join(__dirname, '..', 'route') // dist/src/config -> dist/src/route
    : path.join(__dirname, '..', 'route'); // src/config -> src/route

console.log(`[Swagger] Loading API docs from: ${basePath}`);

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Guestara Menu & Services API',
            version: '1.0.0',
            description: 'API documentation for Guestara Assignment - Menu & Services Management Backend',
        },
        servers: [
            {
                url: `http://localhost:${configuration.PORT}`,
                description: 'Local development server',
            },
        ],
        tags: [
            { name: 'Categories', description: 'Category management' },
            { name: 'Subcategories', description: 'Subcategory management' },
            { name: 'Items', description: 'Item and pricing management' },
            { name: 'Availability', description: 'Availability rules for bookable items' },
            { name: 'Bookings', description: 'Booking management with conflict prevention' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: [
        // Use glob patterns that work with swagger-jsdoc
        `${basePath}/*.js`,
        `${basePath}/*.ts`,
    ],
};

export const swaggerSpec = swaggerJsdoc(options);
