import {
    PricingType,
    type PricingConfig,
    type PriceCalculationOptions,
    type StaticPricingConfig,
    type TieredPricingConfig,
    type DiscountedPricingConfig,
    type DynamicPricingConfig,
} from '../../../common/types/pricing.js';
import { AppError } from '../../../common/utils/AppError.js';

import { calculateStaticPrice } from './calculators/static.js';
import { calculateTieredPrice } from './calculators/tiered.js';
import { calculateComplimentaryPrice } from './calculators/complimentary.js';
import { calculateDiscountedPrice } from './calculators/discounted.js';
import { calculateDynamicPrice } from './calculators/dynamic.js';

/**
 * Calculate base price based on pricing type and configuration
 *
 * @param pricingConfig - The pricing configuration (discriminated union)
 * @param options - Calculation options (quantity, time, etc.)
 */
export function calculateBasePrice(
    pricingConfig: PricingConfig,
    options: PriceCalculationOptions = {}
): number {
    switch (pricingConfig.type) {
        case PricingType.STATIC:
            return calculateStaticPrice(pricingConfig as StaticPricingConfig);

        case PricingType.TIERED: {
            const quantity = options.quantity ?? 1;
            return calculateTieredPrice(pricingConfig as TieredPricingConfig, quantity);
        }

        case PricingType.COMPLIMENTARY:
            return calculateComplimentaryPrice();

        case PricingType.DISCOUNTED:
            return calculateDiscountedPrice(pricingConfig as DiscountedPricingConfig);

        case PricingType.DYNAMIC: {
            if (!options.time) {
                throw new AppError(
                    'Time is required for dynamic pricing. Provide time in HH:MM format.',
                    400
                );
            }
            return calculateDynamicPrice(pricingConfig as DynamicPricingConfig, options.time);
        }

        default: {
            // TypeScript exhaustive check
            const _exhaustive: never = pricingConfig;
            throw new AppError(`Unknown pricing type: ${(_exhaustive as PricingConfig).type}`, 400);
        }
    }
}

// Validate that required options are present for the pricing type
export function validatePricingOptions(
    pricingType: PricingType,
    options: PriceCalculationOptions
): void {
    if (pricingType === PricingType.DYNAMIC && !options.time) {
        throw new AppError(
            'Time is required for dynamic pricing. Provide time in HH:MM format.',
            400
        );
    }
    // Tiered pricing defaults to quantity=1, so no validation needed
}
