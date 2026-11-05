/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "react-router";
import { Package, PackageCheck, ReceiptText, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import star_bg from "../assets/star_bg.jpg";
import order_divider from "../assets/order_divider.png";
import { ApiError, apiFetch } from "../api/api";
import { trackOrder } from "../api/orders";
import type { OrderTracking } from "../api/orders";
import { formatPrice } from "../helpers/priceFormat";
import { useAuth } from "../context/authContext";
import {
	STATUS_LABEL,
	arrivalInfo,
	buildStepStates,
	closedAt,
	isClosedOrder,
} from "../helpers/orderTimeline";
import type { StepId } from "../helpers/orderTimeline";

// --------------------------------------------------------
// SHIPPING TRACKER: TYPES, CONFIG & ARTWORK
// --------------------------------------------------------

/** 'completed' renders RED, 'pending' (not done yet / in progress) renders YELLOW. */
type StepStatus = "completed" | "pending";

interface TrackerStepArt {
	label: string;
	shape: TrackerShapeData;
	Icon: LucideIcon;
}

interface TrackerShapeData {
	width: number;
	height: number;
	center: { x: number; y: number };
	maskBox: { x: number; y: number; width: number; height: number };
	fillPath: string;
	strokePath: string;
	decorations: string[];
}

const STATUS_COLORS: Record<StepStatus, string> = {
	completed: "#F70305",
	pending: "#FFC633",
};

const ICON_COLOR = "#262626";

const SHAPE_T1: TrackerShapeData = {
	width: 203,
	height: 191,
	center: { x: 88, y: 102 },
	maskBox: { x: 0, y: 13.2487, width: 177, height: 178 },
	fillPath:
		"M132.78 22.2487L8 36.2487V119.249L15.044 177.249L153.912 182.249L168 166.749L158.44 26.7487L132.78 22.2487Z",
	strokePath:
		"M8 36.2487L132.78 22.2487L158.44 26.7487L168 166.749L153.912 182.249L15.044 177.249L8 119.249V36.2487Z",
	decorations: [
		"M194.706 1.54705L136.929 36.2366L201.046 26.1527L194.706 1.54705Z",
		"M191.474 37.2761L142.093 41.9514L189.765 53.7913L191.474 37.2761Z",
	],
};

const SHAPE_T2: TrackerShapeData = {
	width: 204,
	height: 193,
	center: { x: 115, y: 88 },
	maskBox: { x: 26.001, y: -0.873657, width: 178, height: 178 },
	fillPath:
		"M49.4558 8.12634L35.001 16.438L43.9729 133.321L39.9854 159.815L186.527 168.126L195.001 39.2952L191.013 16.438L49.4558 8.12634Z",
	strokePath:
		"M35.001 16.438L49.4558 8.12634L191.013 16.438L195.001 39.2952L186.527 168.126L39.9854 159.815L43.9729 133.321L35.001 16.438Z",
	decorations: [
		"M15.501 166.626L10.001 152.126L50.501 142.126L52.501 147.626L15.501 166.626Z",
		"M14.7723 189.89L3.22507 179.449L55.2627 151.186L57.305 156.627L14.7723 189.89Z",
	],
};

const SHAPE_T3: TrackerShapeData = {
	width: 229,
	height: 198,
	center: { x: 119, y: 107 },
	maskBox: { x: 30, y: 19, width: 178, height: 177 },
	fillPath:
		"M42.1728 27L52.289 68.6465L39 131.966L52.289 187L145.312 182.858L174.017 171.614L194.216 179.307L199 63.3207L194.216 27H42.1728Z",
	strokePath:
		"M52.289 68.6465L42.1728 27H194.216L199 63.3207L194.216 179.307L174.017 171.614L145.312 182.858L52.289 187L39 131.966L52.289 68.6465Z",
	decorations: [
		"M3.76282 37.5193L69.9294 50.305L15.4829 14.9742L3.76282 37.5193Z",
		"M30.0375 13.0923L69.9055 42.6031L42.342 1.94478L30.0375 13.0923Z",
		"M219.782 196.191L181.214 165L227.487 181.484L219.782 196.191Z",
	],
};

const SHAPE_T4: TrackerShapeData = {
	width: 179,
	height: 177,
	center: { x: 89.5, y: 88 },
	maskBox: { x: -0.449714, y: -0.787361, width: 179, height: 178 },
	fillPath:
		"M169.55 19.6204L151.05 8.21265L28.0503 19.6205L9.55029 29.5071L17.2432 128.91L9.55029 149.433L33.5503 168.213L122.55 163.115L160.55 163.115L157.55 133.796L169.55 19.6204Z",
	strokePath:
		"M151.05 8.21265L169.55 19.6204L157.55 133.796L160.55 163.115L122.55 163.115L33.5503 168.213L9.55029 149.433L17.2432 128.91L9.55029 29.5071L28.0503 19.6205L151.05 8.21265Z",
	decorations: [],
};

const STEP_ART: Record<StepId, TrackerStepArt> = {
	placed: { label: "Order Placed", shape: SHAPE_T1, Icon: ReceiptText },
	dispatched: { label: "Dispatched", shape: SHAPE_T2, Icon: Package },
	"in-transit": { label: "In Transit", shape: SHAPE_T3, Icon: Truck },
	delivered: { label: "Delivered", shape: SHAPE_T4, Icon: PackageCheck },
};

const BASE_SHAPE_WIDTH = SHAPE_T1.width;
const ICON_VIEWBOX_UNITS = 72;

function TrackerShape({
	shape,
	color,
}: {
	shape: TrackerShapeData;
	color: string;
}) {
	const { width, height, fillPath, strokePath, decorations } = shape;

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="block h-full w-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
			aria-hidden="true"
		>
			<path d={strokePath} stroke={color} strokeWidth={16} />
			<path d={fillPath} fill="white" />
			{decorations.map((d) => (
				<path
					key={d}
					d={d}
					fill="white"
					stroke="black"
					strokeWidth={2}
					strokeMiterlimit={16}
				/>
			))}
		</svg>
	);
}

