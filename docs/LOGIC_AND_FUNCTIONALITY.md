# Builtglory Web App — logic and functionality

What every screen does, which API data it uses, and every rule the frontend applies on top of that data (validation, mappings, derived values). Endpoint shapes are in `API_CALLS_AND_CONTRACTS.md`; end-to-end sequences are in `WORKFLOWS.md`.

Frontend sources: screens in `src/components/**`, shared rules in `src/lib/` (`pipelines.ts`, `property.ts`, `catalog.ts`, `format.ts`, `user.ts`).

---

## 1. App shell and session

### 1.1 Session states (`src/context/SessionContext.tsx`)

| State | Meaning | What the user sees |
| --- | --- | --- |
| `loading` | page just opened, checking the stored token | spinner "Loading Builtglory" |
| `anonymous` | no valid token and has not chosen guest mode | full-screen sign-in gate on **every** route except `/login` and `/onboarding` |
| `guest` | chose "Continue as Guest" (`localStorage.bg_guest = "1"`) | full app; account features ask to sign in |
| `signedIn` | valid token, `GET /me` succeeded | full app |

Restore on load: token in storage → `GET /me` → `signedIn`; failure clears tokens → `guest` or `anonymous`.

After sign-in the app also:

- loads `GET /me/favorites` to know which hearts are filled;
- loads `GET /me/notifications/unread-count`, then every 60 seconds.

### 1.2 Guest restrictions

| Feature | Guest behaviour |
| --- | --- |
| Sidebar | "Notifications" group and "Saved Properties" hidden; a "Guest mode" card with Log in / Sign up |
| Bell, avatar, Profile, Save heart, Share, property tiles (VR/Aerial/Specs/Location), Submit enquiry, Compare, NRI tour, Sell type picker, Live chat, Callback, Raise ticket | open the "Sign in to continue" dialog |
| Account pages opened by URL (`/enquiries`, `/visits`, `/deals`, `/listings`, `/favorites`, `/profile*`, `/notifications`, `/settings/account`, `/settings/notifications`, `/settings/privacy`, `/settings/delete-account`, `/support/live-chat`, `/support/tickets/*`, property enquiry/visit/NRI pages) | "Sign in to …" empty state with a Log in button |
| Public pages | Home, Buy, property detail and media pages, Search, Sell (picker), Settings menu, App settings, Help/FAQ, Customer support, Call us, About, Legal |

### 1.3 Layout

- Desktop: 264 px sidebar + 64 px header + scrolling main area (`#wa-main`, scrolled to top on every route change).
- Mobile (< 768 px): sidebar becomes a left drawer opened from the menu button.
- Header: page title (from the route), back arrow on non-top-level pages, search box (→ `/search`), bell with red dot when `unreadCount > 0`, Log in / Sign up for guests, avatar.
- Sidebar active item and expanding sub-menus (Settings, Help & Support) follow the current URL.

### 1.4 Browser storage

| Key | Content |
| --- | --- |
| `bg_access_token`, `bg_refresh_token` | session tokens |
| `bg_guest` | `"1"` when browsing as guest |
| `bg_device_id` | `web-<uuid>`, sent as `x-device-id` and as `deviceId` on OTP send |
| `bg_pref_language` | App settings language (English / Tamil) |
| `bg_pref_location` | App settings location mode (`gps` / `manual`) |
| `bg_pref_privacy_<key>` | Privacy toggles: `personalise`, `share`, `analytics`, `location` |

---

## 2. Routes

