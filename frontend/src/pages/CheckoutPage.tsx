/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import checkoutHeaderSvg from "../assets/checkout_page_header.svg";
import redStarGraphicSvg from "../assets/checkout_redstar_graphic.svg";
import orderNoContainerSvg from "../assets/checkout_orderno_container.svg";
import AngledButton from "../components/ui/AngledButton";
import { useCart } from "../context/cartContext";
import type { CartLine } from "../api/cart.types";
import { useAuth } from '../context/authContext';
import {
	fetchBarangaysByCity,
	fetchCitiesByProvince,
	fetchProvinces,
	type PsgcOption,
} from "../api/psgc";
import {
	COURIER_OPTIONS,
	type AppliedVoucher,
	type CheckoutFormValues,
	type ConfirmedOrder,
	type CourierId,
	type PaymentOptionId,
} from "../api/checkout.types";
import { submitCheckoutOrder, validateVoucherCode } from "../api/checkout";
import { formatPrice } from "../helpers/priceFormat";
import { ROUTES } from "../routes";

type ValidationErrors = Partial<Record<keyof CheckoutFormValues, string>>;

const SHIPPING_DISCOUNT = 60;

const CLIP_CARD =
	"polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)";

function formatShortDate(date: Date): string {
	return date
		.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		})
		.toUpperCase();
}