function TrackerNode({
	art,
	status,
}: {
	art: TrackerStepArt;
	status: StepStatus;
}) {
	const { shape, Icon } = art;
	const { width, height, center } = shape;

	const wrapperStyle: CSSProperties = {
		width: `${(width / BASE_SHAPE_WIDTH) * 100}%`,
		aspectRatio: `${width} / ${height}`,
		left: "50%",
		top: "50%",
		transform: `translate(-${(center.x / width) * 100}%, -${(center.y / height) * 100}%)`,
	};

	const iconStyle: CSSProperties = {
		left: `${(center.x / width) * 100}%`,
		top: `${(center.y / height) * 100}%`,
		width: `${(ICON_VIEWBOX_UNITS / width) * 100}%`,
		aspectRatio: "1 / 1",
		transform: "translate(-50%, -50%)",
	};

	return (
		<div className="absolute z-10" style={wrapperStyle}>
			<TrackerShape shape={shape} color={STATUS_COLORS[status]} />
			<div className="absolute" style={iconStyle}>
				<Icon
					size="100%"
					strokeWidth={2}
					color={ICON_COLOR}
					aria-hidden="true"
				/>
			</div>
		</div>
	);
}

function TrackerConnector({ status }: { status: StepStatus }) {
	return (
		<span
			aria-hidden="true"
			className="absolute right-1/2 top-1/2 z-0 h-[4px] -translate-y-1/2 lg:h-[6px] w-[calc(100%+1.5rem)] lg:w-[calc(100%+4rem)]"
			style={{
				backgroundColor: STATUS_COLORS[status],
			}}
		/>
	);
}

// --------------------------------------------------------
// PAGE
// --------------------------------------------------------

function lookupErrorMessage(err: unknown): string {
	if (err instanceof ApiError && err.serverMessage) return err.serverMessage;
	return "Something went wrong while looking up your order. Please try again.";
}

interface LookupResult {
	ref: string;
	order: OrderTracking | null;
	error?: string;
}

type TrackingItem = {
	pkOrderItemId?: string;
	productName?: string;
	name?: string;
	sku?: string;
	colorName?: string;
	color?: string;
	sizeLabel?: string;
	size?: string;
	quantity: number;
	unitPrice?: number;
	price?: number;
	lineTotal?: number;
};

type UserOrderRecord = {
	orderNumber?: string;
	items?: TrackingItem[];
};

