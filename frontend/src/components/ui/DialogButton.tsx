import type { ComponentPropsWithRef } from "react";

/** Torn-paper tag outline, drawn in a 140 x 48 box. */
const SHAPE =
	"5,10 24,5 20,11 132,7 128,17 134,24 130,43 12,44 15,37 4,34 8,24";

// React 19: `ref` is a normal prop, so ComponentPropsWithRef lets callers focus the button.
export type DialogButtonVariant = "dark" | "light";

/** Resting colors per variant. Hover swaps them, so each button turns into the other one. */
const VARIANTS: Record<DialogButtonVariant, { shape: string; label: string }> =
	{
		dark: {
			shape: "fill-black stroke-white group-hover:fill-white group-hover:stroke-black",
			label: "fill-white group-hover:fill-black",
		},
		light: {
			shape: "fill-white stroke-black group-hover:fill-black group-hover:stroke-white",
			label: "fill-black group-hover:fill-white",
		},
	};

type DialogButtonProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
	/** "dark" = black with white outline (default). "light" = white with black outline. */
	variant?: DialogButtonVariant;
	children: string;
};

/**
 * "Yes" / "No" tag button for the confirmation dialog, drawn as an SVG.
 *  - rest:  "dark" = black face / white outline / white label, "light" = the inverse
 *  - hover: colors swap, tag tilts and grows slightly
 *  - click: tag presses down and straightens
 * Size it from the parent with className (e.g. "w-28").
 */
export default function DialogButton({
	variant = "dark",
	className = "w-28",
	type = "button",
	children,
	...rest
}: DialogButtonProps) {
	return (
		<button
			type={type}
			className={[
				"group inline-block cursor-pointer select-none",
				"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
				"disabled:pointer-events-none disabled:opacity-40",
				className,
			].join(" ")}
			{...rest}
		>
			<svg
				viewBox="0 0 140 48"
				aria-hidden="true"
				className="block w-full overflow-visible transition-transform duration-150 group-hover:-rotate-2 group-hover:scale-105 group-active:rotate-0 group-active:scale-95"
			>
				<polygon
					points={SHAPE}
					strokeWidth={4}
					strokeLinejoin="miter"
					className={[
						"transition-[fill,stroke] duration-150",
						VARIANTS[variant].shape,
					].join(" ")}
				/>
				<text
					x="70"
					y="26"
					textAnchor="middle"
					dominantBaseline="central"
					className={[
						"font-display uppercase transition-[fill] duration-150",
						VARIANTS[variant].label,
					].join(" ")}
					style={{
						fontSize: 24,
						fontWeight: 900,
						fontStretch: "125%",
					}}
				>
					{children}
				</text>
			</svg>
		</button>
	);
}
