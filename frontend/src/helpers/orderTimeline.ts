import { COURIER_OPTIONS } from "../api/checkout.types";
import type { OrderStatusName, OrderTracking } from "../api/orders";

export const STATUS_LABEL: Record<OrderStatusName, string> = {
    Pending: "PENDING",
    Paid: "PAID",
    Processing: "PROCESSING",
    Shipped: "SHIPPED",
    Delivered: "DELIVERED",
    Cancelled: "CANCELLED",
    Refunded: "REFUNDED",
};

export type StepId = "placed" | "dispatched" | "in-transit" | "delivered";

/** done = finished, current = the one happening now, upcoming = not started. */
export type StepPhase = "done" | "current" | "upcoming";

export interface StepState {
    id: StepId;
    phase: StepPhase;
    timestamp?: string;
    description?: string;
}

/** Cancelled and refunded orders don't follow the shipping steps. */
export const isClosedOrder = (order: OrderTracking) =>
    order.status === "Cancelled" || order.status === "Refunded";

const toDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const eventAt = (order: OrderTracking, status: OrderStatusName) =>
    order.events.find((e) => e.status === status)?.at;

/** "Oct 12, 2026 | 11:41 PM", or undefined if there's no usable date. */
export function formatStamp(iso: string | null | undefined): string | undefined {
    const d = toDate(iso);
    if (!d) return undefined;
    const date = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
    return `${date} | ${time}`;
}

const shortDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Works out which tracker steps are done from whatever the backend has.
 * A shipment row is used when there is one. Without it, the order status alone decides,
 * so the tracker still works for orders nobody has created a shipment for.
 */
export function buildStepStates(order: OrderTracking): StepState[] {
    const ship = order.shipmentStatus;

    const delivered =
        order.status === "Delivered" || ship === "Delivered" || !!order.deliveredAt;
    const inTransit =
        delivered ||
        ship === "InTransit" ||
        ship === "Returned" ||
        (!ship && (order.status === "Shipped" || !!order.shippedAt));
    const dispatched =
        inTransit || order.status === "Shipped" || !!order.shippedAt;

    const done = [true, dispatched, inTransit, delivered];
    const firstOpen = done.indexOf(false);
    const phase = (i: number): StepPhase =>
        done[i] ? "done" : i === firstOpen ? "current" : "upcoming";

    const dispatchedAt =
        order.shippedAt ??
        eventAt(order, "Shipped") ??
        (order.status === "Shipped" ? order.updatedAt : undefined);
    const deliveredAt =
        order.deliveredAt ??
        eventAt(order, "Delivered") ??
        (order.status === "Delivered" ? order.updatedAt : undefined);

    const transitNote = order.trackingNumber
        ? `Tracking no. ${order.trackingNumber}${order.courier ? ` (${order.courier})` : ""}`
        : "Your order is on its way.";

    return [
        {
            id: "placed",
            phase: phase(0),
            timestamp: formatStamp(order.placedAt),
            description: "Your order has been placed.",
        },
        {
            id: "dispatched",
            phase: phase(1),
            timestamp: formatStamp(dispatchedAt),
            description: "We're shipping your order to a hub near you.",
        },
        {
            id: "in-transit",
            phase: phase(2),
            description: transitNote,
        },
        {
            id: "delivered",
            phase: phase(3),
            timestamp: formatStamp(deliveredAt),
            description: "Your order has been delivered.",
        },
    ];
}

// The "EXP. ARRIVAL" cell. Becomes "DELIVERED <date>" once the order is delivered.
export function arrivalInfo(order: OrderTracking): { label: string; value: string } {
    const deliveredOn = toDate(
        order.deliveredAt ??
        eventAt(order, "Delivered") ??
        (order.status === "Delivered" ? order.updatedAt : undefined),
    );
    if (deliveredOn) return { label: "DELIVERED", value: shortDate(deliveredOn) };

    const label = "EXP. ARRIVAL";
    if (isClosedOrder(order)) return { label, value: "—" };

    const courier = COURIER_OPTIONS.find(
        (c) => c.name.toLowerCase() === (order.courier ?? "").toLowerCase(),
    );
    const start = toDate(order.shippedAt) ?? toDate(order.placedAt);
    if (!courier || !start) return { label, value: "To be confirmed" };

    const from = new Date(start);
    from.setDate(from.getDate() + courier.daysMin);
    const to = new Date(start);
    to.setDate(to.getDate() + courier.daysMax);

    if (courier.daysMin === courier.daysMax) return { label, value: shortDate(to) };
    const sameMonth = from.getMonth() === to.getMonth();
    return {
        label,
        value: sameMonth
            ? `${shortDate(from)} – ${to.getDate()}`
            : `${shortDate(from)} – ${shortDate(to)}`,
    };
}

// When a cancelled or refunded order was closed (best guess from the data we have).
export function closedAt(order: OrderTracking): string | undefined {
    return formatStamp(eventAt(order, order.status) ?? order.updatedAt);
}