| Route | Screen | Sign-in needed |
| --- | --- | --- |
| `/` | Home dashboard | no |
| `/browse?type=&search=` | Buy (type picker → results) | no |
| `/search` | Search | no (recent searches need sign-in) |
| `/properties/:id` | Property detail | no |
| `/properties/:id/enquiry` | Submit enquiry | yes |
| `/properties/:id/visit?enquiryId=&visitId=&type=` | Schedule / reschedule visit | yes |
| `/properties/:id/vr-tour` · `/aerial` · `/specs` · `/location` · `/floor-plan` | Property media and info pages | no (opened from tiles that ask for sign-in) |
| `/properties/:id/nri-call` | Schedule NRI video call | yes |
| `/properties/:id/compare?with=` | Compare two properties | no |
| `/sell` | Sell wizard | picker public, wizard needs sign-in |
| `/favorites` | Saved properties | yes |
| `/enquiries`, `/enquiries/:id` | My Enquiries, Enquiry status | yes |
| `/visits` | My Visits | yes |
| `/deals` | My Deals | yes |
| `/listings`, `/listings/:id` | My Listings, Listing status | yes |
| `/listings/:id/offer` · `/accept-offer` · `/counter` · `/counter-sent` · `/deal-confirmed` · `/payment-schedule` · `/registration` · `/sold` | Seller deal flow | yes |
| `/notifications` | Notifications | yes |
| `/profile`, `/profile/edit`, `/profile/change-phone` | Profile | yes |
| `/settings` | Settings menu | no |
| `/settings/account` · `/notifications` · `/privacy` · `/delete-account` | Account settings | yes |
| `/settings/app` | App settings | no (GPS save needs sign-in) |
| `/help`, `/help/:topic` | Help & FAQs | no |
| `/support`, `/support/call` | Customer support, Call us | no |
| `/support/live-chat`, `/support/tickets/new`, `/support/tickets/:id` | Live chat, Raise ticket, Ticket | yes |
| `/about`, `/legal?doc=` | About, Terms / Privacy / Legal & RERA | no |
| `/login?mode=login|signup&next=` | Sign in / sign up | — |
| `/onboarding?stage=setup|prefs` | Onboarding | — |

---

## 3. Shared rules

### 3.1 Property values (`src/lib/property.ts`)

| Value | Rule |
| --- | --- |
| Verified | `status === "available"` |
| Area (sqft) | first positive of `specs.builtUpArea`, `carpetArea`, `plotArea`, `area` |
| BHK | `specs.bhk` as a number (0 = hide) |
| Price per sqft | `round(price / area)` (hidden when area is 0) |
| Photos | `media.coverPhoto` (if not already in the list) + `media.photos` |
| Location | `address.locality` (or `line1`) + `", "` + `address.city` |
| Floor | `"<floor> of <totalFloors>"`, or `"—"` |
| Flat | `specs.unitNo` or `specs.unitNumber` |
| Saved | property id is in the favourites set (from `GET /me/favorites`) |
| Directions link | Google Maps search with lat/lng, or with the address text |
| Specifications tab | all scalar `specs` keys except bhk, areas, floor, totalFloors, unit — key shown in Title Case |

### 3.2 Money and dates (`src/lib/format.ts`)

| Rule | Example |
| --- | --- |
| ≥ 1 crore | `₹ 2.45 Cr` |
| ≥ 1 lakh | `₹ 85 L` |
| otherwise | `₹ 45,000` |
| EMI on property sidebar | loan = 80% of price, 8.5% p.a., 240 months: `P·r·(1+r)^n / ((1+r)^n − 1)` |
| Notification age | `5m`, `2h`, `3d`, `1w` |
| Posted | Today / 1 day ago / N days ago / N weeks ago / N months ago |
| Visit date sent to API | local `YYYY-MM-DD` |

### 3.3 Design option lists → API values (`src/lib/catalog.ts`)

**Property types (13 tiles):**

| Tile | API `type` |
| --- | --- |
| Plot | `plot` |
| Apartment | `apartment` |
| Villa | `villa` |
| Commercial | `commercial` |
| Land Bank | `land` |
| Fractional Ownership | `fractional` |
| 3D Print Home | `3d_printing` |
| Organic Home | `organic_home` |
| CEO Mansion | `ceo_mansion` |
| Holiday Home | `holiday_home` |
| Farmhouse | `farmhouse` |
| NRI Services | `nri` |
| Interior | `interior` |

**Enquiry form:**

