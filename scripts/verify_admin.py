#!/usr/bin/env python3
"""Integration checks against the running API and its Neon database.

Creates uniquely named fixtures and removes only those fixtures in finally.
Requires psql and backend/appsettings.json (or ConnectionStrings__DefaultConnection).
Run the backend in Development, then: python3 scripts/verify_admin.py
"""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import struct
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('VERIFY_API_URL', 'http://localhost:5146')
MARK = 'verify-' + secrets.token_hex(6)
EMAIL = MARK + '@example.invalid'
PASSWORD = secrets.token_urlsafe(24)
TOKEN = MARK + '-cart'
UPLOADED = []


def database(sql):
    connection = os.environ.get('ConnectionStrings__DefaultConnection') or json.loads(
        (ROOT / 'backend/appsettings.json').read_text())['ConnectionStrings']['DefaultConnection']
    fields = dict(part.strip().split('=', 1) for part in connection.split(';') if '=' in part)
    env = os.environ.copy()
    for key, value in fields.items():
        target = {'host': 'PGHOST', 'database': 'PGDATABASE', 'username': 'PGUSER',
                  'password': 'PGPASSWORD', 'port': 'PGPORT', 'ssl mode': 'PGSSLMODE'}.get(key.lower())
        if target:
            env[target] = {'verifyfull': 'verify-full', 'verifyca': 'verify-ca'}.get(value.lower(), value.lower()) if target == 'PGSSLMODE' else value
    assert '.neon.tech' in env.get('PGHOST', ''), 'Verification must use Neon.'
    env.setdefault('PGSSLROOTCERT', 'system')
    env['PGCONNECT_TIMEOUT'] = '10'
    result = subprocess.run(['psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                            env=env, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


HTTP = client()


def request(method, path, data=None, status=200, opener=None, headers=None):
    hdr = headers or {}
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        hdr = {'Content-Type': 'application/json', **hdr}
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        response = (opener or HTTP).open(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    assert response.status == status, f'{method} {path}: expected {status}, received {response.status}: {raw[:500]!r}'
    return json.loads(raw) if raw and 'json' in response.headers.get('Content-Type', '') else raw


def multipart(path, fields, files, status=201):
    boundary = 'Snug' + secrets.token_hex(16)
    chunks = []
    for key, value in fields.items():
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    for key, name, mime, content in files:
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b'\r\n')
    chunks.append(f'--{boundary}--\r\n'.encode())
    return request('POST', path, b''.join(chunks), status, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})


def check():
    assert database('SELECT current_database();')
    request('GET', '/api/Product', status=401, opener=client())
    request('POST', '/api/Product', {}, status=401, opener=client())
    user = request('POST', '/api/Auth/register', {'email': EMAIL, 'password': PASSWORD,
                   'firstName': 'Verification', 'lastName': MARK, 'phoneNumber': '0000000000'})
    credentials = {'email': EMAIL, 'password': PASSWORD}
    request('POST', '/api/Auth/login', {**credentials, 'password': 'incorrect'}, status=401)
    customer = request('POST', '/api/Auth/login', credentials)
    assert customer['role'] == 'Customer' and 'passwordHash' not in customer
    request('GET', '/api/Customer', status=403)
    database(f"UPDATE users SET role=1 WHERE user_email='{EMAIL}';")
    request('POST', '/api/Auth/logout', status=204)
    admin = request('POST', '/api/Auth/login', credentials)
    assert admin['role'] == 'Admin'
    assert request('GET', '/api/Auth/session')['pkUserId'] == user['pkUserId']
    print('PASS login, role restrictions, server session')

    cat = request('POST', '/api/Category', {'categoryName': MARK}, status=201)
    cat_id = cat['pkCategoryId']
    request('POST', '/api/Category', {'categoryName': MARK}, status=409)
    request('PUT', '/api/Category/' + cat_id, {'categoryName': MARK, 'isActive': False})
    request('GET', '/api/Collection', status=404)
    print('PASS categories, duplicate handling, removed collections endpoint')

    sizes = [s for s in request('GET', '/api/Size') if s['label'] != 'One size']
    colors = [c for c in request('GET', '/api/Color') if c['name'] != 'Standard']
    assert sizes and colors, 'Add at least one size and color to run all option combinations.'
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==')
    image = multipart('/api/ProductImage/upload', {}, [('imageFile', 'test.png', 'image/png', png)], 200)
    UPLOADED.append(image['url'])
    assert request('GET', image['url']) == png
    multipart('/api/ProductImage/upload', {}, [('imageFile', 'bad.svg', 'image/svg+xml', b'<svg/>')], 400)
    payload = {'productName': MARK, 'slug': MARK, 'fkCategoryId': cat_id, 'basePrice': 12.5,
               'isActive': True, 'hasSizes': False, 'hasColors': False,
               'images': [{'url': image['url'], 'altText': 'Test upload'}, {'url': 'https://example.com/second.png'}],
               'variants': [{'sku': MARK, 'stock': 7, 'priceOverride': None}]}
    product = request('POST', '/api/Product', payload, 201)
    product_id = product['pkProductId']
    assert len(product['productImages']) == 2 and len(product['productVariants']) == 1
    assert database(f"SELECT count(*) FROM product_images WHERE _fk_product_id='{product_id}';") == '2'
    detail = request('GET', '/api/Product/' + product_id)
    assert detail['sizes'] == [] and detail['colors'] == [] and detail['stock'] == 7
    assert detail['imageSrc'] == image['url']
    variant_id = product['productVariants'][0]['pkProductVariantId']
    print('PASS image upload, static serving, product_images persistence, product without options')

    for has_size, has_color in [(True, False), (False, True), (True, True), (False, False)]:
        payload['hasSizes'] = has_size
        payload['hasColors'] = has_color
        payload['variants'] = [{'id': variant_id, 'sku': MARK, 'stock': 9, 'priceOverride': 0,
                                'sizeId': sizes[0]['pkSizeId'] if has_size else None,
                                'colorId': colors[0]['pkColorId'] if has_color else None}]
        saved = request('PUT', '/api/Product/' + product_id, payload)
        assert saved['hasSizes'] == has_size and saved['hasColors'] == has_color
        detail = request('GET', '/api/Product/' + product_id)
        assert bool(detail['sizes']) == has_size and bool(detail['colors']) == has_color
        assert detail['stock'] == 9 and detail['variants'][0]['priceOverride'] == 0
    # Primary image replacement must respect the unique partial index.
    payload['images'].reverse()
    request('PUT', '/api/Product/' + product_id, payload)
    assert request('GET', '/api/Product/' + product_id)['imageSrc'] == 'https://example.com/second.png'
    request('PUT', '/api/Product/' + product_id, {**payload, 'basePrice': -1}, 400)
    request('PUT', '/api/Product/' + product_id, {**payload, 'variants': payload['variants'] * 2}, 400)
    request('PUT', '/api/Product/' + product_id, {**payload, 'hasSizes': True, 'variants': [{**payload['variants'][0], 'sizeId': 999999999}]}, 400)
    request('PUT', '/api/Product/' + product_id, {**payload, 'variants': [{**payload['variants'][0], 'id': 'unrelated'}]}, 400)
    assert request('GET', '/api/Product/' + product_id)['stock'] == 9
    print('PASS independent option toggles, inventory updates, zero price override, primary image replacement, invalid-save preservation')

    # A database conflict after tracked changes must roll back the entire save.
    second = request('POST', '/api/Product', {**payload, 'slug': MARK + '-second', 'variants': [{'sku': MARK + '-second', 'stock': 1}]}, 201)
    request('PUT', '/api/Product/' + product_id, {**payload, 'productName': 'Should roll back',
            'images': [], 'variants': [{**payload['variants'][0], 'sku': MARK + '-second'}]}, 409)
    assert request('GET', '/api/Product/' + product_id)['name'] == MARK
    assert database(f"SELECT count(*) FROM product_images WHERE _fk_product_id='{product_id}';") == '2'

    cart = request('POST', '/api/Cart/add', {'sessionToken': TOKEN, 'productId': product_id, 'productVariantId': variant_id, 'quantity': 1})
    assert cart['items'][0]['fkProductVariantId'] == variant_id
    before = database(f"SELECT count(*) FROM product_variants WHERE _fk_product_id='{product_id}';")
    request('POST', '/api/Cart/add', {'sessionToken': TOKEN, 'productId': product_id, 'size': 'invented', 'quantity': 1}, 404)
    assert database(f"SELECT count(*) FROM product_variants WHERE _fk_product_id='{product_id}';") == before
    request('POST', '/api/Cart/add', {'sessionToken': TOKEN, 'productId': product_id, 'quantity': 999}, 409)
    print('PASS transaction rollback, optionless cart, stock checks, unavailable options cannot create stock')

    # 3D previews must also reach product_images.
    gltf = b'{"asset":{"version":"2.0"}}'
    gltf += b' ' * ((4 - len(gltf) % 4) % 4)
    glb = struct.pack('<III', 0x46546c67, 2, 20 + len(gltf)) + struct.pack('<II', len(gltf), 0x4e4f534a) + gltf
    model = multipart('/api/Product3DModel/upload', {'productId': product_id},
                      [('modelFile', 'model.glb', 'model/gltf-binary', glb), ('previewFile', 'preview.png', 'image/png', png)])
    UPLOADED.extend([model['modelUrl'], model['previewImageUrl']])
    assert request('GET', model['modelUrl']) == glb
    assert database(f"SELECT count(*) FROM product_images WHERE _fk_product_id='{product_id}';") == '3'
    assert request('GET', '/api/Product3DModel/product/' + product_id)
    request('PUT', '/api/Product3DModel/' + model['id'], {**model, 'modelName': 'Updated model'}, 204)
    request('DELETE', '/api/Product3DModel/' + model['id'], status=204)
    print('PASS 3D upload, preview persistence, list, static serving, editing, deletion')

    checkout = request('POST', '/api/Order/checkout', {'sessionToken': TOKEN, 'email': EMAIL,
        'recipientName': MARK, 'line1': 'Verification', 'city': 'Test', 'province': 'Test',
        'postalCode': '0000', 'phone': '0000', 'idempotencyKey': MARK,
        'directItems': [{'productId': product_id, 'productVariantId': variant_id, 'quantity': 1}]}, 201)
    assert checkout['items'][0]['fkProductVariantId'] == variant_id
    assert request('GET', '/api/Cart/session/' + TOKEN)['items'], 'Direct checkout must preserve the existing cart.'
    assert any(o['pkOrderId'] == checkout['pkOrderId'] and o['status'] == 'Pending' and o['items'] for o in request('GET', '/api/Order'))
    assert any(o['orderId'] == checkout['pkOrderId'] for o in request('GET', '/api/Dashboard/activities')['items'])
    request('PUT', '/api/Order/' + checkout['pkOrderId'] + '/shipment', {'courier': 'Verification courier', 'trackingNumber': MARK}, 204)
    tracked = request('GET', '/api/Order/track/' + checkout['orderNumber'])
    assert tracked['status'] == 'Shipped' and tracked['trackingNumber'] == MARK
    assert tracked['events'][-1]['status'] == 'Shipped'
    request('GET', '/api/Dashboard/analytics')
    customers = request('GET', '/api/Customer')
    assert all('passwordHash' not in c for c in customers)
    print('PASS direct checkout, real orders/details, live dashboard, customer reads')

    request('DELETE', '/api/Product/' + product_id + '/deactivate', status=204)
    request('GET', '/api/Product/' + product_id, status=404)
    request('POST', '/api/Cart/add', {'sessionToken': TOKEN, 'productId': product_id, 'quantity': 1}, 404)
    request('DELETE', '/api/Category/' + cat_id, status=409)
    request('POST', '/api/Auth/logout', status=204)
    request('GET', '/api/Product', status=401)
    print('PASS deactivation, category-in-use protection, logout')


def cleanup():
    # Every predicate is scoped to this run's randomly generated fixture marker.
    database(f"""
    BEGIN;
    DELETE FROM payments WHERE _fk_order_id IN (SELECT _pk_order_id FROM orders WHERE contact_email='{EMAIL}');
    DELETE FROM shipments WHERE _fk_order_id IN (SELECT _pk_order_id FROM orders WHERE contact_email='{EMAIL}');
    DELETE FROM order_status_history WHERE _fk_order_id IN (SELECT _pk_order_id FROM orders WHERE contact_email='{EMAIL}');
    DELETE FROM order_items WHERE _fk_order_id IN (SELECT _pk_order_id FROM orders WHERE contact_email='{EMAIL}');
    DELETE FROM orders WHERE contact_email='{EMAIL}';
    DELETE FROM cart_items WHERE _fk_cart_id IN (SELECT _pk_cart_id FROM carts WHERE session_token='{TOKEN}' OR _fk_user_id IN (SELECT _pk_user_id FROM users WHERE user_email='{EMAIL}')) OR _fk_product_variant_id IN (SELECT _pk_product_variant_id FROM product_variants WHERE _fk_product_id IN (SELECT _pk_product_id FROM products WHERE slug IN ('{MARK}','{MARK}-second')));
    DELETE FROM carts WHERE session_token='{TOKEN}' OR _fk_user_id IN (SELECT _pk_user_id FROM users WHERE user_email='{EMAIL}');
    DELETE FROM product_images WHERE _fk_product_id IN (SELECT _pk_product_id FROM products WHERE slug IN ('{MARK}','{MARK}-second'));
    DELETE FROM product_3d_models WHERE _fk_product_id IN (SELECT _pk_product_id FROM products WHERE slug IN ('{MARK}','{MARK}-second'));
    DELETE FROM product_variants WHERE _fk_product_id IN (SELECT _pk_product_id FROM products WHERE slug IN ('{MARK}','{MARK}-second'));
    DELETE FROM products WHERE slug IN ('{MARK}','{MARK}-second');
    DELETE FROM categories WHERE slug='{MARK}';
    DELETE FROM addresses WHERE recipient_name='{MARK}';
    DELETE FROM audit_logs WHERE _fk_user_id IN (SELECT _pk_user_id FROM users WHERE user_email='{EMAIL}');
    DELETE FROM users WHERE user_email='{EMAIL}';
    COMMIT;
    """)
    for url in UPLOADED:
        if url.startswith('/uploads/'):
            file = ROOT / 'backend/wwwroot' / url.lstrip('/')
            if file.is_file():
                file.unlink()


if __name__ == '__main__':
    try:
        check()
    finally:
        cleanup()
        print('Temporary fixtures cleaned up.')