export default function OrderTrackingPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const reference = (searchParams.get("order") ?? "").trim();

	const [searchInput, setSearchInput] = useState(reference);
	const [result, setResult] = useState<LookupResult | null>(null);
	const [attempt, setAttempt] = useState(0);
	const [showItemsModal, setShowItemsModal] = useState(false);

	const { user } = useAuth();
	const [authItems, setAuthItems] = useState<TrackingItem[] | null>(null);
	const [loadingItems, setLoadingItems] = useState(false);

	// Fetch authenticated user's orders so we can hydrate the items modal
	useEffect(() => {
		const userId = user?.pkUserId;
		if (!userId || !reference) {
			setAuthItems(null);
			return;
		}

		let cancelled = false;
		setLoadingItems(true);

		apiFetch<UserOrderRecord[]>(`/Order/user/${userId}`)
			.then((orders) => {
				if (cancelled || !Array.isArray(orders)) return;
				const target = reference.toUpperCase();
				const match = orders.find(
					(o) =>
						(o.orderNumber ?? "").trim().toUpperCase() === target,
				);
				if (match?.items && Array.isArray(match.items)) {
					setAuthItems(match.items);
				} else {
					setAuthItems(null);
				}
			})
			.catch((err) => {
				console.error(err);
				if (!cancelled) setAuthItems(null);
			})
			.finally(() => {
				if (!cancelled) setLoadingItems(false);
			});

		return () => {
			cancelled = true;
		};
	}, [user?.pkUserId, reference]);

	useEffect(() => {
		if (!reference) return;
		let cancelled = false;

		trackOrder(reference)
			.then((order) => {
				if (!cancelled) setResult({ ref: reference, order });
			})
			.catch((err: unknown) => {
				if (!cancelled)
					setResult({
						ref: reference,
						order: null,
						error: lookupErrorMessage(err),
					});
			});

		return () => {
			cancelled = true;
		};
	}, [reference, attempt]);

	const current = result && result.ref === reference ? result : null;
	const isLoading = reference !== "" && current === null;
	const order = current?.order ?? null;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const next = searchInput.trim().toUpperCase();
		if (!next || isLoading) return;
		setResult(null);
		setAttempt((n) => n + 1);
		setSearchParams({ order: next });
	};

	const handleReset = () => {
		setResult(null);
		setSearchInput("");
		setSearchParams({});
	};

	// --------------------------------------------------------
	// VIEW 1: SEARCH PAGE
	// --------------------------------------------------------
	if (!order) {
		const notice = isLoading
			? "Looking up your order..."
			: current?.error
				? current.error
				: current
					? `We couldn't find an order with the number "${reference}". Check it and try again.`
					: "";

		return (
			<div className="relative h-[calc(100vh-var(--nav-h,64px))] w-full bg-[#111] flex flex-col items-center justify-center font-display overflow-hidden">
				<img
					src={star_bg}
					alt="Star Background"
					className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
				/>

				<div className="relative z-10 w-full max-w-3xl px-6 flex flex-col items-center -mt-20">
					<h1 className="text-white text-2xl md:text-3xl font-extrabold uppercase tracking-widest mb-8">
						Track Your Order:
					</h1>

					<form
						onSubmit={handleSearch}
						className="relative w-full max-w-2xl transform -skew-x-[6deg]"
					>
						<svg
							className="absolute -top-5 -right-5 w-12 h-12 text-white pointer-events-none z-20 drop-shadow-lg"
							viewBox="0 0 100 100"
							fill="currentColor"
							stroke="black"
							strokeWidth="4"
							strokeLinejoin="miter"
						>
							<polygon points="20,100 80,100 100,20 60,60 70,0 0,50" />
						</svg>

						<svg
							className="absolute -bottom-5 -left-6 w-12 h-12 text-white pointer-events-none z-20 drop-shadow-lg"
							viewBox="0 0 100 100"
							fill="currentColor"
							stroke="black"
							strokeWidth="4"
							strokeLinejoin="miter"
						>
							<polygon points="100,0 20,20 0,80 40,50 30,100 100,50" />
						</svg>

						<div className="relative border-2 border-white bg-[#1a1a1a] shadow-[6px_6px_0px_#000]">
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								disabled={isLoading}
								aria-label="Order number"
								aria-invalid={!isLoading && !!current}
								placeholder="Enter your Order ID... (e.g. SR-261013-4821)"
								className="w-full bg-transparent text-white px-6 py-4 md:py-5 outline-none font-bold placeholder-neutral-500 tracking-wider text-sm md:text-base transform skew-x-[6deg] disabled:opacity-60"
							/>
						</div>
					</form>

					<p
						role="status"
						aria-live="polite"
						className={`mt-8 min-h-5 text-center text-xs md:text-sm font-bold tracking-wide ${
							isLoading ? "text-neutral-400" : "text-[#FFC633]"
						}`}
					>
						{notice}
					</p>
				</div>
			</div>
		);
	}

	// --------------------------------------------------------
	// VIEW 2: ORDER DETAILS PAGE
	// --------------------------------------------------------
	const closed = isClosedOrder(order);
	const arrival = arrivalInfo(order);
	const steps = buildStepStates(order);
	const addressLines = [
		order.shipTo.barangay,
		[order.shipTo.city, order.shipTo.province].filter(Boolean).join(", "),
	].filter(Boolean);

	const extendedOrder = order as OrderTracking & { items?: TrackingItem[] };
	const itemsToRender =
		(extendedOrder.items && extendedOrder.items.length > 0
			? extendedOrder.items
			: null) ??
		authItems ??
		[];

	return (
		<div className="h-[calc(100vh-var(--nav-h,64px))] w-full flex flex-col font-display bg-[#111] overflow-hidden select-none">
			{/* TOP SECTION: Light grey (#EEEEEE) matching the 2nd reference image */}
			<div className="relative z-30 w-full bg-[#EEEEEE] px-6 pt-5 pb-3 lg:px-14 lg:pt-7 lg:pb-4 shrink-0">
				<div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_auto] gap-6 lg:gap-10 items-start">
					{/* Column 1: Order Info */}
					<div className="flex flex-col">
						<h2 className="text-xl lg:text-[26px] leading-none font-black uppercase tracking-tight text-black mb-1">
							ORDER TRACKING
						</h2>
						<p className="text-xs lg:text-[15px] font-black uppercase tracking-wide text-black mb-3 lg:mb-4 select-text">
							ORDER #{order.orderNumber}
						</p>

						<div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs lg:text-[14px]">
							<span className="font-black uppercase text-black">
								ORDER STATUS
							</span>
							<span className="font-medium uppercase text-neutral-800">
								{STATUS_LABEL[order.status]}
							</span>

							<span className="font-black uppercase text-black">
								ITEMS IN ORDER
							</span>
							<span className="font-medium text-neutral-800">
								{order.itemCount}
							</span>

							<span className="font-black uppercase text-black">
								{arrival.label}
							</span>
							<span className="font-medium text-neutral-800">
								{arrival.value}
							</span>
						</div>
					</div>

					{/* Column 2: Shipping Details */}
					<div className="flex flex-col lg:pt-6">
						<h3 className="text-xs lg:text-[15px] font-black uppercase tracking-wide text-black mb-3 lg:mb-4">
							SHIPPING DETAILS
						</h3>
						<div className="text-xs lg:text-[14px] font-normal text-neutral-800 leading-snug space-y-0.5">
							{order.shipTo.name || addressLines.length ? (
								<>
									{order.shipTo.name && (
										<p>{order.shipTo.name}</p>
									)}
									{addressLines.map((line) => (
										<p key={line}>{line}</p>
									))}
								</>
							) : (
								<p>Address details unavailable.</p>
							)}
							{order.courier && <p>Via {order.courier}</p>}
						</div>
					</div>

					{/* Column 3: Order Summary */}
					<div className="flex flex-col lg:pt-6 max-w-[240px]">
						<h3 className="text-xs lg:text-[15px] font-black uppercase tracking-wide text-black mb-3 lg:mb-4">
							ORDER SUMMARY
						</h3>

						<div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-xs lg:text-[14px]">
							<span className="font-black uppercase text-black">
								SUBTOTAL
							</span>
							<span className="font-normal text-neutral-800">
								{formatPrice(order.subtotal)}
							</span>

							{order.discountAmount > 0 && (
								<>
									<span className="font-black uppercase text-black">
										DISCOUNT
									</span>
									<span className="font-normal text-neutral-800">
										-{formatPrice(order.discountAmount)}
									</span>
								</>
							)}

							<span className="font-black uppercase text-black">
								SHIPPING
							</span>
							<span className="font-normal text-neutral-800">
								{formatPrice(order.shippingFee)}
							</span>

							<span className="font-black uppercase text-black pt-3">
								TOTAL
							</span>
							<span className="font-normal text-neutral-900 pt-3">
								{formatPrice(order.totalAmount)}
							</span>
						</div>
					</div>

					{/* Column 4: Two Black Pill Action Buttons */}
					<div className="flex flex-row lg:flex-col gap-2.5 lg:items-end lg:justify-start lg:pt-5">
						<button
							type="button"
							onClick={() => setShowItemsModal(true)}
							className="w-full lg:w-44 px-6 py-2 rounded-full border-[1.5px] border-black bg-white text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 hover:bg-black hover:text-white active:scale-95 focus:outline-none whitespace-nowrap cursor-pointer"
						>
							View All Items
						</button>

						<button
							type="button"
							onClick={handleReset}
							className="w-full lg:w-44 px-6 py-2 rounded-full border-[1.5px] border-black bg-white text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 hover:bg-black hover:text-white active:scale-95 focus:outline-none whitespace-nowrap cursor-pointer"
						>
							Track Another
						</button>
					</div>
				</div>
			</div>

			{/* BOTTOM SECTION: Split Background + Jagged Divider + Raised Timeline */}
			<div className="relative flex-1 min-h-0 w-full bg-[#111] flex flex-col justify-center items-center overflow-hidden">
				{/* Layer 0: Star Background Pattern */}
				<img
					src={star_bg}
					alt=""
					aria-hidden="true"
					className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0"
				/>

				{/* Layer 1: Top light-grey fill behind the transparent upper half of order_divider.png so there is NEVER a black bar */}
				<div
					aria-hidden="true"
					className="absolute top-0 left-0 right-0 h-14 md:h-20 lg:h-28 bg-[#EEEEEE] pointer-events-none z-[5]"
				/>

				{/* Layer 2: Overflowing Jagged Divider Graphic (z-10, below the z-20 tracker) */}
				<img
					src={order_divider}
					alt=""
					aria-hidden="true"
					className="absolute top-0 left-1/2 -translate-x-1/2 w-[112%] min-w-[1100px] max-w-none h-auto pointer-events-none z-10"
				/>

				{/* Layer 3: Raised Timeline Graphic (z-20, above the divider) */}
				<div className="relative z-20 w-full max-w-6xl mx-auto px-6 lg:px-12 pt-10 md:pt-14 lg:pt-20">
					{closed ? (
						<div className="text-center text-white px-6">
							<h4 className="text-xl lg:text-3xl font-extrabold uppercase tracking-widest">
								Order {STATUS_LABEL[order.status]}
							</h4>
							{closedAt(order) && (
								<p className="mt-2 text-xs lg:text-sm text-neutral-400 font-bold">
									{closedAt(order)}
								</p>
							)}
							<p className="mt-3 text-xs lg:text-sm text-neutral-300 font-bold">
								{order.status === "Refunded"
									? "Your refund has been issued."
									: "This order was cancelled and will not be shipped."}
							</p>
						</div>
					) : (
						<ol
							aria-label="Shipping progress"
							className="w-full grid grid-cols-4 gap-6 lg:gap-16 items-start list-none"
						>
							{steps.map((step, index) => {
								const art = STEP_ART[step.id];
								const isDone = step.phase === "done";
								const status: StepStatus = isDone
									? "completed"
									: "pending";
								const showNote =
									isDone ||
									(step.id === "in-transit" &&
										step.phase === "current");

								return (
									<li
										key={step.id}
										aria-current={
											step.phase === "current"
												? "step"
												: undefined
										}
										className="relative flex flex-col items-center text-white"
									>
										{/* Icon Box + Connecting Line */}
										<div className="relative w-full flex justify-center">
											{index > 0 && (
												<TrackerConnector
													status={status}
												/>
											)}
											<div className="relative mx-auto aspect-square w-full max-w-[140px] md:max-w-[170px] lg:max-w-[195px]">
												<TrackerNode
													art={art}
													status={status}
												/>
											</div>
										</div>

										{/* Step Text Details (Left-aligned under the box like the 2nd image) */}
										<div className="w-full max-w-[140px] md:max-w-[170px] lg:max-w-[195px] mt-3 lg:mt-4 text-left">
											<h4 className="text-xs md:text-sm lg:text-lg font-black uppercase tracking-wide text-white leading-tight">
												{art.label}
											</h4>

											{isDone && step.timestamp ? (
												<p className="text-[10px] lg:text-xs text-neutral-300 font-medium mt-0.5">
													{step.timestamp}
												</p>
											) : (
												<p className="text-[10px] lg:text-xs text-neutral-300 font-medium mt-0.5">
													In progress...
												</p>
											)}

											{showNote && step.description && (
												<p className="hidden md:block text-[10px] lg:text-xs text-neutral-200 font-normal leading-snug mt-2.5">
													{step.description}
												</p>
											)}
										</div>
									</li>
								);
							})}
						</ol>
					)}
				</div>
			</div>

			{/* VIEW ALL ITEMS MODAL */}
			{showItemsModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-text"
					onClick={() => setShowItemsModal(false)}
				>
					<div
						className="relative w-full max-w-lg bg-[#f5f3ec] border-2 border-[#141414] shadow-[8px_8px_0_#141414] p-6 sm:p-8 font-mono text-[#141414] max-h-[82vh] flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b-2 border-dashed border-[#141414] pb-4 mb-4 shrink-0">
							<div>
								<h2 className="font-display text-2xl font-black uppercase tracking-tight">
									ORDER ITEMS
								</h2>
								<p className="text-xs text-neutral-600 mt-0.5">
									ORDER #{order.orderNumber} ·{" "}
									{order.itemCount}{" "}
									{order.itemCount === 1 ? "ITEM" : "ITEMS"}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowItemsModal(false)}
								className="h-8 w-8 flex items-center justify-center border border-[#141414] font-display text-xl font-black hover:bg-[#e50914] hover:text-white hover:border-[#e50914] transition-colors cursor-pointer"
								aria-label="Close modal"
							>
								&times;
							</button>
						</div>

						<div className="overflow-y-auto pr-1 space-y-4 flex-1">
							{loadingItems ? (
								<p className="text-sm text-neutral-600 py-6 text-center">
									Loading order items...
								</p>
							) : itemsToRender.length > 0 ? (
								itemsToRender.map((item, i) => {
									const unitPrice =
										item.unitPrice ?? item.price ?? 0;
									const lineTotal =
										item.lineTotal ??
										unitPrice * item.quantity;
									const variantParts = [
										item.colorName || item.color,
										item.sizeLabel || item.size,
									].filter(
										(v) =>
											v &&
											v.toLowerCase() !== "standard" &&
											v.toLowerCase() !== "one size",
									);

									return (
										<div
											key={item.pkOrderItemId ?? i}
											className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-3.5 last:border-0"
										>
											<div className="min-w-0">
												<p className="font-bold uppercase text-sm text-[#141414]">
													{item.productName ||
														item.name}
												</p>
												<p className="text-xs text-neutral-600 mt-0.5">
													{variantParts.length > 0
														? variantParts.join(
																" / ",
															)
														: "Standard"}
												</p>
												<p className="text-xs text-neutral-500 mt-0.5">
													{item.quantity} &times;{" "}
													{formatPrice(unitPrice)}
												</p>
											</div>
											<span className="font-bold text-sm whitespace-nowrap text-[#141414]">
												{formatPrice(lineTotal)}
											</span>
										</div>
									);
								})
							) : (
								<div className="py-4 text-center space-y-2">
									<p className="text-sm font-bold uppercase text-[#141414]">
										{order.itemCount}{" "}
										{order.itemCount === 1
											? "Item"
											: "Items"}{" "}
										in this drop
									</p>
									<p className="text-xs text-neutral-600">
										Sign in to the account that placed this
										order (or update the tracking endpoint)
										to view individual item breakdowns.
									</p>
								</div>
							)}
						</div>

						<div className="mt-4 pt-4 border-t-2 border-dashed border-[#141414] space-y-1.5 text-xs shrink-0">
							<div className="flex justify-between">
								<span>Subtotal</span>
								<span>{formatPrice(order.subtotal)}</span>
							</div>
							{order.discountAmount > 0 && (
								<div className="flex justify-between text-[#e50914]">
									<span>Discount</span>
									<span>
										-{formatPrice(order.discountAmount)}
									</span>
								</div>
							)}
							<div className="flex justify-between">
								<span>Shipping</span>
								<span>{formatPrice(order.shippingFee)}</span>
							</div>
							<div className="flex justify-between items-baseline pt-2 border-t border-neutral-300 font-display text-lg font-black uppercase">
								<span>Total</span>
								<span>{formatPrice(order.totalAmount)}</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
