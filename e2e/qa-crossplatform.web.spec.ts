/**
 * QA cross-platform E2E: Webapp (customer) → Backend → MongoDB/Redis → Dashboard (admin) → Webapp.
 * Runs ONLY against the isolated QA stack. Refuses any other API target.
 *   E2E_WEB_URL=http://localhost:3100 E2E_DASHBOARD_URL=http://127.0.0.1:5184 QA_API_URL=http://127.0.0.1:5101 \
 *   QA_REDIS_DB=14 QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... npx playwright test e2e/qa-crossplatform.web.spec.ts --project=web
 */
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const API = process.env.QA_API_URL || 'http://127.0.0.1:5101';
const DASH = process.env.E2E_DASHBOARD_URL || 'http://127.0.0.1:5184';
const REDIS_DB = process.env.QA_REDIS_DB || '14';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'qa-admin@builtglory.test';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || '';
test.skip(!/127\.0\.0\.1:5101|localhost:5101/.test(API), 'QA cross-platform spec runs only against the isolated QA API');

const json = async (path: string, init: RequestInit & { token?: string } = {}) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const r = await fetch(API + path, { ...init, headers });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const redisOtp = (requestId: string) => {
  const plain = execFileSync('redis-cli', ['-n', REDIS_DB, 'GET', `otp:plain:${requestId}`], { encoding: 'utf8' }).trim();
  if (!/^\d{6}$/.test(plain)) {
    throw new Error(`QA OTP reveal key otp:plain:${requestId} is missing. Log-mode SMS is required. The primary OTP record stores only a hash.`);
  }
  return plain;
};
const latestRequestId = (phone: string) => execFileSync('redis-cli', ['-n', REDIS_DB, 'GET', `otp:latest:91${phone}`], { encoding: 'utf8' }).trim();

async function adminToken() {
  const r = await json('/api/v1/auth/admin/login', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.accessToken as string;
}

/** Creates the customer through the API OTP flow and completes their profile so the UI login lands on home. */
async function existingCustomer(phone: string, name: string) {
  const send = await json('/api/v1/auth/customer/otp/send', { method: 'POST', body: JSON.stringify({ phone, countryCode: '+91' }) });
  expect(send.status).toBe(200);
  const requestId = send.body.data.requestId;
  const verify = await json('/api/v1/auth/customer/otp/verify', { method: 'POST', body: JSON.stringify({ phone, countryCode: '+91', otp: redisOtp(requestId), requestId }) });
  expect(verify.status).toBe(200);
  const token = verify.body.data.accessToken;
  const me = await json('/api/v1/me', { method: 'PATCH', token, body: JSON.stringify({ name, email: `qa${phone}@builtglory.test`, userType: 'resident' }) });
  expect(me.status, JSON.stringify(me.body)).toBe(200);
  return { token, userId: String(verify.body.data.user._id || verify.body.data.user.id) };
}

async function webOtpLogin(page: Page, phone: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'OTP', exact: true }).click();
  await page.getByLabel('Mobile number').fill(phone);
  // OTP send is throttled by a resend cooldown; the API-side precondition already used one, so wait it out.
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your number' })).toBeVisible({ timeout: 20_000 });
  const otp = redisOtp(latestRequestId(phone));
  for (let i = 0; i < 6; i += 1) await page.getByLabel(`Digit ${i + 1}`).fill(otp.charAt(i));
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue to Builtglory' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

test.describe.configure({ mode: 'serial' });

