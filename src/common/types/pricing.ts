import type { InheritedFrom } from "./category.js";

export enum PricingType {
    STATIC = 'static',
    TIERED = 'tiered',
    COMPLIMENTARY = 'complimentary',
    DISCOUNTED = 'discounted',
    DYNAMIC = 'dynamic',
}

/**
 * Static Pricing Configuration
 * Fixed price for the item
 */
export interface StaticPricingConfig {
    type: PricingType.STATIC;
    price: number;
}

/**
 * Tier for tiered pricing
 */
export interface PricingTier {
    maxQuantity: number; // Up to this quantity
    price: number;        // Price for this tier
}

/**
 * Tiered Pricing Configuration
 * Price depends on quantity (e.g., hours booked)
 */
export interface TieredPricingConfig {
    type: PricingType.TIERED;
    tiers: PricingTier[];
}

/**
 * Complimentary Pricing Configuration
 * Always free (price = 0)
 */
export interface ComplimentaryPricingConfig {
    type: PricingType.COMPLIMENTARY;
}

/**
 * Discount type
 */
export enum DiscountType {
    FLAT = 'flat',
    PERCENTAGE = 'percentage',
}

/**
 * Discount configuration
 */
export interface Discount {
    type: DiscountType;
    value: number;
}

/**
 * Discounted Pricing Configuration
 * Base price with a discount applied
 */
export interface DiscountedPricingConfig {
    type: PricingType.DISCOUNTED;
    basePrice: number;
    discount: Discount;
}

/**
 * Time window for dynamic pricing
 */
export interface TimeWindow {
    startTime: string; // Format: "HH:MM" (e.g., "08:00")
    endTime: string;   // Format: "HH:MM" (e.g., "11:00")
    price: number;
}

/**
 * Dynamic (Time-based) Pricing Configuration
 * Price changes based on time of day
 */
export interface DynamicPricingConfig {
    type: PricingType.DYNAMIC;
    windows: TimeWindow[];
}

/**
 * Union type for all pricing configurations
 */
export type PricingConfig =
    | StaticPricingConfig
    | TieredPricingConfig
    | ComplimentaryPricingConfig
    | DiscountedPricingConfig
    | DynamicPricingConfig;

/**
 * Options for price calculation
 */
export interface PriceCalculationOptions {
    quantity?: number;      // For tiered pricing
    time?: string;          // For dynamic pricing (format: "HH:MM")
    addonIds?: string[];   // Selected addon IDs
}

/**
 * Price breakdown response
 */
export interface PriceBreakdown {
    itemId: string;
    itemName: string;
    pricingRule: PricingType;
    basePrice: number;
    addons: Array<{
        id: string;
        name: string;
        price: number;
    }>;
    addonTotal: number;
    subtotal: number;
    tax: {
        taxApplicable: boolean | null;
        taxPercentage: number | null;
        amount: number;
        inheritedFrom: InheritedFrom;
    };
    grandTotal: number;
}