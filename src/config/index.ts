type Connection = import('mongoose').Connection;
import { connectDatabase, closeDatabase } from './mongodb.js';

interface Dependencies {
    mongooseConnection: Connection | undefined;
}

const data = {} as Dependencies;

let initialized = false;

export async function initDependencies() {
    if (initialized) {
        console.log('Dependencies already initialized');
        return;
    }

    data.mongooseConnection = await connectDatabase();

    initialized = true;
    console.log('All dependencies initialized');
}

/**
 * Initialize the application environment
 * Returns a cleanup function for graceful shutdown
 */
export async function initializeAppEnvironment(): Promise<{ close: () => Promise<void> }> {
    await initDependencies();
    return {
        close: closeAppEnvironment,
    };
}

export async function closeAppEnvironment(): Promise<void> {
    if (!initialized) {
        console.log('Environment already closed');
        return;
    }

    try {
        await closeDatabase();
        console.log('All connections closed gracefully');
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    } finally {
        initialized = false;
    }
}