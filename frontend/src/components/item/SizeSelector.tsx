import type { ItemSize, ItemVariant } from "../../api/items";

type SizeSelectorProps = {
	sizes: ItemSize[];
	/** Label of the selected size. */
	value: string;
	onChange: (label: string) => void;
	/** id of the visible label element. */
	labelledBy?: string;
	className?: string;

	// Pass variants to cross-check live inventory limits
	variants?: ItemVariant[];
	selectedColor?: string | null;
};

/** Square size picker (single choice). Unavailable sizes are struck through and can't be picked. */
export default function SizeSelector({
	sizes,
	value,
	onChange,
	labelledBy,
	className = "",
	variants,
	selectedColor,
}: SizeSelectorProps) {
	return (
		<div
			role="radiogroup"
			aria-labelledby={labelledBy}
			className={["flex flex-wrap gap-3 p-1", className].join(" ")}
		>
			{sizes.map((size) => {
				const selected = size.label === value;

				// Lookup variant matching this size + the actively selected color (if applicable)
				const variantCheck = variants?.find(
					(v) =>
						v.size === size.label &&
						(!selectedColor || v.color === selectedColor),
				);

				// Fall back to general availability if variants array isn't populated yet
				const stock = variantCheck?.stock ?? (size.available ? 1 : 0);
				const outOfStock = stock <= 0;

				return (
					<button
						key={size.label}
						type="button"
						role="radio"
						aria-checked={selected}
						disabled={outOfStock}
						title={outOfStock ? "Out of stock" : undefined}
						onClick={() => onChange(size.label)}
						className={[
							"flex h-14 w-16 items-center justify-center border-2 sm:h-16 sm:w-[4.5rem] transition-all duration-200",
							"font-display text-3xl font-bold uppercase [font-stretch:62%]",
							"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
							selected
								? "border-brand-red-dark text-brand-red-dark scale-105 shadow-sm" // Active highlight
								: "border-neutral-800 text-neutral-800 bg-white hover:border-black hover:text-black cursor-pointer", // Unselected but available
							outOfStock
								? "opacity-30 cursor-not-allowed !bg-neutral-100 !text-neutral-500 !border-neutral-400 line-through" // Out of stock styling
								: "",
						].join(" ")}
					>
						{size.label}
					</button>
				);
			})}
		</div>
	);
}
