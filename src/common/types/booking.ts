import type { DayOfWeek } from "./availibility.js";

export enum BookingStatus {
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
}

export interface BookingCreateData {
    itemId: string;
    bookingDate: Date;
    startTime: string;
    endTime: string;
    customerName: string;
    customerEmail?: string | undefined;
    customerPhone?: string | undefined;
}

export interface AvailableSlot {
    startTime: string;
    endTime: string;
}

export interface AvailableSlotsResponse {
    itemId: string;
    date: string;
    dayOfWeek: DayOfWeek;
    availabilityRules: AvailableSlot[];
    bookedSlots: Array<{ startTime: string; endTime: string; customerName: string }>;
    availableSlots: AvailableSlot[];
}