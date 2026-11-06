import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import {
	ApiError,
	addToCart,
	changeCartItemVariant,
	clearCart,
	EMPTY_CART,
	fetchCart,
	removeCartItem,
	updateCartItem,
	type Cart,
	type CartOwner,
} from "../api/cart";
import { getSessionToken } from "../api/session";
import { CartContext, type CartContextValue } from "./cartContext";
import { useAuth } from './authContext';

const messageOf = (e: unknown) =>
	e instanceof ApiError
		? (e.serverMessage ?? "Something went wrong. Please try again.")
		: e instanceof Error
			? e.message
			: "Something went wrong.";

/** Holds the cart for the whole app. Wrap it around the router (see App.tsx). */
export function CartProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
	const [cart, setCart] = useState<Cart>(EMPTY_CART);
	const [status, setStatus] = useState<CartContextValue["status"]>("loading");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(0);
	const [isOpen, setIsOpen] = useState(false);

    const userId = auth.user?.pkUserId;
	const owner = useMemo<CartOwner>(
		() => userId ? { userId } : { sessionToken: getSessionToken() },
		[userId],
	);

	const refresh = useCallback(async () => {
		if (auth.status === 'loading' || auth.status === 'error') return;
		try {
			setCart(await fetchCart(owner));
			setStatus("ready");
			setError(null);
		} catch (e) {
			setStatus("error");
			setError(messageOf(e));
		}
	}, [owner, auth.status]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void refresh();
	}, [refresh]);

	/** Runs one change. Counts it as "busy", reports failures through `error`. */
	const run = useCallback(
		async (action: () => Promise<Cart | void>): Promise<boolean> => {
			setPending((n) => n + 1);
			try {
				const next = await action();
				if (next) setCart(next);
				setError(null);
				return true;
			} catch (e) {
				setError(messageOf(e));
				return false;
			} finally {
				setPending((n) => n - 1);
			}
		},
		[],
	);

	const value = useMemo<CartContextValue>(
		() => ({
			lines: cart.lines,
			itemCount: cart.lines.reduce((sum, l) => sum + l.quantity, 0),
			subtotal: cart.lines.reduce(
				(sum, l) => sum + l.unitPrice * l.quantity,
				0,
			),
			status,
			error,
			busy: pending > 0 || auth.status === 'loading' || auth.status === 'error',
			owner,

			isOpen,
			openCart: () => setIsOpen(true),
			closeCart: () => setIsOpen(false),

			addItem: (target, quantity = 1) =>
				run(() => addToCart(owner, target, quantity)),
			setQuantity: (lineId, quantity) =>
				run(async () => {
					await updateCartItem(lineId, quantity);
					return fetchCart(owner);
				}),
			changeVariant: (lineId, change) =>
				run(async () => {
					await changeCartItemVariant(lineId, change);
					return fetchCart(owner);
				}),
			removeLine: (lineId) =>
				run(async () => {
					await removeCartItem(lineId);
					return fetchCart(owner);
				}),
			clear: () =>
				run(async () => {
					if (cart.id) await clearCart(cart.id);
					return fetchCart(owner);
				}),
			refresh,
			dismissError: () => setError(null),
		}),
		[cart, status, error, pending, isOpen, owner, run, refresh, auth.status],
	);

	return (
		<CartContext.Provider value={value}>{children}</CartContext.Provider>
	);
}