| UI choice | API field = value |
| --- | --- |
| Phone / WhatsApp / Email | `preferredContact` = `phone` / `whatsapp` / `email` |
| Schedule Visit / Price Negotiation / More Details | `interestType` = `schedule_visit` / `price_negotiation` / `more_details` |
| Tomorrow, 10:00 AM – 12:00 PM | `preferredVisitTime` = `tomorrow_morning` |
| This Weekend, 2:00 PM – 5:00 PM | `this_weekend_afternoon` |
| Custom Date & Time | `custom` |

**Account role (sign up and onboarding):**

| UI | `role` | `userType` |
| --- | --- | --- |
| Buyer | `buyer` | `resident` |
| Seller | `seller` | `resident` |
| Investor (onboarding only) | `buyer` | `resident` |
| NRI | `buyer` | `nri` |

Role label shown in the app: `userType` nri/pio → "NRI"; else `seller` → "Seller", `both` → "Buyer & Seller", otherwise "Buyer".

**Raise-ticket category:**

| UI pill | API `category` |
| --- | --- |
| Enquiry, Site visit | `property_inquiry` |
| Listing, Documents | `general` |
| Payment | `payment` |
| App issue | `technical` |

The chosen pill is also prefixed to the message: `"[Site visit] <description>"`.

**Callback slot:** Morning / Afternoon / Evening → `bestTimePreference` = `morning` / `afternoon` / `evening`.

**GPS → city:** nearest of Chennai, Bengaluru, Hyderabad, Mumbai, Pune, Delhi NCR (by squared lat/lng distance).

### 3.4 Enquiry pipeline (8 steps, `src/lib/pipelines.ts`)

Step numbers in §3.4 and §3.5 are 1-based (the code in `pipelines.ts` uses 0-based indexes).

Steps: Enquiry Submitted · Verification Call · Visit Scheduled · Deal Confirmed · KYC Verified · Token Payment · Registration · Completed.

**Group:**

| Group | Rule |
| --- | --- |
| completed | `deal.stage === "closed"`, or `status === "closed"` with a deal |
| cancelled | `status === "closed"` with no deal |
| active | everything else |

**Step in progress** (first matching row):

| Condition | Current step |
| --- | --- |
| group completed | 8 Completed (all done) |
| `deal.stage = documentation` | 7 Registration |
| `deal.financials.tokenPaid`, or `deal.stage ∈ full_payment, stage_payment, interior_design` | 6 Token Payment |
| `deal.stage = token_payment` | 5 KYC Verified if `user.kycStatus = verified`, else 4 Deal Confirmed |
| `deal.stage ∈ negotiation, re_engagement` or `status = negotiating` | 4 Deal Confirmed |
| any non-cancelled visit, or `status = visit_scheduled`, or `deal.stage = site_visits` | 3 Visit Scheduled |
| `status = responded` or `deal.stage = active_leads` | 2 Verification Call |
| otherwise | 1 Enquiry Submitted |

Step notes: step 1 shows `submittedAt`; step 3 the next visit date/time; step 4 the agreed price; step 6 the paid token amount; step 7 the registration appointment from `deal.documentation.workflow.registration` (`date`, `office`, `sub`).

**Buyer action on the current step** (opens from the step, the "Current step" card, or `?act=1`). Backend state still drives progress; each action only sends a request:

| Step | Action | Call |
| --- | --- | --- |
| 1 | Request Callback | `POST /callbacks` (`source: property_detail`, `bestTimePreference`) |
| 2 | Schedule Visit | `GET /visits/availability` (next 5 open days) → `POST /visits` |
| 3 | Confirm Deal | `POST /callbacks` (`category: pricing`) to the advisor |
| 4 | Complete KYC | Aadhaar/PAN format checked in the browser; files → `POST /documents` (`ownerType: user`, `purpose: kyc`). The numbers are not sent — the API has no field for them |
| 5 | Pay Token Amount | `POST /payments/token` (`upi` or `bank`); amount = `deal.financials.tokenAmount` or app-config `payment.tokenAmount`; UPI QR encodes `upi://pay` with app-config `payment.escrow.upiId`. Card is shown but not available (no card method in the API) |
| 6 | View Appointment | read-only appointment + client-side document checklist |
| 7 | Mark as Registered | `POST /callbacks` (`category: general`) to the advisor |

