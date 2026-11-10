/* eslint-disable react-hooks/set-state-in-effect */
import {
	useEffect,
	useMemo,
	useState,
	useRef,
	useCallback,
	type CSSProperties,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
	CreditCard,
	ExternalLink,
	Loader2,
	QrCode,
	ShieldCheck,
} from "lucide-react";
import checkoutHeaderSvg from "../assets/checkout_page_header.svg";
import redStarGraphicSvg from "../assets/checkout_redstar_graphic.svg";
import orderNoContainerSvg from "../assets/checkout_orderno_container.svg";
import AngledButton from "../components/ui/AngledButton";
import { useCart } from "../context/cartContext";
import type { CartLine } from "../api/cart.types";
import { useAuth } from "../context/authContext";
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
import { apiFetch } from "../api/api";

type ExtendedFormValues = CheckoutFormValues & { customerNote: string };
type ValidationErrors = Partial<Record<keyof ExtendedFormValues, string>>;

interface CardFormDetails {
	cardholderName: string;
	cardNumber: string;
	expiry: string;
	cvc: string;
}

type CardErrors = Partial<Record<keyof CardFormDetails, string>>;

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

function formatCardNumber(raw: string): string {
	const digits = raw.replace(/\D/g, "").slice(0, 16);
	return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatCardExpiry(raw: string): string {
	const digits = raw.replace(/\D/g, "").slice(0, 4);
	if (digits.length <= 2) return digits;
	return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function paymentMethodDisplayName(method: PaymentOptionId): string {
	switch (method) {
		case "cod":
			return "Cash on Delivery";
		case "cod_ewallet":
			return "COD + E-Wallet on Arrival";
		case "card":
			return "Credit / Debit Card (Paid)";
		case "gcash":
			return "GCash / QR Ph (Paid)";
	}
}

export default function CheckoutPage() {
	const { status } = useAuth();
	if (status === "loading")
		return (
			<div className="p-8 font-display" role="status">
				Checking your session…
			</div>
		);
	if (status === "error")
		return (
			<p className="p-8 font-display">
				Reconnect to continue checking out.
			</p>
		);
	return <CheckoutForm />;
}

function CheckoutForm() {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		lines,
		subtotal: cartSubtotal,
		openCart,
		clear,
		owner,
		busy: cartBusy,
	} = useCart();
	const { user } = useAuth();

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

	const totalItemsCount = checkoutItems.reduce(
		(sum: number, item: CartLine) => sum + item.quantity,
		0,
	);

	const [provinces, setProvinces] = useState<PsgcOption[]>([]);
	const [cities, setCities] = useState<PsgcOption[]>([]);
	const [barangays, setBarangays] = useState<PsgcOption[]>([]);
	const [loadingProvinces, setLoadingProvinces] = useState(false);
	const [loadingCities, setLoadingCities] = useState(false);
	const [loadingBarangays, setLoadingBarangays] = useState(false);

	const [values, setValues] = useState<ExtendedFormValues>({
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
		customerNote: "",
		courierId: "jnt",
		paymentMethod: "cod",
		cashReadyOption: "exact",
		voucherCode: "",
		agreedToTerms: false,
	});

	// Mock Card State
	const [cardDetails, setCardDetails] = useState<CardFormDetails>({
		cardholderName: "",
		cardNumber: "",
		expiry: "",
		cvc: "",
	});
	const [cardErrors, setCardErrors] = useState<CardErrors>({});
	const [cardProcessingStage, setCardProcessingStage] = useState<
		string | null
	>(null);

	// Mock QR Modal State
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [qrSessionId, setQrSessionId] = useState<string>("");
	const [qrConfirmedRef, setQrConfirmedRef] = useState<string | null>(null);
	const [pendingQrOrder, setPendingQrOrder] = useState<ConfirmedOrder | null>(
		null,
	);
	const qrCompletedRef = useRef(false);

	const [customCashAmount, setCustomCashAmount] = useState("");
	const [errors, setErrors] = useState<ValidationErrors>({});
	const [touched, setTouched] = useState<
		Partial<Record<keyof ExtendedFormValues, boolean>>
	>({});
	const [voucher, setVoucher] = useState<AppliedVoucher | null>(null);
	const [voucherError, setVoucherError] = useState<string | null>(null);
	const [applyingVoucher, setApplyingVoucher] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(
		null,
	);

	// Terms Modal State & Scroll Tracking
	const [showTermsModal, setShowTermsModal] = useState(false);
	const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
	const termsScrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (showTermsModal) {
			setHasScrolledToBottom(false);
			setTimeout(() => {
				if (termsScrollRef.current) {
					const { scrollHeight, clientHeight } =
						termsScrollRef.current;
					if (scrollHeight <= clientHeight + 2)
						setHasScrolledToBottom(true);
				}
			}, 100);
		}
	}, [showTermsModal]);

	const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 15) {
			setHasScrolledToBottom(true);
		}
	};

	useEffect(() => {
		let active = true;
		setLoadingProvinces(true);
		fetchProvinces()
			.then((list) => {
				if (active) setProvinces(list);
			})
			.finally(() => {
				if (active) setLoadingProvinces(false);
			});
		return () => {
			active = false;
		};
	}, []);

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
			.finally(() => {
				if (active) setLoadingCities(false);
			});
		return () => {
			active = false;
		};
	}, [values.provinceCode]);

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
		field: keyof ExtendedFormValues,
		val: ExtendedFormValues[keyof ExtendedFormValues],
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

	function validateCardDetails(): CardErrors {
		const next: CardErrors = {};
		if (cardDetails.cardholderName.trim().length < 3) {
			next.cardholderName = "Enter the name on the card.";
		}
		const digits = cardDetails.cardNumber.replace(/\D/g, "");
		if (digits.length !== 16) {
			next.cardNumber = "Enter a valid 16-digit card number.";
		}
		if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) {
			next.expiry = "Use MM/YY format.";
		} else {
			const [mmStr, yyStr] = cardDetails.expiry.split("/");
			const expMonth = Number(mmStr);
			const expYear = 2000 + Number(yyStr);
			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			const currentYear = now.getFullYear();
			if (
				expYear < currentYear ||
				(expYear === currentYear && expMonth < currentMonth)
			) {
				next.expiry = "This card is expired.";
			}
		}
		if (!/^\d{3,4}$/.test(cardDetails.cvc)) {
			next.cvc = "Enter a 3 or 4-digit CVC.";
		}
		return next;
	}

	function validateAll(): ValidationErrors {
		const nextErrors: ValidationErrors = {};
		(Object.keys(values) as Array<keyof ExtendedFormValues>).forEach(
			(key) => {
				const msg = validateField(key, values[key]);
				if (msg) nextErrors[key] = msg;
			},
		);
		return nextErrors;
	}

	function updateField<K extends keyof ExtendedFormValues>(
		field: K,
		value: ExtendedFormValues[K],
	) {
		setValues((prev) => ({ ...prev, [field]: value }));
		if (touched[field])
			setErrors((prev) => ({
				...prev,
				[field]: validateField(field, value),
			}));
	}

	function handleBlur(field: keyof ExtendedFormValues) {
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

	const finalizeOrderSubmission = useCallback(
		async (providerReference?: string) => {
			setSubmitting(true);
			setSubmitError(null);
			try {
				let cashLabel = "";
				if (values.paymentMethod === "cod") {
					if (values.cashReadyOption === "custom")
						cashLabel = `Custom amount - ${formatPrice(Number(customCashAmount) || finalTotal)}`;
					else
						cashLabel =
							cashReadyChoices.find(
								(c) => c.id === values.cashReadyOption,
							)?.label ?? cashReadyChoices[0].label;
				} else if (values.paymentMethod === "cod_ewallet") {
					cashLabel = "E-Wallet on Arrival";
				} else if (values.paymentMethod === "card") {
					const last4 = cardDetails.cardNumber
						.replace(/\D/g, "")
						.slice(-4);
					cashLabel = `Paid via Card (•••• ${last4})`;
				} else {
					cashLabel = `Paid via GCash QR (${providerReference ?? "Verified"})`;
				}

				const confirmed = await submitCheckoutOrder({
					owner,
					isBuyNow: Boolean(buyNowItems),
					items: checkoutItems,
					subtotal: activeSubtotal,
					shippingDiscount,
					voucher,
					values: { ...values, cashReadyOption: cashLabel },
					providerReference,
				});

				confirmed.items = confirmed.items.map((ci) => {
					const variantId =
						(ci as CartLine & { fkProductVariantId?: string })
							.fkProductVariantId ?? ci.id;
					const cartRef = checkoutItems.find(
						(item) =>
							item.id === variantId ||
							(item as CartLine & { productVariantId?: string })
								.productVariantId === variantId,
					);
					return {
						...ci,
						imageUrl: cartRef?.imageUrl ?? null,
					} as CartLine;
				});

				setQrModalOpen(false);
				setCardProcessingStage(null);
				setConfirmedOrder(confirmed);
				if (!buyNowItems) await clear();
				window.scrollTo({ top: 0, behavior: "smooth" });
			} catch (err) {
				setCardProcessingStage(null);
				setQrModalOpen(false);
				setSubmitError(
					err instanceof Error
						? err.message
						: "Failed to place order. Please try again.",
				);
			} finally {
				setSubmitting(false);
			}
		},
		[
			values,
			customCashAmount,
			finalTotal,
			cashReadyChoices,
			cardDetails.cardNumber,
			owner,
			buyNowItems,
			checkoutItems,
			activeSubtotal,
			shippingDiscount,
			voucher,
			clear,
		],
	);

	// Listen for QR scan confirmation (both cross-device Backend Polling AND same-device Tab Sync)
	useEffect(() => {
		if (!qrModalOpen || !qrSessionId || !pendingQrOrder) return;

		qrCompletedRef.current = false;
		let transitionTimer: number | undefined;

		const completeQrOrder = (refNo: string) => {
			if (qrCompletedRef.current) return;
			qrCompletedRef.current = true;
			window.clearInterval(pollTimer);

			setQrConfirmedRef(refNo);
			transitionTimer = window.setTimeout(async () => {
				setQrModalOpen(false);
				setConfirmedOrder({
					...pendingQrOrder,
					cashReadyLabel: `Paid via GCash QR (${refNo})`,
				});
				if (!buyNowItems) {
					try {
						await clear();
					} catch {
						// Cart was already cleared by backend during checkout
					}
				}
				window.scrollTo({ top: 0, behavior: "smooth" });
			}, 800);
		};

		// A. Cross-device Backend Polling (Phone -> Backend -> Desktop)
		const pollTimer = window.setInterval(async () => {
			if (qrCompletedRef.current) return;
			try {
				const tracked = await apiFetch<{ status?: string }>(
					`/Order/track/${encodeURIComponent(pendingQrOrder.orderNumber)}`,
				);
				if (tracked?.status && tracked.status !== "Pending") {
					completeQrOrder(`QR-${pendingQrOrder.orderNumber}`);
				}
			} catch {
				// Ignore transient polling errors while waiting
			}
		}, 2000);

		// B. Same-device LocalStorage / BroadcastChannel fallback
		const onStorage = (e: StorageEvent) => {
			if (e.key === `snug-qr-paid-${qrSessionId}` && e.newValue) {
				try {
					const data = JSON.parse(e.newValue);
					if (data?.status === "PAID") {
						completeQrOrder(
							data.referenceNumber ||
								`QR-${pendingQrOrder.orderNumber}`,
						);
					}
				} catch {
					// ignore parse error
				}
			}
		};

		let bc: BroadcastChannel | null = null;
		if (typeof BroadcastChannel !== "undefined") {
			bc = new BroadcastChannel("snug_qr_channel");
			bc.onmessage = (event) => {
				if (
					event.data?.sessionId === qrSessionId &&
					event.data?.status === "PAID"
				) {
					completeQrOrder(
						event.data.referenceNumber ||
							`QR-${pendingQrOrder.orderNumber}`,
					);
				}
			};
		}

		window.addEventListener("storage", onStorage);
		return () => {
			window.clearInterval(pollTimer);
			if (transitionTimer) window.clearTimeout(transitionTimer);
			window.removeEventListener("storage", onStorage);
			bc?.close();
		};
	}, [qrModalOpen, qrSessionId, pendingQrOrder, buyNowItems, clear]);

	async function handlePlaceOrder(e: React.FormEvent) {
		e.preventDefault();
		setSubmitError(null);
		if (cartBusy || submitting) return;

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

		if (values.paymentMethod === "card") {
			const cErrors = validateCardDetails();
			setCardErrors(cErrors);
			if (
				Object.keys(validation).length > 0 ||
				Object.keys(cErrors).length > 0
			) {
				return;
			}

			setSubmitting(true);
			setCardProcessingStage("VERIFYING CARD FORMAT & ISSUER...");
			await new Promise((r) => setTimeout(r, 950));
			setCardProcessingStage(
				`AUTHORIZING ${formatPrice(finalTotal)} TRANSACTION...`,
			);
			await new Promise((r) => setTimeout(r, 1100));
			setCardProcessingStage("PAYMENT APPROVED! FINALIZING DROP...");
			await new Promise((r) => setTimeout(r, 500));

			const last4 = cardDetails.cardNumber.replace(/\D/g, "").slice(-4);
			await finalizeOrderSubmission(`CARD-${last4}-${Date.now()}`);
			return;
		}

		if (Object.keys(validation).length > 0) return;

		if (values.paymentMethod === "gcash") {
			// If we already created the pending order for this checkout session, just re-open the modal
			if (pendingQrOrder) {
				setQrModalOpen(true);
				return;
			}

			setSubmitting(true);
			try {
				const newSession = `SRQR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
				const created = await submitCheckoutOrder({
					owner,
					isBuyNow: Boolean(buyNowItems),
					items: checkoutItems,
					subtotal: activeSubtotal,
					shippingDiscount,
					voucher,
					values: {
						...values,
						cashReadyOption: "Paid via GCash QR",
					},
					deferOnlinePayment: true, // Creates Pending order on backend first
				});

				created.items = created.items.map((ci) => {
					const variantId =
						(ci as CartLine & { fkProductVariantId?: string })
							.fkProductVariantId ?? ci.id;
					const cartRef = checkoutItems.find(
						(item) =>
							item.id === variantId ||
							(item as CartLine & { productVariantId?: string })
								.productVariantId === variantId,
					);
					return {
						...ci,
						imageUrl: cartRef?.imageUrl ?? null,
					} as CartLine;
				});

				setPendingQrOrder(created);
				setQrConfirmedRef(null);
				setQrSessionId(newSession);
				setQrModalOpen(true);
			} catch (err) {
				setSubmitError(
					err instanceof Error
						? err.message
						: "Failed to initialize QR payment. Please try again.",
				);
			} finally {
				setSubmitting(false);
			}
			return;
		}

		await finalizeOrderSubmission();
	}

	const qrTargetUrl = useMemo(() => {
		if (!qrSessionId || typeof window === "undefined") return "";
		const params = new URLSearchParams({
			session: qrSessionId,
			orderId: pendingQrOrder?.orderId ?? "",
			orderNo: pendingQrOrder?.orderNumber ?? "",
			amount: String(finalTotal),
			recipient:
				`${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
		});
		return `${window.location.origin}${ROUTES.mockQrPay}?${params.toString()}`;
	}, [
		qrSessionId,
		pendingQrOrder,
		finalTotal,
		values.firstName,
		values.lastName,
	]);

	if (confirmedOrder) {
		const deliveryWindow = formatDeliveryRange(
			confirmedOrder.placedAt,
			confirmedOrder.courier.daysMin,
			confirmedOrder.courier.daysMax,
		);

		return (
			<div className="min-h-[calc(100vh-5rem)] bg-white text-[#141414] pb-20">
				<div className="mx-auto max-w-[1920px] px-6 sm:px-10 lg:px-[4.6vw] pt-8">
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

						<div className="relative w-72 sm:w-80 lg:w-[26vw] lg:max-w-[30rem] shrink-0 [container-type:inline-size]">
							<img
								src={orderNoContainerSvg}
								alt="Order Number Container"
								className="w-full h-auto block pointer-events-none"
							/>
							<span className="absolute left-[9%] bottom-[13%] origin-left whitespace-nowrap font-display text-[4.8cqw] font-black tracking-tight text-white -rotate-3">
								{confirmedOrder.orderNumber}
							</span>

							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(
										confirmedOrder.orderNumber,
									);
									const btn =
										document.getElementById(
											"copy-order-btn",
										);
									if (btn) {
										btn.innerText = "COPIED!";
										setTimeout(() => {
											btn.innerText = "COPY ORDER ID";
										}, 2000);
									}
								}}
								id="copy-order-btn"
								className="absolute left-[9%] -bottom-10 bg-black text-white font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest px-3.5 py-2 border-2 border-black hover:bg-[#e50914] transition-colors cursor-pointer shadow-[3px_3px_0_#141414] -rotate-3"
							>
								COPY ORDER ID
							</button>
						</div>
					</div>

					<div className="mx-auto mt-10 lg:mt-14 grid max-w-[1300px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)] lg:gap-x-14 items-start">
						<div className="w-full">
							<div className="w-full bg-[#f5f3ec] border border-[#141414] p-7 font-mono text-[#141414]">
								<div className="flex items-baseline gap-3 pb-4 border-b-2 border-dashed border-[#141414]">
									<h2 className="font-display text-2xl font-black uppercase tracking-tight">
										YOUR DROP
									</h2>
									<span className="text-sm text-neutral-600">
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
												className="flex items-start justify-between gap-3 text-base"
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

								<div className="border-t-2 border-dashed border-[#141414] pt-5 space-y-2.5 text-base">
									<div className="flex justify-between">
										<span>
											Subtotal ({totalItemsCount} items)
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
									<p className="mt-3 text-sm text-neutral-600">
										{confirmedOrder.paymentMethod === "cod"
											? "Pay in cash to the rider on delivery."
											: confirmedOrder.paymentMethod ===
												  "cod_ewallet"
												? "Pay the rider by GCash or Maya QR at your door."
												: `Paid online (${confirmedOrder.cashReadyLabel}).`}
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
								<p className="mt-1 font-mono text-sm text-neutral-300">
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
									{paymentMethodDisplayName(
										confirmedOrder.paymentMethod,
									)}
								</p>
								<p className="mt-1 font-mono text-sm text-neutral-300">
									{confirmedOrder.paymentMethod === "cod" ||
									confirmedOrder.paymentMethod ===
										"cod_ewallet"
										? `Have ${formatPeso(confirmedOrder.totalAmount)} ready for the rider.`
										: `${confirmedOrder.cashReadyLabel} — No cash needed on delivery.`}
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
								<p className="mt-3 font-mono text-base font-bold">
									{confirmedOrder.recipientName}
								</p>
								<p className="mt-2 font-mono text-sm leading-relaxed text-neutral-300">
									{confirmedOrder.addressLine},{" "}
									{confirmedOrder.barangay},<br />
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

	return (
		<div className="bg-white text-[#141414] min-h-screen pb-24">
			<div className="mx-auto flex max-w-[1920px] w-full flex-col px-4 sm:px-8 lg:px-12 pt-6 lg:pt-10">
				<div className="mb-6 shrink-0">
					<button
						type="button"
						onClick={() => {
							navigate(ROUTES.shop);
							openCart();
						}}
						className="group mb-6 inline-flex cursor-pointer items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-neutral-600 transition-colors hover:text-[#e50914]"
					>
						<span className="transition-transform group-hover:-translate-x-1">
							←
						</span>{" "}
						BACK TO BAG
					</button>
					<div>
						<img
							src={checkoutHeaderSvg}
							alt="CHECKOUT"
							className="h-14 sm:h-16 w-auto select-none pointer-events-none"
						/>
						{!user && (
							<p className="mt-3 text-[15px] font-display">
								Have an account?{" "}
								<Link
									className="font-bold underline"
									to={`${ROUTES.signIn}?returnTo=${encodeURIComponent(ROUTES.checkout)}`}
									state={{ checkoutState: location.state }}
								>
									Sign in
								</Link>{" "}
								to save this order to your account, or continue
								as a guest.
							</p>
						)}
					</div>
				</div>

				<form
					onSubmit={handlePlaceOrder}
					noValidate
					style={
						{
							"--rw": "clamp(480px, 38vw, 700px)",
							"--gap": "6rem",
						} as CSSProperties
					}
					className="relative grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_var(--rw)] lg:gap-x-[var(--gap)] items-start"
				>
					{/* LEFT SIDE: Form Content */}
					<div className="space-y-6 lg:pr-4">
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
								<div>
									<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
										FIRST NAME
									</label>
									<input
										type="text"
										maxLength={100}
										value={values.firstName}
										onChange={(e) =>
											updateField(
												"firstName",
												e.target.value,
											)
										}
										onBlur={() => handleBlur("firstName")}
										placeholder="Juan"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${errors.firstName ? "w-full bg-red-500" : values.firstName ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
									/>
									{errors.firstName && (
										<p className="mt-1 font-mono text-xs text-red-400">
											{errors.firstName}
										</p>
									)}
								</div>
								<div>
									<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
										LAST NAME
									</label>
									<input
										type="text"
										maxLength={100}
										value={values.lastName}
										onChange={(e) =>
											updateField(
												"lastName",
												e.target.value,
											)
										}
										onBlur={() => handleBlur("lastName")}
										placeholder="Dela Cruz"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${errors.lastName ? "w-full bg-red-500" : values.lastName ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
									/>
									{errors.lastName && (
										<p className="mt-1 font-mono text-xs text-red-400">
											{errors.lastName}
										</p>
									)}
								</div>
								<div>
									<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
										EMAIL
									</label>
									<input
										type="email"
										maxLength={255}
										value={values.email}
										onChange={(e) =>
											updateField("email", e.target.value)
										}
										onBlur={() => handleBlur("email")}
										placeholder="juan@example.com"
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${errors.email ? "w-full bg-red-500" : values.email ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
									/>
									{errors.email && (
										<p className="mt-1 font-mono text-xs text-red-400">
											{errors.email}
										</p>
									)}
								</div>
								<div>
									<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
										MOBILE NUMBER
									</label>
									<input
										type="tel"
										maxLength={100}
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
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${errors.mobileNumber ? "w-full bg-red-500" : values.mobileNumber ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
									/>
									{errors.mobileNumber && (
										<p className="mt-1 font-mono text-xs text-red-400">
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
								<div>
									<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
										HOUSE NO. / STREET / UNIT
									</label>
									<input
										type="text"
										maxLength={255}
										value={values.line1}
										onChange={(e) =>
											updateField("line1", e.target.value)
										}
										onBlur={() => handleBlur("line1")}
										placeholder="123 Sampaguita St."
										className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
									/>
									<div
										className={`mt-1 h-[3px] transition-all ${errors.line1 ? "w-full bg-red-500" : values.line1 ? "w-3/5 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
									/>
									{errors.line1 && (
										<p className="mt-1 font-mono text-xs text-red-400">
											{errors.line1}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div>
										<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
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
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
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
											className={`mt-1 h-[3px] transition-all ${errors.provinceCode ? "w-full bg-red-500" : values.provinceCode ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
										/>
										{errors.provinceCode && (
											<p className="mt-1 font-mono text-xs text-red-400">
												{errors.provinceCode}
											</p>
										)}
									</div>

									<div>
										<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
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
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] disabled:opacity-60 focus:outline-none"
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
											className={`mt-1 h-[3px] transition-all ${errors.cityCode ? "w-full bg-red-500" : values.cityCode ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
										/>
										{errors.cityCode && (
											<p className="mt-1 font-mono text-xs text-red-400">
												{errors.cityCode}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div>
										<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
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
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] disabled:opacity-60 focus:outline-none"
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
											className={`mt-1 h-[3px] transition-all ${errors.barangayCode ? "w-full bg-red-500" : values.barangayCode ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
										/>
										{errors.barangayCode && (
											<p className="mt-1 font-mono text-xs text-red-400">
												{errors.barangayCode}
											</p>
										)}
									</div>

									<div>
										<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
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
											className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
										/>
										<div
											className={`mt-1 h-[3px] transition-all ${errors.postalCode ? "w-full bg-red-500" : values.postalCode ? "w-2/3 bg-[#e50914]" : "w-1/3 bg-neutral-700"}`}
										/>
										{errors.postalCode && (
											<p className="mt-1 font-mono text-xs text-red-400">
												{errors.postalCode}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div>
										<label className="block font-display text-[13px] font-bold uppercase tracking-wider mb-2 text-neutral-300">
											NOTE FOR SELLER (OPTIONAL)
										</label>
										<textarea
											rows={2}
											maxLength={1000}
											value={values.customerNote}
											onChange={(e) =>
												updateField(
													"customerNote",
													e.target.value,
												)
											}
											className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-[15px] text-[#141414] focus:outline-none"
											placeholder="Special instructions for the team..."
										/>
										<div className="mt-1 h-[3px] w-1/3 bg-neutral-700" />
									</div>

									<div>
										<label className="block font-display text-[13px] font-bold uppercase tracking-wider mb-2 text-neutral-300">
											NOTE FOR COURIER (OPTIONAL)
										</label>
										<textarea
											rows={2}
											maxLength={1000}
											value={values.landmarkNotes}
											onChange={(e) =>
												updateField(
													"landmarkNotes",
													e.target.value,
												)
											}
											className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-[15px] text-[#141414] focus:outline-none"
											placeholder="Landmarks, delivery instructions..."
										/>
										<div className="mt-1 h-[3px] w-1/3 bg-neutral-700" />
									</div>
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
								<label className="block font-display text-sm font-bold uppercase tracking-wider mb-2">
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
									className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none"
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
								{/* 1. CASH ON DELIVERY */}
								<label
									onClick={() =>
										updateField("paymentMethod", "cod")
									}
									className={`relative block cursor-pointer p-4 border transition-colors ${values.paymentMethod === "cod" ? "bg-[#e50914] border-[#e50914] text-white" : "bg-transparent border-neutral-700 text-white hover:border-neutral-500"}`}
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
										<span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white">
											{values.paymentMethod === "cod" && (
												<span className="h-2 w-2 rounded-full bg-white" />
											)}
										</span>
										<span className="font-mono text-sm font-bold uppercase tracking-wider">
											CASH ON DELIVERY
										</span>
									</div>
									<p className="mt-1.5 pl-7 font-mono text-xs text-white/90">
										Pay the rider in cash when it arrives.
									</p>
								</label>

								{/* 2. COD + E-WALLET ON ARRIVAL */}
								<label
									onClick={() =>
										updateField(
											"paymentMethod",
											"cod_ewallet",
										)
									}
									className={`relative block cursor-pointer p-4 border transition-colors ${values.paymentMethod === "cod_ewallet" ? "bg-[#e50914] border-[#e50914] text-white" : "bg-transparent border-neutral-700 text-white hover:border-neutral-500"}`}
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
										<span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white">
											{values.paymentMethod ===
												"cod_ewallet" && (
												<span className="h-2 w-2 rounded-full bg-white" />
											)}
										</span>
										<span className="font-mono text-sm font-bold uppercase tracking-wider">
											COD + E-WALLET ON ARRIVAL
										</span>
									</div>
									<p className="mt-1.5 pl-7 font-mono text-xs text-white/90">
										Pay the rider by GCash or Maya QR at
										your door.
									</p>
								</label>

								{/* 3. MOCK CREDIT / DEBIT CARD */}
								<div className="flex flex-col">
									<label
										onClick={() =>
											updateField(
												"paymentMethod",
												"card" as PaymentOptionId,
											)
										}
										className={`relative block cursor-pointer p-4 border transition-colors ${values.paymentMethod === "card" ? "bg-[#e50914] border-[#e50914] text-white" : "bg-transparent border-neutral-700 text-white hover:border-neutral-500"}`}
									>
										<div className="flex items-center gap-2.5">
											<input
												type="radio"
												name="paymentMethod"
												checked={
													values.paymentMethod ===
													"card"
												}
												onChange={() =>
													updateField(
														"paymentMethod",
														"card" as PaymentOptionId,
													)
												}
												className="sr-only"
											/>
											<span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white">
												{values.paymentMethod ===
													"card" && (
													<span className="h-2 w-2 rounded-full bg-white" />
												)}
											</span>
											<CreditCard size={16} />
											<span className="font-mono text-sm font-bold uppercase tracking-wider">
												CREDIT / DEBIT CARD
											</span>
										</div>
										<p className="mt-1.5 pl-7 font-mono text-xs text-white/90">
											Instant online card authorization
											(Visa / Mastercard).
										</p>
									</label>

									{values.paymentMethod === "card" && (
										<div className="border border-t-0 border-[#e50914] bg-[#1c1c1f] p-5 space-y-4">
											<div>
												<label className="block font-display text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-300">
													NAME ON CARD
												</label>
												<input
													type="text"
													maxLength={100}
													value={
														cardDetails.cardholderName
													}
													onChange={(e) => {
														setCardDetails((p) => ({
															...p,
															cardholderName:
																e.target.value,
														}));
														setCardErrors((p) => ({
															...p,
															cardholderName:
																undefined,
														}));
													}}
													placeholder="JUAN DELA CRUZ"
													className="w-full bg-[#f5f3ec] px-3 py-2 font-mono text-sm uppercase text-[#141414] focus:outline-none"
												/>
												{cardErrors.cardholderName && (
													<p className="mt-1 font-mono text-xs text-red-400">
														{
															cardErrors.cardholderName
														}
													</p>
												)}
											</div>

											<div>
												<label className="block font-display text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-300">
													CARD NUMBER (16 DIGITS)
												</label>
												<input
													type="text"
													inputMode="numeric"
													maxLength={19}
													value={
														cardDetails.cardNumber
													}
													onChange={(e) => {
														setCardDetails((p) => ({
															...p,
															cardNumber:
																formatCardNumber(
																	e.target
																		.value,
																),
														}));
														setCardErrors((p) => ({
															...p,
															cardNumber:
																undefined,
														}));
													}}
													placeholder="4532 •••• •••• ••••"
													className="w-full bg-[#f5f3ec] px-3 py-2 font-mono text-sm tracking-widest text-[#141414] focus:outline-none"
												/>
												{cardErrors.cardNumber && (
													<p className="mt-1 font-mono text-xs text-red-400">
														{cardErrors.cardNumber}
													</p>
												)}
											</div>

											<div className="grid grid-cols-2 gap-4">
												<div>
													<label className="block font-display text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-300">
														EXPIRY (MM/YY)
													</label>
													<input
														type="text"
														inputMode="numeric"
														maxLength={5}
														value={
															cardDetails.expiry
														}
														onChange={(e) => {
															setCardDetails(
																(p) => ({
																	...p,
																	expiry: formatCardExpiry(
																		e.target
																			.value,
																	),
																}),
															);
															setCardErrors(
																(p) => ({
																	...p,
																	expiry: undefined,
																}),
															);
														}}
														placeholder="08/29"
														className="w-full bg-[#f5f3ec] px-3 py-2 font-mono text-sm text-[#141414] focus:outline-none"
													/>
													{cardErrors.expiry && (
														<p className="mt-1 font-mono text-xs text-red-400">
															{cardErrors.expiry}
														</p>
													)}
												</div>

												<div>
													<label className="block font-display text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-300">
														CVC / CVV
													</label>
													<input
														type="password"
														inputMode="numeric"
														maxLength={4}
														value={cardDetails.cvc}
														onChange={(e) => {
															setCardDetails(
																(p) => ({
																	...p,
																	cvc: e.target.value
																		.replace(
																			/\D/g,
																			"",
																		)
																		.slice(
																			0,
																			4,
																		),
																}),
															);
															setCardErrors(
																(p) => ({
																	...p,
																	cvc: undefined,
																}),
															);
														}}
														placeholder="123"
														className="w-full bg-[#f5f3ec] px-3 py-2 font-mono text-sm text-[#141414] focus:outline-none"
													/>
													{cardErrors.cvc && (
														<p className="mt-1 font-mono text-xs text-red-400">
															{cardErrors.cvc}
														</p>
													)}
												</div>
											</div>
										</div>
									)}
								</div>

								{/* 4. MOCK GCASH / QR PH */}
								<label
									onClick={() =>
										updateField(
											"paymentMethod",
											"gcash" as PaymentOptionId,
										)
									}
									className={`relative block cursor-pointer p-4 border transition-colors ${values.paymentMethod === "gcash" ? "bg-[#e50914] border-[#e50914] text-white" : "bg-transparent border-neutral-700 text-white hover:border-neutral-500"}`}
								>
									<div className="flex items-center gap-2.5">
										<input
											type="radio"
											name="paymentMethod"
											checked={
												values.paymentMethod === "gcash"
											}
											onChange={() =>
												updateField(
													"paymentMethod",
													"gcash" as PaymentOptionId,
												)
											}
											className="sr-only"
										/>
										<span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white">
											{values.paymentMethod ===
												"gcash" && (
												<span className="h-2 w-2 rounded-full bg-white" />
											)}
										</span>
										<QrCode size={16} />
										<span className="font-mono text-sm font-bold uppercase tracking-wider">
											GCASH / QR PH (SCAN TO PAY)
										</span>
									</div>
									<p className="mt-1.5 pl-7 font-mono text-xs text-white/90">
										Generates a dynamic QR code modal upon
										placing your order.
									</p>
								</label>

								{/* CASH READY DROPDOWN (Only shown for COD / COD E-Wallet) */}
								{(values.paymentMethod === "cod" ||
									values.paymentMethod === "cod_ewallet") && (
									<div className="pt-2">
										<label
											className={`block font-display text-sm font-bold uppercase tracking-wider mb-2 ${values.paymentMethod === "cod_ewallet" ? "opacity-50" : ""}`}
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
											className="w-full appearance-none bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed focus:outline-none"
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
											className={`mt-1 h-[3px] w-3/5 ${values.paymentMethod === "cod_ewallet" ? "bg-neutral-600 opacity-50" : "bg-[#e50914]"}`}
										/>

										{values.paymentMethod === "cod" &&
											values.cashReadyOption ===
												"custom" && (
												<div className="mt-4">
													<input
														type="text"
														inputMode="numeric"
														maxLength={15}
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
														className="w-full bg-[#f5f3ec] px-3 py-2.5 font-mono text-base text-[#141414] focus:outline-none border border-neutral-400"
													/>
													<div className="mt-1 h-[3px] w-2/5 bg-[#e50914]" />
												</div>
											)}
									</div>
								)}
							</div>
						</section>
					</div>

					{/* RIGHT SIDE: Sticky Receipt */}
					<div className="relative lg:sticky lg:top-[calc(var(--nav-h)+2rem)] h-fit">
						<img
							src={redStarGraphicSvg}
							alt=""
							aria-hidden="true"
							className="pointer-events-none select-none hidden lg:block absolute top-1/2 z-30 h-[1000px] w-auto max-w-none -translate-y-1/2 right-full mr-[3rem] translate-x-1/2"
						/>

						<div className="relative w-full pr-2 pb-2">
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
										<p className="py-6 text-center text-sm text-neutral-500">
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
									<label className="block text-sm font-bold uppercase tracking-wider mb-2">
										VOUCHER CODE
									</label>
									<div className="flex items-stretch gap-2">
										<input
											type="text"
											maxLength={40}
											value={values.voucherCode}
											onChange={(e) =>
												updateField(
													"voucherCode",
													e.target.value.toUpperCase(),
												)
											}
											placeholder="REBEL200"
											className="flex-1 bg-white px-4 py-3 text-base text-[#141414] border border-neutral-300 focus:border-[#141414] focus:outline-none"
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
										<p className="mt-1.5 text-xs text-[#e50914] font-bold">
											{voucherError}
										</p>
									)}
									{voucher && !voucherError && (
										<p className="mt-1.5 text-xs text-emerald-700 font-bold">
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
									<p className="mt-3 text-[15px] text-neutral-600">
										{values.paymentMethod === "cod"
											? "Pay in cash to the rider on delivery."
											: values.paymentMethod ===
												  "cod_ewallet"
												? "Pay the rider by GCash or Maya QR at your door."
												: values.paymentMethod ===
													  "card"
													? "Card will be authorized immediately upon placing order."
													: "Scan the GCash / QR Ph code in the next step to confirm."}
									</p>
								</div>
							</div>

							<div className="relative z-40 mt-6 pl-2">
								<label className="flex items-center gap-3 cursor-pointer font-mono text-[15px] text-[#141414]">
									<input
										type="checkbox"
										checked={values.agreedToTerms}
										onChange={(e) => {
											if (
												!hasScrolledToBottom &&
												e.target.checked
											) {
												e.preventDefault();
												setShowTermsModal(true);
											} else {
												updateField(
													"agreedToTerms",
													e.target.checked,
												);
											}
										}}
										className="h-5 w-5 accent-[#141414]"
									/>
									<span>
										I agree to the{" "}
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												setShowTermsModal(true);
											}}
											className="underline hover:text-[#e50914]"
										>
											Terms and Return Policy
										</button>
										.
									</span>
								</label>
								{errors.agreedToTerms && (
									<p className="mt-1.5 font-mono text-xs text-[#e50914] font-bold">
										{errors.agreedToTerms}
									</p>
								)}
							</div>

							{submitError && (
								<div className="relative z-40 mt-3 border border-[#e50914] bg-red-50 px-3 py-2 font-mono text-sm text-[#e50914] font-bold">
									{submitError}
								</div>
							)}

							<div className="relative z-40 mt-5">
								<AngledButton
									variant="buyNow"
									type="submit"
									className="w-full"
									disabled={
										submitting ||
										cartBusy ||
										checkoutItems.length === 0
									}
								>
									{submitting
										? "PROCESSING..."
										: values.paymentMethod === "cod"
											? "PLACE ORDER - COD"
											: values.paymentMethod ===
												  "cod_ewallet"
												? "PLACE ORDER - COD / QR"
												: values.paymentMethod ===
													  "card"
													? "PAY & PLACE ORDER - CARD"
													: "GENERATE QR & PAY"}
								</AngledButton>
							</div>
						</div>
					</div>
				</form>
			</div>

			{/* MOCK CARD PROCESSING OVERLAY */}
			{cardProcessingStage && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
					<div className="w-full max-w-md bg-[#141414] text-white border-2 border-[#e50914] shadow-[8px_8px_0_#e50914] p-8 font-mono text-center space-y-5">
						<Loader2
							size={44}
							className="mx-auto animate-spin text-[#e50914]"
						/>
						<h3 className="font-display text-2xl font-black uppercase tracking-wide">
							PROCESSING CARD
						</h3>
						<p className="text-xs text-neutral-300 uppercase tracking-widest">
							{cardProcessingStage}
						</p>
						<div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 pt-2">
							<ShieldCheck size={15} />
							<span>256-Bit Encrypted Mock Gateway</span>
						</div>
					</div>
				</div>
			)}

			{/* MOCK GCASH / QR SCANNER MODAL */}
			{qrModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-text"
					onClick={() => !submitting && setQrModalOpen(false)}
				>
					<div
						className="relative w-full max-w-md bg-[#f5f3ec] border-4 border-[#141414] shadow-[10px_10px_0_#e50914] p-6 sm:p-8 font-mono text-[#141414]"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b-2 border-dashed border-[#141414] pb-4 mb-5">
							<div>
								<h2 className="font-display text-2xl font-black uppercase tracking-tight">
									SCAN TO PAY (GCASH / QR)
								</h2>
								<p className="text-xs text-neutral-600">
									Amount Due:{" "}
									<strong className="text-[#e50914]">
										{formatPrice(finalTotal)}
									</strong>
								</p>
							</div>
							<button
								type="button"
								disabled={submitting}
								onClick={() => setQrModalOpen(false)}
								className="h-8 w-8 flex items-center justify-center border border-[#141414] font-display text-xl font-black hover:bg-[#e50914] hover:text-white transition-colors cursor-pointer"
								aria-label="Close QR modal"
							>
								&times;
							</button>
						</div>

						{qrConfirmedRef ? (
							<div className="py-10 text-center space-y-4">
								<Loader2
									size={40}
									className="mx-auto animate-spin text-emerald-600"
								/>
								<p className="font-display text-xl font-black uppercase text-emerald-700">
									QR PAYMENT RECEIVED!
								</p>
								<p className="text-xs text-neutral-600">
									Reference: {qrConfirmedRef} — Confirming
									your order...
								</p>
							</div>
						) : (
							<div className="space-y-5 text-center">
								<div className="mx-auto w-56 h-56 bg-white border-4 border-[#141414] p-3 flex items-center justify-center shadow-[4px_4px_0_#141414]">
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetUrl)}`}
										alt="Scan QR to Pay"
										className="w-full h-full object-contain"
									/>
								</div>

								<div className="flex items-center justify-center gap-2 text-xs font-bold uppercase text-neutral-700">
									<Loader2
										size={15}
										className="animate-spin text-[#e50914]"
									/>
									<span>
										Waiting for QR scan confirmation...
									</span>
								</div>

								<p className="text-xs text-neutral-600 leading-relaxed">
									Scan the QR code with your phone, or click
									below to open the QR Payment Confirmation
									Page directly in a new tab.
								</p>

								<div className="pt-2 space-y-2.5">
									<a
										href={qrTargetUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="w-full py-3 px-4 bg-[#141414] text-white font-display text-sm font-black uppercase tracking-wider hover:bg-[#e50914] transition-colors flex items-center justify-center gap-2"
									>
										<span>OPEN QR CONFIRMATION PAGE</span>
										<ExternalLink size={15} />
									</a>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* TERMS AND RETURN POLICY MODAL */}
			{showTermsModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-text"
					onClick={() => setShowTermsModal(false)}
				>
					<div
						className="relative w-full max-w-2xl bg-[#f5f3ec] border-2 border-[#141414] shadow-[8px_8px_0_#141414] p-6 sm:p-8 font-mono text-[#141414] max-h-[85vh] flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b-2 border-dashed border-[#141414] pb-4 mb-4 shrink-0">
							<h2 className="font-display text-2xl font-black uppercase tracking-tight">
								Terms & Return Policy
							</h2>
							<button
								type="button"
								onClick={() => setShowTermsModal(false)}
								className="h-8 w-8 flex items-center justify-center border border-[#141414] font-display text-xl font-black hover:bg-[#e50914] hover:text-white hover:border-[#e50914] transition-colors cursor-pointer"
								aria-label="Close modal"
							>
								&times;
							</button>
						</div>

						<div
							ref={termsScrollRef}
							onScroll={handleTermsScroll}
							className="overflow-y-auto pr-2 space-y-5 text-sm leading-relaxed flex-1"
						>
							<div>
								<h3 className="font-extrabold text-black uppercase tracking-wide mb-2">
									1. Pricing, Payments & Orders
								</h3>
								<p>
									All product prices are stated in Philippine
									Peso (PHP) and are subject to change without
									prior notice. We accept payments via GCash,
									Maya, Bank Transfer, and Cash on Delivery
									(COD). By confirming an order, you agree to
									pay the total amount including shipping
									fees. Unpaid orders (except COD) will be
									automatically cancelled after 24 hours.
								</p>
							</div>
							<div>
								<h3 className="font-extrabold text-black uppercase tracking-wide mb-2">
									2. Shipping & Delivery
								</h3>
								<p>
									We fulfill orders via local courier partners
									(e.g., J&T Express, LBC). Standard delivery
									within Metro Manila takes 1-3 business days,
									while provincial shipping takes 3-7 business
									days. Snug Rebel is not liable for delays
									caused by severe weather (typhoons),
									inaccurate shipping information, or
									third-party courier handling issues.
								</p>
							</div>
							<div>
								<h3 className="font-extrabold text-[#e50914] uppercase tracking-wide mb-2">
									3. Returns & Exchanges (DTI Compliance)
								</h3>
								<p>
									In compliance with the Department of Trade
									and Industry (DTI) regulations (R.A. 7394 -
									Consumer Act of the Philippines), we accept
									returns strictly for defective or damaged
									goods within seven (7) days of receipt. We
									do not offer refunds or exchanges for
									"change of mind." Items must be unwashed,
									unworn, and have original tags attached.
								</p>
							</div>
							<div>
								<h3 className="font-extrabold text-black uppercase tracking-wide mb-2">
									4. Governing Law
								</h3>
								<p>
									These Terms shall be governed by and
									construed in accordance with the laws of the
									Republic of the Philippines. Any disputes
									arising from these Terms shall be subject to
									the exclusive jurisdiction of the courts
									located in the City of Manila.
								</p>
							</div>
						</div>

						<div className="mt-6 pt-4 border-t-2 border-dashed border-[#141414] shrink-0">
							<button
								type="button"
								disabled={!hasScrolledToBottom}
								onClick={() => {
									updateField("agreedToTerms", true);
									setShowTermsModal(false);
								}}
								className={`w-full py-3 font-display font-black uppercase tracking-wider transition-colors cursor-pointer ${
									hasScrolledToBottom
										? "bg-[#141414] text-white hover:bg-[#e50914]"
										: "bg-neutral-300 text-neutral-500 cursor-not-allowed"
								}`}
							>
								{hasScrolledToBottom
									? "I Agree"
									: "Scroll to bottom to agree"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
