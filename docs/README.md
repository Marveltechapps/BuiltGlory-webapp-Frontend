# Builtglory Web App — backend handoff docs

These files describe exactly what the web app (`BG-Webapp`) expects from the backend.

| File | Use it for |
| --- | --- |
| [API_CALLS_AND_CONTRACTS.md](API_CALLS_AND_CONTRACTS.md) | Every endpoint the web app calls (51), the exact request it sends and the response fields it reads; envelope, auth, refresh, CORS, enums |
| [LOGIC_AND_FUNCTIONALITY.md](LOGIC_AND_FUNCTIONALITY.md) | What each screen does, validation rules, derived values (verified, area, ₹/sqft, EMI), enum mappings, the 10-step enquiry and 12-step listing pipelines, how My Visits and My Deals are built |
| [WORKFLOWS.md](WORKFLOWS.md) | End-to-end flows (session, OTP sign-in, buyer, seller, support, notifications, account) with sequence diagrams, status transitions, and the back-office actions each flow needs |
| [BACKEND_REQUIREMENTS_AND_GAPS.md](BACKEND_REQUIREMENTS_AND_GAPS.md) | Compatibility checklist, missing features with proposed endpoints, current backend issues, security notes |

Frontend code references: calls in `src/services/`, shapes in `src/types/`, shared rules in `src/lib/` (`pipelines.ts`, `property.ts`, `catalog.ts`).

Backend reference: `BuiltGlory-Backend/API_CALLS_AND_CONTRACTS.md`.
