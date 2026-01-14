import mongoose from 'mongoose';
import { setGlobalOptions } from '@typegoose/typegoose';
import configuration from '../../configuration.js';

type Connection = mongoose.Connection;

let isConnected = false;

/**
 * Configure Typegoose global options
 */
setGlobalOptions({
    schemaOptions: {
        timestamps: true, // Auto add createdAt, updatedAt
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    },
    options: {
        allowMixed: 0, // Strict mode - prevent mixed types
    },
});

export const connectDatabase = async (): Promise<Connection | undefined> => {
    if (isConnected) {
        console.log('Using existing MongoDB connection');
        return;
    }

    try {
        const options: mongoose.ConnectOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        const connection = await mongoose.connect(configuration.DATABASE_URL, options);

        isConnected = true;

        console.log('MongoDB connected successfully');
        console.log(`Database: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);

        // Event handlers
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connection established');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            isConnected = true;
        });

        return connection.connection;

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        isConnected = false;

        if (configuration.NODE_ENV !== 'test') {
            console.log('Retrying connection in 5 seconds...');
            setTimeout(() => { void connectDatabase(); }, 5000);
        } else {
            throw error;
        }
    }
};

export const closeDatabase = async (): Promise<void> => {
    if (!isConnected) {
        console.log('MongoDB already disconnected');
        return;
    }

    try {
        await mongoose.connection.close();
        isConnected = false;
        console.log('MongoDB connection closed gracefully');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        throw error;
    }
};
