import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { CartLine } from "../../api/cart";
import { useCart } from "../../context/cartContext";
import { formatPrice } from "../../helpers/priceFormat";
import { itemPath, ROUTES } from "../../routes";
import ShopButton from "../ui/ShopButton";
import CartVariantPicker from "./CartVariantPicker";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import headerBox from "../../assets/cart_header_container.svg";
import starBg from "../../assets/snugrebel_star_bg.png";
import checkoutState0 from "../../assets/checkout_button_container_state0.svg";
import checkoutState1 from "../../assets/checkout_button_container_state1.svg";
import closeState0 from "../../assets/cart_x_button_container_state0.svg";
import closeState1 from "../../assets/cart_x_button_container_state1.svg";

/**
 * How long the slide-out takes before the drawer unmounts.
 * Keep in sync with --animate-cart-out in index.css.
 */
const CLOSE_MS = 250;

/**
 * Where "YOUR BAG" sits inside cart_header_container.svg, as % of the image.
 * The text is centered inside this box, so move the box to move the text:
 *   - too far right? raise `right` (or lower `left`)
 *   - too low?       raise `bottom` (or lower `top`)
 * fontCqw is the font size as a % of the header's width.
 */
const HEADER_TEXT = { top: 12, right: 14, bottom: 0, left: 22, fontCqw: 10 };

/**
 * Two stacked images that cross-fade (instead of popping) when the parent `group` is
 * hovered or focused. The resting image sets the box size, the other one overlays it.
 */
function FadeSwap({
	rest,
	active,
	restClassName = "",
}: {
	rest: string;
	active: string;
	restClassName?: string;
}) {
	return (
		<>
			<img
				src={rest}
				alt=""
				draggable={false}
				className={[
					"transition-opacity duration-200 ease-out group-hover:opacity-0 group-focus-visible:opacity-0",
					restClassName,
				].join(" ")}
			/>
			<img
				src={active}
				alt=""
				draggable={false}
				className="absolute inset-0 size-full object-contain opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
			/>
		</>
	);
}

const stepperButton =
	"grid size-6 cursor-pointer place-items-center bg-brand-red-dark text-white transition " +
	"hover:bg-brand-red active:scale-90 disabled:cursor-not-allowed disabled:opacity-40";