The enquiry form sends the design's Interest / Budget / Planning-to-buy picks as `enquiryTypes` tags (Home Loan maps to `interestType: more_details`).

**List badge and note:**

| Case | Badge (tone) | Note |
| --- | --- | --- |
| completed | completed (green) | Deal completed |
| cancelled | cancelled (rose) | Enquiry cancelled |
| has deal | `customerStageLabel` (blue) | Deal stage: `<label>` |
| has an upcoming visit / `visit_scheduled` | visit scheduled (blue) | Visit on `<date> <time>` |
| `new` | awaiting (amber) | Awaiting callback from advisor |
| `responded` | responded (blue) | Advisor responded to your enquiry |

### 3.5 Listing pipeline (12 steps)

Steps: Submitted · Verification Call · Document Verification · Site Inspection · Legal Verification · Offer Preparation · Offer Sent · Negotiation · Deal Confirmation · Term Sheet · Registration · Sale Complete.

**Offer accepted** = `acquisition.negotiation.sellerDecision.decision === "accepted"` or `acquisition.negotiation.status === "seller_accepted"` or `acquisition.stage ∈ token_to_seller, documentation, seller_payout, acquired`.

**Sold** = `sellRequest.status === "sold"` or `acquisition.stage === "acquired"`.

**Step in progress** (first matching row):

| Condition | Current step |
| --- | --- |
| sold | all 12 done |
| `status = draft` | 1 Submitted |
| stage `seller_payout` | 11 Registration |
| stage `documentation` | 10 Term Sheet |
| stage `token_to_seller` or offer accepted | 9 Deal Confirmation |
| stage `negotiation` | 8 Negotiation if seller countered, else 7 Offer Sent if an offer exists, else 6 Offer Preparation |
| stage `valuation` | 7 Offer Sent if an offer exists, else 6 Offer Preparation |
| stage `site_inspection` | 4 Site Inspection |
| `status = under_review` or stage `pending_review` | 3 Document Verification |
| `status ∈ accepted, approved, active, negotiating` | 5 Legal Verification |
| otherwise (`new`) | 2 Verification Call |

`rejected` / `changes_requested` replace the "current step" banner with an amber card showing `rejectionReason` or `changeRequests`.

**List groups and tabs:** Sold = `sold`; Withdrawn = `paused`, `rejected`; Active = all other non-draft statuses; drafts appear only under "All".

### 3.6 My Deals (derived — there is no customer deals endpoint)

| Source | Row included when | Title / price | Badge | Progress | Opens |
| --- | --- | --- | --- | --- | --- |
| Buyer: `GET /me/buy-enquiries` | the enquiry has a `deal` | deal or enquiry property title; `financials.agreedPrice` → `offeredPrice` → snapshot price | `customerStageLabel`, or Completed when closed | `round(i / 10 × 100)` where `i` is the 0-based current step; 100 when closed | `/enquiries/:id` |
| Seller: `GET /me/sell-requests` + `GET …/:id/activity` for every non-draft, non-rejected listing | offer accepted or sold | listing title; `offer.amount` | stage `seller_payout` → Registration; `documentation` → Payment Schedule; sold → Completed; else Deal Confirmed | `round(i / 12 × 100)` (0-based step); 100 when sold | the matching `/listings/:id/...` page |

Tabs: All · Active · Completed (default Active).

### 3.7 My Visits (derived — there is no customer visits endpoint)

Visits = every `visits[]` item across `GET /me/buy-enquiries`, newest date first. Visits created without an `enquiryId` do not appear.

| Tab | Visit status |
| --- | --- |
| Upcoming | `scheduled`, `confirmed`, `rescheduled` |
| Completed | `completed` |
| Cancelled | `cancelled`, `missed` |

