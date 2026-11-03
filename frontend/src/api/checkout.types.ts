import type { CartLine } from "./cart.types";

export type CourierId = "jnt" | "ninjavan" | "flash" | "lbc";

export interface CourierOption {
    id: CourierId;
    name: string;
    etaLabel: string;
    daysMin: number;
    daysMax: number;
    fee: number;
}

export const COURIER_OPTIONS: CourierOption[] = [
    { id: "jnt", name: "J&T Express", etaLabel: "3 to 5 days", daysMin: 3, daysMax: 5, fee: 120 },
    { id: "ninjavan", name: "Ninja Van", etaLabel: "3 to 5 days", daysMin: 3, daysMax: 5, fee: 110 },
    { id: "flash", name: "Flash Express", etaLabel: "2 to 4 days", daysMin: 2, daysMax: 4, fee: 100 },
    { id: "lbc", name: "LBC", etaLabel: "1 to 3 days", daysMin: 1, daysMax: 3, fee: 150 },
];

export type PaymentOptionId = "cod" | "cod_ewallet";

export interface CheckoutFormValues {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    line1: string;
    provinceCode: string;
    provinceName: string;
    cityCode: string;
    cityName: string;
    barangayCode: string;
    barangayName: string;
    postalCode: string;
    landmarkNotes: string;
    courierId: CourierId;
    paymentMethod: PaymentOptionId;
    cashReadyOption: string;
    voucherCode: string;
    agreedToTerms: boolean;
}

export interface AppliedVoucher {
    code: string;
    discountAmount: number;
    description?: string;
}

export interface ConfirmedOrder {
    orderId: string;
    orderNumber: string;
    placedAt: string;
    items: CartLine[];
    subtotal: number;
    courier: CourierOption;
    shippingDiscount: number;
    voucher: AppliedVoucher | null;
    totalAmount: number;
    paymentMethod: PaymentOptionId;
    cashReadyLabel: string;
    recipientName: string;
    email: string;
    mobileNumber: string;
    addressLine: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
    landmarkNotes?: string;
}