/**
 * OpenAPI / Swagger Documentation Foundation
 *
 * This file serves as the documentation boundary for future API endpoint contracts.
 */
export const openApiBaseDocument = {
    openapi: '3.0.3',
    info: {
        title: 'E-Commerce Platform REST API',
        version: '1.0.0',
        description: 'Production-grade enterprise e-commerce backend API specification.',
    },
    servers: [
        {
            url: '/api/v1',
            description: 'API v1 root',
        },
    ],
    paths: {
        '/health': {
            get: {
                summary: 'Server health check',
                description: 'Returns server operational status and uptime',
                responses: {
                    '200': {
                        description: 'Server is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string', example: 'healthy' },
                                                timestamp: { type: 'string', example: '2026-08-20T00:00:00.000Z' },
                                                uptime: { type: 'number', example: 120.45 },
                                                environment: { type: 'string', example: 'development' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
