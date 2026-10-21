# Builtglory Web App — API calls and contracts

This file lists **every HTTP call the web app makes**, the exact request it sends, and the response fields it reads. A backend that satisfies these contracts will work with the web app without frontend changes.

- Source of truth in the frontend: `src/services/*.ts` (calls), `src/types/*.ts` (shapes).
- Backend reference: `BuiltGlory-Backend/API_CALLS_AND_CONTRACTS.md` (Express routes + Joi validators).
- 51 distinct endpoints are used. All are customer-facing or public; no `/admin/*` endpoint is called.

---

## 1. Global conventions

### 1.1 Base URL

| Item | Value |
| --- | --- |
| Env var | `NEXT_PUBLIC_API_BASE_URL` |
| Default | `http://localhost:5001/api/v1` |
| Join rule | trailing `/` stripped from base, leading `/` stripped from path |

Every path in this document is relative to the base URL (for example `/me` means `GET http://localhost:5001/api/v1/me`).

### 1.2 Request headers

| Header | When | Value |
| --- | --- | --- |
| `x-device-id` | every request | `web-<uuid>`, generated once per browser and stored in `localStorage.bg_device_id` |
| `Authorization` | when the user is signed in | `Bearer <accessToken>` |
| `Content-Type` | JSON bodies | `application/json` |
| `Content-Type` | `POST /documents` | `multipart/form-data` (set by the browser) |

### 1.3 Success envelope

Every successful JSON response must be:

```json
{
  "data": "<payload: object | array | null>",
  "meta": { "requestId": "string", "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```

- `data` is unwrapped by the frontend. List screens read `meta.total` (property count, enquiry count, listing count).
- `204 No Content` is accepted with no body (used by `DELETE /properties/:id/save`).

### 1.4 Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Sell request submission is incomplete.",
    "details": [{ "field": "photos", "message": "Upload at least 5 photos." }]
  },
  "meta": { "requestId": "string" }
}
```

The UI shows `error.details[0].message` if present, otherwise `error.message`, otherwise `API request failed: <status>`. A network failure shows *"Could not reach the Builtglory server. Check your connection and try again."* Keep messages human-readable — they are displayed verbatim.

### 1.5 Authentication and token refresh

| Step | Behaviour |
| --- | --- |
| Storage | `localStorage.bg_access_token`, `localStorage.bg_refresh_token` |
| 401 on an authenticated call | the client calls `POST /auth/refresh` **once** (concurrent 401s share one refresh) and retries the original request with the new access token |
| Refresh fails | tokens are cleared, the UI shows *"Your session has expired. Please sign in again."* and returns to the sign-in gate |
| Refresh token rotation | supported — the client always stores the `refreshToken` returned by refresh |

### 1.6 CORS

The browser calls the API directly. The API must allow the web origin with `Authorization` and `x-device-id` headers:

- local dev: `http://localhost:3000` (Next default) and/or `http://localhost:5173`
- production: the deployed web domain

> The current backend `.env` has `CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:8081`, so `http://localhost:3000` is blocked.

### 1.7 Common enums used by the web app

| Enum | Values |
| --- | --- |
| Property `type` | `plot`, `apartment`, `villa`, `commercial`, `land`, `fractional`, `3d_printing`, `organic_home`, `ceo_mansion`, `holiday_home`, `farmhouse`, `nri`, `interior` (also displays `residential`) |
| Property `status` | `draft`, `available`, `reserved`, `under_construction`, `sold` |
| User `role` | `buyer`, `seller`, `both` |
| User `userType` | `resident`, `nri`, `pio` |
| Enquiry `status` | `new`, `responded`, `visit_scheduled`, `negotiating`, `closed` |
| Visit `status` | `scheduled`, `confirmed`, `completed`, `cancelled`, `missed`, `rescheduled` |
| Visit `visitType` | `physical`, `virtual` |
| Sell request `status` | `draft`, `new`, `under_review`, `accepted`, `approved`, `active`, `negotiating`, `paused`, `sold`, `rejected`, `changes_requested` |
| Acquisition `stage` | `pending_review`, `site_inspection`, `valuation`, `negotiation`, `token_to_seller`, `documentation`, `seller_payout`, `acquired`, `rejected`, `on_hold` |
| Sales deal `stage` | `active_leads`, `site_visits`, `negotiation`, `token_payment`, `full_payment`, `stage_payment`, `interior_design`, `documentation`, `closed`, `lost`, `re_engagement` |
| Support ticket `status` | `open`, `in_progress`, `resolved`, `closed` |
| Support `category` | `property_inquiry`, `payment`, `technical`, `kyc`, `general`, `complaint` |

