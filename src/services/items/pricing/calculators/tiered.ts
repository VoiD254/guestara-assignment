import type { TieredPricingConfig } from '../../../../common/types/pricing.js';
import { AppError } from '../../../../common/utils/AppError.js';

export function calculateTieredPrice(config: TieredPricingConfig, quantity: number): number {
    // Tiers are expected to be sorted by maxQuantity ascending (validated at input)
    const tier = config.tiers.find((t) => quantity <= t.maxQuantity);

    if (!tier) {
        const maxTier = config.tiers[config.tiers.length - 1];
        throw new AppError(
            `Quantity ${quantity} exceeds maximum tier of ${maxTier?.maxQuantity ?? 0}`,
            400
        );
    }

    return tier.price;
}
