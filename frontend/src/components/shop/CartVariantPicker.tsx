/* eslint-disable react-hooks/set-state-in-effect */
import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import type { CartLine, VariantChange } from "../../api/cart";
import { getItem, type ItemDetail } from "../../api/items";

const PANEL_WIDTH = 288;
const VIEWPORT_GAP = 12;

type Position = {
	left: number;
	width: number;
	top?: number;
	bottom?: number;
	maxHeight: number;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type CartVariantPickerProps = {
	line: CartLine;
	/** True while a cart change is in flight. Options can't be clicked until it's done. */
	disabled?: boolean;
	/** Applies the change. Resolves to false if it failed (the cart shows the error). */
	onChange: (change: VariantChange) => Promise<boolean>;
};

const sameText = (a: string | null | undefined, b: string | null | undefined) =>
	(a ?? "").toLowerCase() === (b ?? "").toLowerCase();

const sectionLabel =
	"mb-2 font-display text-[11px] font-extrabold uppercase tracking-wide text-white/70 [font-stretch:125%]";

/**
 * The "Standard, S" tag on a cart line. Click it to open a panel where the shopper can
 * switch the size or color of that line. A pick applies right away; the panel stays open
 * so both can be changed, and closes on Done, Escape or a click outside.
 *
 * The panel is portaled to <body> and positioned from the tag, so the scrolling item
 * list can't clip it.
 */
export default function CartVariantPicker({
	line,
	disabled = false,
	onChange,
}: CartVariantPickerProps) {
	const [open, setOpen] = useState(false);
	const [item, setItem] = useState<ItemDetail | null>(null);
	const [loadState, setLoadState] = useState<LoadState>("idle");
	const [pos, setPos] = useState<Position | null>(null);

	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const panelId = useId();

	const label = [line.color, line.size].filter(Boolean).join(", ");

	const close = useCallback((returnFocus = false) => {
		setOpen(false);
		if (returnFocus) triggerRef.current?.focus();
	}, []);

	// Fetch this product's sizes and colors whenever the panel opens.
	// Anything loaded before stays visible while it refreshes.
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setLoadState((s) => (s === "ready" ? s : "loading"));
		getItem(line.productId)
			.then((found) => {
				if (cancelled) return;
				setItem(found);
				setLoadState(found ? "ready" : "error");
			})
			.catch(() => {
				if (!cancelled)
					setLoadState((s) => (s === "ready" ? s : "error"));
			});
		return () => {
			cancelled = true;
		};
	}, [open, line.productId]);

	/** Sit under the tag, or above it if there's no room below. */
	const place = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const width = Math.min(
			PANEL_WIDTH,
			window.innerWidth - VIEWPORT_GAP * 2,
		);
		const left = Math.max(
			VIEWPORT_GAP,
			Math.min(rect.left, window.innerWidth - width - VIEWPORT_GAP),
		);
		const panelHeight = panelRef.current?.offsetHeight ?? 260;
		const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
		const spaceAbove = rect.top - VIEWPORT_GAP;
		const flip = spaceBelow < panelHeight && spaceAbove > spaceBelow;
		setPos(
			flip
				? {
						left,
						width,
						bottom: window.innerHeight - rect.top + 8,
						maxHeight: spaceAbove - 8,
					}
				: {
						left,
						width,
						top: rect.bottom + 8,
						maxHeight: spaceBelow - 8,
					},
		);
	}, []);

	// Re-place when opening and when the content changes size (loading -> options)
	useLayoutEffect(() => {
		if (open) place();
	}, [open, loadState, item, place]);

	// Follow the tag while the list scrolls or the window resizes
	useEffect(() => {
		if (!open) return;
		window.addEventListener("resize", place);
		window.addEventListener("scroll", place, true);
		return () => {
			window.removeEventListener("resize", place);
			window.removeEventListener("scroll", place, true);
		};
	}, [open, place]);

	// Click outside closes. Escape closes just the panel (not the whole drawer).
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node;
			if (panelRef.current?.contains(target)) return;
			if (triggerRef.current?.contains(target)) return;
			close();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			// capture phase on window: runs before the drawer's own Escape handler
			e.stopPropagation();
			close(true);
		};
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("keydown", onKey, true);
		};
	}, [open, close]);

	// Move focus into the panel when it opens, onto the selected size if there is one
	useEffect(() => {
		if (!open || loadState !== "ready") return;
		const panel = panelRef.current;
		if (!panel || panel.contains(document.activeElement)) return;
		const target =
			panel.querySelector<HTMLElement>('[aria-checked="true"]') ??
			panel.querySelector<HTMLElement>("button:not(:disabled)");
		target?.focus();
	}, [open, loadState]);

	const pick = (change: VariantChange) => {
		if (disabled) return;
		void onChange(change);
	};

	const sizes = item?.sizes ?? [];
	const colors = item?.colors ?? [];
	const showSizes = sizes.length > 1;
	const showColors = colors.length > 1;

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => (open ? close() : setOpen(true))}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				aria-label={`Change options for ${line.name}${label ? `, currently ${label}` : ""}`}
				className={[
					"mt-1.5 inline-flex w-fit max-w-full cursor-pointer items-center gap-1 py-0.5 pl-2 pr-1 text-[11px] font-bold transition-colors",
					"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
					open
						? "bg-brand-red-dark text-white"
						: "bg-white text-black hover:bg-neutral-300",
				].join(" ")}
			>
				<span className="truncate">{label || "Select options"}</span>
				<ChevronDown
					size={14}
					strokeWidth={3}
					aria-hidden="true"
					className={[
						"shrink-0 transition-transform duration-200 motion-reduce:transition-none",
						open ? "rotate-180" : "",
					].join(" ")}
				/>
			</button>

			{open &&
				createPortal(
					<div
						ref={panelRef}
						id={panelId}
						role="dialog"
						aria-label={`Options for ${line.name}`}
						style={
							pos
								? {
										left: pos.left,
										width: pos.width,
										top: pos.top,
										bottom: pos.bottom,
										maxHeight: pos.maxHeight,
									}
								: { visibility: "hidden" }
						}
						className="fixed z-[60] flex origin-top animate-cart-fade-in flex-col overflow-y-auto border-[3px] border-white bg-black p-4 text-white shadow-[6px_6px_0_var(--color-brand-red-dark)] motion-reduce:animate-none"
					>
						<p className="mb-3 truncate font-display text-sm font-black uppercase [font-stretch:125%]">
							{line.name}
						</p>

						{loadState === "loading" && (
							<p
								role="status"
								className="py-6 text-center font-display text-xs font-bold uppercase tracking-wide text-white/70"
							>
								Loading options…
							</p>
						)}

						{loadState === "error" && (
							<p
								role="alert"
								className="py-6 text-center text-xs font-bold text-white/80"
							>
								Couldn’t load the options for this item.
							</p>
						)}

						{loadState === "ready" && (
							<div className="space-y-4">
								{showSizes && (
									<div>
										<p
											id={`${panelId}-size`}
											className={sectionLabel}
										>
											Size
										</p>
										<div
											role="radiogroup"
											aria-labelledby={`${panelId}-size`}
											className="flex flex-wrap gap-2"
										>
											{sizes.map((size) => {
												const selected = sameText(
													size.label,
													line.size,
												);
												return (
													<button
														key={size.label}
														type="button"
														role="radio"
														aria-checked={selected}
														disabled={
															disabled ||
															(!size.available &&
																!selected)
														}
														title={
															size.available
																? undefined
																: "Out of stock"
														}
														onClick={() =>
															!selected &&
															pick({
																size: size.label,
															})
														}
														className={[
															"grid h-10 min-w-12 cursor-pointer place-items-center border-2 px-3 font-display text-sm font-extrabold uppercase transition",
															"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
															"disabled:cursor-not-allowed",
															selected
																? "border-brand-red-dark bg-brand-red-dark text-white"
																: size.available
																	? "border-white/40 text-white enabled:hover:border-white enabled:hover:bg-white enabled:hover:text-black"
																	: "border-white/20 text-white/30 line-through",
														].join(" ")}
													>
														{size.label}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{showColors && (
									<div>
										<p
											id={`${panelId}-color`}
											className={sectionLabel}
										>
											Color
										</p>
										<div
											role="radiogroup"
											aria-labelledby={`${panelId}-color`}
											className="flex flex-wrap gap-2"
										>
											{colors.map((color) => {
												const selected = sameText(
													color.name,
													line.color,
												);
												return (
													<button
														key={color.name}
														type="button"
														role="radio"
														aria-checked={selected}
														disabled={disabled}
														onClick={() =>
															!selected &&
															pick({
																color: color.name,
															})
														}
														className={[
															"flex cursor-pointer items-center gap-2 border-2 py-1.5 pl-1.5 pr-3 text-xs font-bold transition",
															"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
															"disabled:cursor-not-allowed",
															selected
																? "border-brand-red-dark bg-brand-red-dark text-white"
																: "border-white/40 text-white enabled:hover:border-white",
														].join(" ")}
													>
														<span
															aria-hidden="true"
															style={{
																backgroundColor:
																	color.hex,
															}}
															className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-white/60"
														>
															{selected && (
																<Check
																	size={11}
																	strokeWidth={
																		4
																	}
																	className="text-white mix-blend-difference"
																/>
															)}
														</span>
														{color.name}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{!showSizes && !showColors && (
									<p className="py-4 text-center text-xs font-bold text-white/70">
										This item only comes in one option.
									</p>
								)}
							</div>
						)}

						<button
							type="button"
							onClick={() => close(true)}
							className="mt-4 w-full cursor-pointer bg-white py-2 font-display text-xs font-black uppercase tracking-wide text-black transition hover:bg-neutral-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [font-stretch:125%]"
						>
							Done
						</button>
					</div>,
					document.body,
				)}
		</>
	);
}