Card line 2: "Site visit" or "Video call" + property location.

---

## 4. Screens

### 4.1 Home (`/`)
- **Live listings** stat = `meta.total` of `GET /properties?limit=1`. Other stats (100% verified, 0% brokerage, 24×7 support) are fixed copy.
- **Featured** = `GET /properties?featured=true&limit=6`; empty → "No featured properties yet" with Browse button.
- **Upcoming launches** = `GET /properties?upcoming=true&limit=4` (wide cards); empty → "No upcoming launches right now".
- CTA band → `/sell`. Each section has its own loading / error-with-retry state.

### 4.2 Buy (`/browse`)
- No type yet → 13-tile type picker. Opening with `?type=` or `?search=` skips the picker.
- Filters → query: property types (one `GET /properties` per ticked type, merged), budget (`maxPrice` only below ₹3 Cr), bedrooms (`bhk` CSV), amenities (CSV), verified only, search term, sort. `limit=50`.
- Sort: Relevance / Price low→high / high→low use the API; "Largest area" sorts loaded results by area.
- Header count = `meta.total` (sum when several types). City shown only when all results share one city.
- Grid / map toggle. Map pins are placed from the results' latitude/longitude; without coordinates the design's fixed pin layout is used.
- Empty → "No properties match" + Clear filters.

### 4.3 Search (`/search`)
- Recent searches: `GET /me/searches` (signed in only). "Clear all" → `DELETE /me/searches`. The × on one item hides it for this visit only.
- Trending: `GET /search/trending` (hidden when empty).
- Enter / tap a term → `POST /me/searches` (signed in, best-effort) → `/browse?search=<term>`.
- Browse by type → `/browse?type=<id>`.

### 4.4 Property detail (`/properties/:id`)
- `GET /properties/:id`. Error/404 → error card with retry.
- Gallery: real photos; arrows and dots only when there are 2+ photos; thumbnails; "+N" on the third; full-screen lightbox (Esc, ←, →).
- Tiles VR Tour / Aerial / Specs / Location → sub-pages (sign-in required).
- Tabs: Overview (6 highlight cards + description), Specifications, Amenities, Floor plan (`media.floorPlanUrl`), Location (map + "Get directions").
- Sidebar: price, ₹/sqft, Negotiable/Fixed price, EMI estimate, Submit enquiry, Compare, NRI video tour; advisor card ("Builtglory Advisor", call → support `telUrl`, views/enquiries counters); Builtglory Assured note.
- Share: native share sheet or copy link. Save: optimistic `POST`/`DELETE /properties/:id/save`.
- Similar properties: same `type` (limit 4, excluding this one), topped up with any listings to make 3.

### 4.5 Property sub-pages
| Page | Data | Behaviour |
| --- | --- | --- |
| VR tour | `media.tour3dUrl` | "Play tour" loads the URL in an iframe; full-screen button; no URL → disabled with message |
| Aerial | `media.videoUrl` or `media.droneImageUrl` | Video with play/pause, progress bar and seek; image with zoom; Save opens the media; Orient/Layers show "not available" |
| Specs | `amenities[]`, `highlights[]` | 20 design amenities highlighted when present |
| Location | `advantages.*`, `nearbyPlaces[]` | One row per advantage/place; "Open map" → Google Maps |
| Floor plan | `media.floorPlanUrl` | Image with zoom in/out; download opens the file |
| Compare | `?with=` id, else first saved property, else same-type listing, else any listing | Rows: Price, BHK, Area, Floor, Rate, Verified, Negotiable, Saved by |

### 4.6 Submit enquiry (`/properties/:id/enquiry`)
- Name, mobile, email pre-filled from `/me`.
- Validation: name required; **mobile must equal the account's verified number** (else: change it from Profile → Change Phone Number); email format if filled; consent checkbox required; message ≤ 500 chars.
- On submit: `PATCH /me` with changed name/email (if any) → `POST /buy-enquiries`.
- Success card: Home · View Property · Schedule Visit (`/visit?enquiryId=<new id>`); "History" → `/enquiries`.

