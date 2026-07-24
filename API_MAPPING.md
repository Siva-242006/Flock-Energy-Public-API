# API Mapping & Field Normalization Specification

This document maps discovered legacy Urja Meter Ops endpoints to the public versioned REST API (`/api/v1/...`), documenting field transformations, type coercions, and envelope normalization.

---

## 🗺️ Master API Endpoint Mapping Table

| Legacy Endpoint | Public REST Endpoint | Service / Controller Layer | Normalization & Transformation Summary | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `POST /login` | Encapsulated Internally | `SessionManager.login()` | Form-encoded credentials with CSRF origin headers. Saves `<SESSION_COOKIE>` into `tough-cookie` jar. | Internal auth only. Never exposed publicly. |
| `GET /portal/meters/search?q={q}&page={page}` | `GET /api/v1/meters?q={q}&page={page}` | `MeterService.searchMeters()` ➡️ `MeterController.searchMeters()` | Renames `serialNo` ➡️ `serialNumber`, `phaseType` ➡️ `phase`, `installStatus` ➡️ `installationStatus`. Wraps items in paginated envelope. | Searches by meter ID, serial prefix, or make. |
| `GET /meters/{id}/__data.json` & `GET /portal/meters/{id}/geo` | `GET /api/v1/meters/{id}` | `MeterService.getMeterDetails()` ➡️ `MeterController.getMeterDetails()` | Orchestrates parallel `Promise.all` calls. `SvelteHydrationParser` extracts 7-tier hierarchy and `installationType`. Converts string `lat`/`lng` to floats. | Combines hydration, geo, and catalog records into unified domain representation. |
| `GET /portal/meters/{id}/energy` | `GET /api/v1/meters/{id}/energy` | `MeterService.getMeterEnergy()` ➡️ `MeterController.getMeterEnergy()` | Maps `voltR` ➡️ `voltage`. Coerces strings to numbers. Formats timestamps into standard ISO-8601 strings. | Telemetry history log. |
| `GET /portal/dts?page={page}` | `GET /api/v1/dts?page={page}` | `DTService.getDts()` ➡️ `DTController.getDts()` | Maps `transformerCode` ➡️ `code`, `transformerName` ➡️ `name`. Wraps items in paginated envelope. | Distribution Transformers listing. |
| `GET /portal/export` & `GET /portal/keys` | `GET /api/v1/export` | `ExportService.getExportData()` ➡️ `ExportController.getExportData()` | Retrieves `<SIGNING_SECRET>` from `/portal/keys` for HMAC signing or synthesizes dataset from master catalog. | Bulk export endpoint. |
| `GET /login` (Probing) | `GET /health` | `LegacyAdapter.pingHealth()` ➡️ `HealthController.getHealth()` | Lightweight unauthenticated HTTPS probe. Returns `{ status: "UP", legacy: "CONNECTED" }`. | Monitoring & health check. |

---

## 🔀 Field-Level Data Normalization Rules

### 1. Smart Meter Fields
| Legacy Raw Field | Public REST Field | Type Normalization | Transformation Rule |
| :--- | :--- | :--- | :--- |
| `meterId` | `meterId` | `string` | Preserved as uppercase identifier (e.g. `J100087`) |
| `serialNo` | `serialNumber` | `string` | Renamed for standard REST naming conventions |
| `make` | `make` | `string` | Preserved (e.g. `HPL`, `L&T`, `Genus`, `Secure`) |
| `phaseType` | `phase` | `string` | Renamed (`single` / `three`) |
| `installStatus` | `installationStatus` | `string` | Renamed (`Installed`, `Decommissioned`, `Faulty`) |
| `lat` | `location.latitude` | `number` | String float parsed via `parseFloat(lat)` |
| `lng` | `location.longitude` | `number` | String float parsed via `parseFloat(lng)` |

### 2. Network Hierarchy Fields (Parsed from SvelteKit Hydration)
| Legacy SvelteKit Key | Public REST Field | Sample Value |
| :--- | :--- | :--- |
| `"Zone"` | `hierarchy.zone` | `"Jaipur Zone 2 (Z-02)"` |
| `"Circle"` | `hierarchy.circle` | `"Circle 2 (C-02)"` |
| `"Division"` | `hierarchy.division` | `"Division 8 (D-08)"` |
| `"Subdivision"` | `hierarchy.subdivision` | `"Subdivision 8 (SD-08)"` |
| `"Sub Station"` / `"Substation"` | `hierarchy.subStation` | `"Substation 8 (SS-08)"` |
| `"Feeder"` | `hierarchy.feeder` | `"Feeder 8 (F-008)"` |
| `"DT"` | `hierarchy.dt` | `"Tonk Road DT 8 (DT-008)"` |

### 3. Energy Telemetry Fields
| Legacy Raw Field | Public REST Field | Type Coercion | Transformation Rule |
| :--- | :--- | :--- | :--- |
| `timestamp` | `timestamp` | `string` | Converted to ISO-8601 formatted string |
| `kWh` | `kWh` | `number` | Parsed via `parseFloat(kWh)` |
| `kVAh` | `kVAh` | `number` | Parsed via `parseFloat(kVAh)` |
| `voltR` | `voltage` | `number` | Renamed `voltR` ➡️ `voltage` |
