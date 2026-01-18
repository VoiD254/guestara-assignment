import type { StaticPricingConfig } from '../../../../common/types/pricing.js';

export function calculateStaticPrice(config: StaticPricingConfig): number {
    return config.price;
}