### 4.7 Schedule / reschedule visit (`/properties/:id/visit`)
- Loads the property, `GET /me/buy-enquiries?propertyId=`, and availability for the visible month.
- No active enquiry for this property and not rescheduling → "Submit an enquiry first" card.
- Bookable window: tomorrow to today + 30 days. Days without an available slot are disabled; booked slots disabled. First open day is preselected.
- Reschedule mode (`visitId` set): amber "Current booking" banner, button "Confirm Reschedule", `PATCH /visits/:id/reschedule`. Otherwise "Confirm Visit", `POST /visits` with the enquiry id. `type=virtual` uses virtual slots.
- Success: date/time, property, Advisor "Builtglory team", Reference `#<referenceId>`; Directions, Reschedule (switches to reschedule mode), Done → `/visits`.

### 4.8 NRI video call (`/properties/:id/nri-call`)
- Virtual availability from tomorrow for 14 days; shows the first 5 days that have an open slot, then that day's slots.
- Language choice (English/Tamil/Hindi/Kannada) is displayed on the confirmation but **not sent**.
- `POST /visits` with `visitType: "virtual"` and the active enquiry id if there is one.

### 4.9 Sell wizard (`/sell`)
1. **Type picker** (sign-in required) + "Not sure? Call Us" + Recently sold (`GET /properties?recentlySold=true&limit=4`, "Sold in N days") + "Why sell" chips.
2. **Six steps** with progress rail; a step can be revisited, not skipped.

| Step | Fields | "Continue" enabled when |
| --- | --- | --- |
| 1 Basic details | title (≤100), sub-type, BHK, built-up area, carpet area, floor, total floors, unit, age | title ≥ 8 chars, built-up area and floor filled |
| 2 Location | "Use current" GPS, building/society, locality, city, pincode | building ≥ 3 chars, pincode 6 digits |
| 3 Details | facing, ownership, furnishing, parking (0–50) | facing and ownership chosen |
| 4 Amenities | 28 options | at least one |
| 5 Photos | upload (jpeg/png/webp, multiple) | ≥ 5 uploaded and none still uploading |
| 6 Price | asking price, negotiable toggle | price ≥ ₹50,000 |

- The draft is created on the first "Save as Draft" (steps 1–2) or first photo upload (`POST /sell-requests/drafts`), then updated with `PATCH`.
- Photos upload to `POST /documents` against the draft; failed uploads are removed and the error shown.
- Leaving step 5 saves the draft and fetches `POST …/valuation-estimate`.
- Step 6 shows ₹/sqft from the entered price, and the estimate's Low/High per sqft and `basis`.
- Submit: save draft → if `role === "buyer"`, `PATCH /me {role:"both"}` → `POST …/submit` → success card (Home / My Listings).

### 4.10 Seller flow (`/listings/:id/...`) — all read `GET …/activity`
| Screen | Behaviour |
| --- | --- |
| Listing status | Thumbnail, status pill, price; Views / Enquiries / "Step N of 12"; 12-step list. When an offer exists, tapping a step opens the offer (or Sold). |
| Offer | Offer amount; "X% above/below area average" from the valuation estimate; countdown to `offer.expiresAt`; Negotiate / Accept. If already accepted → "Offer accepted · View deal". No offer → "No offer yet". |
| Accept offer | Confirmation dialog → `offer-decision {accepted}` → Deal confirmed. |
| Counter offer | Amount (digits only, > 0), notes ≤ 1000 → `offer-decision {countered}` → Counter sent. |
| Counter sent | Shows `offer.amount` vs `offer.counterAmount`. |
| Deal confirmed | Agreed price, term-sheet preview (built from activity data; download not available), "Confirm Deal" if not yet accepted. Bank details form (see validation below) → `PATCH /me {bankDetails}` → Payment schedule. |
| Payment schedule | `payoutSchedule[]` with due label and status, payment mode "Bank Transfer (escrow)", total = offer amount. "Confirm Schedule" → Registration. |
| Registration | Appointment card (or "To be scheduled"), office + map link, document checklist (local ticks). "Add to Calendar" downloads an `.ics` when a date exists. "Confirm Appointment" (all ticked) → `POST …/messages` → Sold page if sold, else Listing status. |
| Sold | Payment Received/Pending, Registration Completed/Pending; sale-deed download not available; Contact Builtglory → `/support`. |

