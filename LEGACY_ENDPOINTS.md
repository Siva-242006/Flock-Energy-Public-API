# Discovered Legacy Endpoints Inventory

This document catalogs every legacy endpoint discovered during technical investigation of Urja Meter Ops (`https://urja-ops.flockenergy.tech`).

---

## 📋 Discovered Endpoint Catalog

| Legacy Endpoint | HTTP Method | Auth Required | Purpose / Functionality | Classification | Wrapped By Public API |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `POST` | No | Authenticates user session with form credentials | **Internal** | Encapsulated in `SessionManager` |
| `/login` | `GET` | No | HTML login page & health check probe target | **Internal** | Used by `pingHealth()` |
| `/portal/meters/search` | `GET` | Yes | Searches smart meters master catalog | **Wrapped** | `GET /api/v1/meters` |
| `/meters/{id}/__data.json` | `GET` | Yes | SvelteKit hydration payload with hierarchy & installation type | **Wrapped** | `GET /api/v1/meters/{id}` |
| `/portal/meters/{id}/geo` | `GET` | Yes | Returns latitude and longitude coordinates | **Wrapped** | `GET /api/v1/meters/{id}` |
| `/portal/meters/{id}/energy` | `GET` | Yes | Returns historical consumption telemetry logs | **Wrapped** | `GET /api/v1/meters/{id}/energy` |
| `/portal/dts` | `GET` | Yes | Lists Distribution Transformers (DTs) | **Wrapped** | `GET /api/v1/dts` |
| `/portal/export` | `GET` | Yes | Returns bulk dataset export | **Wrapped** | `GET /api/v1/export` |
| `/portal/keys` | `GET` | Yes | Returns internal signing secret (`<SIGNING_SECRET>`) | **Never Expose** | Encapsulated internally by `ExportService` |
| `/api/auth/sign-out` | `POST` | Yes | Destroys active user session cookie | **Internal** | Not exposed publicly |

---

## 🔒 Classification Rules

1. **Wrapped**: Endpoints mapped directly to public REST versioned endpoints (`/api/v1/...`) with standardized JSON envelopes.
2. **Internal**: Endpoints used internally by `SessionManager` or `LegacyAdapter` for authentication and health checking.
3. **Never Expose**: Security-sensitive endpoints (such as `/portal/keys`) that must never be exposed to public consumers.
