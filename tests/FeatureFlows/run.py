"""Integration checks against a disposable database and local Brevo stub.

Requires .NET 10, dotnet-ef, Node/Playwright + Chromium, frontend npm ci,
and a PostgreSQL Docker container (PG_CONTAINER, default snug-onboarding-db).
Uses only synthetic data; no external emails or production database access.
"""
import http.cookiejar
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[2]
DB = 'feature_' + uuid.uuid4().hex
CONTAINER = os.environ.get('PG_CONTAINER', 'snug-onboarding-db')
MAIL = []
FAIL_DELIVERY = False


def sql(statement, database=DB):
    return subprocess.check_output(['docker', '--host=unix:///var/run/docker.sock', 'exec', '-i', CONTAINER,
        'psql', '-U', 'snugdev', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], input=statement.encode()).decode().strip()


class MailStub(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.headers.get('Transfer-Encoding') == 'chunked':
            chunks = []
            while True:
                size = int(self.rfile.readline().strip(), 16)
                if size == 0:
                    self.rfile.readline()
                    break
                chunks.append(self.rfile.read(size))
                self.rfile.read(2)
            payload = b''.join(chunks)
        else:
            payload = self.rfile.read(int(self.headers['Content-Length']))
        message = json.loads(payload)
        if not FAIL_DELIVERY:
            MAIL.append(message)
        self.send_response(503 if FAIL_DELIVERY else 201)
        self.end_headers()
        self.wfile.write(b'{}')

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps(MAIL).encode())

    def log_message(self, *_):
        pass


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def client():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}),
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(path, data=None, status=200, session=None, method=None):
    request = urllib.request.Request(API + path, data=None if data is None else json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'}, method=method)
    try:
        response = (session or client()).open(request)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read().decode()
    assert response.status == status, (path, response.status, body)
    return json.loads(body) if body and body[0] in '[{' else body


def latest_code():
    return re.search(r'<strong>(\d{6})</strong>', MAIL[-1]['htmlContent'])[1]


def request_code():
    sql("UPDATE email_otps SET sent_at=now()-interval '2 minutes'")
    call('/api/Auth/forgot-password', {'email': EMAIL.upper()}, 202)
    return latest_code()


def reset(code, password='New-password-123', status=200):
    return call('/api/Auth/reset-password', {'email': EMAIL, 'code': code, 'password': password}, status)


EMAIL = 'customer@example.test'
processes = []
stub = ThreadingHTTPServer(('127.0.0.1', 0), MailStub)
threading.Thread(target=stub.serve_forever, daemon=True).start()
API = f'http://127.0.0.1:{free_port()}'
WEB = f'http://127.0.0.1:{free_port()}'
ADMIN_WEB = f'http://127.0.0.1:{free_port()}'
try:
    sql(f'CREATE DATABASE {DB}', 'postgres')
    with tempfile.TemporaryDirectory() as temporary:
        schema = Path(temporary) / 'schema.sql'
        subprocess.run(['dotnet-ef', 'dbcontext', 'script', '--project', str(ROOT / 'backend'),
            '--no-build', '--output', str(schema)], check=True, stdout=subprocess.DEVNULL)
        sql(schema.read_text(encoding='utf-8-sig'))
        # Exercise the same upgrade script twice to verify repeatability.
        upgrade = (ROOT / 'backend/SQL/password_reset.sql').read_text()
        sql(upgrade); sql(upgrade)
        audit_upgrade = (ROOT / 'backend/SQL/audit_log_details.sql').read_text()
        sql(audit_upgrade); sql(audit_upgrade)
        environment = os.environ | {
            'ConnectionStrings__DefaultConnection': f'Host=127.0.0.1;Port=5433;Database={DB};Username=snugdev',
            'ASPNETCORE_ENVIRONMENT': 'Development', 'ASPNETCORE_URLS': API,
            'Email__BrevoApiKey': 'local-test-only', 'Email__From': 'test@example.test',
            'Email__StorefrontUrl': WEB, 'Email__DevelopmentApiUrl': f'http://127.0.0.1:{stub.server_port}/',
            'Cors__AllowedOrigins__0': WEB,
            'Cors__AllowedOrigins__1': ADMIN_WEB,
        }
        with open(Path(temporary) / 'api.log', 'w+') as log:
            processes.append(subprocess.Popen(['dotnet', str(ROOT / 'backend/bin/Debug/net10.0/backend.dll')],
                cwd=ROOT / 'backend', env=environment, stdout=log, stderr=log))
            for _ in range(100):
                try:
                    call('/health'); break
                except (urllib.error.URLError, AssertionError):
                    if processes[-1].poll() is not None:
                        log.seek(0); raise RuntimeError(log.read())
                    time.sleep(.1)
            else:
                raise RuntimeError('API startup timed out')
            call('/api/Auth/register', {'email': EMAIL, 'password': 'Old-password-123',
                'firstName': 'Test', 'lastName': 'Customer'}, 202)
            call('/api/Auth/verify-email-code', {'email': EMAIL, 'code': latest_code()})
            old_session = client()
            user = call('/api/Auth/login', {'email': EMAIL, 'password': 'Old-password-123'}, session=old_session)
            user_id = user['pkUserId']
            code = request_code()
            count = len(MAIL)
            known = call('/api/Auth/forgot-password', {'email': EMAIL}, 202)
            unknown = call('/api/Auth/forgot-password', {'email': 'unknown@example.test'}, 202)
            assert known == unknown and len(MAIL) == count, 'Enumeration or resend cooldown regression'
            reset(code, 'short', 400)
            reset(code, 'é' * 37, 400)
            call('/api/Auth/request-login-code', {'email': EMAIL}, 202)
            sign_in_code = latest_code()
            reset(code)
            reset(code, status=400)
            call('/api/Auth/login-code', {'email': EMAIL, 'code': sign_in_code}, 400)
            call('/api/Auth/session', status=401, session=old_session)
            call('/api/Auth/login', {'email': EMAIL, 'password': 'Old-password-123'}, 401)
            call('/api/Auth/login', {'email': EMAIL, 'password': 'New-password-123'})
            code = request_code()
            # Codes are scoped to their purpose.
            call('/api/Auth/login-code', {'email': EMAIL, 'code': code}, 400)
            sql("UPDATE email_otps SET expires_at=now()-interval '1 minute' WHERE purpose='password-reset'")
            reset(code, status=400)
            code = request_code()
            wrong = '000000' if code != '000000' else '999999'
            for _ in range(5):
                reset(wrong, status=400)
            reset(code, status=400)
            code = request_code()
            sql("UPDATE email_otps SET sent_at=now()-interval '2 minutes' WHERE purpose='password-reset'")
            FAIL_DELIVERY = True
            call('/api/Auth/forgot-password', {'email': EMAIL}, 202)
            FAIL_DELIVERY = False
            reset(code)  # Failed provider delivery must preserve the previous code.
            code = request_code()
            sql('UPDATE users SET is_active=false')
            reset(code, status=400)
            sql('UPDATE users SET is_active=true')
            sql((ROOT / 'tests/FeatureFlows/review_seed.sql').read_text())
            session = client()
            call('/api/Auth/login', {'email': EMAIL, 'password': 'New-password-123'}, session=session)
            tracking = call('/api/Order/track/FEATURE-DELIVERED')
            assert tracking['items'][0]['productId'] == 'feature-product'
            account = call('/api/Order/mine', session=session)
            assert account[0]['items'][0]['productId'] == 'feature-product'
            review = {'productId': 'feature-product', 'orderItemId': 'feature-item',
                'userId': 'spoofed', 'rating': 5, 'body': 'Test review'}
            call('/api/Review', review, 401)
            result = call('/api/Review', review, 201, session)
            assert result['fkUserId'] == user_id
            call('/api/Review', review, 409, session)
            sql("DELETE FROM reviews; UPDATE products SET review_count=0, avg_rating=0; UPDATE orders SET status=0")
            call('/api/Review', review, 400, session)
            sql('UPDATE orders SET status=4')
            print('PASS: password recovery, code isolation/expiry/replay/attempts, cooldown, delivery rollback, session invalidation, review IDs and ownership', flush=True)
            if os.environ.get('SKIP_BROWSER') != '1':
                with open(Path(temporary) / 'vite.log', 'w') as vite_log:
                    processes.append(subprocess.Popen(['npm', 'run', 'dev', '--', '--host', '127.0.0.1',
                        '--port', WEB.rsplit(':', 1)[1], '--strictPort'], cwd=ROOT / 'frontend',
                        env=os.environ | {'VITE_API_URL': API + '/api'}, stdout=vite_log, stderr=vite_log,
                        start_new_session=True))
                    for _ in range(100):
                        try:
                            client().open(WEB); break
                        except urllib.error.URLError:
                            time.sleep(.1)
                    sql("UPDATE email_otps SET sent_at=now()-interval '2 minutes'")
                    subprocess.run(['node', str(ROOT / 'tests/FeatureFlows/browser.cjs')], check=True,
                        env=os.environ | {'TEST_WEB_URL': WEB, 'TEST_API_URL': API,
                            'TEST_MAIL_URL': f'http://127.0.0.1:{stub.server_port}/'})
            # Audit viewing is restricted to administrators, even though staff can mutate orders.
            call('/api/Audit', status=401)
            admin_password = 'New-password-123' if os.environ.get('SKIP_BROWSER') == '1' else 'Browser-password-123'
            call('/api/Auth/login', {'email': EMAIL, 'password': admin_password}, session=session)
            call('/api/Audit', status=403, session=session)
            sql("INSERT INTO users (_pk_user_id, user_email, password_hash, first_name, last_name, phone_number, role, email_verification_required) SELECT 'feature-admin', 'admin@example.test', password_hash, 'Audit', 'Admin', '', 1, false FROM users WHERE user_email='customer@example.test'")
            admin = client()
            call('/api/Auth/login', {'email': 'admin@example.test', 'password': admin_password}, session=admin)
            call('/api/Order/feature-order/status', {'status': 'Processing'}, 204, admin, method='PUT')
            events = call('/api/Audit?actionType=Orders&search=FEATURE-DELIVERED', session=admin)
            event = events['items'][0]
            assert event['action'] == 'ORDER_UPDATED' and event['actorName'] == 'Audit Admin'
            assert event['actorRole'] == 'Admin' and event['entityId'] == 'feature-order'
            assert json.loads(event['changes'])['Status'] == {'Before': 'Delivered', 'After': 'Processing'}
            assert event['requestId'] and datetime.fromisoformat(event['createdAt']).utcoffset() == timedelta(0)
            category = call('/api/Category', {'categoryName': 'Audit category', 'slug': 'audit-category', 'isActive': True}, 201, admin)
            created = call('/api/Audit?actionType=Categories', session=admin)['items'][0]
            assert created['entityId'] == category['pkCategoryId'] and 'Audit category' in created['description']
            before = int(sql('SELECT count(*) FROM audit_logs'))
            call('/api/Category', {'categoryName': 'Invalid parent', 'fkParentCategoryId': 'missing-parent', 'isActive': True}, 500, admin)
            assert int(sql('SELECT count(*) FROM audit_logs')) == before
            sql("ALTER TABLE audit_logs ADD CONSTRAINT feature_audit_failure CHECK (description NOT LIKE '%Rollback sentinel%')")
            call('/api/Category', {'categoryName': 'Rollback sentinel', 'isActive': True}, 500, admin)
            assert sql("SELECT count(*) FROM categories WHERE category_name='Rollback sentinel'") == '0'
            assert int(sql('SELECT count(*) FROM audit_logs')) == before
            sql('ALTER TABLE audit_logs DROP CONSTRAINT feature_audit_failure')
            page = call('/api/Audit?pageSize=1', session=admin)
            assert len(page['items']) == 1 and page['total'] > 1
            call('/api/Audit?page=0', status=400, session=admin)
            raw = json.dumps(call('/api/Audit?pageSize=100', session=admin))
            for secret in ['password_hash', 'code_hash', 'Browser-password-123', 'New-password-123', 'Great shirt']:
                assert secret not in raw
            sql("UPDATE users SET role=2 WHERE _pk_user_id='feature-admin'")
            call('/api/Audit', status=403, session=admin)
            sql("UPDATE users SET role=1 WHERE _pk_user_id='feature-admin'")
            print('PASS: audit action types, generated record IDs, actor attribution, before/after values, rollback, filters, pagination, privacy and permissions', flush=True)
            if os.environ.get('SKIP_BROWSER') != '1':
                admin_web = ADMIN_WEB
                sql('SELECT 1')
                with open(Path(temporary) / 'admin-vite.log', 'w') as admin_log:
                    processes.append(subprocess.Popen(['npm', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', admin_web.rsplit(':', 1)[1], '--strictPort'], cwd=ROOT / 'admin',
                        env=os.environ | {'VITE_API_BASE_URL': API}, stdout=admin_log, stderr=admin_log, start_new_session=True))
                    for _ in range(100):
                        try:
                            client().open(admin_web); break
                        except urllib.error.URLError:
                            time.sleep(.1)
                    subprocess.run(['node', str(ROOT / 'tests/FeatureFlows/audit-browser.cjs')], check=True,
                        env=os.environ | {'TEST_ADMIN_URL': admin_web, 'TEST_API_URL': API})
finally:
    import signal
    for process in reversed(processes):
        if process.poll() is None:
            if process.args[0] == 'npm':
                os.killpg(process.pid, signal.SIGTERM)
            else:
                process.terminate()
            process.wait(timeout=10)
    stub.shutdown()
    sql(f'DROP DATABASE IF EXISTS {DB} WITH (FORCE)', 'postgres')
