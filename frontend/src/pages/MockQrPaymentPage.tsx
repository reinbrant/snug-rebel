import { useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { formatPrice } from "../helpers/priceFormat";
import logoWhite from "../assets/snugrebel_logo_white.svg";

export default function MockQrPaymentPage() {
	const [searchParams] = useSearchParams();
	const sessionId = searchParams.get("session") ?? "DEMO-SESSION";
	const amount = Number(searchParams.get("amount") ?? 0);
	const recipient = searchParams.get("recipient") ?? "Rebel Customer";

	const [processing, setProcessing] = useState(false);
	const [paid, setPaid] = useState(false);
	const [refNo] = useState(
		() => `GC-${Math.floor(100000000 + Math.random() * 900000000)}`,
	);

	const handleConfirmPayment = () => {
		setProcessing(true);
		setTimeout(() => {
			const payload = {
				sessionId,
				status: "PAID",
				referenceNumber: refNo,
				paidAt: new Date().toISOString(),
			};

			// Notify the Checkout page tab via localStorage + BroadcastChannel
			localStorage.setItem(
				`snug-qr-paid-${sessionId}`,
				JSON.stringify(payload),
			);
			if (typeof BroadcastChannel !== "undefined") {
				const bc = new BroadcastChannel("snug_qr_channel");
				bc.postMessage(payload);
				bc.close();
			}

			setProcessing(false);
			setPaid(true);
		}, 1200);
	};

	return (
		<div className="min-h-[calc(100vh-var(--nav-h,64px))] bg-[#111] text-white flex items-center justify-center p-4 font-mono">
			<div className="w-full max-w-md bg-[#f5f3ec] text-[#141414] border-4 border-black shadow-[10px_10px_0_#e50914] p-6 sm:p-8">
				{/* Header */}
				<div className="flex items-center justify-between bg-[#141414] text-white px-4 py-3 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 border-b-4 border-[#e50914]">
					<div className="flex items-center gap-2.5">
						<Smartphone size={20} className="text-[#e50914]" />
						<span className="font-display text-sm font-black uppercase tracking-wider">
							GCash / QR Ph Gateway
						</span>
					</div>
					<img
						src={logoWhite}
						alt="Snug Rebel"
						className="h-6 w-auto"
					/>
				</div>

				{paid ? (
					<div className="text-center py-6 space-y-5">
						<div className="mx-auto w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-[4px_4px_0_#141414]">
							<CheckCircle2 size={36} strokeWidth={2.5} />
						</div>
						<div>
							<h1 className="font-display text-3xl font-black uppercase tracking-tight text-[#141414]">
								PAYMENT SENT!
							</h1>
							<p className="mt-1 text-xs text-neutral-600 font-bold uppercase">
								Ref No. {refNo}
							</p>
						</div>

						<div className="bg-white border-2 border-dashed border-[#141414] p-4 text-left text-xs space-y-2">
							<div className="flex justify-between">
								<span className="text-neutral-500">
									MERCHANT
								</span>
								<span className="font-bold">SNUG REBEL PH</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-500">
									AMOUNT PAID
								</span>
								<span className="font-bold text-[#e50914]">
									{formatPrice(amount)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-500">STATUS</span>
								<span className="font-bold text-emerald-700">
									CONFIRMED
								</span>
							</div>
						</div>

						<p className="text-xs text-neutral-600 leading-relaxed">
							Your checkout tab has been notified and will
							automatically redirect to your Order Confirmation.
							You may now close this window.
						</p>

						<button
							type="button"
							onClick={() => window.close()}
							className="w-full py-3 bg-[#141414] text-white font-display font-black uppercase tracking-wider hover:bg-[#e50914] transition-colors cursor-pointer"
						>
							CLOSE WINDOW
						</button>
					</div>
				) : (
					<div className="space-y-6">
						<div className="text-center border-b-2 border-dashed border-[#141414] pb-5">
							<p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
								You are paying
							</p>
							<h1 className="font-display text-2xl font-black uppercase mt-1">
								SNUG REBEL STREETWEAR
							</h1>
							<p className="font-display text-4xl font-black text-[#e50914] mt-3">
								{formatPrice(amount)}
							</p>
						</div>

						<div className="space-y-2.5 text-xs bg-white p-4 border border-[#141414]">
							<div className="flex justify-between">
								<span className="text-neutral-500 uppercase">
									Buyer
								</span>
								<span className="font-bold uppercase">
									{recipient}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-500 uppercase">
									Payment Channel
								</span>
								<span className="font-bold">
									GCash / QR Ph (Mock)
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-500 uppercase">
									Reference ID
								</span>
								<span className="font-mono text-[11px]">
									QR-TXN-{sessionId.slice(-6).toUpperCase()}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-neutral-200/70 px-3 py-2 border-l-4 border-[#141414]">
							<ShieldCheck size={18} className="shrink-0" />
							<span>
								Simulated QR checkout page. Tap confirm below to
								authorize this mock payment.
							</span>
						</div>

						<button
							type="button"
							disabled={processing}
							onClick={handleConfirmPayment}
							className="w-full py-4 bg-[#e50914] text-white font-display text-lg font-black uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0_#141414] hover:bg-[#141414] transition-colors cursor-pointer disabled:opacity-50"
						>
							{processing
								? "AUTHORIZING PAYMENT..."
								: `CONFIRM & PAY ${formatPrice(amount)}`}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
