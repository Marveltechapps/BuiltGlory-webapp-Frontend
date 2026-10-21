# Builtglory Web App — backend requirements and gaps

Use this when building or checking a backend for the web app.

- **Part A** — what any backend must do for the current web app to work (compatibility checklist).
- **Part B** — features the UI shows but the current API cannot serve, with **proposed** contracts. These endpoints do **not** exist today; names and shapes are suggestions.
- **Part C** — behaviours in the current `BuiltGlory-Backend` that the web app works around, and recommended fixes.
- **Part D** — security notes.

---

## Part A — compatibility checklist

### A1. Transport

- [ ] Base path `/api/v1` (web default `http://localhost:5001/api/v1`, configurable with `NEXT_PUBLIC_API_BASE_URL`).
- [ ] CORS allows the web origin(s) — `http://localhost:3000`, `http://localhost:5173`, production domain — with headers `Authorization`, `Content-Type`, `x-device-id`, and methods `GET, POST, PATCH, PUT, DELETE`.
- [ ] Success: `{ data, meta: { requestId, page?, limit?, total?, totalPages? } }`.
- [ ] Error: `{ error: { code, message, details: [{ field, message }] }, meta }`, with human-readable messages (shown to users as-is).
- [ ] `204` allowed for `DELETE /properties/:id/save`.

### A2. Auth

- [ ] `POST /auth/customer/otp/send` → `{ requestId, expiresInSeconds, canResendAt }`; 10-digit phone; `purpose` `login | change_phone`.
- [ ] `POST /auth/customer/otp/verify` with a **6-digit** OTP → `{ accessToken, refreshToken, expiresInSeconds, user }` for login; `{ verified, phone, phoneNormalized }` for change_phone.
- [ ] First login creates the customer (no separate sign-up endpoint is called).
- [ ] Bearer auth on every customer route; expired token → **401**.
- [ ] `POST /auth/refresh { refreshToken }` → new pair (rotation OK).
- [ ] `POST /auth/logout { refreshToken }` (with Bearer) revokes.

### A3. Data the screens depend on

- [ ] `GET /me` returns the user fields listed in the contracts file, including `notificationPreferences` (5 channels), `bankDetails`, `kycStatus`, `profilePhoto`.
- [ ] `PATCH /me` returns the **updated user**.
- [ ] `GET /properties` supports `type, maxPrice, bhk (CSV), amenities (CSV), verified, search, sort (relevance|price_asc|price_desc), featured, upcoming, recentlySold, limit` and returns `meta.total`.
- [ ] Property documents expose `media.{coverPhoto, photos, videoUrl, droneImageUrl, tour3dUrl, floorPlanUrl}`, `specs.*`, `advantages`, `nearbyPlaces`, `highlights`, `metrics.{views, enquiries, savedCount}`.
- [ ] `GET /me/buy-enquiries` returns each enquiry **with `visits[]` and `deal`** (+ `customerStage`, `customerStageLabel`). My Visits and My Deals are built from this.
- [ ] `GET /visits/availability` returns `days[].slots[].{time, available}` for `physical` and `virtual`.
- [ ] `GET /me/sell-requests/:id/activity` returns `sellRequest, acquisition, offer, payoutSchedule, registration, metrics` (shape in the contracts file).
- [ ] `POST /documents` (multipart) returns a **browser-loadable `url`** for images used in `<img>`.
- [ ] `GET /content?section=faq|legal|about` with seeded items: FAQ `metadata.icon` + `metadata.topicLabel`; legal slugs `terms-of-service` and `privacy-policy`.
- [ ] `GET /app/config` returns `support.{phone, supportEmail, whatsappUrl, telUrl}`, `versions.current`, `storeUrls`.
- [ ] In-app notifications (`channel: in_app`) with `title`, `message`, `isRead`, `createdAt` and a target id.

---

## Part B — gaps (proposed contracts)