**Bank details validation:** holder, bank, account number, IFSC required; account number 6–18 digits and equal to the confirmation; IFSC matches `^[A-Za-z]{4}0[A-Za-z0-9]{6}$`. Only the **last 4 digits** are sent (`accountNumberLast4`). A saved account shows "Saved account ending ••1234".

### 4.11 Buyer lists
| Screen | Behaviour |
| --- | --- |
| Saved | `GET /me/favorites`; un-saving a card removes it immediately. Empty → Browse button. |
| My Enquiries | Tabs All / Active / Completed / Cancelled (§3.4). Card → Enquiry status. |
| Enquiry status | Progress bar, 8-step timeline in two columns, "Current step" and "Up next" cards, View Property, View My Visits, Call / Chat. "Cancel Enquiry" only when active and no deal → dialog → `PATCH …/cancel` → back to list. |
| My Visits | §3.7. Upcoming: Reschedule (scheduler in reschedule mode, same visit type) / Cancel (dialog → `PATCH /visits/:id/cancel`, then reload). Others: View Property / Visit Again (or Rebook Visit). |
| My Deals | §3.6. |

### 4.12 Notifications (`/notifications`)
- Groups Today / Earlier; unread dot; "Mark all read" (enabled only when something is unread).
- Opening a notification marks it read (`PATCH …/:id/read`, refreshes the badge) and navigates:

| First matching rule | Opens |
| --- | --- |
| `enquiryId` | `/enquiries/:enquiryId` |
| `listingId` | `/listings/:listingId` |
| event/entityType/screen contains "visit" | `/visits` |
| contains "deal" or `dealId` | `/deals` |
| contains "support" / "ticket" / "chat" | `/support` |
| contains "sell" and `entityId` | `/listings/:entityId` |
| `propertyId` | `/properties/:propertyId` |
| none | stays |

- Icon: visit → calendar, enquiry → message, sell/listing → badge-check (rejected/failed → warning, rose), payment/token/payout → wallet, deal → handshake, support → headset, launch/upcoming → rocket, offer/loan → percent, else bell.

### 4.13 Profile and settings
| Screen | Behaviour |
| --- | --- |
| Profile | Avatar (photo or initials), name, phone, Verified badge (`isVerified`), personal details, Edit / Change phone / Account settings, Logout. |
| Edit profile | Photo upload (`POST /documents` → `PATCH /me {profilePhoto}`); name ≥ 2 chars, email format if filled, city optional; phone locked. |
| Change phone | New 10-digit number → OTP `purpose: change_phone` → 6-digit verify → `PATCH /me {mobileNumber}`. Resend timer from `canResendAt`. |
| Settings | Menu; Log out (signed in only). |
| Account settings | Account summary, Edit profile, Change phone, Logout, Delete account. |
| Notification settings | 5 channels × Transactional / Marketing toggles; defaults transactional on, marketing off. Each toggle saves immediately (optimistic, reverted on error) and sends **all five channels**. |
| App settings | Language (stored in browser). Location: GPS → geolocation → `PATCH /me {latitude, longitude, city}`; Manual → onboarding city picker (`/onboarding?stage=prefs`). |
| Privacy & data | Four toggles (stored in browser). "Download my data" = `GET /me` saved as JSON. "Delete my data" → Delete account. |
| Delete account | See §4.15. |
| About | CMS `about` text, version (`app/config` → CMS), Listings count (live), "18 Cities" and "4.8★" fixed copy; links to Terms / Privacy / Legal & RERA, Rate the app (store URL), Share. |

