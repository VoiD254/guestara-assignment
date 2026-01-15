import swaggerJsdoc from 'swagger-jsdoc';
import configuration from '../../configuration.js';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Guestara API',
            version: '1.0.0',
            description: 'API documentation for Guestara Assignment',
        },
        servers: [
            {
                url: `http://localhost:${configuration.PORT}`,
                description: 'Local development server',
            },
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
    apis: ['./src/route/**/*.ts', './src/services/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
