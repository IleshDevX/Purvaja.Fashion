import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
export async function connectDatabase() {
    try {
        await mongoose.connect(env.DATABASE_URL);
        logger.info('Connected to MongoDB database successfully.');
    }
    catch (error) {
        logger.error({ error }, 'Failed to connect to MongoDB database.');
        throw error;
    }
}
export async function disconnectDatabase() {
    try {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB database.');
    }
    catch (error) {
        logger.error({ error }, 'Error while disconnecting from MongoDB database.');
    }
}
