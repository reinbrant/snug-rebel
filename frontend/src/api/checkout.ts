import { apiFetch } from "./api";
import type { CartLine, CartOwner } from "./cart.types";
import {
    COURIER_OPTIONS,
    type AppliedVoucher,
    type CheckoutFormValues,
    type ConfirmedOrder,
    type PaymentOptionId,
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

function mapBackendPaymentMethod(method: PaymentOptionId): string {
    switch (method) {
        case "cod":
            return "Cod";
        case "cod_ewallet":
            return "CodEwallet";
        case "gcash":
            return "Gcash";
        case "card":
            return "Card";
    }
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
    values: CheckoutFormValues & { customerNote?: string };
    providerReference?: string;
}): Promise<ConfirmedOrder> {
    const {
        owner,
        isBuyNow,
        items,
        subtotal,
        shippingDiscount,
        voucher,
        values,
        providerReference,
    } = params;

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
        const idempotencyKey =
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2);
        const userId = "userId" in owner ? owner.userId : undefined;
        const sessionToken =
            "sessionToken" in owner ? owner.sessionToken : undefined;

        const createdOrder = await apiFetch<BackendOrderDTO>("/Order/checkout", {
            method: "POST",
            body: JSON.stringify({
                userId: userId ?? null,
                sessionToken: sessionToken ?? null,
                idempotencyKey,
                shippingFee: netShipping,
                discountAmount,
                voucherCode: voucher?.code ?? null,
                courier: courier.name,
                paymentMethod: mapBackendPaymentMethod(values.paymentMethod),
                recipientName: `${values.firstName.trim()} ${values.lastName.trim()}`,
                email: values.email.trim(),
                phone: values.mobileNumber.trim(),
                line1: values.line1.trim(),
                barangay: values.barangayName,
                city: values.cityName,
                province: values.provinceName,
                postalCode: values.postalCode.trim(),
                customerNote:
                    (values.customerNote || values.landmarkNotes)?.trim() || null,
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
        });

        if (createdOrder?.orderNumber) {
            orderId = createdOrder.pkOrderId || orderId;
            orderNumber = createdOrder.orderNumber;
            placedAt = createdOrder.placedAt || placedAt;
        }

        // Mark online mock payments (Card / GCash QR) as Paid in the backend
        if (
            createdOrder?.pkOrderId &&
            (values.paymentMethod === "card" || values.paymentMethod === "gcash")
        ) {
            try {
                await apiFetch("/Payment/process", {
                    method: "POST",
                    body: JSON.stringify({
                        orderId: createdOrder.pkOrderId,
                        // Backend PaymentMethod enum: 2 = Gcash, 4 = Card
                        method: values.paymentMethod === "gcash" ? 2 : 4,
                        providerReference:
                            providerReference ??
                            `MOCK-${values.paymentMethod.toUpperCase()}-${Date.now()}`,
                    }),
                });
            } catch (err) {
                console.warn("Mock payment status update warning:", err);
            }
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