test('customer enquiry on Webapp is stored, shown in Dashboard, and admin updates flow back to Webapp', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const admin = await adminToken();
  const props = await json('/api/v1/properties?limit=5');
  expect(props.status).toBe(200);
  const property = props.body.data.find((p: { status: string }) => p.status === 'available');
  expect(property, 'needs one available property in the QA DB').toBeTruthy();
  const propertyId = String(property._id || property.id);

  const phone = '7' + String(Date.now()).slice(-9);
  const name = `QA Web Buyer ${phone.slice(-4)}`;
  const customer = await existingCustomer(phone, name);
  // Respect the OTP resend cooldown (OTP_RESEND_SECONDS, default 60s) before the UI asks for a fresh code.
  await page.waitForTimeout(61_000);

  // 1. Webapp: real OTP login through the UI.
  await webOtpLogin(page, phone);

  // 2. Webapp: property detail → enquiry form → submit.
  await page.goto(`/properties/${propertyId}`);
  await expect(page.getByText(property.title).first()).toBeVisible({ timeout: 20_000 });
  await page.goto(`/properties/${propertyId}/enquiry`);
  await page.getByRole('button', { name: 'Price Negotiation' }).click();
  await page.getByRole('button', { name: 'Phone', exact: true }).click();
  await page.getByPlaceholder('Any specific requirements or questions?').fill('QA cross-platform enquiry');
  await page.getByText('I agree to be contacted by Builtglory').click();
  // The back arrow is also named 'Submit Enquiry' (a11y finding); the primary action is the last one.
  await page.getByRole('button', { name: 'Submit Enquiry' }).last().click();
  await expect(page.getByRole('button', { name: 'View My Enquiries' })).toBeVisible({ timeout: 20_000 });

  // 3. Backend/DB: the enquiry exists with the exact business fields the UI chose.
  const mine = await json('/api/v1/me/buy-enquiries', { token: customer.token });
  expect(mine.status).toBe(200);
  const enquiry = mine.body.data.find((e: { propertyId: unknown }) => JSON.stringify(e.propertyId).includes(propertyId));
  expect(enquiry, JSON.stringify(mine.body.data).slice(0, 500)).toBeTruthy();
  const enquiryId = String(enquiry._id || enquiry.id);
  const adminView = await json(`/api/v1/admin/buy-enquiries/${enquiryId}`, { token: admin });
  expect(adminView.status).toBe(200);
  expect(adminView.body.data).toEqual(expect.objectContaining({ interestType: 'price_negotiation', preferredContact: 'phone', status: 'new', additionalMessage: 'QA cross-platform enquiry' }));

  // 4. Dashboard UI: admin sees the new enquiry in the Buy Enquiries queue and its detail page.
  const dash = await browser.newPage();
  await dash.goto(DASH + '/login');
  await dash.locator('#email').fill(ADMIN_EMAIL);
  await dash.locator('#password').fill(ADMIN_PASSWORD);
  await dash.getByRole('button', { name: /sign in/i }).click();
  await expect(dash).toHaveURL(/\/admin\//, { timeout: 30_000 });
  await dash.goto(DASH + '/admin/enquiries/buy');
  await expect(dash.getByText(name).first()).toBeVisible({ timeout: 30_000 });
  await dash.goto(DASH + `/admin/enquiries/buy/${enquiryId}`);
  await expect(dash.getByText(name).first()).toBeVisible({ timeout: 30_000 });
  await expect(dash.getByText(property.title).first()).toBeVisible();
  await dash.screenshot({ path: test.info().outputPath('dashboard-enquiry-detail.png'), fullPage: true });

  // 5. Admin responds (API, as the Dashboard does) → customer sees the new status on the Webapp.
  const responded = await json(`/api/v1/admin/buy-enquiries/${enquiryId}`, { method: 'PATCH', token: admin, body: JSON.stringify({ status: 'responded', notes: 'QA advisor called' }) });
  expect(responded.status, JSON.stringify(responded.body)).toBe(200);
  const after = await json(`/api/v1/me/buy-enquiries/${enquiryId}`, { token: customer.token });
  expect(after.body.data.status).toBe('responded');
  await page.goto(`/enquiries/${enquiryId}`);
  // 'responded' maps to step index 1 ("Verification Call") in lib/pipelines.ts enquiryStepIndex.
  await expect(page.getByText(/Step 2 of 8 · Verification Call/).first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: test.info().outputPath('web-enquiry-status.png'), fullPage: true });

  // 6. Isolation: another customer cannot open this enquiry.
  const other = await existingCustomer('6' + String(Date.now()).slice(-9), 'QA Other');
  expect((await json(`/api/v1/me/buy-enquiries/${enquiryId}`, { token: other.token })).status).toBe(404);
});
