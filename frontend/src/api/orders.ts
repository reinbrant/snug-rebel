import { ApiError, apiFetch } from "./api";

export type OrderStatusName =
    | "Pending"
    | "Paid"
    | "Processing"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Refunded";

export type ShipmentStatusName =
    | "Preparing"
    | "InTransit"
    | "Delivered"
    | "Returned";

/** What the tracking page needs to know about one order. Dates are ISO strings (UTC). */
export interface OrderTrackingItem {
    orderItemId: string;
    productId: string;
    productName: string;
    sizeLabel: string;
    colorName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface OrderTracking {
    orderNumber: string;
    status: OrderStatusName;
    placedAt: string;
    updatedAt: string;
    itemCount: number;
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    totalAmount: number;
    courier: string | null;
    trackingNumber: string | null;
    shipmentStatus: ShipmentStatusName | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    /** Privacy-trimmed on the server: first name + last initial, no street or phone. */
    shipTo: { name: string; barangay: string; city: string; province: string };
    events: { status: OrderStatusName; at: string }[];
    items: OrderTrackingItem[];
}

// Same switch the items, products and checkout modules use.
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

const ORDER_STATUSES: OrderStatusName[] = [
    "Pending",
    "Paid",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
];

const SHIPMENT_STATUSES: ShipmentStatusName[] = [
    "Preparing",
    "InTransit",
    "Delivered",
    "Returned",
];

const asNumber = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asTextOrNull = (v: unknown) =>
    typeof v === "string" && v.trim() ? v : null;

/**
 * Safety net for the server response: a missing or unexpected field
 * becomes a safe default instead of crashing the page.
 */
export function normalize(raw: Partial<OrderTracking>): OrderTracking {
    const status = ORDER_STATUSES.includes(raw.status as OrderStatusName)
        ? (raw.status as OrderStatusName)
        : "Pending";
    const shipmentStatus = SHIPMENT_STATUSES.includes(
        raw.shipmentStatus as ShipmentStatusName,
    )
        ? (raw.shipmentStatus as ShipmentStatusName)
        : null;

    return {
        orderNumber: asText(raw.orderNumber),
        status,
        placedAt: asText(raw.placedAt),
        updatedAt: asText(raw.updatedAt) || asText(raw.placedAt),
        itemCount: asNumber(raw.itemCount),
        subtotal: asNumber(raw.subtotal),
        discountAmount: asNumber(raw.discountAmount),
        shippingFee: asNumber(raw.shippingFee),
        totalAmount: asNumber(raw.totalAmount),
        courier: asTextOrNull(raw.courier),
        trackingNumber: asTextOrNull(raw.trackingNumber),
        shipmentStatus,
        shippedAt: asTextOrNull(raw.shippedAt),
        deliveredAt: asTextOrNull(raw.deliveredAt),
        items: Array.isArray(raw.items) ? raw.items.filter(Boolean).map(item => ({
            orderItemId: asText(item.orderItemId), productId: asText(item.productId),
            productName: asText(item.productName), sizeLabel: asText(item.sizeLabel),
            colorName: asText(item.colorName), quantity: asNumber(item.quantity),
            unitPrice: asNumber(item.unitPrice), lineTotal: asNumber(item.lineTotal),
        })) : [],
        shipTo: {
            name: asText(raw.shipTo?.name),
            barangay: asText(raw.shipTo?.barangay),
            city: asText(raw.shipTo?.city),
            province: asText(raw.shipTo?.province),
        },
        events: Array.isArray(raw.events)
            ? raw.events
                .filter((e) => ORDER_STATUSES.includes(e?.status) && asText(e?.at))
                .map((e) => ({ status: e.status, at: e.at }))
            : [],
    };
}

/**
 * Looks an order up by its order number (e.g. SR-261013-4821).
 * Resolves to null when no such order exists; throws ApiError for anything else.
 */
export async function trackOrder(
    reference: string,
): Promise<OrderTracking | null> {
    const ref = reference.trim();
    if (!ref) return null;
    if (USE_MOCK) return mockTrack(ref);

    try {
        const raw = await apiFetch<Partial<OrderTracking>>(
            `/Order/track/${encodeURIComponent(ref)}`,
        );
        return raw ? normalize(raw) : null;
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

// --------------------------------------------------------
// MOCK MODE
// --------------------------------------------------------
// Demo codes: DEMO-PENDING, DEMO-SHIPPED, DEMO-DELIVERED, DEMO-CANCELLED.
// Any real-looking number (SR-YYMMDD-NNNN), such as the one mock checkout makes,
// shows a shipped demo order. Anything else is "not found".

const hoursAgo = (h: number) =>
    new Date(Date.now() - h * 3_600_000).toISOString();

function mockOrder(
    orderNumber: string,
    status: OrderStatusName,
): OrderTracking {
    const shipped = status === "Shipped" || status === "Delivered";
    return {
        orderNumber,
        status,
        placedAt: hoursAgo(shipped ? 72 : 2),
        updatedAt: hoursAgo(status === "Delivered" ? 4 : shipped ? 40 : 1),
        itemCount: 2,
        subtotal: 1000,
        discountAmount: 0,
        shippingFee: 120,
        totalAmount: 1120,
        courier: "J&T Express",
        trackingNumber: shipped ? "JT0123456789" : null,
        shipmentStatus:
            status === "Delivered" ? "Delivered" : shipped ? "InTransit" : "Preparing",
        shippedAt: shipped ? hoursAgo(40) : null,
        deliveredAt: status === "Delivered" ? hoursAgo(4) : null,
        shipTo: {
            name: "Juan D.",
            barangay: "Tondo",
            city: "Manila",
            province: "Metro Manila",
        },
        events: [],
        items: [],
    };
}

async function mockTrack(ref: string): Promise<OrderTracking | null> {
    await new Promise((r) => setTimeout(r, 350));
    const key = ref.toUpperCase();
    switch (key) {
        case "DEMO-PENDING":
            return mockOrder(key, "Pending");
        case "DEMO-SHIPPED":
            return mockOrder(key, "Shipped");
        case "DEMO-DELIVERED":
            return mockOrder(key, "Delivered");
        case "DEMO-CANCELLED":
            return mockOrder(key, "Cancelled");
    }
    return /^SR-\d{6}-\d{4}$/.test(key) ? mockOrder(key, "Shipped") : null;
}
