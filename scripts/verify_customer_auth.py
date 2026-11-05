#!/usr/bin/env python3
"""Run with the development API connected to Neon. Creates and cleans its own fixtures."""
import verify_admin as test

request = test.request
MARK = test.MARK
MAIN_EMAIL = test.EMAIL
OTHER_EMAIL = 'other-' + MAIN_EMAIL
PASSWORD = test.PASSWORD


def check():
    guest = test.client()
    first = test.client()
    second = test.client()
    request('GET', '/api/Collection', status=404, opener=guest)
    request('GET', '/api/Auth/session', status=401, opener=guest)
    request('GET', '/api/Order/mine', status=401, opener=guest)
    request('POST', '/api/Auth/register', {'email': MAIN_EMAIL, 'password': 'short', 'firstName': 'Test', 'lastName': MARK}, 400, opener=first)
    request('POST', '/api/Auth/register', {'email': MAIN_EMAIL, 'password': 'é' * 40, 'firstName': 'Test', 'lastName': MARK}, 400, opener=first)
    request('POST', '/api/Auth/register', {'email': 'invalid', 'password': PASSWORD, 'firstName': 'Test', 'lastName': MARK}, 400, opener=first)
    user = request('POST', '/api/Auth/register', {'email': MAIN_EMAIL.upper(), 'password': PASSWORD,
                   'firstName': 'Customer', 'lastName': MARK}, opener=first)
    user_id = user['pkUserId']
    assert user['role'] == 'Customer' and 'passwordHash' not in user
    assert request('GET', '/api/Auth/session', opener=first)['pkUserId'] == user_id
    request('POST', '/api/Auth/register', {'email': MAIN_EMAIL, 'password': PASSWORD, 'firstName': 'Test', 'lastName': MARK}, 409, opener=guest)
    request('GET', '/api/Product', status=403, opener=first)
    assert request('GET', '/api/Order/mine', opener=first) == []
    print('PASS registration validation, automatic sign-in, normalized/duplicate email, safe profiles and customer role')

    # Fixture catalog is created only through a dedicated admin cookie for this test user.
    test.database(f"UPDATE users SET role=1 WHERE user_email='{MAIN_EMAIL}';")
    admin = test.client()
    request('POST', '/api/Auth/login', {'email': MAIN_EMAIL, 'password': PASSWORD}, opener=admin)
    category = request('POST', '/api/Category', {'categoryName': MARK}, 201, opener=admin)
    product = request('POST', '/api/Product', {'productName': MARK, 'slug': MARK,
        'fkCategoryId': category['pkCategoryId'], 'basePrice': 20, 'hasSizes': False, 'hasColors': False,
        'variants': [{'sku': MARK, 'stock': 15}], 'images': []}, 201, opener=admin)
    test.database(f"UPDATE users SET role=0 WHERE user_email='{MAIN_EMAIL}';")
    request('GET', '/api/Product', status=403, opener=admin)  # Stale role cookie cannot keep admin privileges.
    product_id = product['pkProductId']
    variant_id = product['productVariants'][0]['pkProductVariantId']
    request('POST', '/api/Auth/logout', status=204, opener=first)
    payload = {'sessionToken': test.TOKEN, 'productId': product_id, 'quantity': 2}
    guest_cart = request('POST', '/api/Cart/add', payload, opener=guest)
    item_id = guest_cart['items'][0]['pkCartItemId']
    request('PUT', '/api/Cart/item/' + item_id, {'quantity': 1}, 401, opener=guest)
    request('PUT', '/api/Cart/item/' + item_id, {'quantity': 3}, opener=guest, headers={'X-Cart-Session': test.TOKEN})
    request('POST', '/api/Auth/login', {'email': MAIN_EMAIL, 'password': 'incorrect'}, 401, opener=first)
    request('POST', '/api/Auth/login', {'email': '  ' + MAIN_EMAIL.upper() + '  ', 'password': PASSWORD, 'sessionToken': test.TOKEN}, opener=first)
    cart = request('GET', '/api/Cart/user/' + user_id, opener=first)
    assert cart['items'][0]['quantity'] == 3
    assert cart['sessionToken'] is None
    request('GET', '/api/Cart/session/' + test.TOKEN, status=404, opener=guest)
    request('GET', '/api/Cart/user/' + user_id, status=401, opener=guest)
    request('PUT', '/api/Cart/item/' + item_id, {'quantity': 4}, 401, opener=guest, headers={'X-Cart-Session': test.TOKEN})
    print('PASS guest bag ownership, sign-in transfer, guest token revocation, live cookie roles')

    request('POST', '/api/Auth/logout', status=204, opener=first)
    request('POST', '/api/Cart/add', {**payload, 'quantity': 2}, opener=guest)
    request('POST', '/api/Auth/login', {'email': MAIN_EMAIL, 'password': PASSWORD, 'sessionToken': test.TOKEN}, opener=first)
    cart = request('GET', '/api/Cart/user/' + user_id, opener=first)
    assert len(cart['items']) == 1 and cart['items'][0]['quantity'] == 5
    request('PUT', '/api/Cart/item/' + cart['items'][0]['pkCartItemId'], {'quantity': 4}, opener=first)
    assert request('GET', '/api/Cart/user/' + user_id, opener=first)['items'][0]['quantity'] == 4

    other = request('POST', '/api/Auth/register', {'email': OTHER_EMAIL, 'password': PASSWORD, 'firstName': 'Other', 'lastName': MARK}, opener=second)
    other_id = other['pkUserId']
    request('GET', '/api/Cart/user/' + user_id, status=403, opener=second)
    request('POST', '/api/Cart/add', {'userId': user_id, 'productId': product_id, 'quantity': 1}, 403, opener=second)
    request('PUT', '/api/Cart/item/' + item_id, {'quantity': 1}, 403, opener=second)
    request('DELETE', '/api/Cart/item/' + item_id, status=403, opener=second)
    request('DELETE', '/api/Cart/' + cart['pkCartId'] + '/clear', status=403, opener=second)
    request('GET', '/api/Order/user/' + user_id, status=403, opener=second)
    request('POST', '/api/Order/checkout', {'userId': user_id, 'email': MAIN_EMAIL}, 403, opener=second)
    print('PASS repeated-login bag merge, quantity edits, cross-account cart/order/checkout isolation')

    order = request('POST', '/api/Order/checkout', {'userId': user_id, 'email': MAIN_EMAIL,
        'recipientName': MARK, 'phone': '0000', 'line1': 'Verification', 'city': 'Test',
        'province': 'Test', 'postalCode': '0000', 'idempotencyKey': MARK,
        'directItems': [{'productId': product_id, 'productVariantId': variant_id, 'quantity': 1}]}, 201, opener=first)
    assert order['fkUserId'] == user_id
    assert any(o['pkOrderId'] == order['pkOrderId'] for o in request('GET', '/api/Order/mine', opener=first))
    assert request('GET', '/api/Order/mine', opener=second) == []
    request('GET', '/api/Order/' + order['pkOrderId'], status=403, opener=second)
    request('POST', '/api/Order/checkout', {'userId': other_id, 'idempotencyKey': MARK}, 403, opener=second)
    test.database(f"UPDATE users SET is_active=false WHERE user_email='{MAIN_EMAIL}';")
    request('GET', '/api/Auth/session', status=401, opener=first)
    request('POST', '/api/Auth/login', {'email': MAIN_EMAIL, 'password': PASSWORD}, 403, opener=first)
    test.database(f"UPDATE users SET is_active=true WHERE user_email='{MAIN_EMAIL}';")
    request('POST', '/api/Auth/login', {'email': MAIN_EMAIL, 'password': PASSWORD}, opener=first)
    request('POST', '/api/Auth/logout', status=204, opener=first)
    request('GET', '/api/Auth/session', status=401, opener=first)
    request('GET', '/api/Cart/user/' + user_id, status=401, opener=first)
    print('PASS authenticated checkout, own order history, session revocation for inactive accounts and logout')


if __name__ == '__main__':
    try:
        check()
    finally:
        test.EMAIL = MAIN_EMAIL
        test.cleanup()
        test.EMAIL = OTHER_EMAIL
        test.cleanup()
        print('Temporary customer authentication fixtures cleaned up.')
