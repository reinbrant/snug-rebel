import { Link } from "react-router";

/** Hand-cut outline, drawn in a 540 x 180 box. The face and its shadow share it. */
const SHAPE = "12,14 490,3 522,20 534,160 505,174 10,167 3,102";

type ShopButtonProps = {
	to: string;
	onClick?: () => void;
	children: string;
	/** Size it from the parent, e.g. "w-52". Defaults to w-44. */
	className?: string;
};

/**
 * "Shop" link-button drawn as an SVG.
 *  - rest:  white face, red outline, red label
 *  - hover: red face, white label, black shadow appears
 *  - click: the face drops onto its shadow
 */
export default function ShopButton({
	to,
	onClick,
	children,
	className = "w-44",
}: ShopButtonProps) {
	return (
		<Link
			to={to}
			onClick={onClick}
			className={[
				"group inline-block cursor-pointer select-none",
				"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
				className,
			].join(" ")}
		>
			<svg
				viewBox="-12 -12 574 214"
				aria-hidden="true"
				className="block w-full overflow-visible"
			>
				{/* shadow, only visible on hover */}
				<polygon
					points={SHAPE}
					transform="translate(16 14)"
					className="fill-black opacity-0 transition-opacity duration-100 group-hover:opacity-100"
				/>

				{/* face + label move together when pressed */}
				<g className="transition-transform duration-100 group-active:[transform:translate(12px,10px)]">
					<polygon
						points={SHAPE}
						strokeWidth={14}
						strokeLinejoin="miter"
						className="fill-white stroke-brand-red transition-[fill] duration-150 group-hover:fill-brand-red"
					/>
					<text
						x="270"
						y="92"
						textAnchor="middle"
						dominantBaseline="central"
						className="fill-brand-red font-display uppercase transition-[fill] duration-150 group-hover:fill-white"
						style={{
							fontSize: 76,
							fontWeight: 900,
							fontStretch: "125%",
						}}
					>
						{children}
					</text>
				</g>
			</svg>
		</Link>
	);
}
