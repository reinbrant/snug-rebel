import { apiFetch } from "./api";
import type { CartLine, CartOwner } from "./cart.types";
import {
    COURIER_OPTIONS,
    type AppliedVoucher,
    type CheckoutFormValues,
    type ConfirmedOrder,
} from "./checkout.types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

interface BackendPromoCode {
    pkPromoCodeId: string;
    promocode: string;
    discountType: number;
    discountValue: number;
    minOrderAmount?: number | null;
    isActive: boolean;
}

interface BackendOrderDTO {
    pkOrderId: string;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    totalAmount: number;
    placedAt: string;
}

export async function validateVoucherCode(
    rawCode: string,
    subtotal: number,
): Promise<AppliedVoucher> {
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new Error("Enter a voucher code.");

    if (!USE_MOCK) {
        try {
            const promos = await apiFetch<BackendPromoCode[]>("/PromoCode");
            const match = promos.find(
                (p) => p.isActive && p.promocode.toUpperCase() === code,
            );
            if (match) {
                if (match.minOrderAmount && subtotal < match.minOrderAmount) {
                    throw new Error(
                        `Minimum order of ₱${match.minOrderAmount.toLocaleString()} required for ${code}.`,
                    );
                }
                const discountAmount =
                    match.discountType === 0
                        ? Math.round((subtotal * Number(match.discountValue)) / 100)
                        : Number(match.discountValue);
                return { code: match.promocode.toUpperCase(), discountAmount };
            }
        } catch (err) {
            if (err instanceof Error && err.message.startsWith("Minimum order")) {
                throw err;
            }
        }
    }

    if (code === "REBEL200") {
        return { code: "REBEL200", discountAmount: 200 };
    }
    if (code === "SNUG100") {
        return { code: "SNUG100", discountAmount: 100 };
    }

    throw new Error(`Voucher "${code}" is invalid or expired.`);
}

function generateFallbackOrderNumber(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `SR-${yy}${mm}${dd}-${rand}`;
}

export async function submitCheckoutOrder(params: {
    owner: CartOwner;
    isBuyNow?: boolean;
    items: CartLine[];
    subtotal: number;
    shippingDiscount: number;
    voucher: AppliedVoucher | null;
    values: CheckoutFormValues;
}): Promise<ConfirmedOrder> {
    const { owner, isBuyNow, items, subtotal, shippingDiscount, voucher, values } =
        params;
    const courier =
        COURIER_OPTIONS.find((c) => c.id === values.courierId) ??
        COURIER_OPTIONS[0];
    const discountAmount = voucher?.discountAmount ?? 0;
    const netShipping = Math.max(0, courier.fee - shippingDiscount);
    const totalAmount = Math.max(0, subtotal + netShipping - discountAmount);

    let orderId = `ord-${Date.now()}`;
    let orderNumber = generateFallbackOrderNumber();
    let placedAt = new Date().toISOString();

    if (!USE_MOCK) {
        // Generate a unique idempotency key per checkout attempt
        const idempotencyKey = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        
        const userId = "userId" in owner ? owner.userId : undefined;
        const sessionToken = "sessionToken" in owner ? owner.sessionToken : undefined;

        // Removed the fake-order catch block so real errors bubble up to CheckoutPage.tsx
        const createdOrder = await apiFetch<BackendOrderDTO>(
            "/Order/checkout",
            {
                method: "POST",
                body: JSON.stringify({
                    userId: userId ?? null,
                    sessionToken: sessionToken ?? null,
                    idempotencyKey, // Send idempotencyKey
                    shippingFee: netShipping,
                    discountAmount,
                    voucherCode: voucher?.code ?? null,
                    courier: courier.name,
                    paymentMethod:
                        values.paymentMethod === "cod"
                            ? "COD"
                            : "COD_EWALLET",
                    // Inline address and contact fields sent directly in the checkout payload
                    recipientName: `${values.firstName.trim()} ${values.lastName.trim()}`,
                    email: values.email.trim(),
                    phone: values.mobileNumber.trim(),
                    line1: values.line1.trim(),
                    barangay: values.barangayName,
                    city: values.cityName,
                    province: values.provinceName,
                    postalCode: values.postalCode.trim(),
                    customerNote: values.landmarkNotes.trim() || null,
                    cashReadyOption: values.cashReadyOption,
                    directItems: isBuyNow
                        ? items.map((i) => ({
                            productId: i.productId,
                            productVariantId: i.variantId,
                            size: i.size,
                            color: i.color,
                            quantity: i.quantity,
                        }))
                        : null,
                }),
            },
        );

        if (createdOrder?.orderNumber) {
            orderId = createdOrder.pkOrderId || orderId;
            orderNumber = createdOrder.orderNumber;
            placedAt = createdOrder.placedAt || placedAt;
        }
    }

    return {
        orderId,
        orderNumber,
        placedAt,
        items: [...items],
        subtotal,
        courier,
        shippingDiscount,
        voucher,
        totalAmount,
        paymentMethod: values.paymentMethod,
        cashReadyLabel: values.cashReadyOption,
        recipientName: `${values.firstName.trim()} ${values.lastName.trim()}`,
        email: values.email.trim(),
        mobileNumber: values.mobileNumber.trim(),
        addressLine: values.line1.trim(),
        barangay: values.barangayName,
        city: values.cityName,
        province: values.provinceName,
        postalCode: values.postalCode.trim(),
        landmarkNotes: values.landmarkNotes.trim() || undefined,
    };
}