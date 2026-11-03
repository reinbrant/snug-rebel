import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { Package, PackageCheck, ReceiptText, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import star_bg from "../assets/star_bg.jpg";
import order_divider from "../assets/order_divider.svg";

// --------------------------------------------------------
// SHIPPING TRACKER: TYPES, CONFIG & ARTWORK
// --------------------------------------------------------

/** 'completed' renders RED, 'pending' (not done yet / in progress) renders YELLOW. */
type StepStatus = "completed" | "pending";

interface TrackerStep {
  id: string;
  label: string;
  status: StepStatus;
  /** Shown only when the step is completed. */
  timestamp?: string;
  /** Shown only when the step is completed (hidden on small screens). */
  description?: string;
  shape: TrackerShapeData;
  Icon: LucideIcon;
}

interface TrackerShapeData {
  /** viewBox size of the original SVG file */
  width: number;
  height: number;
  /** Visual centre of the container "body" (excluding the paper-plane decorations), in viewBox units */
  center: { x: number; y: number };
  /** Bounding box of the original <mask> */
  maskBox: { x: number; y: number; width: number; height: number };
  /** Path used for the white fill + mask (from the original SVG) */
  fillPath: string;
  /** Path used for the coloured outline (from the original SVG) */
  strokePath: string;
  /** White paper-plane decorations (from the original SVG) */
  decorations: string[];
}

const STATUS_COLORS: Record<StepStatus, string> = {
  completed: "#F70305", // red used in the supplied SVGs
  pending: "#FFC633", // yellow used in the supplied SVGs
};

const ICON_COLOR = "#262626";

// Artwork copied verbatim from T1.svg – T4.svg. Only the stroke colour is made dynamic.
const SHAPE_T1: TrackerShapeData = {
  width: 203,
  height: 191,
  center: { x: 88, y: 102 },
  maskBox: { x: 0, y: 13.2487, width: 177, height: 178 },
  fillPath:
    "M132.78 22.2487L8 36.2487V119.249L15.044 177.249L153.912 182.249L168 166.749L158.44 26.7487L132.78 22.2487Z",
  strokePath:
    "M8 36.2487L132.78 22.2487L158.44 26.7487L168 166.749L153.912 182.249L15.044 177.249L8 119.249V36.2487Z",
  decorations: [
    "M194.706 1.54705L136.929 36.2366L201.046 26.1527L194.706 1.54705Z",
    "M191.474 37.2761L142.093 41.9514L189.765 53.7913L191.474 37.2761Z",
  ],
};

const SHAPE_T2: TrackerShapeData = {
  width: 204,
  height: 193,
  center: { x: 115, y: 88 },
  maskBox: { x: 26.001, y: -0.873657, width: 178, height: 178 },
  fillPath:
    "M49.4558 8.12634L35.001 16.438L43.9729 133.321L39.9854 159.815L186.527 168.126L195.001 39.2952L191.013 16.438L49.4558 8.12634Z",
  strokePath:
    "M35.001 16.438L49.4558 8.12634L191.013 16.438L195.001 39.2952L186.527 168.126L39.9854 159.815L43.9729 133.321L35.001 16.438Z",
  decorations: [
    "M15.501 166.626L10.001 152.126L50.501 142.126L52.501 147.626L15.501 166.626Z",
    "M14.7723 189.89L3.22507 179.449L55.2627 151.186L57.305 156.627L14.7723 189.89Z",
  ],
};

const SHAPE_T3: TrackerShapeData = {
  width: 229,
  height: 198,
  center: { x: 119, y: 107 },
  maskBox: { x: 30, y: 19, width: 178, height: 177 },
  fillPath:
    "M42.1728 27L52.289 68.6465L39 131.966L52.289 187L145.312 182.858L174.017 171.614L194.216 179.307L199 63.3207L194.216 27H42.1728Z",
  strokePath:
    "M52.289 68.6465L42.1728 27H194.216L199 63.3207L194.216 179.307L174.017 171.614L145.312 182.858L52.289 187L39 131.966L52.289 68.6465Z",
  decorations: [
    "M3.76282 37.5193L69.9294 50.305L15.4829 14.9742L3.76282 37.5193Z",
    "M30.0375 13.0923L69.9055 42.6031L42.342 1.94478L30.0375 13.0923Z",
    "M219.782 196.191L181.214 165L227.487 181.484L219.782 196.191Z",
  ],
};

const SHAPE_T4: TrackerShapeData = {
  width: 179,
  height: 177,
  center: { x: 89.5, y: 88 },
  maskBox: { x: -0.449714, y: -0.787361, width: 179, height: 178 },
  fillPath:
    "M169.55 19.6204L151.05 8.21265L28.0503 19.6205L9.55029 29.5071L17.2432 128.91L9.55029 149.433L33.5503 168.213L122.55 163.115L160.55 163.115L157.55 133.796L169.55 19.6204Z",
  strokePath:
    "M151.05 8.21265L169.55 19.6204L157.55 133.796L160.55 163.115L122.55 163.115L33.5503 168.213L9.55029 149.433L17.2432 128.91L9.55029 29.5071L28.0503 19.6205L151.05 8.21265Z",
  decorations: [],
};

const TRACKER_STEPS: TrackerStep[] = [
  {
    id: "placed",
    label: "Order Placed",
    status: "completed",
    timestamp: "Oct 12, 2026 | 11:41 PM",
    description: "Your order has been placed.",
    shape: SHAPE_T1,
    Icon: ReceiptText,
  },
  {
    id: "dispatched",
    label: "Dispatched",
    status: "completed",
    timestamp: "Oct 13, 2026 | 10:35 AM",
    description: "We're shipping your order to a hub near you.",
    shape: SHAPE_T2,
    Icon: Package,
  },
  {
    id: "in-transit",
    label: "In Transit",
    status: "completed",
    shape: SHAPE_T3,
    Icon: Truck,
  },
  {
    id: "delivered",
    label: "Delivered",
    status: "completed",
    shape: SHAPE_T4,
    Icon: PackageCheck,
  },
];

// Every shape is scaled relative to T1's width so all four share one scale.
const BASE_SHAPE_WIDTH = SHAPE_T1.width;
// Icon width in viewBox units (body of a container is ~160 units wide).
const ICON_VIEWBOX_UNITS = 72;

/** Inline version of the supplied SVG containers so the stroke colour can change per state. */
function TrackerShape({
  shape,
  color,
}: {
  shape: TrackerShapeData;
  color: string;
}) {
  const { width, height, fillPath, strokePath, decorations } = shape;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <path d={strokePath} stroke={color} strokeWidth={16} />
      <path d={fillPath} fill="white" />
      {decorations.map((d) => (
        <path
          key={d}
          d={d}
          fill="white"
          stroke="black"
          strokeWidth={2}
          strokeMiterlimit={16}
        />
      ))}
    </svg>
  );
}