export default function CartDrawer() {
	const {
		lines,
		itemCount,
		subtotal,
		status,
		error,
		busy,
		isOpen,
		closeCart,
		setQuantity,
		changeVariant,
		removeLine,
		dismissError,
	} = useCart();

	// The line the shopper is being asked to confirm deleting (null = no dialog)
	const [pendingLine, setPendingLine] = useState<CartLine | null>(null);
	// True while the drawer is sliding back out
	const [closing, setClosing] = useState(false);
	const closeTimer = useRef<number | null>(null);

	// If the cart gets closed from somewhere else, don't leave a dialog waiting for next time
	const [wasOpen, setWasOpen] = useState(isOpen);
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		if (!isOpen) setPendingLine(null);
	}

	/** Slide out, then actually close. Use this for every way of closing the drawer. */
	const requestClose = useCallback(() => {
		if (closeTimer.current !== null) return;
		setClosing(true);
		closeTimer.current = window.setTimeout(() => {
			closeTimer.current = null;
			closeCart();
			setClosing(false);
			setPendingLine(null);
		}, CLOSE_MS);
	}, [closeCart]);

	useEffect(
		() => () => {
			if (closeTimer.current !== null)
				window.clearTimeout(closeTimer.current);
		},
		[],
	);

	// Close on Escape. While the confirm dialog is open, Escape only closes the dialog.
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !pendingLine) requestClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isOpen, requestClose, pendingLine]);

	if (!isOpen) return null;

	const confirmDelete = async () => {
		const line = pendingLine;
		setPendingLine(null);
		if (line) await removeLine(line.id);
	};

	return (
		<div
			className={[
				"fixed inset-0 z-50 flex justify-end",
				closing ? "pointer-events-none" : "",
			].join(" ")}
		>
			{/* Dimmed backdrop (fades), click to close */}
			<div
				onClick={requestClose}
				aria-hidden="true"
				className={[
					"absolute inset-0 bg-black/60 backdrop-blur-xs motion-reduce:animate-none",
					closing ? "animate-cart-fade-out" : "animate-cart-fade-in",
				].join(" ")}
			/>

			<aside
				aria-label="Shopping bag"
				className={[
					"relative z-10 flex h-full w-full max-w-xl flex-col border-l-4 border-black bg-[#19191c] bg-cover bg-center text-white shadow-2xl motion-reduce:animate-none",
					closing ? "animate-cart-out" : "animate-cart-in",
				].join(" ")}
				style={{ backgroundImage: `url(${starBg})` }}
			>
				{/* Close button: the two SVG states cross-fade; they already contain the X */}
				<button
					type="button"
					onClick={requestClose}
					aria-label="Close bag"
					className="group absolute right-4 top-4 z-20 block w-12 cursor-pointer transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-white"
				>
					<FadeSwap
						rest={closeState0}
						active={closeState1}
						restClassName="block h-auto w-full"
					/>
				</button>

				{/* Header */}
				<header className="px-6 pb-2 pt-20">
					<div
						className="relative mx-auto w-[min(100%,400px)] -translate-x-3"
						style={{ containerType: "inline-size" }}
					>
						<img
							src={headerBox}
							alt=""
							draggable={false}
							className="block h-auto w-full select-none"
						/>
						<h2
							className="absolute flex items-center justify-center whitespace-nowrap font-display font-black uppercase leading-none tracking-tight text-white [font-stretch:125%]"
							style={{
								top: `${HEADER_TEXT.top}%`,
								right: `${HEADER_TEXT.right}%`,
								bottom: `${HEADER_TEXT.bottom}%`,
								left: `${HEADER_TEXT.left}%`,
								fontSize: `${HEADER_TEXT.fontCqw}cqw`,
							}}
						>
							Your Bag
							<span className="sr-only">
								{" "}
								({itemCount} items)
							</span>
						</h2>
					</div>
				</header>

				{/* Error Banner */}
				{error && (
					<div
						role="alert"
						className="mx-6 mt-3 flex items-center justify-between border-2 border-white bg-brand-red-dark px-4 py-3 text-xs font-bold text-white"
					>
						<span>{error}</span>
						<button
							type="button"
							onClick={dismissError}
							aria-label="Dismiss error"
							className="ml-3 cursor-pointer underline"
						>
							Dismiss
						</button>
					</div>
				)}

				{/* Items List */}
				<div className="flex-1 overflow-y-auto px-6 py-5">
					{status === "loading" ? (
						<p className="py-12 text-center font-display text-lg font-bold">
							Loading your bag…
						</p>
					) : lines.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center gap-12 text-center">
							<p className="text-xl">Your bag is empty</p>
							<ShopButton to={ROUTES.shop} onClick={requestClose}>
								Shop
							</ShopButton>
						</div>
					) : (
						<ul className="space-y-4">
							{lines.map((line) => {
								const to = itemPath(
									line.productId || line.variantId,
								);

								return (
									<li
										key={line.id}
										className="border-[6px] border-white bg-black p-3"
									>
										<div className="flex gap-3">
											<Link
												to={to}
												onClick={requestClose}
												className="size-24 shrink-0 overflow-hidden bg-neutral-300"
											>
												{line.imageUrl && (
													<img
														src={line.imageUrl}
														alt={line.name}
														className="size-full object-cover"
													/>
												)}
											</Link>

											<div className="flex min-w-0 flex-1 flex-col">
												<div className="flex items-start justify-between gap-2">
													<Link
														to={to}
														onClick={requestClose}
														className="font-display text-lg font-black uppercase leading-tight hover:underline [font-stretch:125%]"
													>
														{line.name}
													</Link>
													<button
														type="button"
														disabled={busy}
														onClick={() =>
															setPendingLine(line)
														}
														aria-label={`Remove ${line.name}`}
														className="shrink-0 cursor-pointer text-brand-red transition hover:scale-125 active:scale-90 disabled:opacity-40"
													>
														<Trash2
															size={18}
															strokeWidth={2.25}
														/>
													</button>
												</div>

												<CartVariantPicker
													line={line}
													disabled={busy}
													onChange={(change) =>
														changeVariant(
															line.id,
															change,
														)
													}
												/>

												<div className="mt-auto flex items-end justify-between gap-2 pt-2">
													<span className="font-display text-lg font-black [font-stretch:125%]">
														{formatPrice(
															line.unitPrice *
																line.quantity,
														)}
													</span>

													<div className="flex items-center gap-1.5">
														<button
															type="button"
															disabled={busy}
															onClick={() =>
																// at 1, "-" means delete, so confirm first
																line.quantity <=
																1
																	? setPendingLine(
																			line,
																		)
																	: void setQuantity(
																			line.id,
																			line.quantity -
																				1,
																		)
															}
															aria-label="Decrease quantity"
															className={
																stepperButton
															}
														>
															<Minus
																size={12}
																strokeWidth={3}
															/>
														</button>
														<span className="grid h-7 w-10 place-items-center border border-brand-red font-display text-sm font-extrabold">
															{line.quantity}
														</span>
														<button
															type="button"
															disabled={
																busy ||
																line.quantity >=
																	line.stock
															}
															onClick={() =>
																void setQuantity(
																	line.id,
																	line.quantity +
																		1,
																)
															}
															aria-label="Increase quantity"
															className={
																stepperButton
															}
														>
															<Plus
																size={12}
																strokeWidth={3}
															/>
														</button>
													</div>
												</div>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				{/* Footer */}
				{lines.length > 0 && (
					<div className="flex items-center justify-between gap-3 px-6 pb-8 pt-4">
						<div>
							<p className="font-display text-xs font-extrabold uppercase tracking-wide [font-stretch:125%]">
								Subtotal
							</p>
							<p className="font-display text-2xl font-black [font-stretch:125%]">
								{formatPrice(subtotal)}
							</p>
						</div>

						{/* Checkout: the two SVG states already contain the "Check out" text and its tilt.
						    They cross-fade on hover; the whole button presses down on click. */}
						<button
							type="button"
							disabled={busy}
							onClick={() => {
								requestClose();
								// Navigate to checkout when route is ready
							}}
							aria-label="Check out"
							className="group relative h-20 w-56 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							<div className="absolute inset-0 transition-transform duration-150 group-active:-rotate-2 group-active:scale-95">
								<FadeSwap
									rest={checkoutState0}
									active={checkoutState1}
									restClassName="absolute inset-0 size-full object-contain"
								/>
							</div>
						</button>
					</div>
				)}
			</aside>

			{pendingLine && (
				<ConfirmDeleteDialog
					itemName={pendingLine.name}
					onConfirm={() => void confirmDelete()}
					onCancel={() => setPendingLine(null)}
				/>
			)}
		</div>
	);
}
