import { getModelForClass, index, pre, prop } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";

@pre<Category>("save", function (this: Category) {
    // Normalize: set taxPercentage to null when taxApplicable is not true
    if (!this.taxApplicable) {
        this.taxPercentage = null;
    }
    // Validate: taxPercentage required when taxApplicable is true
    if (this.taxApplicable && this.taxPercentage == null) {
        throw new Error("taxPercentage is required when taxApplicable is true");
    }
})
@index({ name: 1 }, { unique: true })
export class Category extends TimeStamps {
    @prop({ required: true, trim: true, unique: true })
    public name!: string;

    @prop({ trim: true })
    public image?: string;

    @prop({ trim: true })
    public description?: string;

    @prop({ required: true })
    public taxApplicable!: boolean;

    @prop({ min: 0, max: 100, default: null })
    public taxPercentage?: number | null;

    @prop({ required: true, default: true })
    public isActive!: boolean;
}

export const CategoryModel = getModelForClass(Category, {
    schemaOptions: {
        collection: 'categories',
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