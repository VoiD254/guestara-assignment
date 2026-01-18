import { prop, pre, getModelForClass, index, type Ref } from '@typegoose/typegoose';
import { Item } from '../items/schema.js';
import { DayOfWeek } from '../../common/types/availibility.js';

@pre<Availability>('save', async function () {
    if (this.startTime >= this.endTime) {
        throw new Error('startTime must be before endTime');
    }
})
@index({ itemId: 1, dayOfWeek: 1 })
export class Availability {
    @prop({ required: true, ref: () => Item })
    public itemId!: Ref<Item>;

    @prop({ required: true, enum: DayOfWeek, type: String })
    public dayOfWeek!: DayOfWeek;

    @prop({ required: true })
    public startTime!: string; // Format: "HH:MM"

    @prop({ required: true })
    public endTime!: string; // Format: "HH:MM"

    @prop({ default: true })
    public isActive!: boolean;

    @prop({ default: Date.now })
    public createdAt!: Date;

    @prop({ default: Date.now })
    public updatedAt!: Date;
}

export const AvailabilityModel = getModelForClass(Availability, {
    schemaOptions: {
        collection: 'availabilities',
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
