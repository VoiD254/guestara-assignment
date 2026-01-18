import { prop, pre, getModelForClass, index, type Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses.js';
import { Category } from '../category/schema.js';
import { Subcategory } from '../subcategory/schema.js';
import { PricingType, type PricingConfig } from '../../common/types/pricing.js';

/**
 * Addon sub-document (embedded in Item)
 */
export class Addon {
    @prop({ required: true, trim: true })
    public name!: string;

    @prop({ required: true, min: 0 })
    public price!: number;

    @prop({ default: false })
    public isMandatory!: boolean;

    @prop({ trim: true })
    public addonGroup?: string; // e.g., "Sauces" (for grouping)

    @prop({ default: true })
    public isActive!: boolean;
}

/**
 * Item Model
 * Can belong to EITHER a category OR a subcategory (XOR constraint)
 */
@pre<Item>('save', async function () {
    // ⭐ XOR Constraint: Must have exactly ONE parent
    const hasCategory = this.categoryId != null;
    const hasSubcategory = this.subcategoryId != null;

    if (hasCategory && hasSubcategory) {
        throw new Error('Item cannot belong to both category and subcategory');
    }

    if (!hasCategory && !hasSubcategory) {
        throw new Error('Item must belong to either category or subcategory');
    }

    // ⭐ Tax validation: If taxApplicable is true, taxPercentage required
    if (this.taxApplicable === true && this.taxPercentage == null) {
        throw new Error('taxPercentage is required when taxApplicable is true');
    }

    // ⭐ Tax auto-nullify: If taxApplicable is false, taxPercentage must be null
    if (this.taxApplicable === false) {
        this.taxPercentage = null;
    }
})
@index({ categoryId: 1, name: 1 }, { unique: true, sparse: true })
@index({ subcategoryId: 1, name: 1 }, { unique: true, sparse: true })
export class Item extends TimeStamps {
    @prop({ required: true, trim: true })
    public name!: string;

    @prop({ trim: true })
    public description?: string;

    @prop({ trim: true })
    public image?: string;

    // Parent relationship (XOR: EITHER category OR subcategory)
    @prop({ ref: () => Category })
    public categoryId?: Ref<Category>;

    @prop({ ref: () => Subcategory })
    public subcategoryId?: Ref<Subcategory>;

    // Pricing configuration
    @prop({ required: true, enum: Object.values(PricingType) })
    public pricingType!: PricingType;

    @prop({ required: true, type: Object })
    public pricingConfig!: PricingConfig;

    // Tax (nullable = inherit from parent)
    @prop({ type: Boolean })
    public taxApplicable?: boolean | null;

    @prop({ min: 0, max: 100 })
    public taxPercentage?: number | null;

    @prop({ default: false })
    public isBookable!: boolean;

    @prop({ default: true })
    public isActive!: boolean;

    // Addons (embedded array)
    @prop({ type: () => [Addon], default: [] })
    public addons!: Addon[];
}

export const ItemModel = getModelForClass(Item, {
    schemaOptions: {
        collection: 'items',
        timestamps: true,
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
});