/**
 * One step of the tracker: container artwork + Lucide icon, positioned so the container body's
 * centre sits exactly on the column's centre line (where the connector lines run).
 */
function TrackerNode({ step }: { step: TrackerStep }) {
  const { shape, Icon, status } = step;
  const { width, height, center } = shape;

  const wrapperStyle: CSSProperties = {
    width: `${(width / BASE_SHAPE_WIDTH) * 100}%`,
    aspectRatio: `${width} / ${height}`,
    left: "50%",
    top: "50%",
    transform: `translate(-${(center.x / width) * 100}%, -${(center.y / height) * 100}%)`,
  };

  const iconStyle: CSSProperties = {
    left: `${(center.x / width) * 100}%`,
    top: `${(center.y / height) * 100}%`,
    width: `${(ICON_VIEWBOX_UNITS / width) * 100}%`,
    aspectRatio: "1 / 1",
    transform: "translate(-50%, -50%)",
  };

  return (
    <div className="absolute z-10" style={wrapperStyle}>
      <TrackerShape shape={shape} color={STATUS_COLORS[status]} />
      <div className="absolute" style={iconStyle}>
        <Icon
          size="100%"
          strokeWidth={2}
          color={ICON_COLOR}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/**
 * Connector between step i-1 and step i.
 * Rule: a connector is RED only when the step it leads INTO is completed; otherwise YELLOW.
 */
function TrackerConnector({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden="true"
      className="absolute right-1/2 top-1/2 z-0 h-1 -translate-y-1/2 lg:h-[6px]"
      // 100% of the column + the grid's gap-2 (0.5rem) reaches the previous column's centre
      style={{
        width: "calc(100% + 0.5rem)",
        backgroundColor: STATUS_COLORS[status],
      }}
    />
  );
}

// --------------------------------------------------------
// PAGE
// --------------------------------------------------------

export default function OrderTrackingPage() {
  const [searchInput, setSearchInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [orderId, setOrderId] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setOrderId(searchInput.toUpperCase());
      setIsTracking(true);
    }
  };

  // --------------------------------------------------------
  // VIEW 1: SEARCH PAGE
  // --------------------------------------------------------
  if (!isTracking) {
    return (
      <div className="relative h-[calc(100vh-var(--nav-h,64px))] w-full bg-[#111] flex flex-col items-center justify-center font-display overflow-hidden">
        {/* Background Pattern */}
        <img
          src={star_bg}
          alt="Star Background"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col items-center -mt-20">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold uppercase tracking-widest mb-8">
            Track Your Order:
          </h1>

          {/* Skewed Search Container */}
          <form
            onSubmit={handleSearch}
            className="relative w-full max-w-2xl transform -skew-x-[6deg]"
          >
            {/* Top Right Jagged Accent */}
            <svg
              className="absolute -top-5 -right-5 w-12 h-12 text-white pointer-events-none z-20 drop-shadow-lg"
              viewBox="0 0 100 100"
              fill="currentColor"
              stroke="black"
              strokeWidth="4"
              strokeLinejoin="miter"
            >
              <polygon points="20,100 80,100 100,20 60,60 70,0 0,50" />
            </svg>

            {/* Bottom Left Jagged Accent */}
            <svg
              className="absolute -bottom-5 -left-6 w-12 h-12 text-white pointer-events-none z-20 drop-shadow-lg"
              viewBox="0 0 100 100"
              fill="currentColor"
              stroke="black"
              strokeWidth="4"
              strokeLinejoin="miter"
            >
              <polygon points="100,0 20,20 0,80 40,50 30,100 100,50" />
            </svg>

            {/* Input Field */}
            <div className="relative border-2 border-white bg-[#1a1a1a] shadow-[6px_6px_0px_#000]">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter your Order ID..."
                className="w-full bg-transparent text-white px-6 py-4 md:py-5 outline-none font-bold placeholder-neutral-500 tracking-wider text-sm md:text-base transform skew-x-[6deg]"
              />
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // VIEW 2: ORDER DETAILS PAGE (Non-Scrollable)
  // --------------------------------------------------------
  return (
    <div className="h-[calc(100vh-var(--nav-h,64px))] w-full flex flex-col font-display bg-[#111] overflow-hidden">
      {/* Top Section: Details Grid */}
      <div className="w-full px-6 py-4 lg:px-16 lg:py-8 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 shrink-0 z-10">
        {/* Column 1: Order Info */}
        <div className="flex flex-col">
          <h2 className="text-lg lg:text-xl font-extrabold uppercase tracking-widest mb-1">
            Order Tracking
          </h2>
          <p className="text-xs lg:text-sm font-extrabold mb-3 lg:mb-6">
            ORDER #{orderId || "12345678"}
          </p>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] lg:text-xs font-extrabold">
            <span className="text-black tracking-wide">ORDER STATUS</span>
            <span className="text-neutral-500">SHIPPED</span>

            <span className="text-black tracking-wide">ITEMS IN ORDER</span>
            <span className="text-neutral-500">2</span>

            <span className="text-black tracking-wide">EXP. ARRIVAL</span>
            <span className="text-neutral-500">Oct 29</span>
          </div>
        </div>

        {/* Column 2: Shipping Details */}
        <div className="flex flex-col">
          <h3 className="text-xs lg:text-sm font-extrabold uppercase tracking-widest mb-2 lg:mb-4">
            Shipping Details
          </h3>
          <div className="text-[10px] lg:text-xs font-bold text-neutral-600 leading-relaxed">
            <p>Reinbrant Mariano</p>
            <p>1234 Address, Tondo</p>
            <p>Metro Manila</p>
          </div>
        </div>

        {/* Column 3: Order Summary */}
        <div className="flex flex-col">
          <h3 className="text-xs lg:text-sm font-extrabold uppercase tracking-widest mb-2 lg:mb-4">
            Order Summary
          </h3>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] lg:text-xs font-extrabold border-b-2 border-black pb-2 mb-2">
            <span className="text-black">SUBTOTAL</span>
            <span className="text-neutral-600">P1000</span>

            <span className="text-black">SHIPPING</span>
            <span className="text-neutral-600">P90</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 text-xs lg:text-sm font-extrabold">
            <span className="text-black">TOTAL</span>
            <span className="text-black">P1090</span>
          </div>
        </div>

        {/* Column 4: Action Buttons */}
        <div className="flex flex-col gap-2 lg:gap-3 lg:items-end lg:justify-start pt-2 lg:pt-0">
          <button className="w-full lg:w-36 px-4 py-2 rounded-full border-2 border-black text-black font-extrabold text-[10px] lg:text-xs uppercase tracking-widest transition-all duration-200 hover:bg-black hover:text-white active:scale-95 focus:outline-none">
            View Invoice
          </button>

          <button className="w-full lg:w-36 px-4 py-2 rounded-full border-2 border-[#e60000] text-[#e60000] font-extrabold text-[10px] lg:text-xs uppercase tracking-widest transition-all duration-200 hover:bg-[#e60000] hover:text-white active:scale-95 focus:outline-none">
            File Return
          </button>
        </div>
      </div>

      {/* Divider Graphic - Changed bg to white to prevent black gap, scaling adjusted to match design */}
      <div className="w-full h-12 md:h-16 lg:h-24 bg-white shrink-0 relative z-20 overflow-hidden flex items-center justify-center">
        <img
          src={order_divider}
          alt="Divider"
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[20%] w-full min-w-[1000px] lg:min-w-[1400px] h-auto pointer-events-none drop-shadow-xl"
        />
      </div>

      {/* Bottom Section: Tracking Info */}
      <div className="relative flex-1 min-h-0 w-full bg-[#111] flex flex-col justify-center items-center pb-4 lg:pb-8">
        {/* Star Background Restored to match the mockup */}
        <img
          src={star_bg}
          alt="Star Background"
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center">
          {/* Shipping Status Tracker (containers + connectors + descriptive text) */}
          <ol
            aria-label="Shipping progress"
            className="w-full grid grid-cols-4 gap-2 text-center shrink-0 px-2 lg:px-12 mt-auto mb-6 lg:mb-12 list-none"
          >
            {TRACKER_STEPS.map((step, index) => {
              const isCompleted = step.status === "completed";

              return (
                <li
                  key={step.id}
                  className="relative flex flex-col items-center text-white"
                >
                  {/* Shape area: connector runs along its vertical centre, behind the container */}
                  <div className="relative w-full">
                    {index > 0 && <TrackerConnector status={step.status} />}
                    <div className="relative mx-auto aspect-square w-full max-w-[200px]">
                      <TrackerNode step={step} />
                    </div>
                  </div>

                  <h4 className="text-[10px] lg:text-xs font-extrabold uppercase tracking-wide mb-1">
                    {step.label}
                  </h4>

                  {isCompleted ? (
                    <>
                      <span className="text-[8px] lg:text-[10px] text-neutral-400 font-bold mb-2">
                        {step.timestamp}
                      </span>
                      {step.description && (
                        <p className="hidden md:block text-[9px] lg:text-[10px] text-neutral-300 font-bold leading-tight max-w-[120px]">
                          {step.description}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-[8px] lg:text-[10px] text-neutral-500 font-bold mb-2 italic">
                      In progress...
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
