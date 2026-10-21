# Builtglory web API — Postman test report

Run at: 2026-10-20T09:30:36.305Z

Target: `http://localhost:5001/api/v1`
Client: Postman CLI 1.75.0 (`postman request`)
Source list: `BG-Webapp/docs/API_CALLS_AND_CONTRACTS.md` (51 calls)
Device header: `x-device-id: web-postman-contract-test`

Authenticated calls used a customer JWT for a synthetic account (`9000000099`, API Contract Tester). The token was signed with the API's own session issuer. Live OTP was not sent, because SMS delivery is set to the vendor and would text a handset.

Results: 51 pass, 0 fail. 51 calls. Rechecked on 2026-10-20 after the refresh-token and offer-decision fixes.

| # | Method | Path | HTTP | Result | What came back |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/customer/otp/send` | 200 | Pass | `requestId` returned for phone `9000000099`. |
| 2 | POST | `/auth/customer/otp/verify` | 200 | Pass | Session issued. Access and refresh tokens present. |
| 3 | POST | `/auth/refresh` | 200 | Pass | Rotated access and refresh tokens. An unreadable token now returns 401 `Refresh token revoked or expired.` |
| 4 | POST | `/auth/logout` | 200 | Pass | revoked |
| 5 | GET | `/me` | 200 | Pass | id 6ad7330274bae9fc9237806b |
| 6 | PATCH | `/me` | 200 | Pass | id 6ad7330274bae9fc9237806b |
| 7 | GET | `/me/account-deletion` | 200 | Pass | status none |
| 8 | POST | `/me/account-deletion` | 201 | Pass | status requested |
| 9 | GET | `/properties?limit=1` | 200 | Pass | 1 items, total 12 |
| 10 | GET | `/properties/6a6ae7b2111466b70ae9b3cf` | 200 | Pass | id 6a6ae7b2111466b70ae9b3cf |
| 11 | POST | `/properties/6a6ae7b2111466b70ae9b3cf/save` | 200 | Pass | id 6a6ae7b2111466b70ae9b3cf |
| 12 | DELETE | `/properties/6a6ae7b2111466b70ae9b3cf/save` | 204 | Pass | 204 No Content |
| 13 | GET | `/me/favorites` | 200 | Pass | 0 items |
| 14 | POST | `/buy-enquiries` | 201 | Pass | id 6ad7344d17adbfe24b99578f |
| 15 | GET | `/me/buy-enquiries?limit=100&sort=newest` | 200 | Pass | 1 items, total 1 |
| 16 | GET | `/me/buy-enquiries/6ad7344d17adbfe24b99578f` | 200 | Pass | id 6ad7344d17adbfe24b99578f |
| 17 | PATCH | `/me/buy-enquiries/6ad7344d17adbfe24b99578f/cancel` | 200 | Pass | id 6ad7344d17adbfe24b99578f |
| 18 | GET | `/visits/availability?propertyId=6a6ae7b2111466b70ae9b3cf&visitType=physical&from=2026-10-21&days=7` | 200 | Pass | object |
| 19 | POST | `/visits` | 201 | Pass | id 6ad7345817adbfe24b995792 |
| 20 | PATCH | `/visits/6ad7345817adbfe24b995792/reschedule` | 200 | Pass | id 6ad7345817adbfe24b995792 |
| 21 | PATCH | `/visits/6ad7345817adbfe24b995792/cancel` | 200 | Pass | id 6ad7345817adbfe24b995792 |
| 22 | POST | `/sell-requests/drafts` | 201 | Pass | id 6ad7346517adbfe24b99579f |
| 23 | PATCH | `/me/sell-requests/6ad7346517adbfe24b99579f` | 200 | Pass | id 6ad7346517adbfe24b99579f |
| 24 | POST | `/me/sell-requests/6ad7346517adbfe24b99579f/submit` | 200 | Pass | id 6ad7346517adbfe24b99579f |
| 25 | GET | `/me/sell-requests?limit=100&sort=newest` | 200 | Pass | 2 items, total 2 |
| 26 | GET | `/me/sell-requests/6ad7346517adbfe24b99579f` | 200 | Pass | id 6ad7346517adbfe24b99579f |
| 27 | GET | `/me/sell-requests/6ad7346517adbfe24b99579f/activity` | 200 | Pass | object |
| 28 | POST | `/me/sell-requests/6ad7346517adbfe24b99579f/offer-decision` | 200 | Pass | offer 8500000, counter 8800000, status countered |
| 29 | POST | `/me/sell-requests/6ad7346517adbfe24b99579f/messages` | 201 | Pass | object |
| 30 | POST | `/me/sell-requests/6ad7346517adbfe24b99579f/valuation-estimate` | 200 | Pass | object |
| 31 | POST | `/documents` | 201 | Pass | id 6ad7348217adbfe24b9957ab |
| 32 | GET | `/me/notifications?limit=100` | 200 | Pass | 8 items, total 8 |
| 33 | GET | `/me/notifications/unread-count` | 200 | Pass | count 7 |
| 34 | PATCH | `/me/notifications/read` | 200 | Pass | 16 items |
| 35 | PATCH | `/me/notifications/6ad7346c17adbfe24b9957a7/read` | 200 | Pass | id 6ad7346c17adbfe24b9957a7 |
| 36 | GET | `/search/trending?limit=8` | 200 | Pass | 8 items |
| 37 | GET | `/me/searches` | 200 | Pass | 0 items |
| 38 | POST | `/me/searches` | 201 | Pass | 1 items |
| 39 | DELETE | `/me/searches` | 200 | Pass | 0 items |
| 40 | GET | `/content?section=faq&limit=100` | 200 | Pass | 5 items |
| 41 | GET | `/app/config` | 200 | Pass | object |
| 42 | POST | `/support/tickets` | 201 | Pass | id 6ad7349617adbfe24b9957ac |
| 43 | GET | `/me/support/tickets?channel=ticket&sort=newest&limit=5` | 200 | Pass | 1 items, total 1 |
| 44 | GET | `/me/support/tickets/6ad7349617adbfe24b9957ac` | 200 | Pass | id 6ad7349617adbfe24b9957ac |
| 45 | POST | `/me/support/tickets/6ad7349617adbfe24b9957ac/responses` | 201 | Pass | id 6ad7349617adbfe24b9957ac |
| 46 | POST | `/me/support/tickets/6ad7349617adbfe24b9957ac/read` | 200 | Pass | id 6ad7349617adbfe24b9957ac |
| 47 | POST | `/me/support/tickets/6ad7349617adbfe24b9957ac/close` | 200 | Pass | id 6ad7349617adbfe24b9957ac |
| 48 | POST | `/me/support/tickets/6ad7349617adbfe24b9957ac/reopen` | 200 | Pass | id 6ad7349617adbfe24b9957ac |
| 49 | GET | `/me/support/live-chat` | 200 | Pass | id 6ad7339b17adbfe24b995782 |
| 50 | POST | `/me/support/live-chat` | 201 | Pass | id 6ad7339b17adbfe24b995782 |
| 51 | POST | `/callbacks` | 201 | Pass | id 6ad734b317adbfe24b9957c7 |

## Findings

- All 51 calls returned the status the web app expects, with `data` and `meta.requestId` (or 204 for unsave).
- OTP send and verify (`#1`, `#2`) succeed for a 10-digit phone and the matching code. A short phone is still 400. A wrong code is still 401.
- Refresh (`#3`) rotates a live session and returns new tokens. A token that is not a JWT returns the 401 error envelope.
- Offer decision (`#28`) records a counter against the listing price when Builtglory has not set a separate offer yet. This listing countered 8500000 with 8800000.
- The run used a synthetic customer, phone `9000000099`. It created a cancelled enquiry, a cancelled visit, a submitted sell draft, a support ticket, a live chat, and a callback. Account deletion was requested and then cancelled on that same account, so it is not queued for deletion.

## How to read the result

- **Pass** — the status matches the contract and the JSON envelope is present (`data` + `meta.requestId`, or 204 for unsave).
- **Responded** — the route is live and returned the error envelope, but the happy path needs data this run did not have (no offer, no visit slot, invalid OTP).
- **Fail** — no response, a 5xx, or a success body that does not match the envelope.