---

## 2. Endpoint index

| # | Method | Path | Auth | Used by (screen) |
| --- | --- | --- | --- | --- |
| 1 | POST | `/auth/customer/otp/send` | public | Login, Sign up, Onboarding, Change phone, Delete account |
| 2 | POST | `/auth/customer/otp/verify` | public | Login, Sign up, Onboarding, Change phone, Delete account |
| 3 | POST | `/auth/refresh` | public | HTTP client (any 401) |
| 4 | POST | `/auth/logout` | bearer | Log out dialog |
| 5 | GET | `/me` | customer | Session restore, Privacy (download my data) |
| 6 | PATCH | `/me` | customer | Sign up, Onboarding, Profile, Settings, Enquiry, Sell, Deal confirmed |
| 7 | GET | `/me/account-deletion` | customer | Delete account |
| 8 | POST | `/me/account-deletion` | customer | Delete account |
| 9 | GET | `/properties` | public | Home, Buy, Similar, Compare, Sell (recently sold), Login/About (listing count) |
| 10 | GET | `/properties/:propertyId` | public | Property detail and all property sub-pages |
| 11 | POST | `/properties/:propertyId/save` | customer | Heart / Save button |
| 12 | DELETE | `/properties/:propertyId/save` | customer | Heart / Save button |
| 13 | GET | `/me/favorites` | customer | Session (saved ids), Saved properties |
| 14 | POST | `/buy-enquiries` | customer | Submit enquiry |
| 15 | GET | `/me/buy-enquiries` | customer | My Enquiries, My Visits, My Deals, Schedule visit, NRI call, Delete account |
| 16 | GET | `/me/buy-enquiries/:enquiryId` | customer | Enquiry status |
| 17 | PATCH | `/me/buy-enquiries/:enquiryId/cancel` | customer | Enquiry status → Cancel |
| 18 | GET | `/visits/availability` | customer | Schedule visit, NRI video call |
| 19 | POST | `/visits` | customer | Schedule visit, NRI video call |
| 20 | PATCH | `/visits/:visitId/reschedule` | customer | Schedule visit (reschedule mode) |
| 21 | PATCH | `/visits/:visitId/cancel` | customer | My Visits → Cancel |
| 22 | POST | `/sell-requests/drafts` | customer | Sell wizard |
| 23 | PATCH | `/me/sell-requests/:sellRequestId` | customer | Sell wizard |
| 24 | POST | `/me/sell-requests/:sellRequestId/submit` | customer | Sell wizard → Submit |
| 25 | GET | `/me/sell-requests` | customer | My Listings, My Deals, Delete account |
| 26 | GET | `/me/sell-requests/:sellRequestId` | customer | (service exists, not used by a screen yet) |
| 27 | GET | `/me/sell-requests/:sellRequestId/activity` | customer | Listing status, Offer, Accept, Counter, Deal confirmed, Payment schedule, Registration, Sold, My Deals |
| 28 | POST | `/me/sell-requests/:sellRequestId/offer-decision` | customer | Accept offer, Counter offer, Deal confirmed |
| 29 | POST | `/me/sell-requests/:sellRequestId/messages` | customer | Registration → Confirm appointment |
| 30 | POST | `/me/sell-requests/:sellRequestId/valuation-estimate` | customer | Sell wizard (price step), Offer |
| 31 | POST | `/documents` | bearer | Sell photos, Profile photo, Ticket screenshot |
| 32 | GET | `/me/notifications` | customer | Notifications |
| 33 | GET | `/me/notifications/unread-count` | customer | Sidebar badge + header dot (every 60 s) |
| 34 | PATCH | `/me/notifications/read` | customer | Notifications → Mark all read |
| 35 | PATCH | `/me/notifications/:id/read` | customer | Notifications → open one |
| 36 | GET | `/search/trending` | public | Search |
| 37 | GET | `/me/searches` | customer | Search (recent) |
| 38 | POST | `/me/searches` | customer | Search (record term) |
| 39 | DELETE | `/me/searches` | customer | Search → Clear all |
| 40 | GET | `/content` | public | Help/FAQ, Legal, Terms modal, Onboarding terms, About |
| 41 | GET | `/app/config` | public | Support phone/WhatsApp, version, store link |
| 42 | POST | `/support/tickets` | customer | Raise ticket |
| 43 | GET | `/me/support/tickets` | customer | Customer support → Recent tickets |
| 44 | GET | `/me/support/tickets/:ticketId` | customer | Ticket detail |
| 45 | POST | `/me/support/tickets/:ticketId/responses` | customer | Ticket reply, Live chat send |
| 46 | POST | `/me/support/tickets/:ticketId/read` | customer | Ticket detail, Live chat |
| 47 | POST | `/me/support/tickets/:ticketId/close` | customer | Ticket → Mark as resolved, Live chat → Close |
| 48 | POST | `/me/support/tickets/:ticketId/reopen` | customer | Ticket → Reopen |
| 49 | GET | `/me/support/live-chat` | customer | Live chat |
| 50 | POST | `/me/support/live-chat` | customer | Live chat (first message) |
| 51 | POST | `/callbacks` | customer | Customer support → Request a callback |

