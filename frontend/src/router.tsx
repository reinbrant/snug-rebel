import { createBrowserRouter } from "react-router";
import { ITEM_ROUTE_PATTERN, ROUTES } from "./routes.ts";
import RootLayout from "./layouts/RootLayout.tsx";
import ItemDetail from "./pages/ItemDetail.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import Shop from "./pages/ShoppingPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import PlaceholderPage from "./pages/PlaceholderPage.tsx";

/** Route table. Swap each PlaceholderPage for the real page when it is made. */
export const router = createBrowserRouter([
	{
		element: <RootLayout />,
		children: [
			{ path: ROUTES.home, element: <LandingPage /> },
			{ path: ROUTES.shop, element: <Shop /> },
			{ path: ITEM_ROUTE_PATTERN, element: <ItemDetail /> }, // /shop/:itemId
			{ path: ROUTES.checkout, element: <CheckoutPage /> },
			{ path: ROUTES.about, element: <PlaceholderPage title="About" /> },
			{
				path: ROUTES.orders,
				element: <PlaceholderPage title="Orders" />,
			},
			{ path: "*", element: <PlaceholderPage title="Page not found" /> },
		],
	},
]);
