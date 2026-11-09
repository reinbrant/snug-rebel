import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { apiFetch } from '../api/api'
import { authErrorMessage } from '../api/auth'
import { useAuth } from '../context/authContext'
import { formatPrice } from '../helpers/priceFormat'
import { ROUTES } from '../routes'
import '../styles/Account.css'
import DemographicsForm from '../components/DemographicsForm'

type CustomerOrder = {
  pkOrderId: string; orderNumber: string; placedAt: string; status: string; totalAmount: number
  items: Array<{ pkOrderItemId: string; productName: string; quantity: number }>
}

export default function AccountPage() {
  const auth = useAuth()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [version, setVersion] = useState(0)

  const userId = auth.user?.pkUserId
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    apiFetch<CustomerOrder[]>(`/Order/user/${userId}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setOrders(data); setOrdersError('') } })
      .catch(error => { if (!controller.signal.aborted) setOrdersError(authErrorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setLoadingOrders(false) })
    return () => controller.abort()
  }, [userId, version])

  if (auth.status === 'loading') return <div className="account-page" role="status">Checking your session…</div>
  if (auth.status === 'error') return <section className="account-page"><h1>Your account</h1><p className="account-error" role="alert">{auth.error}</p><button className="account-button" onClick={() => void auth.refresh()}>Retry connection</button></section>
  if (!auth.user) return <Navigate to={`${ROUTES.signIn}?returnTo=${encodeURIComponent(ROUTES.account)}`} replace />

  return <section className="account-page">
    <header className="account-header"><div><p className="account-eyebrow">Snug Rebel / My account</p><h1>Hey, {auth.user.firstName}.</h1></div>
      <button className="account-button account-button-outline" disabled={loggingOut} onClick={async () => {
        setLoggingOut(true); setActionError('')
        try { await auth.signOut() }
        catch (error) { setActionError(authErrorMessage(error)) }
        finally { setLoggingOut(false) }
      }}>{loggingOut ? 'Signing out…' : 'Sign out'}</button>
    </header>
    {actionError && <p className="account-error" role="alert">{actionError}</p>}
    <div className="account-grid">
      <aside className="account-card account-profile"><h2>Your details</h2><dl>
        <dt>Name</dt><dd>{auth.user.firstName} {auth.user.lastName}</dd>
        <dt>Email</dt><dd>{auth.user.userEmail}</dd>
        {auth.user.phoneNumber && <><dt>Phone</dt><dd>{auth.user.phoneNumber}</dd></>}
      </dl><DemographicsForm key={auth.user.pkUserId} /><Link to={ROUTES.shop} className="account-text-link">Back to the shop →</Link></aside>
      <div className="account-card"><h2>Your orders</h2>
        {loadingOrders ? <p role="status">Loading your orders…</p> : ordersError ? <div><p className="account-error" role="alert">{ordersError}</p><button className="account-button account-button-outline" onClick={() => { setLoadingOrders(true); setVersion(v => v + 1) }}>Retry orders</button></div> : orders.length === 0 ? <p>No orders yet. Your next favorite is in the shop.</p> :
          <ul className="account-orders">{orders.map(order => <li key={order.pkOrderId}>
            <div className="account-order-head"><Link to={`${ROUTES.tracking}?order=${encodeURIComponent(order.orderNumber)}`}>{order.orderNumber}</Link><span>{order.status}</span></div>
            <p>{new Date(order.placedAt).toLocaleDateString()} · {formatPrice(order.totalAmount)}</p>
            <ul>{order.items.map(item => <li key={item.pkOrderItemId}>{item.productName} × {item.quantity}</li>)}</ul>
          </li>)}</ul>}
      </div>
    </div>
  </section>
}