---

## 3. Contracts by module

### 3.1 Auth

#### 1. `POST /auth/customer/otp/send`

Request body:

```json
{ "countryCode": "+91", "phone": "9884012345", "deviceId": "web-3f1c…", "purpose": "login" }
```

| Field | Rule |
| --- | --- |
| `phone` | exactly 10 digits (UI strips spaces) |
| `purpose` | `login` (sign in / sign up / re-verify before deletion) or `change_phone` |

Response `data` read by the UI:

```json
{ "requestId": "otp_req_…", "expiresInSeconds": 300, "canResendAt": "2026-10-20T10:01:30.000Z" }
```

- `canResendAt` drives the "Resend code in m:ss" countdown.
- `expiresInSeconds` drives "The code is valid for N minutes".
- Error shown inline under the phone field (for example 409 *OTP resend cooldown is active.*).

#### 2. `POST /auth/customer/otp/verify`

Request body:

```json
{ "countryCode": "+91", "phone": "9884012345", "otp": "482913", "requestId": "otp_req_…", "purpose": "login" }
```

- `otp` is **6 digits**. The UI renders 6 boxes.
- `purpose: "login"` response — a session:

```json
{ "accessToken": "jwt", "refreshToken": "jwt", "expiresInSeconds": 900, "user": { "_id": "…", "name": "Aarav" } }
```

  The UI stores both tokens, then calls `GET /me`. If `user.name` is empty after a login (new account), the UI routes to onboarding (`/onboarding?stage=setup`).

- `purpose: "change_phone"` response:

```json
{ "verified": true, "phone": "9000000000", "phoneNormalized": "919000000000" }
```

  The UI then calls `PATCH /me { "mobileNumber": "9000000000" }`.

#### 3. `POST /auth/refresh`

```json
{ "refreshToken": "jwt" }
```

Response `data`: `{ "accessToken": "jwt", "refreshToken": "jwt" }`. Any non-2xx ends the session.

#### 4. `POST /auth/logout`

Headers include the current `Authorization`. Body: `{ "refreshToken": "jwt" }`. Response `data`: `{ "revoked": true }`. Failure is ignored — the client clears tokens regardless.

---

### 3.2 Users (`/me`)

#### 5. `GET /me`

Fields the UI reads:

```json
{
  "_id": "665f…",
  "name": "Aarav Subramanian",
  "mobileNumber": "9884012345",
  "phone": "+91 9884012345",
  "phoneNormalized": "919884012345",
  "email": "aarav@example.com",
  "isVerified": true,
  "role": "buyer",
  "userType": "resident",
  "city": "Chennai",
  "profilePhoto": "https://…/profile.jpg",
  "kycStatus": "pending",
  "bankDetails": { "accountHolderName": "…", "bankName": "…", "accountNumberLast4": "4321", "ifsc": "HDFC0001234", "branch": "…", "upiId": "…" },
  "notificationPreferences": {
    "push":     { "transactional": true, "marketing": true },
    "whatsapp": { "transactional": true, "marketing": false },
    "sms":      { "transactional": true, "marketing": false },
    "email":    { "transactional": true, "marketing": false },
    "in_app":   { "transactional": true, "marketing": true }
  }
}
```

- Phone display uses `mobileNumber` → `phone` → `phoneNormalized` (last 10 digits).
- `kycStatus === "verified"` marks the "KYC Verified" step of the enquiry pipeline as done.
- Privacy → "Download my data" saves the full `GET /me` JSON as `builtglory-my-data.json`.

#### 6. `PATCH /me`

The response must be the **updated user** (same shape as `GET /me`); the UI replaces its copy with it. Bodies sent:

| Screen | Body |
| --- | --- |
| Sign up (after OTP) | `{ "name", "email", "role": "buyer\|seller", "userType": "resident\|nri" }` |
| Onboarding — profile | `{ "name", "email"? }` |
| Onboarding — preferences | `{ "city", "role", "userType" }` |
| Edit profile | `{ "name", "email": string\|null, "city": string\|null }` |
| Profile photo | `{ "profilePhoto": "<url from POST /documents>" }` |
| Change phone (after OTP) | `{ "mobileNumber": "9000000000" }` |
| Notification settings | `{ "notificationPreferences": { push, whatsapp, sms, email, in_app } }` — **always all five channels** |
| App settings → Use GPS | `{ "latitude", "longitude", "city" }` |
| Submit enquiry (only changed fields) | `{ "name"?, "email"? }` |
| Sell → Submit (if role is `buyer`) | `{ "role": "both" }` |
| Deal confirmed → Save bank details | `{ "bankDetails": { "accountHolderName", "bankName", "accountNumberLast4", "ifsc", "branch": string\|null, "upiId": string\|null } }` |

Errors such as *"This email is already registered to another account."* are shown inline.

#### 7. `GET /me/account-deletion`

Response `data`: `{ "status": "none|requested|cancelled|completed", "requestedAt", "scheduledDeletionAt" }`. If `status === "requested"` the Delete Account screen shows the confirmation card directly.

#### 8. `POST /me/account-deletion`

```json
{ "confirmation": "DELETE", "reason": "Too many calls or notifications — <optional note>" }
```

Response: same shape as #7. The UI then signs the user out.

---

### 3.3 Properties

#### 9. `GET /properties`

Query parameters sent (only the ones that apply):

| Param | Example | Sent by |
| --- | --- | --- |
| `type` | `apartment` | Buy (one request per ticked type), Similar, Compare |
| `maxPrice` | `15000000` | Buy budget slider (only when below ₹3 Cr) |
| `bhk` | `2,3` | Buy bedrooms pills (CSV) |
| `amenities` | `Lift,Pool` | Buy amenities (CSV) |
| `verified` | `true` | Buy "Verified listings only" |
| `search` | `3 BHK Adyar` | Buy, when opened from Search |
| `sort` | `relevance` / `price_asc` / `price_desc` | Buy sort menu ("Largest area" is sorted in the browser) |
| `featured` | `true` | Home → Featured (limit 6) |
| `upcoming` | `true` | Home → Upcoming launches (limit 4) |
| `recentlySold` | `true` | Sell → Recently sold (limit 4) |
| `limit` | `1` / `4` / `6` / `50` | `limit=1` is used only to read `meta.total` for "Live listings" |

Response: `data: Property[]`, `meta.total`.