Priority: **P1** = the UI shows the feature and it currently fails or is a dead end; **P2** = works partly or by workaround; **P3** = nice to have.

### B1. Password login, sign-up password, forgot/reset password — P1

The design has a Password tab, a sign-up password field with a strength meter, and a forgot/reset flow. The API is OTP-only.

Either remove these from the UI, or add:

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/customer/password/login` | `{ identifier: "<phone or email>", password }` | session (same as OTP verify) |
| PUT | `/me/password` | `{ password }` (Bearer; set after sign-up OTP) | `{ updated: true }` |
| POST | `/auth/customer/password/forgot` | `{ phone }` | `{ requestId, expiresInSeconds, canResendAt }` |
| POST | `/auth/customer/password/reset` | `{ phone, otp, requestId, newPassword }` | `{ reset: true }` |

Rules the UI already enforces: password ≥ 8 chars with a number or capital letter; login form requires ≥ 6.

### B2. Google / Apple sign-in — P2

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/customer/oauth/google` | `{ idToken }` | session |
| POST | `/auth/customer/oauth/apple` | `{ identityToken, name? }` | session |

New social accounts without a verified phone should be sent to phone verification (the app treats phone as the primary identity).

### B3. Customer visits list — P2

Today visits come from `GET /me/buy-enquiries[].visits`, so virtual visits created without `enquiryId` never appear in My Visits.

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| GET | `/me/visits` | `status?, visitType?, page, limit, sort` | `Visit[]` with `propertySnapshot { title, location, price }` |

### B4. Customer deals list — P2

Buyer deals come from enquiries; seller deals need one `/activity` call per listing (N+1).

| Method | Path | Response |
| --- | --- | --- |
| GET | `/me/deals` | `[{ side: "buyer" \| "seller", id, title, price, stage, stageLabel, progressPercent, enquiryId?, sellRequestId?, updatedAt }]` |

### B5. Deal documents (term sheet, sale deed) — P1

"Term Sheet.pdf" and "Download Sale Deed" have no source.

| Method | Path | Response |
| --- | --- | --- |
| GET | `/me/sell-requests/:id/documents` | `[{ documentId, type: "term_sheet" \| "sale_deed" \| …, name, status, createdAt }]` |
| GET | `/documents/:documentId/read-url` (exists) | `{ readUrl, expiresInSeconds }` — must allow the owning seller |

Alternative: add `documents[]` to the activity response.

### B6. Seller confirmations without endpoints — P2

| UI action | Today | Proposed |
| --- | --- | --- |
| Payment schedule → "Confirm Schedule" | navigation only | `POST /me/sell-requests/:id/payout-schedule/confirm` |
| Registration → "Confirm Appointment" | sends a seller message | `POST /me/sell-requests/:id/registration/confirm { documentsReady: string[] }` |
| Deal confirmed → "Confirm Deal" | re-sends `offer-decision accepted` | fine as is, or a dedicated `…/deal/confirm` |

### B7. Small request fields — P2/P3

| UI input | Proposed field |
| --- | --- |
| Enquiry cancel reason | `PATCH /me/buy-enquiries/:id/cancel { reason }` |
| NRI call language | `POST /visits { …, preferredLanguage: "English" \| "Tamil" \| "Hindi" \| "Kannada" }` |
| Remove one recent search | `DELETE /me/searches/:term` (or `DELETE /me/searches?term=`) |
| App language | `PATCH /me { preferences: { language } }` |
| Privacy toggles | `PATCH /me { privacy: { personalise, shareWithSellers, analytics, location } }` |
| Cancel account deletion | `DELETE /me/account-deletion` exists — UI does not offer it yet |

### B8. Display data the API does not have — P3