### 4.14 Help and support
| Screen | Behaviour |
| --- | --- |
| Help & FAQs | CMS `faq` items grouped into topics (§API 3.10); search filters topics by label or question. "Still need help?" → Customer support. |
| FAQ topic | Accordion (first open). |
| Customer support | Live chat; Request a callback (expands: name/phone read-only from profile, slot, submit → confirmation); Raise ticket; Recent tickets (5, Refresh); Call us; WhatsApp (`whatsappUrl`). |
| Call us | Phone from config, Tap to call (`tel:`), WhatsApp, office hours (fixed copy), Request callback instead. |
| Live chat | Loads the active chat; first message starts it; later messages reply; refreshes every 10 s; "Close chat" closes it and clears the screen; marks read when `unreadCustomerCount > 0`. |
| Raise ticket | Category pill, subject (≤ 200), description, optional screenshot (uploaded first, URL sent in `attachments`). Success shows `referenceId` → View ticket. |
| Ticket detail | Thread, attachments, reply box and "Mark as resolved" (→ close) while open / in progress; "Reopen ticket" otherwise; refreshes every 10 s while open. |

### 4.15 Delete account (`/settings/delete-account`)
1. If `GET /me/account-deletion` says `requested` → show the scheduled-deletion card.
2. Review: what will be lost, with live counts (saved properties, enquiries, upcoming visits, active listings); acknowledgement checkbox.
3. Reason (one of six) + optional note.
4. "Send OTP" → `POST /auth/customer/otp/send` (purpose login) → 6-digit verify; the fresh session replaces the stored tokens.
5. Type `DELETE` → `POST /me/account-deletion` with `reason = "<reason> — <note>"`.
6. Confirmation (scheduled date) → Done signs out.

### 4.16 Legal
- `/legal?doc=Terms of Service|Privacy Policy|Legal & RERA`; tabs switch between Terms and Privacy.
- "On this page" lists `# Heading` sections (or the document title when none).
- Email us copies the support email from app config; Contact support → `/support`.
- The same CMS documents appear in the "Terms & Privacy" dialog on sign-up/onboarding.

### 4.17 Sign in / sign up (`/login` and the gate)
| Mode | Rules |
| --- | --- |
| Log in — OTP (default) | mobile required, 10 digits → send OTP → 6-digit verify |
| Log in — Password | phone/email required, password ≥ 6 chars, then error "Password sign-in isn't available yet. Use OTP to sign in." |
| Sign up | name ≥ 2, mobile 10 digits, valid email, password strength ≥ "Fair" (8+ chars with a number or capital), terms accepted → OTP → verify → `PATCH /me {name, email, role, userType}` |
| Forgot password | error "Password reset isn't available…" |
| Google / Apple | toast "not available yet" |

- Failed validation shakes the card. OTP errors show under the boxes.
- Success screen → "Continue": login with no name → onboarding setup; `/login` page → `next` path or `/`; gate → the page the user was on.
- Gate shows "Continue as Guest" (sets guest mode). `/login` shows "Continue as guest" (×) instead, which goes back.
- Left panel: rotating features, live "Verified listings" count, fixed "0% brokerage" and "4.8★".

### 4.18 Onboarding (`/onboarding`)
Stages: splash (1.5 s) → intro slides → mobile → OTP → terms (CMS Terms text; all three boxes required) → profile (name ≥ 2, optional email, optional photo) → preferences (GPS detect, city search with free-text option, popular cities, role) → success → Home.

`?stage=setup` / `?stage=prefs` start there when already signed in (used after a new-account login and from App settings → Manual entry).

---

## 5. Loading, empty and error states

| State | Pattern |
| --- | --- |
| Loading | spinner + label (page-level or inside the section) |
| Empty | dashed card with icon, title, hint and usually an action |
| Error | rose dashed card "Something went wrong" + API message + "Try again" (re-runs the request) |
| Form error | rose banner above the submit button with the API message |
| Mutation success | toast at the bottom (green icon); failures use a rose icon |
| Reload after mutation | previous data stays on screen while it refreshes |
