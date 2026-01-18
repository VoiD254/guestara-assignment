import { prop, pre, getModelForClass, index, type Ref } from '@typegoose/typegoose';
import { Item } from '../items/schema.js';
import { BookingStatus } from '../../common/types/booking.js';

@pre<Booking>('save', async function () {
    if (this.startTime >= this.endTime) {
        throw new Error('startTime must be before endTime');
    }
})
@index({ itemId: 1, bookingDate: 1, startTime: 1, endTime: 1 })
@index({ itemId: 1, bookingDate: 1, status: 1 })
export class Booking {
    @prop({ required: true, ref: () => Item })
    public itemId!: Ref<Item>;

    @prop({ required: true })
    public bookingDate!: Date;

    @prop({ required: true })
    public startTime!: string;

    @prop({ required: true })
    public endTime!: string;

    @prop({ required: true, trim: true })
    public customerName!: string;

    @prop({ trim: true })
    public customerEmail?: string;

    @prop({ trim: true })
    public customerPhone?: string;

    @prop({ required: true, enum: BookingStatus, default: BookingStatus.CONFIRMED, type: String })
    public status!: BookingStatus;

    @prop({ default: Date.now })
    public createdAt!: Date;

    @prop({ default: Date.now })
    public updatedAt!: Date;
}

export const BookingModel = getModelForClass(Booking, {
    schemaOptions: {
        collection: 'bookings',
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