| UI element | Current web fallback | Proposed field |
| --- | --- | --- |
| Advisor name, rating, phone on property / visit | "Builtglory Advisor" / "Builtglory team", support phone | `assignedAdvisor { name, phone, rating }` on property, enquiry and visit |
| Explicit "Legally verified" flag | `status === "available"` | `isVerified` or `verification { title, legal, site }` on property |
| Compare "Rating" row | replaced by "Saved by" count | `rating` on property |
| Visit "Seller" line | visit type + location | `sellerDisplayName` |
| "18 Cities", "4.8★ App rating" | fixed copy | `GET /app/config` → `stats { cities, appRating }` |
| Offer countdown | hidden when `offer.expiresAt` is null | always set `acquisition.negotiation.deadline` with the offer |
| Registration appointment | accepts string or object | standardise `{ date, time, office, address }` |

### B9. Realtime — P3

The web polls (live chat and ticket every 10 s, unread count every 60 s). The backend's Socket.IO `/chat` namespace could replace polling; it needs the same Bearer token and CORS for the web origin.

---

## Part C — current backend behaviours to review

| # | Area | What happens | Web workaround | Recommendation |
| --- | --- | --- | --- | --- |
| C1 | CORS | `.env` `CORS_ORIGINS` = `5173, 5174, 8081` | run web on `:5173` | add `http://localhost:3000` and the production web domain |
| C2 | `PATCH /me` `notificationPreferences` | stored with `$set` of the whole object, so a one-channel patch resets the others to defaults | always sends all five channels | deep-merge per channel |
| C3 | Visit time zone | `visitDateTime()` builds the slot time with `Date.UTC`, so "11:00 AM" is treated as 11:00 UTC (16:30 IST) for the "must be in the future" check | books from tomorrow onward | parse slots in `Asia/Kolkata` (availability already reports `timezone: "Asia/Kolkata"`) |
| C4 | Verified filter | `verified=true` means `status = available` | same rule for the badge | add a real verification flag (B8) |
| C5 | `GET /content` | first call inserts default content when the collection is empty (a write inside a GET) | — | seed via migration/seed script |
| C6 | Profile photo upload | only `purpose: property_media` accepts public images, so profile photos are uploaded as property media | uses `property_media` + `documentType: profile_photo` | add `purpose: profile_photo` |
| C7 | Sell submission role | submission requires role `seller` or `both` | web sets `role: both` before submit | set the role server-side on submit, or document the rule |
| C8 | Buy-enquiry cancel | no body accepted | reason not sent | accept `{ reason }` (B7) |
| C9 | Ticket "Mark as resolved" | a customer can set `resolved` only by posting a reply with `resolve: true`, and the reply `message` is required | uses `POST …/close`; tag then shows "Closed" | accept `resolve: true` without a message (then the web can switch to it), or keep `close` |
| C10 | Duplicate sign-in mount | `/api/signin/*` and `/api/v1/signin/*` | not used by web | keep for mobile or remove |
| C11 | Response for `GET /properties/:id` | only visible statuses; sold properties return 404 | "Property not found" | return sold properties read-only so old links and "Recently sold" can open |

---

## Part D — security notes

1. `BuiltGlory-Backend/.env.example` is **tracked in git** and contains the SMS vendor URL with a real username and password (`user=…&pass=…`). Rotate that password and replace it with a placeholder in `.env.example`.
2. `.env` (MongoDB Atlas URI, AWS keys, JWT secrets) is git-ignored — keep it that way. During the frontend work the AWS **access key ID** from `.env` was printed in a local tool log (the secret key was not); rotate it if you treat key IDs as sensitive.
3. The web app stores access and refresh tokens in `localStorage` (required for Bearer auth from the browser). Keep access tokens short-lived (currently 900 s) and refresh tokens revocable.
4. Bank details: the web sends only `accountNumberLast4`. Keep the API rejecting full account numbers.
5. Uploaded files are rendered by URL. Serve them from a bucket/CDN that sets correct `Content-Type` and does not allow HTML/SVG uploads for image purposes (current allow-list: jpeg, png, webp, mp4, pdf).
