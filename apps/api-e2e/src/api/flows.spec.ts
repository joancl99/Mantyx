import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../support/test-app';
import { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } from '../support/env';

/**
 * End-to-end flows against the real AppModule (real guards, validation,
 * Prisma against the dedicated e2e database, Redis-backed sessions).
 *
 * The tests are sequential and share state: the SUPERADMIN seeded by the
 * global setup onboards two companies through the API, company A builds a
 * catalog + warehouse and moves stock, and company B proves tenant
 * isolation. Auth endpoints are throttled at 10 req/min — keep the number
 * of login/refresh calls well below that.
 */
describe('Mantyx API e2e flows', () => {
  let app: INestApplication;
  let api: AxiosInstance;

  let superToken = '';
  let superRefreshCookie = '';
  let adminAToken = '';
  let adminBToken = '';
  let viewerToken = '';

  let companyAId = '';
  let productAId = '';
  let warehouseAId = '';
  let location1Id = '';
  let location2Id = '';

  const adminA = { email: 'admin.a@e2e.test', password: 'AdminA-Pass123!' };
  const adminB = { email: 'admin.b@e2e.test', password: 'AdminB-Pass123!' };
  const viewer = { email: 'viewer.a@e2e.test', password: 'Viewer-Pass123!' };

  beforeAll(async () => {
    const e2e = await createE2eApp();
    app = e2e.app;
    api = axios.create({
      baseURL: e2e.baseURL,
      validateStatus: () => true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  function refreshCookieOf(res: AxiosResponse): string {
    const setCookie: string[] = res.headers['set-cookie'] ?? [];
    return setCookie.find((c) => c.startsWith('refresh_token=')) ?? '';
  }

  async function login(email: string, password: string) {
    return api.post('/api/auth/login', { email, password });
  }

  describe('auth session', () => {
    it('rejects a wrong password with 401', async () => {
      const res = await login(SUPERADMIN_EMAIL, 'definitely-wrong');
      expect(res.status).toBe(401);
    });

    it('logs in and delivers the refresh token only as an httpOnly cookie', async () => {
      const res = await login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
      expect(res.status).toBe(200);
      expect(typeof res.data.accessToken).toBe('string');
      expect(res.data.user).toMatchObject({
        email: SUPERADMIN_EMAIL,
        role: 'SUPERADMIN',
      });
      // Refresh token never rides in the body.
      expect(res.data.refreshToken).toBeUndefined();

      const cookie = refreshCookieOf(res);
      expect(cookie).toContain('refresh_token=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/auth');

      superToken = res.data.accessToken;
      superRefreshCookie = cookie.split(';')[0];
    });

    it('refreshes the access token with the cookie and rotates it', async () => {
      const res = await api.post(
        '/api/auth/refresh',
        {},
        { headers: { Cookie: superRefreshCookie } },
      );
      expect(res.status).toBe(200);
      expect(typeof res.data.accessToken).toBe('string');
      const rotated = refreshCookieOf(res);
      expect(rotated).toContain('refresh_token=');
      expect(rotated.split(';')[0]).not.toBe(superRefreshCookie);
    });

    it('rejects a refresh without the cookie', async () => {
      const res = await api.post('/api/auth/refresh', {});
      expect(res.status).toBe(401);
    });

    it('rejects protected routes without a token', async () => {
      const res = await api.get('/api/companies');
      expect(res.status).toBe(401);
    });
  });

  describe('invite-based onboarding (SUPERADMIN)', () => {
    it('creates company A together with its initial ADMIN', async () => {
      const res = await api.post(
        '/api/companies',
        {
          name: 'E2E Company A',
          adminName: 'Admin A',
          adminEmail: adminA.email,
          adminPassword: adminA.password,
        },
        bearer(superToken),
      );
      expect(res.status).toBe(201);
      expect(typeof res.data.id).toBe('string');
      companyAId = res.data.id;
    });

    it('creates company B together with its initial ADMIN', async () => {
      const res = await api.post(
        '/api/companies',
        {
          name: 'E2E Company B',
          adminName: 'Admin B',
          adminEmail: adminB.email,
          adminPassword: adminB.password,
        },
        bearer(superToken),
      );
      expect(res.status).toBe(201);
    });

    it('blocks the SUPERADMIN (no company) on tenant-scoped routes with 403', async () => {
      const res = await api.get('/api/products', bearer(superToken));
      expect(res.status).toBe(403);
    });
  });

  describe('catalog and warehouse setup (company A ADMIN)', () => {
    // The app trusts exactly one proxy hop (nginx in prod), so the client IP
    // forwarded in X-Forwarded-For must be what req.ip resolves to.
    const forwardedIp = '203.0.113.7';

    it('logs in as the provisioned company A ADMIN', async () => {
      const res = await api.post(
        '/api/auth/login',
        { email: adminA.email, password: adminA.password },
        { headers: { 'X-Forwarded-For': forwardedIp } },
      );
      expect(res.status).toBe(200);
      expect(res.data.user).toMatchObject({ role: 'ADMIN' });
      adminAToken = res.data.accessToken;
    });

    it('records the login in the audit trail with the forwarded client IP', async () => {
      const res = await api.get('/api/audit?action=LOGIN', bearer(adminAToken));
      expect(res.status).toBe(200);
      const entry = res.data.data.find(
        (row: { user?: { email: string } | null }) =>
          row.user?.email === adminA.email,
      );
      expect(entry).toBeDefined();
      expect(entry.ipAddress).toBe(forwardedIp);
    });

    it('blocks an ADMIN on the platform-level companies route with 403', async () => {
      const res = await api.get('/api/companies', bearer(adminAToken));
      expect(res.status).toBe(403);
    });

    it('never allows provisioning another ADMIN through POST /users', async () => {
      const res = await api.post(
        '/api/users',
        {
          name: 'Rogue Admin',
          email: 'rogue@e2e.test',
          password: 'Rogue-Pass123!',
          role: 'ADMIN',
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(400);
    });

    it('provisions a VIEWER worker account', async () => {
      const res = await api.post(
        '/api/users',
        {
          name: 'Viewer A',
          email: viewer.email,
          password: viewer.password,
          role: 'VIEWER',
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(201);
    });

    it('creates a category and a product', async () => {
      const categoryRes = await api.post(
        '/api/categories',
        { name: 'E2E Category' },
        bearer(adminAToken),
      );
      expect(categoryRes.status).toBe(201);

      const productRes = await api.post(
        '/api/products',
        {
          name: 'E2E Product',
          sku: 'E2E-SKU-001',
          minStock: 5,
          categoryId: categoryRes.data.id,
        },
        bearer(adminAToken),
      );
      expect(productRes.status).toBe(201);
      productAId = productRes.data.id;
    });

    it('creates the warehouse hierarchy down to two locations', async () => {
      const warehouseRes = await api.post(
        '/api/warehouses',
        { name: 'E2E Warehouse' },
        bearer(adminAToken),
      );
      expect(warehouseRes.status).toBe(201);
      warehouseAId = warehouseRes.data.id;

      const zoneRes = await api.post(
        `/api/warehouses/${warehouseAId}/zones`,
        { name: 'Zona E2E' },
        bearer(adminAToken),
      );
      expect(zoneRes.status).toBe(201);
      const zoneId = zoneRes.data.id;

      const aisleRes = await api.post(
        `/api/warehouses/${warehouseAId}/zones/${zoneId}/aisles`,
        { name: 'Pasillo E2E' },
        bearer(adminAToken),
      );
      expect(aisleRes.status).toBe(201);
      const aisleId = aisleRes.data.id;

      const base = `/api/warehouses/${warehouseAId}/zones/${zoneId}/aisles/${aisleId}/locations`;
      const loc1Res = await api.post(
        base,
        { code: 'E2E-01' },
        bearer(adminAToken),
      );
      const loc2Res = await api.post(
        base,
        { code: 'E2E-02' },
        bearer(adminAToken),
      );
      expect(loc1Res.status).toBe(201);
      expect(loc2Res.status).toBe(201);
      location1Id = loc1Res.data.id;
      location2Id = loc2Res.data.id;
    });
  });

  describe('stock movements (company A)', () => {
    const movements = '/api/stock/movements';

    it('registers an INBOUND movement and creates stock at the destination', async () => {
      const res = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'INBOUND',
          quantity: 10,
          toLocationId: location1Id,
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(201);

      const stock = await api.get(
        `/api/stock/by-product/${productAId}`,
        bearer(adminAToken),
      );
      expect(stock.status).toBe(200);
      expect(stock.data.total).toBe(10);
    });

    it('rejects an OUTBOUND movement beyond the available quantity', async () => {
      const res = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'OUTBOUND',
          quantity: 15,
          fromLocationId: location1Id,
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(400);
    });

    it('decrements stock on a valid OUTBOUND movement', async () => {
      const res = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'OUTBOUND',
          quantity: 4,
          fromLocationId: location1Id,
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(201);

      const stock = await api.get(
        `/api/stock/by-product/${productAId}`,
        bearer(adminAToken),
      );
      expect(stock.data.total).toBe(6);
    });

    it('rejects a TRANSFER whose source and destination are the same location', async () => {
      const res = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'TRANSFER',
          quantity: 2,
          fromLocationId: location1Id,
          toLocationId: location1Id,
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(400);
    });

    it('moves stock between locations on a valid TRANSFER', async () => {
      const res = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'TRANSFER',
          quantity: 2,
          fromLocationId: location1Id,
          toLocationId: location2Id,
        },
        bearer(adminAToken),
      );
      expect(res.status).toBe(201);

      const stock = await api.get(
        `/api/stock/by-product/${productAId}`,
        bearer(adminAToken),
      );
      expect(stock.data.total).toBe(6);
      const byLocation = new Map<string, number>(
        stock.data.entries.map(
          (e: { locationId: string; quantity: number }) => [
            e.locationId,
            e.quantity,
          ],
        ),
      );
      expect(byLocation.get(location1Id)).toBe(4);
      expect(byLocation.get(location2Id)).toBe(2);
    });

    it('lets a VIEWER read stock but not create movements', async () => {
      const loginRes = await login(viewer.email, viewer.password);
      expect(loginRes.status).toBe(200);
      viewerToken = loginRes.data.accessToken;

      const overview = await api.get(
        '/api/stock/overview',
        bearer(viewerToken),
      );
      expect(overview.status).toBe(200);

      const movementRes = await api.post(
        movements,
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'INBOUND',
          quantity: 1,
          toLocationId: location1Id,
        },
        bearer(viewerToken),
      );
      expect(movementRes.status).toBe(403);
    });
  });

  describe('multi-tenant isolation (company B)', () => {
    it('logs in as the company B ADMIN', async () => {
      const res = await login(adminB.email, adminB.password);
      expect(res.status).toBe(200);
      adminBToken = res.data.accessToken;
    });

    it('cannot see company A products in listings', async () => {
      const res = await api.get('/api/products', bearer(adminBToken));
      expect(res.status).toBe(200);
      expect(res.data.data).toEqual([]);
    });

    it('cannot fetch a company A product by id', async () => {
      const res = await api.get(
        `/api/products/${productAId}`,
        bearer(adminBToken),
      );
      expect(res.status).toBe(404);
    });

    it('cannot move stock against company A resources', async () => {
      const res = await api.post(
        '/api/stock/movements',
        {
          productId: productAId,
          warehouseId: warehouseAId,
          type: 'INBOUND',
          quantity: 1,
          toLocationId: location1Id,
        },
        bearer(adminBToken),
      );
      expect(res.status).toBe(404);
    });

    it('only sees its own company users', async () => {
      const res = await api.get('/api/users', bearer(adminBToken));
      expect(res.status).toBe(200);
      const emails = res.data.map((u: { email: string }) => u.email);
      expect(emails).toContain(adminB.email);
      expect(emails).not.toContain(adminA.email);
      expect(emails).not.toContain(viewer.email);
    });
  });

  describe('logout revocation', () => {
    it('revokes the access token on logout', async () => {
      const before = await api.get('/api/companies', bearer(superToken));
      expect(before.status).toBe(200);
      expect(before.data.map((c: { id: string }) => c.id)).toContain(
        companyAId,
      );

      const logoutRes = await api.post(
        '/api/auth/logout',
        {},
        bearer(superToken),
      );
      expect(logoutRes.status).toBe(204);

      // The same (still unexpired) access token is now denylisted.
      const after = await api.get('/api/companies', bearer(superToken));
      expect(after.status).toBe(401);
    });
  });
});
