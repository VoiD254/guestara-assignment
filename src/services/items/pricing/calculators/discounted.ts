import { DiscountType, type DiscountedPricingConfig } from '../../../../common/types/pricing.js';

export function calculateDiscountedPrice(config: DiscountedPricingConfig): number {
    let finalPrice = config.basePrice;

    if (config.discount.type === DiscountType.PERCENTAGE) {
        finalPrice = finalPrice * (1 - config.discount.value / 100);
    } else if (config.discount.type === DiscountType.FLAT) {
        finalPrice = finalPrice - config.discount.value;
    }

    // Ensure price never goes negative
    return Math.max(0, finalPrice);
}