**Property fields the UI reads** (shared by #9, #10, #11, #13):

```json
{
  "_id": "665f…",
  "referenceId": "PRP-000123",
  "title": "Sunrise Heights — 3 BHK",
  "description": "…",
  "type": "apartment",
  "status": "available",
  "isFeatured": true,
  "isUpcoming": false,
  "launchDate": "2026-12-01T00:00:00.000Z",
  "price": 8500000,
  "isNegotiable": true,
  "address": { "line1": "…", "locality": "Adyar", "city": "Chennai", "pincode": "600020", "latitude": 13.0, "longitude": 80.25 },
  "specs": { "bhk": "3", "builtUpArea": 1450, "carpetArea": 1200, "plotArea": null, "area": null, "floor": 7, "totalFloors": 12, "facing": "East", "unitNo": "B-704", "furnishing": "Semi-Furnished", "age": "1–5 years" },
  "amenities": ["Lift", "Gym", "Pool"],
  "media": { "coverPhoto": "https://…", "photos": ["https://…"], "videoUrl": "https://…mp4", "droneImageUrl": "https://…", "tour3dUrl": "https://…", "floorPlanUrl": "https://…" },
  "advantages": { "investment": ["+22% appreciation in 5 yrs"], "location": ["…"], "connectivity": ["…"] },
  "nearbyPlaces": [{ "name": "DAV School", "type": "school", "distance": "1.2 km" }],
  "highlights": ["Vaastu compliant"],
  "metrics": { "views": 1284, "enquiries": 36, "savedCount": 12 },
  "savedByUsers": ["<userId>"],
  "soldAt": "2026-09-01T00:00:00.000Z",
  "createdAt": "2026-08-20T00:00:00.000Z"
}
```

| UI element | Field(s) |
| --- | --- |
| "Verified" / "Legally verified" badge | `status === "available"` (same rule as the backend `verified=true` filter) |
| Area | `specs.builtUpArea` → `carpetArea` → `plotArea` → `area` (first positive number) |
| BHK / Beds | `specs.bhk` (number or numeric string) |
| ₹/sqft | `price / area` |
| Photos (cards, gallery, lightbox) | `media.coverPhoto` first, then `media.photos` |
| Location line | `address.locality` (or `line1`) + `address.city` |
| Flat no. | `specs.unitNo` or `specs.unitNumber` |
| Floor | `specs.floor` + " of " + `specs.totalFloors` |
| Facing | `specs.facing` |
| Posted | relative time from `createdAt` |
| Specifications tab | every other scalar key in `specs` |
| VR tour / Aerial / Floor plan pages | `media.tour3dUrl` (iframe) / `media.videoUrl` (video) or `media.droneImageUrl` / `media.floorPlanUrl` |
| Location page | `advantages.*`, `nearbyPlaces[]` (icon chosen from `type`: school, hospital, metro/train/bus, mall/shop) |
| Specs page | `amenities[]` matched against the 20 design amenities (case-insensitive), `highlights[]` |
| Advisor card counters | `metrics.views`, `metrics.enquiries` |
| Compare "Saved by" row | `metrics.savedCount` |
| "Sold in N days" | `soldAt − createdAt` |
| Map pins (Buy → map view) | `address.latitude/longitude` |

#### 10. `GET /properties/:propertyId`

Returns one Property. 404 → the page shows *"Property not found."* with a retry.

#### 11. `POST /properties/:propertyId/save` / 12. `DELETE /properties/:propertyId/save`

No body. POST returns the Property; DELETE returns `204`. The heart toggles optimistically and reverts on error.

#### 13. `GET /me/favorites`

`data: Property[]`. Loaded once after sign-in to fill the set of saved ids; also the list on the Saved page.

---

### 3.4 Buy enquiries

#### 14. `POST /buy-enquiries`

```json
{
  "propertyId": "665f…",
  "preferredContact": "phone | whatsapp | email",
  "interestType": "schedule_visit | price_negotiation | more_details",
  "preferredVisitTime": "tomorrow_morning | this_weekend_afternoon | custom | null",
  "additionalMessage": "string (≤500) | null"
}
```

`preferredVisitTime` is sent only when `interestType` is `schedule_visit`. Response: the created enquiry (`_id` is used for the "Schedule Visit" link).

#### 15. `GET /me/buy-enquiries?limit=100&sort=newest[&propertyId=…]`

The UI **depends on the enriched shape** (visits and deal attached to each enquiry), because there is no customer "list my visits" or "list my deals" endpoint:

```json
{
  "_id": "…",
  "referenceId": "ENQ-000045",
  "propertyId": "665f…",
  "propertySnapshot": { "title": "Sunrise Heights", "price": 8500000, "type": "apartment", "location": "Adyar, Chennai" },
  "status": "visit_scheduled",
  "customerStage": "negotiation",
  "customerStageLabel": "Negotiating",
  "submittedAt": "2026-10-10T09:14:00.000Z",
  "visits": [
    { "_id": "…", "referenceId": "VIS-000012", "propertyId": "665f…", "enquiryId": "…", "visitDate": "2026-10-24T00:00:00.000Z", "visitTime": "11:00 AM", "visitType": "physical", "status": "scheduled" }
  ],
  "deal": {
    "_id": "…", "stage": "token_payment",
    "financials": { "offeredPrice": 8200000, "agreedPrice": 8250000 },
    "propertySnapshot": { "title": "Sunrise Heights" }
  }
}
```

`meta.total` is shown as "N total".

#### 16. `GET /me/buy-enquiries/:enquiryId`

Same enriched shape for one enquiry (Enquiry Status page).

#### 17. `PATCH /me/buy-enquiries/:enquiryId/cancel`

No body. The cancel dialog's "Reason for cancelling" select is **not sent** (the endpoint accepts no body). Shown only when the enquiry is active and has no deal.

---

### 3.5 Visits

#### 18. `GET /visits/availability`

| Param | Value |
| --- | --- |
| `propertyId` | property id |
| `visitType` | `physical` (site visit) or `virtual` (NRI video call) |
| `from` | `YYYY-MM-DD` (never earlier than tomorrow) |
| `days` | 1–30 (site visit: the visible month, capped at 30 days ahead; NRI: 14) |

Response read:

```json
{
  "days": [
    { "date": "2026-10-21", "slots": [{ "time": "10:00 AM", "available": true, "status": "available", "remainingCapacity": 1, "bookedCount": 0 }] }
  ]
}
```

Days with no available slot are disabled; booked slots are shown struck-through and disabled.

#### 19. `POST /visits`

```json
{ "propertyId": "665f…", "enquiryId": "…", "visitDate": "2026-10-24", "visitTime": "11:00 AM", "visitType": "physical" }
```

`enquiryId` is the user's active enquiry for that property (required for the visit to appear in "My Visits"). Response used: `_id`, `referenceId`, `visitDate`, `visitTime`.

#### 20. `PATCH /visits/:visitId/reschedule`

```json
{ "visitDate": "2026-10-26", "visitTime": "2:00 PM" }
```

#### 21. `PATCH /visits/:visitId/cancel`

```json
{ "reason": "Cancelled by buyer from My Visits" }
```

---

### 3.6 Sell requests (seller listings)

#### 22. `POST /sell-requests/drafts` and 23. `PATCH /me/sell-requests/:id`

The wizard sends the same payload to both (draft is created on the first "Save as Draft" or the first photo upload; later saves PATCH it):

```json
{
  "propertyType": "apartment",
  "propertyTitle": "Bright 3 BHK in Adyar",
  "askingPrice": 8500000,
  "negotiable": true,
  "address": { "street": "Sunrise Heights", "locality": "Adyar", "city": "Chennai", "pincode": "600020", "latitude": 13.0, "longitude": 80.25 },
  "specifications": {
    "subType": "Gated Community",
    "bhk": "3",
    "builtUpArea": 1450,
    "plotArea": 1450,
    "carpetArea": 1200,
    "floor": "7",
    "totalFloors": 12,
    "unitNo": "B-704",
    "propertyAge": "1–5 years",
    "facing": "East",
    "furnishing": "Unfurnished",
    "parking": 1
  },
  "amenities": ["Lift", "Parking", "Security"],
  "ownershipType": "Freehold",
  "photos": ["https://…/1.jpg", "https://…/2.jpg"],
  "draftStep": 5
}
```

- `bhk` is sent without the " BHK" suffix (`"Studio"` and `"5+"` stay as text).
- `plotArea` is sent only for `plot` and `land`.
- Empty optional fields are omitted or sent as `null`.
- Response: the sell request (`_id` is kept as the draft id).

#### 24. `POST /me/sell-requests/:id/submit`

No body. The backend validates the merged draft (title ≥ 8 chars, street ≥ 3, city, 6-digit pincode, price ≥ ₹50,000, ownership, ≥ 5 photos, seller role). Validation `details[0].message` is shown in the wizard.

#### 25. `GET /me/sell-requests?limit=100&sort=newest`

Fields read: `_id`, `referenceId`, `propertyTitle`, `askingPrice`, `status`, `address.locality`, `address.city`, `photos[0]`, `metrics.views`, `metrics.enquiryCount`, `submittedAt`, `rejectionReason`, `changeRequests[]`. `meta.total` shown as "N total".

#### 27. `GET /me/sell-requests/:id/activity`

The whole seller flow reads this object:

```json
{
  "sellRequest": { "_id": "…", "referenceId": "SR-000031", "propertyTitle": "…", "askingPrice": 8500000, "status": "negotiating", "photos": [], "address": {}, "metrics": { "views": 120 }, "submittedAt": "…" },
  "acquisition": {
    "referenceId": "ACQ-000019",
    "stage": "negotiation",
    "negotiation": { "status": "seller_countered", "sellerDecision": { "decision": "countered", "counterAmount": 8800000 } }
  },
  "offer": { "amount": 8250000, "status": "negotiation", "expiresAt": "2026-10-22T18:00:00.000Z", "counterAmount": 8800000, "notes": null },
  "payoutSchedule": [
    { "key": "token", "label": "Token Amount", "amount": 247500, "dueLabel": "Due on agreement", "status": "pending" },
    { "key": "balance", "label": "Balance Payment", "amount": 8002500, "dueLabel": "Due at registration", "status": "pending" }
  ],
  "registration": {
    "appointment": { "date": "2026-11-15T10:00:00.000Z", "time": "10:00 AM", "office": "Sub-Registrar Office, Adyar", "address": "3rd Main Rd, Kasturba Nagar…" },
    "status": "pending",
    "checklist": ["Original title documents", "Aadhaar & PAN (seller)", "Latest tax receipts", "Encumbrance certificate", "2 passport photos"]
  },
  "metrics": { "enquiryCount": 3, "visitCount": 2, "chatCount": 0, "payoutCount": 0 }
}
```

| UI | Field(s) |
| --- | --- |
| 12-step listing pipeline | `sellRequest.status`, `acquisition.stage`, `acquisition.negotiation`, `offer` (see LOGIC file) |
| Offer amount | `offer.amount` (no offer → "No offer yet" empty state) |
| Countdown | `offer.expiresAt` (null → "No expiry has been set for this offer") |
| Counter sent | `offer.counterAmount` |
| Offer accepted? | `acquisition.negotiation.sellerDecision.decision === "accepted"` or `negotiation.status === "seller_accepted"` or stage ∈ `token_to_seller, documentation, seller_payout, acquired` |
| Payment schedule | `payoutSchedule[]` (status `paid` shown green) |
| Registration | `registration.appointment` (string or object with `date`, `time`, `office`/`location`, `address`), `registration.checklist[]`, `registration.status` |
| Sold page | `sellRequest.status === "sold"` or stage `acquired`; payment received when every payout item is `paid`; registration completed when `registration.status === "completed"` |
| Term sheet preview | `acquisition.referenceId`, `offer.amount`, token and balance from `payoutSchedule` |

#### 28. `POST /me/sell-requests/:id/offer-decision`

```json
{ "decision": "accepted" }
```

```json
{ "decision": "countered", "counterAmount": 8800000, "notes": "Recent sale in the same tower closed at ₹88 L" }
```

Response: the updated activity object (#27).

#### 29. `POST /me/sell-requests/:id/messages`

Sent when the seller confirms the registration checklist:

```json
{ "text": "Registration documents ready: Original title documents, Aadhaar & PAN (seller), …. I confirm the registration appointment." }
```

#### 30. `POST /me/sell-requests/:id/valuation-estimate`

Body: the same payload as #22 (wizard) or empty (Offer screen). Response read:

```json
{ "estimatedPrice": 8010000, "low": 7209000, "high": 8811000, "pricePerSqft": 5524, "area": 1450, "basis": "Based on 6 comparable apartment listings near Adyar." }
```

- Sell step 6 shows Low/High **per sqft** = `low / area`, `high / area`, plus `basis`.
- Offer screen shows "X% above/below area average (₹ estimatedPrice)".

---

### 3.7 Documents

#### 31. `POST /documents` (multipart)

| Form field | Sell photos | Profile photo | Ticket screenshot |
| --- | --- | --- | --- |
| `file` | image (jpeg/png/webp) | image | jpeg/png/pdf |
| `ownerType` | `sell_request` | `user` | `user` |
| `ownerId` | draft sell request id | current user id | current user id |
| `purpose` | `property_media` | `property_media` | `support_attachment` |
| `documentType` | `property_photo` | `profile_photo` | `support_screenshot` |

Response `data` must include a **browser-loadable `url`**:

```json
{ "_id": "…", "referenceId": "DOC-…", "url": "https://bucket.s3.ap-south-1.amazonaws.com/property_media/…/photo.jpg", "status": "uploaded" }
```

The URL is stored in `sellRequest.photos[]`, `user.profilePhoto` or `ticket.attachments[]` and rendered directly in `<img>`.

---

### 3.8 Notifications

#### 32. `GET /me/notifications?limit=100`

```json
{ "_id": "…", "event": "visit_confirmed", "title": "Visit confirmed", "message": "Oct 24, 11:00 AM · Sunrise Heights", "notificationType": "visit", "entityType": "visit", "entityId": "…", "screen": "visits", "enquiryId": "…", "listingId": "…", "propertyId": "…", "dealId": "…", "isRead": false, "createdAt": "…" }
```

Grouped into "Today" / "Earlier" by `createdAt`. Icon and tap target are derived from `event`, `notificationType`, `entityType`, `screen` and the id fields (see LOGIC file).

#### 33. `GET /me/notifications/unread-count` → `{ "count": 3 }` (polled every 60 s while signed in).

#### 34. `PATCH /me/notifications/read` body `{}` — marks all read.

#### 35. `PATCH /me/notifications/:id/read` body `{}`.

---

### 3.9 Search

| # | Call | Body / query | Response |
| --- | --- | --- | --- |
| 36 | `GET /search/trending?limit=8` | — | `string[]` |
| 37 | `GET /me/searches` | — | `string[]` (recent terms, newest first) |
| 38 | `POST /me/searches` | `{ "term": "3 BHK Adyar" }` | `string[]` (updated recent list) |
| 39 | `DELETE /me/searches` | — | `[]` |

---

### 3.10 Content and app config

#### 40. `GET /content?section=faq|legal|about&limit=100`

```json
{ "_id": "…", "slug": "faq-schedule-visit", "section": "faq", "title": "Can I schedule a visit?", "excerpt": "…", "body": "…", "category": "buying", "order": 30, "metadata": { "icon": "home", "topicLabel": "Buying", "lastUpdatedLabel": "1 Jan 2026" }, "updatedAt": "…" }
```

| Section | How the UI uses it |
| --- | --- |
| `faq` | Grouped by `category` into Help topics. Topic label = `metadata.topicLabel`, icon = `metadata.icon` (a Lucide icon id such as `home`, `tag`, `wallet`, `user`). Question = `title`, answer = `body`. |
| `legal` | Terms = slug `terms-of-service` (or category `terms`); Privacy = slug `privacy-policy` (or category `privacy`); "Legal & RERA" = any item whose slug/category/title contains `rera`. "Last updated" = `metadata.lastUpdatedLabel` or `updatedAt`. |
| `about` | First item: `body` (or `excerpt`), `metadata.version`, `metadata.copyright`, `metadata.address`. |

Legal `body` format understood by the renderer: paragraphs separated by blank lines, optional `# Heading` lines (become numbered sections and the "On this page" list) and `- ` bullet lines.

#### 41. `GET /app/config`

```json
{
  "versions": { "current": "2.4.0" },
  "storeUrls": { "android": "https://play.google.com/…", "ios": null },
  "support": { "phone": "+91 8667769670", "supportPhoneE164": "+918667769670", "supportEmail": "support@builtglory.com", "whatsappNumber": "918667769670", "whatsappUrl": "https://wa.me/918667769670", "telUrl": "tel:+918667769670" }
}
```

Used by Call Us, WhatsApp buttons, advisor call button, auth-screen Help link, About (version, "Rate the app"), Legal ("Email us").

---

### 3.11 Support

| # | Call | Body / query | Response fields used |
| --- | --- | --- | --- |
| 42 | `POST /support/tickets` | `{ "category", "subject" (≤200), "message": "[<UI category>] <description>", "attachments": ["<url>"], "channel": "ticket" }` | `_id`, `referenceId` |
| 43 | `GET /me/support/tickets?channel=ticket&sort=newest&limit=5` | — | `_id`, `subject`, `referenceId`, `status`, `createdAt` |
| 44 | `GET /me/support/tickets/:id` | — | full ticket (below) |
| 45 | `POST /me/support/tickets/:id/responses` | `{ "message", "clientMessageId": "web-<ts>-<rand>" }` | updated ticket |
| 46 | `POST /me/support/tickets/:id/read` | — | ignored (fire-and-forget when `unreadCustomerCount > 0`) |
| 47 | `POST /me/support/tickets/:id/close` | — | updated ticket |
| 48 | `POST /me/support/tickets/:id/reopen` | — | updated ticket |
| 49 | `GET /me/support/live-chat` | — | active live-chat ticket or `null` |
| 50 | `POST /me/support/live-chat` | `{ "category": "general", "subject": "Live chat", "message" }` | the live-chat ticket |
| 51 | `POST /callbacks` | `{ "source": "help_support", "sourceScreen": "web_customer_support", "category": "general", "bestTimePreference": "morning\|afternoon\|evening" }` | ignored (success → confirmation message) |

Ticket shape read by Ticket Detail and Live Chat:

```json
{
  "_id": "…", "referenceId": "BG-TKT-2026-8842", "category": "technical", "subject": "Document upload not working",
  "message": "[App issue] The sale deed upload keeps failing at 90%.", "status": "open", "channel": "ticket",
  "attachments": ["https://…"], "unreadCustomerCount": 1, "createdAt": "…",
  "responses": [{ "_id": "…", "message": "Thanks for reporting…", "responderType": "admin", "createdAt": "…" }]
}
```

- Thread = `message` (as the customer's first bubble) + `responses[]` (`responderType === "customer"` → right side, otherwise "Builtglory Support").
- Live chat status tag: "Connected" if any `responderType === "admin"` response exists, else "Waiting".
- Status tags: `open` → Open, `in_progress` → In progress, `resolved` → Resolved, `closed` → Closed.
- Ticket Detail and Live Chat re-fetch every **10 seconds** while open (the Socket.IO `/chat` namespace is not used by the web app).

---

## 4. Calls that are not made (UI features without an endpoint)

These buttons exist in the design but no request is sent; they show a clear "not available" message or keep the choice in the browser. Proposed endpoints are in `BACKEND_REQUIREMENTS_AND_GAPS.md`.

| UI feature | Current web behaviour |
| --- | --- |
| Log in with password | error: "Password sign-in isn't available yet. Use OTP to sign in." |
| Sign-up password | validated in the form, not sent |
| Forgot / reset password | error: "Password reset isn't available…" |
| Google / Apple sign-in | toast: "… sign-in isn't available yet" |
| Term sheet PDF download, Sale deed download | toast: download isn't available yet |
| Remove one recent search | hidden for this visit only |
| Enquiry cancel reason | not sent |
| NRI call language | not sent |
| App language, privacy toggles | saved in `localStorage` only |
| Payment schedule "Confirm Schedule" | navigation only |