function formatPeso(amount: number): string {
	return `₱${amount.toLocaleString("en-PH", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatDeliveryRange(
	placedIso: string,
	minDays: number,
	maxDays: number,
): string {
	const base = new Date(placedIso);
	const start = new Date(base);
	start.setDate(base.getDate() + minDays);
	const end = new Date(base);
	end.setDate(base.getDate() + maxDays);

	const startDay = start.toLocaleDateString("en-US", { weekday: "short" });
	const endDay = end.toLocaleDateString("en-US", { weekday: "short" });
	const startNum = start.getDate();
	const endNum = end.getDate();
	const month = end.toLocaleDateString("en-US", { month: "short" });

	return `${startDay} ${startNum} - ${endDay} ${endNum} ${month}`;
}

export default function CheckoutPage() {
    const { status } = useAuth();
    if (status === 'loading') return <div className="p-8 font-display" role="status">Checking your session…</div>;
    if (status === 'error') return <p className="p-8 font-display">Reconnect to continue checking out.</p>;
    return <CheckoutForm />;
}

function CheckoutForm() {
	const navigate = useNavigate();
	const location = useLocation();
	const { lines, subtotal: cartSubtotal, openCart, clear, owner, busy: cartBusy } = useCart();
    const { user } = useAuth();

	// Support "Buy Now" single-item checkout via router state
	const buyNowItems = (location.state as { buyNowItems?: CartLine[] } | null)
		?.buyNowItems;

	const checkoutItems: CartLine[] = buyNowItems ?? lines;
	const activeSubtotal: number = buyNowItems
		? buyNowItems.reduce(
				(sum: number, item: CartLine) =>
					sum + item.unitPrice * item.quantity,
				0,
			)
		: cartSubtotal;

	// PSGC Cloud API state
	const [provinces, setProvinces] = useState<PsgcOption[]>([]);
	const [cities, setCities] = useState<PsgcOption[]>([]);
	const [barangays, setBarangays] = useState<PsgcOption[]>([]);
	const [loadingProvinces, setLoadingProvinces] = useState(false);
	const [loadingCities, setLoadingCities] = useState(false);
	const [loadingBarangays, setLoadingBarangays] = useState(false);

	// Form state
	const [values, setValues] = useState<CheckoutFormValues>({
		firstName: user?.firstName ?? "",
		lastName: user?.lastName ?? "",
		email: user?.userEmail ?? "",
		mobileNumber: user?.phoneNumber ?? "",
		line1: "",
		provinceCode: "",
		provinceName: "",
		cityCode: "",
		cityName: "",
		barangayCode: "",
		barangayName: "",
		postalCode: "",
		landmarkNotes: "",
		courierId: "jnt",
		paymentMethod: "cod",
		cashReadyOption: "exact",
		voucherCode: "",
		agreedToTerms: false,
	});

	const [customCashAmount, setCustomCashAmount] = useState("");
	const [errors, setErrors] = useState<ValidationErrors>({});
	const [touched, setTouched] = useState<
		Partial<Record<keyof CheckoutFormValues, boolean>>
	>({});
	const [voucher, setVoucher] = useState<AppliedVoucher | null>(null);
	const [voucherError, setVoucherError] = useState<string | null>(null);
	const [applyingVoucher, setApplyingVoucher] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(
		null,
	);

	// Load Provinces on mount
	useEffect(() => {
		let active = true;
		setLoadingProvinces(true);
		fetchProvinces()
			.then((list) => {
				if (active) setProvinces(list);
			})
			.catch((err) => console.error(err))
			.finally(() => {
				if (active) setLoadingProvinces(false);
			});
		return () => {
			active = false;
		};
	}, []);

	// Load Cities when Province changes
	useEffect(() => {
		if (!values.provinceCode) {
			setCities([]);
			return;
		}
		let active = true;
		setLoadingCities(true);
		fetchCitiesByProvince(values.provinceCode)
			.then((list) => {
				if (active) setCities(list);
			})
			.catch((err) => console.error(err))
			.finally(() => {
				if (active) setLoadingCities(false);
			});
		return () => {
			active = false;
		};
	}, [values.provinceCode]);

	// Load Barangays when City changes
	useEffect(() => {
		if (!values.cityCode) {
			setBarangays([]);
			return;
		}
		let active = true;
		setLoadingBarangays(true);
		fetchBarangaysByCity(values.cityCode)
			.then((list) => {
				if (active) setBarangays(list);
			})
			.catch((err) => console.error(err))
			.finally(() => {
				if (active) setLoadingBarangays(false);
			});
		return () => {
			active = false;
		};
	}, [values.cityCode]);

	const selectedCourier = useMemo(
		() =>
			COURIER_OPTIONS.find((c) => c.id === values.courierId) ??
			COURIER_OPTIONS[0],
		[values.courierId],
	);

	const shippingDiscount = checkoutItems.length > 0 ? SHIPPING_DISCOUNT : 0;
	const voucherDiscount = voucher?.discountAmount ?? 0;
	const finalTotal = Math.max(
		0,
		activeSubtotal +
			Math.max(0, selectedCourier.fee - shippingDiscount) -
			voucherDiscount,
	);

	const cashReadyChoices = useMemo(() => {
		const list = [
			{ id: "exact", label: `Exact amount - ${formatPrice(finalTotal)}` },
		];
		list.push({ id: "custom", label: "Change for..." });
		return list;
	}, [finalTotal]);

	function validateField(
		field: keyof CheckoutFormValues,
		val: CheckoutFormValues[keyof CheckoutFormValues],
	): string | undefined {
		switch (field) {
			case "firstName":
				return String(val).trim().length < 2
					? "First name is required."
					: undefined;
			case "lastName":
				return String(val).trim().length < 2
					? "Last name is required."
					: undefined;
			case "email":
				return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())
					? undefined
					: "Enter a valid email address.";
			case "mobileNumber":
				return /^(\+?63|0)9\d{9}$/.test(
					String(val).replace(/[\s-]/g, ""),
				)
					? undefined
					: "Enter a valid PH mobile number (e.g. 09171234567).";
			case "line1":
				return String(val).trim().length < 4
					? "House No. / Street / Unit is required."
					: undefined;
			case "provinceCode":
				return !val ? "Select a province." : undefined;
			case "cityCode":
				return !val ? "Select a municipality or city." : undefined;
			case "barangayCode":
				return !val ? "Select a barangay." : undefined;
			case "postalCode":
				return /^\d{4}$/.test(String(val).trim())
					? undefined
					: "Enter a valid 4-digit PH postal code.";
			case "agreedToTerms":
				return val === true
					? undefined
					: "You must agree to the Terms and Return Policy.";
			default:
				return undefined;
		}
	}

	function validateAll(): ValidationErrors {
		const nextErrors: ValidationErrors = {};
		(Object.keys(values) as Array<keyof CheckoutFormValues>).forEach(
			(key) => {
				const msg = validateField(key, values[key]);
				if (msg) nextErrors[key] = msg;
			},
		);
		return nextErrors;
	}

	function updateField<K extends keyof CheckoutFormValues>(
		field: K,
		value: CheckoutFormValues[K],
	) {
		setValues((prev) => ({ ...prev, [field]: value }));
		if (touched[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: validateField(field, value),
			}));
		}
	}

	function handleBlur(field: keyof CheckoutFormValues) {
		setTouched((prev) => ({ ...prev, [field]: true }));
		setErrors((prev) => ({
			...prev,
			[field]: validateField(field, values[field]),
		}));
	}

	async function handleApplyVoucher() {
		setVoucherError(null);
		if (!values.voucherCode.trim()) {
			setVoucher(null);
			return;
		}
		setApplyingVoucher(true);
		try {
			const applied = await validateVoucherCode(
				values.voucherCode,
				activeSubtotal,
			);
			setVoucher(applied);
		} catch (err) {
			setVoucher(null);
			setVoucherError(
				err instanceof Error ? err.message : "Invalid voucher code.",
			);
		} finally {
			setApplyingVoucher(false);
		}
	}

	async function handlePlaceOrder(e: React.FormEvent) {
		e.preventDefault();
		setSubmitError(null);
        if (cartBusy) return;

		if (checkoutItems.length === 0) {
			setSubmitError("Your bag is empty. Add items before checking out.");
			return;
		}

		const validation = validateAll();
		setErrors(validation);
		setTouched({
			firstName: true,
			lastName: true,
			email: true,
			mobileNumber: true,
			line1: true,
			provinceCode: true,
			cityCode: true,
			barangayCode: true,
			postalCode: true,
			agreedToTerms: true,
		});

		if (Object.keys(validation).length > 0) {
			return;
		}

		setSubmitting(true);
		try {
			let cashLabel = "";
			if (values.paymentMethod === "cod") {
				if (values.cashReadyOption === "custom") {
					cashLabel = `Custom amount - ${formatPrice(Number(customCashAmount) || finalTotal)}`;
				} else {
					cashLabel =
						cashReadyChoices.find(
							(c) => c.id === values.cashReadyOption,
						)?.label ?? cashReadyChoices[0].label;
				}
			} else {
				cashLabel = "E-Wallet on Arrival (Disregarded)";
			}

			const confirmed = await submitCheckoutOrder({
				owner,
				isBuyNow: Boolean(buyNowItems),
				items: checkoutItems,
				subtotal: activeSubtotal,
				shippingDiscount,
				voucher,
				values: { ...values, cashReadyOption: cashLabel },
			});

			setConfirmedOrder(confirmed);
			if (!buyNowItems) {
				await clear();
			}
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (err) {
			setSubmitError(
				err instanceof Error
					? err.message
					: "Failed to place order. Please try again.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	// =========================================================================
	// ORDER CONFIRMATION VIEW
	// =========================================================================
	if (confirmedOrder) {
		const deliveryWindow = formatDeliveryRange(
			confirmedOrder.placedAt,
			confirmedOrder.courier.daysMin,
			confirmedOrder.courier.daysMax,
		);
		const totalItemCount = confirmedOrder.items.reduce(
			(sum: number, i: CartLine) => sum + i.quantity,
			0,
		);

		return (
			<div className="min-h-[calc(100vh-5rem)] bg-white text-[#141414] pb-20">
				<div className="mx-auto max-w-[1760px] px-6 sm:px-10 lg:px-[4.6vw] pt-8">
					<div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
						<div>
							<h1
								className="font-display text-[clamp(3.5rem,6.7vw,8.5rem)] leading-[0.95] font-black uppercase tracking-tight text-[#d71920]"
								style={{
									WebkitTextStroke: "2px #141414",
									textShadow: "4px 4px 0 #141414",
								}}
							>
								YOU’RE IN!
							</h1>
							<p className="mt-2 font-display text-[clamp(1.1rem,1.9vw,2.4rem)] font-extrabold uppercase tracking-wide text-[#141414]">
								ORDER CONFIRMED – THANKS, REBEL!
							</p>
						</div>

						<div className="relative w-72 sm:w-80 lg:w-[26vw] lg:max-w-[30rem] shrink-0 select-none self-start md:self-auto [container-type:inline-size]">
							<img
								src={orderNoContainerSvg}
								alt="Order Number Container"
								className="w-full h-auto block pointer-events-none"
							/>
							<span className="absolute left-[9%] bottom-[13%] origin-left whitespace-nowrap font-display text-[4.8cqw] font-black tracking-tight text-white -rotate-3">
								{confirmedOrder.orderNumber}
							</span>
						</div>
					</div>

					<div className="mx-auto mt-10 lg:mt-14 grid max-w-[1180px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)] lg:gap-x-11 items-start">
						<div className="w-full">
							<div className="w-full bg-[#f5f3ec] border border-[#141414] p-7 font-mono text-[#141414]">
								<div className="flex items-baseline gap-3 pb-4 border-b-2 border-dashed border-[#141414]">
									<h2 className="font-display text-2xl font-black uppercase tracking-tight">
										YOUR DROP
									</h2>
									<span className="text-xs text-neutral-600">
										{formatShortDate(
											new Date(confirmedOrder.placedAt),
										)}
									</span>
								</div>

								<div className="my-5 max-h-72 overflow-y-auto pr-1 space-y-4">
									{confirmedOrder.items.map(
										(item: CartLine) => (
											<div
												key={item.id}
												className="flex items-start justify-between gap-3 text-sm"
											>
												<div className="flex items-start gap-3 min-w-0">
													<img
														src={
															item.imageUrl ??
															undefined
														}
														alt={item.name}
														className="h-14 w-14 shrink-0 object-cover border border-[#141414] bg-neutral-900"
													/>
													<div className="min-w-0">
														<p className="font-bold uppercase truncate">
															{item.name}
														</p>
														<p className="text-neutral-600 text-xs">
															{item.color} /{" "}
															{item.size}
														</p>
													</div>
												</div>
												<span className="shrink-0 font-semibold whitespace-nowrap">
													{item.quantity} ×{" "}
													{item.unitPrice.toLocaleString(
														"en-PH",
														{
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														},
													)}
												</span>
											</div>
										),
									)}
								</div>

								<div className="border-t-2 border-dashed border-[#141414] pt-5 space-y-2.5 text-sm">
									<div className="flex justify-between">
										<span>
											Subtotal ({totalItemCount} items)
										</span>
										<span>
											{formatPeso(
												confirmedOrder.subtotal,
											)}
										</span>
									</div>
									<div className="flex justify-between">
										<span>
											Courier:{" "}
											{confirmedOrder.courier.name}
										</span>
										<span>
											{formatPeso(
												confirmedOrder.courier.fee,
											)}
										</span>
									</div>
									{confirmedOrder.shippingDiscount > 0 && (
										<div className="flex justify-between">
											<span>Shipping discount</span>
											<span>
												-
												{formatPeso(
													confirmedOrder.shippingDiscount,
												)}
											</span>
										</div>
									)}
									{confirmedOrder.voucher && (
										<div className="flex justify-between">
											<span>
												Voucher{" "}
												{confirmedOrder.voucher.code}
											</span>
											<span>
												-
												{formatPeso(
													confirmedOrder.voucher
														.discountAmount,
												)}
											</span>
										</div>
									)}
								</div>

								<div className="mt-5 border-t-2 border-dashed border-[#141414] pt-5">
									<div className="flex items-baseline justify-between">
										<span className="font-display text-3xl font-black uppercase">
											TOTAL
										</span>
										<span className="font-display text-4xl font-black">
											{formatPeso(
												confirmedOrder.totalAmount,
											)}
										</span>
									</div>
									<p className="mt-3 text-xs text-neutral-600">
										{confirmedOrder.paymentMethod === "cod"
											? "Pay in cash to the rider on delivery."
											: "Pay the rider by GCash or Maya QR at your door."}
									</p>
								</div>
							</div>
							<div className="mx-1 h-2 border-b-2 border-dashed border-neutral-300" />
						</div>

						<div className="space-y-6">
							<div
								className="border-l-4 border-[#e50914] bg-[#141414] text-white p-7"
								style={{ clipPath: CLIP_CARD }}
							>
								<div className="flex items-center gap-3">
									<span className="inline-flex h-7 w-9 items-center justify-center bg-[#e50914] text-sm font-black">
										→
									</span>
									<h3 className="font-display text-xl font-black uppercase tracking-wide">
										ESTIMATED DELIVERY
									</h3>
								</div>
								<p className="mt-3 font-display text-2xl font-extrabold">
									{deliveryWindow}
								</p>
								<p className="mt-1 font-mono text-xs text-neutral-300">
									via {confirmedOrder.courier.name}
								</p>
							</div>

							<div
								className="border-l-4 border-[#e50914] bg-[#141414] text-white p-7"
								style={{ clipPath: CLIP_CARD }}
							>
								<div className="flex items-center gap-3">
									<span className="inline-flex h-7 w-9 items-center justify-center bg-[#e50914] text-sm font-black">
										₱
									</span>
									<h3 className="font-display text-xl font-black uppercase tracking-wide">
										PAYMENT METHOD
									</h3>
								</div>
								<p className="mt-3 font-display text-2xl font-extrabold">
									{confirmedOrder.paymentMethod === "cod"
										? "Cash on Delivery"
										: "COD + E-Wallet on Arrival"}
								</p>
								<p className="mt-1 font-mono text-xs text-neutral-300">
									Have{" "}
									{formatPeso(confirmedOrder.totalAmount)}{" "}
									ready for the rider.
								</p>
							</div>

							<div
								className="border-l-4 border-[#e50914] bg-[#141414] text-white p-7"
								style={{ clipPath: CLIP_CARD }}
							>
								<div className="flex items-center gap-3">
									<span className="inline-flex h-7 w-9 items-center justify-center bg-[#e50914] text-sm font-black">
										›
									</span>
									<h3 className="font-display text-xl font-black uppercase tracking-wide">
										SHIPPING ADDRESS
									</h3>
								</div>
								<p className="mt-3 font-mono text-sm font-bold">
									{confirmedOrder.recipientName}
								</p>
								<p className="mt-2 font-mono text-xs leading-relaxed text-neutral-300">
									{confirmedOrder.addressLine},{" "}
									{confirmedOrder.barangay},
									<br />
									{confirmedOrder.city},{" "}
									{confirmedOrder.province}{" "}
									{confirmedOrder.postalCode}
									<br />
									{confirmedOrder.mobileNumber}
								</p>
							</div>
						</div>
					</div>

					<div className="mt-6 flex justify-end">
						<button
							type="button"
							onClick={() => navigate(ROUTES.shop)}
							className="bg-[#141414] px-16 py-4 font-display text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-[#e50914] cursor-pointer"
							style={{
								clipPath:
									"polygon(0 0, 100% 6%, 97% 100%, 3% 94%)",
							}}
						>
							KEEP SHOPPING
						</button>
					</div>
				</div>
			</div>
		);
	}

	// =========================================================================
	// MAIN CHECKOUT FORM VIEW
	// =========================================================================
	const totalItemsCount = checkoutItems.reduce(
		(sum: number, item: CartLine) => sum + item.quantity,
		0,
	);

	return (
		<div className="bg-white text-[#141414] pb-16 lg:pb-0 lg:h-[calc(100dvh-5rem)] lg:overflow-hidden">
			<div className="mx-auto flex h-full max-w-[1760px] flex-col px-4 sm:px-8 lg:px-12 pt-6">
				{/* Top-Left CHECKOUT SVG Header */}
				<div className="mb-6 shrink-0">
					<img
						src={checkoutHeaderSvg}
						alt="CHECKOUT"
						className="h-14 sm:h-16 w-auto select-none pointer-events-none"
					/>
                    {!user && <p className="mt-3 text-sm font-display">Have an account? <Link className="font-bold underline" to={`${ROUTES.signIn}?returnTo=${encodeURIComponent(ROUTES.checkout)}`} state={{ checkoutState: location.state }}>Sign in</Link> to save this order to your account, or continue as a guest.</p>}

				</div>

				<form
					onSubmit={handlePlaceOrder}
					noValidate
					style={
						{
							"--rw": "clamp(440px, 36vw, 640px)",
							"--gap": "5rem",
						} as CSSProperties
					}
					className="relative grid grid-cols-1 gap-10 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_var(--rw)] lg:gap-x-[var(--gap)]"
				>
					{/* Red star graphic */}
					<img
						src={redStarGraphicSvg}
						alt=""
						aria-hidden="true"
						className="pointer-events-none select-none hidden lg:block absolute top-1/2 z-30 h-[108%] w-auto max-w-none -translate-y-1/2 translate-x-1/2"
						style={{ right: "calc(var(--rw) + var(--gap) / 2)" }}
					/>

					{/* LEFT SIDE */}
					<div className="lg:h-full lg:overflow-y-auto lg:pr-4 lg:pb-20 space-y-6">
						{/* 01 INTEL */}
						<section
							className="bg-[#141414] text-white p-6 sm:p-8"
							style={{ clipPath: CLIP_CARD }}
						>
							<div className="flex items-center gap-3 mb-6">
								<span className="inline-flex h-8 w-10 items-center justify-center bg-[#e50914] font-display text-base font-black">
									01
								</span>
								<h2 className="font-display text-2xl font-black uppercase tracking-wide">
									INTEL
								</h2>
							</div>

							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
								{/* First Name */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										FIRST NAME
									</label>
									<input
										type="text"
										value={values.firstName}
										onChange={(e) =>
											updateField(
												"firstName",
												e.target.value,
											)
										}
										onBlur={() => handleBlur("firstName")}
										placeholder="Juan"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${
											errors.firstName
												? "w-full bg-red-500"
												: values.firstName
													? "w-2/3 bg-[#e50914]"
													: "w-1/3 bg-neutral-700"
										}`}
									/>
									{errors.firstName && (
										<p className="mt-1 font-mono text-[11px] text-red-400">
											{errors.firstName}
										</p>
									)}
								</div>

								{/* Last Name */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										LAST NAME
									</label>
									<input
										type="text"
										value={values.lastName}
										onChange={(e) =>
											updateField(
												"lastName",
												e.target.value,
											)
										}
										onBlur={() => handleBlur("lastName")}
										placeholder="Dela Cruz"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${
											errors.lastName
												? "w-full bg-red-500"
												: values.lastName
													? "w-2/3 bg-[#e50914]"
													: "w-1/3 bg-neutral-700"
										}`}
									/>
									{errors.lastName && (
										<p className="mt-1 font-mono text-[11px] text-red-400">
											{errors.lastName}
										</p>
									)}
								</div>

								{/* Email */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										EMAIL
									</label>
									<input
										type="email"
										value={values.email}
										onChange={(e) =>
											updateField("email", e.target.value)
										}
										onBlur={() => handleBlur("email")}
										placeholder="juan@example.com"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${
											errors.email
												? "w-full bg-red-500"
												: values.email
													? "w-2/3 bg-[#e50914]"
													: "w-1/3 bg-neutral-700"
										}`}
									/>
									{errors.email && (
										<p className="mt-1 font-mono text-[11px] text-red-400">
											{errors.email}
										</p>
									)}
								</div>

								{/* Mobile Number */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										MOBILE NUMBER
									</label>
									<input
										type="tel"
										value={values.mobileNumber}
										onChange={(e) =>
											updateField(
												"mobileNumber",
												e.target.value,
											)
										}
										onBlur={() =>
											handleBlur("mobileNumber")
										}
										placeholder="0917 123 4567"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${
											errors.mobileNumber
												? "w-full bg-red-500"
												: values.mobileNumber
													? "w-2/3 bg-[#e50914]"
													: "w-1/3 bg-neutral-700"
										}`}
									/>
									{errors.mobileNumber && (
										<p className="mt-1 font-mono text-[11px] text-red-400">
											{errors.mobileNumber}
										</p>
									)}
								</div>
							</div>
						</section>

						{/* 02 DROP ZONE */}
						<section
							className="bg-[#141414] text-white p-6 sm:p-8"
							style={{ clipPath: CLIP_CARD }}
						>
							<div className="flex items-center gap-3 mb-6">
								<span className="inline-flex h-8 w-10 items-center justify-center bg-[#e50914] font-display text-base font-black">
									02
								</span>
								<h2 className="font-display text-2xl font-black uppercase tracking-wide">
									DROP ZONE
								</h2>
							</div>

							<div className="space-y-6">
								{/* House No. / Street / Unit */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										HOUSE NO. / STREET / UNIT
									</label>
									<input
										type="text"
										value={values.line1}
										onChange={(e) =>
											updateField("line1", e.target.value)
										}
										onBlur={() => handleBlur("line1")}
										placeholder="123 Sampaguita St."
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${
											errors.line1
												? "w-full bg-red-500"
												: values.line1
													? "w-3/5 bg-[#e50914]"
													: "w-1/3 bg-neutral-700"
										}`}
									/>
									{errors.line1 && (
										<p className="mt-1 font-mono text-[11px] text-red-400">
											{errors.line1}
										</p>
									)}
								</div>

								{/* Province & Municipality / City (PSGC Cloud API) - appearance-none */}
								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div>
										<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
											PROVINCE
										</label>
										<select
											value={values.provinceCode}
											onChange={(e) => {
												const code = e.target.value;
												const found = provinces.find(
													(p) => p.code === code,
												);
												setValues((prev) => ({
													...prev,
													provinceCode: code,
													provinceName:
														found?.name ?? "",
													cityCode: "",
													cityName: "",
													barangayCode: "",
													barangayName: "",
												}));
												setErrors((prev) => ({
													...prev,
													provinceCode: undefined,
												}));
											}}
											onBlur={() =>
												handleBlur("provinceCode")
											}
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
										>
											<option value="">
												{loadingProvinces
													? "Loading provinces..."
													: "Select Province"}
											</option>
											{provinces.map((p) => (
												<option
													key={p.code}
													value={p.code}
												>
													{p.name}
												</option>
											))}
										</select>
										<div
											className={`mt-1 h-[3px] transition-all ${
												errors.provinceCode
													? "w-full bg-red-500"
													: values.provinceCode
														? "w-2/3 bg-[#e50914]"
														: "w-1/3 bg-neutral-700"
											}`}
										/>
										{errors.provinceCode && (
											<p className="mt-1 font-mono text-[11px] text-red-400">
												{errors.provinceCode}
											</p>
										)}
									</div>

									<div>
										<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
											MUNICIPALITY / CITY
										</label>
										<select
											value={values.cityCode}
											disabled={
												!values.provinceCode ||
												loadingCities
											}
											onChange={(e) => {
												const code = e.target.value;
												const found = cities.find(
													(c) => c.code === code,
												);
												setValues((prev) => ({
													...prev,
													cityCode: code,
													cityName: found?.name ?? "",
													barangayCode: "",
													barangayName: "",
												}));
												setErrors((prev) => ({
													...prev,
													cityCode: undefined,
												}));
											}}
											onBlur={() =>
												handleBlur("cityCode")
											}
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] disabled:opacity-60 focus:outline-none"
										>
											<option value="">
												{loadingCities
													? "Loading cities..."
													: "Select Municipality / City"}
											</option>
											{cities.map((c) => (
												<option
													key={c.code}
													value={c.code}
												>
													{c.name}
												</option>
											))}
										</select>
										<div
											className={`mt-1 h-[3px] transition-all ${
												errors.cityCode
													? "w-full bg-red-500"
													: values.cityCode
														? "w-2/3 bg-[#e50914]"
														: "w-1/3 bg-neutral-700"
											}`}
										/>
										{errors.cityCode && (
											<p className="mt-1 font-mono text-[11px] text-red-400">
												{errors.cityCode}
											</p>
										)}
									</div>
								</div>

								{/* Barangay & Postal Code */}
								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div>
										<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
											BARANGAY
										</label>
										<select
											value={values.barangayCode}
											disabled={
												!values.cityCode ||
												loadingBarangays
											}
											onChange={(e) => {
												const code = e.target.value;
												const found = barangays.find(
													(b) => b.code === code,
												);
												setValues((prev) => ({
													...prev,
													barangayCode: code,
													barangayName:
														found?.name ?? "",
												}));
												setErrors((prev) => ({
													...prev,
													barangayCode: undefined,
												}));
											}}
											onBlur={() =>
												handleBlur("barangayCode")
											}
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] disabled:opacity-60 focus:outline-none"
										>
											<option value="">
												{loadingBarangays
													? "Loading barangays..."
													: "Select Barangay"}
											</option>
											{barangays.map((b) => (
												<option
													key={b.code}
													value={b.code}
												>
													{b.name}
												</option>
											))}
										</select>
										<div
											className={`mt-1 h-[3px] transition-all ${
												errors.barangayCode
													? "w-full bg-red-500"
													: values.barangayCode
														? "w-2/3 bg-[#e50914]"
														: "w-1/3 bg-neutral-700"
											}`}
										/>
										{errors.barangayCode && (
											<p className="mt-1 font-mono text-[11px] text-red-400">
												{errors.barangayCode}
											</p>
										)}
									</div>

									<div>
										<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
											POSTAL CODE
										</label>
										<input
											type="text"
											inputMode="numeric"
											maxLength={4}
											value={values.postalCode}
											onChange={(e) =>
												updateField(
													"postalCode",
													e.target.value.replace(
														/\D/g,
														"",
													),
												)
											}
											onBlur={() =>
												handleBlur("postalCode")
											}
											placeholder="1012"
											className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
										/>
										<div
											className={`mt-1 h-[3px] transition-all ${
												errors.postalCode
													? "w-full bg-red-500"
													: values.postalCode
														? "w-2/3 bg-[#e50914]"
														: "w-1/3 bg-neutral-700"
											}`}
										/>
										{errors.postalCode && (
											<p className="mt-1 font-mono text-[11px] text-red-400">
												{errors.postalCode}
											</p>
										)}
									</div>
								</div>

								{/* Landmark / Rider Notes */}
								<div>
									<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
										LANDMARK / RIDER NOTES
									</label>
									<input
										type="text"
										value={values.landmarkNotes}
										onChange={(e) =>
											updateField(
												"landmarkNotes",
												e.target.value,
											)
										}
										placeholder="Near the basketball court"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
									/>
									<div className="mt-1 h-[3px] w-3/5 bg-[#e50914]" />
								</div>
							</div>
						</section>

						{/* 03 PICK YOUR COURIER */}
						<section
							className="bg-[#141414] text-white p-6 sm:p-8"
							style={{ clipPath: CLIP_CARD }}
						>
							<div className="flex items-center gap-3 mb-6">
								<span className="inline-flex h-8 w-10 items-center justify-center bg-[#e50914] font-display text-base font-black">
									03
								</span>
								<h2 className="font-display text-2xl font-black uppercase tracking-wide">
									PICK YOUR COURIER
								</h2>
							</div>

							<div>
								<label className="block font-display text-xs font-bold uppercase tracking-wider mb-2">
									COURIER
								</label>
								<select
									value={values.courierId}
									onChange={(e) =>
										updateField(
											"courierId",
											e.target.value as CourierId,
										)
									}
									className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none"
								>
									{COURIER_OPTIONS.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} – {c.etaLabel} –{" "}
											{formatPrice(c.fee)}
										</option>
									))}
								</select>
								<div className="mt-1 h-[3px] w-3/5 bg-[#e50914]" />
							</div>
						</section>

						{/* 04 HOW YOU PAYING? */}
						<section
							className="bg-[#141414] text-white p-6 sm:p-8"
							style={{ clipPath: CLIP_CARD }}
						>
							<div className="flex items-center gap-3 mb-6">
								<span className="inline-flex h-8 w-10 items-center justify-center bg-[#e50914] font-display text-base font-black">
									04
								</span>
								<h2 className="font-display text-2xl font-black uppercase tracking-wide">
									HOW YOU PAYING?
								</h2>
							</div>

							<div className="space-y-4">
								{/* Radio Option 1: Cash on Delivery */}
								<label
									onClick={() =>
										updateField("paymentMethod", "cod")
									}
									className={`relative block cursor-pointer p-4 border transition-colors ${
										values.paymentMethod === "cod"
											? "bg-[#e50914] border-[#e50914] text-white"
											: "bg-transparent border-neutral-700 text-white hover:border-neutral-500"
									}`}
								>
									<div className="flex items-center gap-2.5">
										<input
											type="radio"
											name="paymentMethod"
											checked={
												values.paymentMethod === "cod"
											}
											onChange={() =>
												updateField(
													"paymentMethod",
													"cod" as PaymentOptionId,
												)
											}
											className="sr-only"
										/>
										<span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white">
											{values.paymentMethod === "cod" && (
												<span className="h-2 w-2 rounded-full bg-white" />
											)}
										</span>
										<span className="font-mono text-xs font-bold uppercase tracking-wider">
											CASH ON DELIVERY
										</span>
									</div>
									<p className="mt-1.5 pl-6 font-mono text-[11px] text-white/90">
										Pay the rider in cash when it arrives.
									</p>
								</label>

								{/* Radio Option 2: COD + E-Wallet on Arrival */}
								<label
									onClick={() =>
										updateField(
											"paymentMethod",
											"cod_ewallet",
										)
									}
									className={`relative block cursor-pointer p-4 border transition-colors ${
										values.paymentMethod === "cod_ewallet"
											? "bg-[#e50914] border-[#e50914] text-white"
											: "bg-transparent border-neutral-700 text-white hover:border-neutral-500"
									}`}
								>
									<div className="flex items-center gap-2.5">
										<input
											type="radio"
											name="paymentMethod"
											checked={
												values.paymentMethod ===
												"cod_ewallet"
											}
											onChange={() =>
												updateField(
													"paymentMethod",
													"cod_ewallet" as PaymentOptionId,
												)
											}
											className="sr-only"
										/>
										<span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white">
											{values.paymentMethod ===
												"cod_ewallet" && (
												<span className="h-2 w-2 rounded-full bg-white" />
											)}
										</span>
										<span className="font-mono text-xs font-bold uppercase tracking-wider">
											COD + E-WALLET ON ARRIVAL
										</span>
									</div>
									<p className="mt-1.5 pl-6 font-mono text-[11px] text-white/90">
										Pay the rider by GCash or Maya QR at
										your door.
									</p>
								</label>

								{/* CASH READY Dropdown */}
								<div className="pt-2">
									<label
										className={`block font-display text-xs font-bold uppercase tracking-wider mb-2 ${
											values.paymentMethod ===
											"cod_ewallet"
												? "opacity-50"
												: ""
										}`}
									>
										CASH READY
									</label>
									<select
										value={values.cashReadyOption}
										disabled={
											values.paymentMethod ===
											"cod_ewallet"
										}
										onChange={(e) =>
											updateField(
												"cashReadyOption",
												e.target.value,
											)
										}
										className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed focus:outline-none"
									>
										{cashReadyChoices.map((choice) => (
											<option
												key={choice.id}
												value={choice.id}
											>
												{choice.label}
											</option>
										))}
									</select>
									<div
										className={`mt-1 h-[3px] w-3/5 ${
											values.paymentMethod ===
											"cod_ewallet"
												? "bg-neutral-600 opacity-50"
												: "bg-[#e50914]"
										}`}
									/>

									{values.paymentMethod === "cod" &&
										values.cashReadyOption === "custom" && (
											<div className="mt-3">
												<input
													type="text"
													inputMode="numeric"
													value={customCashAmount}
													onChange={(e) =>
														setCustomCashAmount(
															e.target.value.replace(
																/\D/g,
																"",
															),
														)
													}
													placeholder="Enter custom cash amount (e.g. 2000)"
													className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-sm text-[#141414] focus:outline-none border border-neutral-400"
												/>
												<div className="mt-1 h-[3px] w-2/5 bg-[#e50914]" />
											</div>
										)}
								</div>
							</div>
						</section>
					</div>

					{/* RIGHT SIDE: scrolls independently */}
					<div className="relative lg:h-full lg:overflow-y-auto lg:pb-20 lg:pt-1 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
						<div className="relative w-full pr-2 pb-2">
							{/* Receipt Container */}
							<div className="relative z-20 bg-[#f5f3ec] border-2 border-[#141414] p-6 sm:p-8 lg:p-10 font-mono text-[#141414] shadow-[8px_8px_0_#141414]">
								<div className="flex items-baseline justify-between pb-4 border-b-2 border-dashed border-[#141414]">
									<h2 className="font-display text-4xl font-black uppercase tracking-tight">
										SNUG REBEL
									</h2>
									<span className="text-sm text-neutral-600">
										{formatShortDate(new Date())}
									</span>
								</div>

								<div className="my-6 max-h-[32vh] overflow-y-auto pr-1 space-y-5">
									{checkoutItems.length === 0 ? (
										<p className="py-6 text-center text-xs text-neutral-500">
											Your bag is currently empty.
										</p>
									) : (
										checkoutItems.map((item: CartLine) => (
											<div
												key={item.id}
												className="flex items-start justify-between gap-4 text-base"
											>
												<div className="flex items-start gap-3 min-w-0">
													<img
														src={
															item.imageUrl ??
															undefined
														}
														alt={item.name}
														className="h-16 w-16 shrink-0 object-cover border border-[#141414] bg-neutral-900"
													/>
													<div className="min-w-0">
														<p className="font-bold uppercase truncate">
															{item.name}
														</p>
														<p className="text-neutral-600 text-sm">
															{item.color} /{" "}
															{item.size}
														</p>
													</div>
												</div>
												<span className="shrink-0 font-semibold whitespace-nowrap">
													{item.quantity} ×{" "}
													{item.unitPrice.toLocaleString(
														"en-PH",
														{
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														},
													)}
												</span>
											</div>
										))
									)}
								</div>

								<div className="border-t-2 border-dashed border-[#141414] pt-5 pb-5">
									<label className="block text-xs font-bold uppercase tracking-wider mb-2">
										VOUCHER CODE
									</label>
									<div className="flex items-stretch gap-2">
										<input
											type="text"
											value={values.voucherCode}
											onChange={(e) =>
												updateField(
													"voucherCode",
													e.target.value.toUpperCase(),
												)
											}
											placeholder="REBEL200"
											className="flex-1 bg-white px-4 py-3 text-sm text-[#141414] border border-neutral-300 focus:border-[#141414] focus:outline-none"
										/>
										<button
											type="button"
											onClick={handleApplyVoucher}
											disabled={applyingVoucher}
											className="bg-[#141414] text-white px-7 py-3 font-display text-base font-black uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
										>
											{applyingVoucher ? "..." : "APPLY"}
										</button>
									</div>
									{voucherError && (
										<p className="mt-1.5 text-[11px] text-[#e50914]">
											{voucherError}
										</p>
									)}
									{voucher && !voucherError && (
										<p className="mt-1.5 text-[11px] text-emerald-700">
											Voucher {voucher.code} applied (-
											{formatPrice(
												voucher.discountAmount,
											)}
											)
										</p>
									)}
								</div>

								<div className="border-t-2 border-dashed border-[#141414] pt-6 space-y-3 text-base">
									<div className="flex justify-between">
										<span>
											Subtotal ({totalItemsCount} items)
										</span>
										<span>
											{formatPrice(activeSubtotal)}
										</span>
									</div>
									<div className="flex justify-between">
										<span>
											Courier: {selectedCourier.name}
										</span>
										<span>
											{formatPrice(selectedCourier.fee)}
										</span>
									</div>
									{shippingDiscount > 0 && (
										<div className="flex justify-between">
											<span>Shipping discount</span>
											<span>
												-{formatPrice(shippingDiscount)}
											</span>
										</div>
									)}
									{voucher && (
										<div className="flex justify-between">
											<span>Voucher {voucher.code}</span>
											<span>
												-
												{formatPrice(
													voucher.discountAmount,
												)}
											</span>
										</div>
									)}
								</div>

								<div className="mt-5 border-t-2 border-dashed border-[#141414] pt-5">
									<div className="flex items-baseline justify-between">
										<span className="font-display text-4xl font-black uppercase">
											TOTAL
										</span>
										<span className="font-display text-5xl font-black">
											{formatPrice(finalTotal)}
										</span>
									</div>
									<p className="mt-3 text-sm text-neutral-600">
										{values.paymentMethod === "cod"
											? "Pay in cash to the rider on delivery."
											: "Pay the rider by GCash or Maya QR at your door."}
									</p>
								</div>
							</div>

							{/* Terms Checkbox */}
							<div className="relative z-40 mt-6 pl-2">
								<label className="flex items-center gap-2.5 cursor-pointer font-mono text-sm text-[#141414]">
									<input
										type="checkbox"
										checked={values.agreedToTerms}
										onChange={(e) =>
											updateField(
												"agreedToTerms",
												e.target.checked,
											)
										}
										className="h-4 w-4 accent-[#141414]"
									/>
									<span>
										I agree to the Terms and Return Policy.
									</span>
								</label>
								{errors.agreedToTerms && (
									<p className="mt-1 font-mono text-[11px] text-[#e50914]">
										{errors.agreedToTerms}
									</p>
								)}
							</div>

							{submitError && (
								<div className="relative z-40 mt-3 border border-[#e50914] bg-red-50 px-3 py-2 font-mono text-xs text-[#e50914]">
									{submitError}
								</div>
							)}

							{/* Place Order Button */}
							<div className="relative z-40 mt-5">
								<AngledButton
									variant="buyNow"
									type="submit"
									className="w-full"
									disabled={
										submitting || cartBusy || checkoutItems.length === 0
									}
								>
									{submitting
										? "PLACING ORDER..."
										: values.paymentMethod === "cod"
											? "PLACE ORDER - COD"
											: "PLACE ORDER - COD / QR"}
								</AngledButton>
							</div>

							{/* Back to Bag Link */}
							<div className="relative z-40 mt-6 pl-2">
								<button
									type="button"
									onClick={() => {
										navigate(ROUTES.shop);
										openCart();
									}}
									className="font-mono text-xs font-bold uppercase tracking-wider text-[#141414] hover:text-[#e50914] cursor-pointer"
								>
									← BACK TO BAG
								</button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
