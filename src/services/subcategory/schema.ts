import { getModelForClass, index, pre, prop, type Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";
import { Category } from "../category/schema.js";

@pre<Subcategory>("save", function (this: Subcategory) {
    // Normalize: set taxPercentage to null when taxApplicable is explicitly false
    // (null/undefined means inherit from category, so don't touch taxPercentage)
    if (this.taxApplicable === false) {
        this.taxPercentage = null;
    }
    // Validate: taxPercentage required when taxApplicable is true
    if (this.taxApplicable && this.taxPercentage == null) {
        throw new Error("taxPercentage is required when taxApplicable is true");
    }
})
@index({ categoryId: 1, name: 1 }, { unique: true })
export class Subcategory extends TimeStamps {
    @prop({ required: true, ref: () => Category })
    public categoryId!: Ref<Category>;

    @prop({ required: true, trim: true, unique: true })
    public name!: string;

    @prop({ trim: true })
    public image?: string;

    @prop({ trim: true })
    public description?: string;

    /**
   * Tax settings (nullable = inherit from category)
   * - null: Inherit from parent category
   * - true/false: Override parent setting
   */
    @prop({ type: Boolean, default: null })
    public taxApplicable?: boolean | null;

    @prop({ min: 0, max: 100 })
    public taxPercentage?: number | null;

    @prop({ required: true, default: true })
    public isActive!: boolean;
}

export const SubcategoryModel = getModelForClass(Subcategory, {
    schemaOptions: {
        collection: 'subcategories',
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