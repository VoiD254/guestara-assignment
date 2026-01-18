import type { DynamicPricingConfig } from '../../../../common/types/pricing.js';
import { AppError } from '../../../../common/utils/AppError.js';

/**
 * Calculate price for dynamic (time-based) pricing type
 * Finds the time window that matches the current time and returns its price
 */
export function calculateDynamicPrice(config: DynamicPricingConfig, time: string): number {
    // Find the time window that contains the given time
    const window = config.windows.find((w) => time >= w.startTime && time < w.endTime);

    if (!window) {
        const availableWindows = config.windows
            .map((w) => `${w.startTime}-${w.endTime}`)
            .join(', ');

        throw new AppError(
            `Item not available at time ${time}. Available windows: ${availableWindows}`,
            400
        );
    }

    return window.price;
}
