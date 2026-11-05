import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dialogBox from "../../assets/confirmation_dialog_container.svg";
import DialogButton from "../ui/DialogButton";

/**
 * Where the text + buttons sit inside confirmation_dialog_container.svg, as % of the image.
 * The block is centered inside this box, so move the box to move the text:
 *   - text too far left?  raise `left` or lower `right`
 *   - text too high?      raise `top` or lower `bottom`
 * fontCqw is the font size as a % of the dialog's width.
 */
const CONTENT = { top: 6, right: 20, bottom: 0, left: 26, fontCqw: 2.7 };

type ConfirmDeleteDialogProps = {
	/** Shown to screen readers only, so they know which item is being deleted. */
	itemName: string;
	onConfirm: () => void;
	onCancel: () => void;
};

/**
 * Centered "Are you sure you want to delete this item?" dialog over a dimmed screen.
 * Clicking the dim area, pressing Escape or choosing "No" cancels.
 * Focus starts on "No" so an accidental Enter never deletes anything.
 */
export default function ConfirmDeleteDialog({
	itemName,
	onConfirm,
	onCancel,
}: ConfirmDeleteDialogProps) {
	const noRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		noRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onCancel]);

	return createPortal(
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-delete-text"
			className="fixed inset-0 z-[60] grid animate-cart-fade-in place-items-center bg-black/75 px-4 motion-reduce:animate-none"
			onClick={onCancel}
		>
			<div
				className="relative w-[min(96vw,900px)]"
				style={{ containerType: "inline-size" }}
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={dialogBox}
					alt=""
					draggable={false}
					className="block h-auto w-full select-none"
				/>

				{/* text + buttons are centered inside the CONTENT box */}
				<div
					className="absolute flex flex-col items-center justify-center gap-[3cqw] text-center"
					style={{
						top: `${CONTENT.top}%`,
						right: `${CONTENT.right}%`,
						bottom: `${CONTENT.bottom}%`,
						left: `${CONTENT.left}%`,
					}}
				>
					<p
						id="confirm-delete-text"
						className="font-display font-extrabold leading-tight text-white [font-stretch:125%]"
						style={{
							fontSize: `clamp(14px, ${CONTENT.fontCqw}cqw, 30px)`,
						}}
					>
						Are you sure you want to delete this item?
						<span className="sr-only"> ({itemName})</span>
					</p>
					<div className="flex items-center justify-center gap-[3cqw]">
						{/* Yes: black / white outline. No: white / black outline. Hover swaps them. */}
						<DialogButton
							variant="dark"
							className="w-[15cqw] min-w-16"
							onClick={onConfirm}
						>
							Yes
						</DialogButton>
						<DialogButton
							ref={noRef}
							variant="light"
							className="w-[15cqw] min-w-16"
							onClick={onCancel}
						>
							No
						</DialogButton>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
