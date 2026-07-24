# System Architecture & Design Specification

This document provides a detailed breakdown of the architectural patterns, layered execution flow, DTO isolation strategy, and error handling mechanisms implemented in the Urja Meter Ops API Wrapper.

---

## 🏛️ Layered Architecture Pattern

The system adopts a strict 5-tier layered architecture pattern:

```
[ Client / Postman ]
       │  HTTP Request
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. ROUTING & MIDDLEWARE LAYER                               │
│    • Express Router                                         │
│    • Helmet Security & CORS                                 │
│    • Pino Logger with Correlation ID (X-Request-ID)         │
│    • Zod Validation Middleware                              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Validated Parameters
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER LAYER (`src/controllers/`)                    │
│    • MeterController, DTController, ExportController        │
│    • Unifies responses into standard JSON envelopes         │
│    • Zero business logic                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Operations
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE LAYER (`src/services/`)                          │
│    • MeterService, DTService, ExportService                 │
│    • Orchestrates parallel Promise.all requests             │
│    • Catalog synthesis & fallback handling                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Raw Payload
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ANTI-CORRUPTION & TRANSFORMER LAYER (`src/transformers/`)│
│    • SvelteHydrationParser                                  │
│    • MeterTransformer, DTTransformer, EnergyTransformer     │
│    • Converts LegacyDTO ──► PublicDTO                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Legacy Communication
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. LEGACY ADAPTER & SESSION LAYER (`src/legacy/`)           │
│    • LegacyAdapter HTTP client                              │
│    • SessionManager (CookieJar & Auth Retry)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Authenticated HTTPS
                               ▼
[ Upstream Legacy Host: https://urja-ops.flockenergy.tech ]
```

---

## 🔄 Execution & Data Flows

### 1. Request Flow (Meter Details Example: `GET /api/v1/meters/J100087`)

1. **Routing & Pre-Flight Validation**:
   - `requestId` middleware assigns `X-Request-ID` (`req_a417b...`).
   - `validate(getMeterParamsSchema)` verifies `meterId` is valid.
2. **Controller Dispatch**:
   - `MeterController.getMeterDetails` extracts `meterId` and invokes `MeterService.getMeterDetails("J100087")`.
3. **Service Orchestration**:
   - `MeterService` initiates 3 concurrent independent lookups via `Promise.all`:
     - `getMeterDataJson("J100087")` ➡️ `GET /meters/J100087/__data.json`
     - `getMeterGeo("J100087")` ➡️ `GET /portal/meters/J100087/geo`
     - `searchMeters("J100087", 1)` ➡️ `GET /portal/meters/search?q=J100087`
4. **Session & Cookie Propagation**:
   - `SessionManager` attaches `<SESSION_COOKIE>` automatically.
   - If session is expired, executes `POST /login` and retries **once**.
5. **Anti-Corruption Parsing & Transformation**:
   - `SvelteHydrationParser` extracts `installationType` (`CT Operated`) and 7-tier hierarchy (`Zone 2` ... `Tonk Road DT 8`).
   - `MeterTransformer.toDetailDTO` merges parsed hydration attributes, string-to-number coordinate floats (`26.85955`, `75.83779`), and catalog fields into `PublicMeterDetailDTO`.
6. **Response Envelope Formatting**:
   - Controller wraps DTO in `{ success: true, message: "...", data: { ... } }` and returns HTTP `200 OK`.

---

## 🛡️ DTO Isolation Strategy

To protect the public API contract from upstream legacy changes, DTOs are strictly separated:

```
Legacy Host Payload ──► [ Legacy DTO ] ──► [ Transformer ] ──► [ Public DTO ] ──► Standard JSON Envelope
```

- **`src/dto/legacy/`**: Defines exact raw shapes returned by legacy host (`serialNo`, `phaseType`, `installStatus`, `lat`, `lng`).
- **`src/dto/public/`**: Defines public REST API contracts (`serialNumber`, `phase`, `installationStatus`, `location: { latitude, longitude }`).
- **Transformer Isolation**: If legacy field names change upstream, only the corresponding file in `src/transformers/` is updated; public REST API consumers experience zero breaking changes.

---

## 🔁 Resiliency & Auth Retry Policy

```
Legacy Operation Called
       │
       ▼
Execute HTTP Request via Axios
       │
       ├───► [ 200 OK ] ──► Return Response
       │
       └───► [ 401 / 403 / 303 Redirect to /login ]
                 │
                 ▼
         isAuthenticationExpired() Check
                 │
                 ├───► Retry Count < MAX_RETRY (1)
                 │       │
                 │       ▼
                 │   Execute SessionManager.login() (POST /login)
                 │       │
                 │       ▼
                 │   Retry Request ONCE with fresh Session Cookie
                 │
                 └───► Retry Count >= MAX_RETRY (1)
                         │
                         ▼
                     Throw UpstreamAuthenticationError (HTTP 502)
```

---

## 🛑 Error Mapping Matrix

Centralized error handling in `src/utils/ErrorMapper.ts` maps domain exceptions to standardized error envelopes:

| Domain Exception / Error | HTTP Status | Public Error Code | Envelope Message |
| :--- | :--- | :--- | :--- |
| `ZodError` | `400 Bad Request` | `INVALID_PARAMETERS` | "Invalid request parameters" |
| `NotFoundError` | `404 Not Found` | `METER_NOT_FOUND` | "Meter with ID '...' not found" |
| Route Not Found | `404 Not Found` | `RESOURCE_NOT_FOUND` | "Route GET ... not found" |
| `UpstreamAuthenticationError` | `502 Bad Gateway` | `UPSTREAM_AUTH_FAILED` | "Failed to authenticate with legacy backend system" |
| `AxiosError` (ETIMEDOUT / ECONNABORTED) | `504 Gateway Timeout` | `UPSTREAM_TIMEOUT` | "Legacy backend request timed out" |
| Unhandled Exceptions | `500 Internal Error` | `INTERNAL_SERVER_ERROR` | "An unexpected error occurred" |
