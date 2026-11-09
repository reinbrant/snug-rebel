import { type ReactNode } from "react";
import categoryHeader from "../../assets/shoppingpage_category_filter_header.svg";
import sortHeader from "../../assets/shoppingpage_sort_filter_header.svg";
import starBg from "../../assets/snugrebel_star_bg.png";
import ShopFilterButton from "./ShopFilterButton";
import {
	CATEGORIES,
	SORT_OPTIONS,
	type Category,
	type SortKey,
} from "../../data/products";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";

type ShopSidebarProps = {
	sort: SortKey;
	onSortChange: (sort: SortKey) => void;
	category: Category | null;
	onCategoryChange: (category: Category | null) => void;
	showSaleOnly: boolean;
	onSaleOnlyChange: (saleOnly: boolean) => void;
	isOpen: boolean;
	onToggle: () => void;
	navbarHidden: boolean;
	className?: string;
};

type HeadingArt = {
	src: string;
	width: number;
	height: number;
	textBox: { top: number; right: number; bottom: number; left: number };
	fontSizeCqw: number;
};

const HEADING_SCALE = 0.45;

const SORT_HEADING: HeadingArt = {
	src: sortHeader,
	width: 359,
	height: 118,
	textBox: { top: 17, right: 10, bottom: 32, left: 15.5 },
	fontSizeCqw: 16,
};
const CATEGORY_HEADING: HeadingArt = {
	src: categoryHeader,
	width: 469,
	height: 174,
	textBox: { top: 21, right: 11, bottom: 28, left: 5 },
	fontSizeCqw: 12,
};

function SidebarHeading({
	id,
	art,
	children,
}: {
	id: string;
	art: HeadingArt;
	children: ReactNode;
}) {
	const { top, right, bottom, left } = art.textBox;
	return (
		<div
			className="relative mx-auto lg:mx-0"
			style={{
				aspectRatio: `${art.width} / ${art.height}`,
				width: `min(100%, ${art.width * HEADING_SCALE}px)`,
				containerType: "inline-size",
			}}
		>
			<img
				src={art.src}
				alt=""
				draggable={false}
				className="absolute inset-0 size-full select-none"
			/>
			<h2
				id={id}
				className="absolute flex items-center justify-center whitespace-nowrap text-center font-display font-black leading-none tracking-tight text-white [font-stretch:110%]"
				style={{
					top: `${top}%`,
					right: `${right}%`,
					bottom: `${bottom}%`,
					left: `${left}%`,
					fontSize: `${art.fontSizeCqw}cqw`,
				}}
			>
				{children}
			</h2>
		</div>
	);
}

export default function ShopSidebar({
	sort,
	onSortChange,
	category,
	onCategoryChange,
	showSaleOnly,
	onSaleOnlyChange,
	isOpen,
	onToggle,
	navbarHidden,
	className = "",
}: ShopSidebarProps) {
	return (
		<>
			{/* Mobile Toggle Button */}
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={isOpen}
				className="md:hidden fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl font-display font-extrabold uppercase text-xs tracking-wider shadow-[4px_4px_0_var(--color-brand-red)] border-2 border-white hover:bg-neutral-900 transition-all active:translate-y-0.5 cursor-pointer"
			>
				<SlidersHorizontal size={16} />
				<span>{isOpen ? "Hide Filters" : "Filter & Sort"}</span>
			</button>

			{/* Sidebar Panel: z-20 keeps it below the footer (z-30) so the footer can slide OVER it */}
			<aside
				className={[
					"fixed inset-y-0 left-0 z-20 w-[280px] bg-[#19191c] bg-cover bg-center px-5 shadow-2xl transition-all duration-300 ease-in-out flex flex-col border-r border-neutral-800",
					navbarHidden
						? "top-0 h-[100vh] pt-4"
						: "top-[var(--nav-h)] h-[calc(100vh-var(--nav-h))] pt-3",
					isOpen ? "translate-x-0" : "-translate-x-full md:invisible",
					className,
				].join(" ")}
				style={{ backgroundImage: `url(${starBg})` }}
			>
				<div className="flex flex-col w-full h-full overflow-y-auto pb-12">
					{/* Header with Collapse Button */}
					<div className="flex items-center justify-between pb-2.5 border-b border-neutral-800/60 w-full shrink-0">
						<span className="font-display font-extrabold text-white uppercase tracking-[0.15em] text-[10px]">
							Filters & Sorting
						</span>
						<button
							type="button"
							onClick={onToggle}
							title="Collapse sidebar"
							className="inline-flex items-center gap-1 bg-white text-black pl-1.5 pr-2.5 py-1 rounded-md font-display font-black text-[9px] uppercase tracking-wider hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
						>
							<ChevronLeft size={14} strokeWidth={3} /> COLLAPSE
						</button>
					</div>

					{/* 1. Categories */}
					<section
						aria-labelledby="shop-category-heading"
						className="w-full shrink-0 mt-2"
					>
						<SidebarHeading
							id="shop-category-heading"
							art={CATEGORY_HEADING}
						>
							CATEGORIES
						</SidebarHeading>
						<div className="mt-0.5 flex flex-col items-start w-full">
							{CATEGORIES.filter(
								(option) => option.sidebar !== false,
							).map((option) => (
								<ShopFilterButton
									key={option.value}
									label={option.label}
									style={{ minHeight: "32px" }}
									className="scale-[0.80] origin-left py-0"
									selected={category === option.value}
									onClick={() =>
										onCategoryChange(
											category === option.value
												? null
												: option.value,
										)
									}
								/>
							))}
						</div>
					</section>

					{/* 2. Sorting & Extra Filters */}
					<section
						aria-labelledby="shop-sort-heading"
						className="w-full shrink-0 mt-0"
					>
						<SidebarHeading
							id="shop-sort-heading"
							art={SORT_HEADING}
						>
							Sort By:
						</SidebarHeading>
						<div className="mt-0.5 flex flex-col items-start w-full">
							{SORT_OPTIONS.map((option) => (
								<ShopFilterButton
									key={option.value}
									label={option.label}
									style={{ minHeight: "32px" }}
									className="scale-[0.80] origin-left py-0"
									selected={sort === option.value}
									onClick={() => onSortChange(option.value)}
								/>
							))}

							<div className="my-1 ml-2 h-px w-full max-w-[180px] bg-neutral-800/80" />

							<ShopFilterButton
								label="🔥 ON SALE"
								style={{ minHeight: "32px" }}
								className="scale-[0.80] origin-left text-brand-red font-extrabold py-0"
								selected={showSaleOnly}
								onClick={() => onSaleOnlyChange(!showSaleOnly)}
							/>
						</div>
					</section>
				</div>
			</aside>
		</>
	);
}
