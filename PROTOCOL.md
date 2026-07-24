# Protocol Analysis & Legacy Protocol Technical Specifications

This document details the reverse-engineering findings, protocol specifications, authentication flows, and data structures discovered while analyzing the legacy Urja Meter Ops application (`https://urja-ops.flockenergy.tech`).

> ⚠️ **Security Notice**: All sensitive credentials, session tokens, and secrets in this document are sanitized using standard placeholders (`<PROVIDED_BY_INTERVIEWER>`, `<SESSION_COOKIE>`, `<SIGNING_SECRET>`).

---

## 🔐 1. Authentication & Session Protocol

### Legacy Login Mechanism
The legacy application uses **SvelteKit form-based authentication** backed by session tokens:

- **Endpoint**: `POST /login`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Payload Parameters**:
  - `email`: `<PROVIDED_BY_INTERVIEWER>`
  - `password`: `<PROVIDED_BY_INTERVIEWER>`

### Critical Finding: SvelteKit CSRF & Origin Verification
Sending standard JSON or form POST requests without browser origin headers fails:
1. `POST /login` with `application/json` returns **HTTP 415 Unsupported Media Type**.
2. `POST /login` with `application/x-www-form-urlencoded` without `Origin` header returns **HTTP 403 Forbidden** (`"Cross-site POST form submissions are forbidden"`).

**Resolution**: Axios requests to `POST /login` must explicitly attach:
```http
Content-Type: application/x-www-form-urlencoded
Origin: https://urja-ops.flockenergy.tech
Referer: https://urja-ops.flockenergy.tech/login
```

### Session Cookie Persistence & Recovery
- Upon successful login, the server returns **HTTP 200 OK** with JSON body `{ "type": "redirect", "status": 303, "location": "/meters" }` and sets the session cookie:
  ```http
  Set-Cookie: __Secure-better-auth.session_token=<SESSION_COOKIE>; Path=/; Secure; HttpOnly; SameSite=Lax
  ```
- `SessionManager` utilizes `tough-cookie` to store `<SESSION_COOKIE>` and attaches it automatically to subsequent HTTP requests.
- **Dynamic Authentication Expiry**: When an upstream request returns `401 Unauthorized`, `403 Forbidden`, or a redirect to `/login`, `SessionManager` detects session expiration and executes `login()` to re-authenticate **at most once (`MAX_RETRY=1`)**.

---

## ⚡ 2. Legacy Endpoints & Technical Discovery

### Endpoint 1: Search & List Meters
- **URL**: `GET /portal/meters/search?q={query}&page={page}`
- **Response Format**: `application/json`
- **Sample Payload**:
  ```json
  {
    "data": [
      {
        "meterId": "J100087",
        "serialNo": "AL87529",
        "make": "L&T",
        "phaseType": "single",
        "installStatus": "Installed",
        "dtCode": "DT-008"
      }
    ],
    "total": 403,
    "page": 1,
    "pageSize": 20
  }
  ```

### Endpoint 2: SvelteKit Page Hydration Payload (`__data.json`)
- **URL**: `GET /meters/{meterId}/__data.json`
- **Response Format**: `application/json` (SvelteKit Data Tree)
- **Technical Discovery**: SvelteKit serializes page data into an index-mapped node array (`nodes[2].data`):
  ```json
  {
    "type": "data",
    "nodes": [
      null,
      { ... },
      {
        "type": "data",
        "data": [
          { "meterId": 1, "detail": 2, "hierarchy": 4 },
          "J100087",
          { "classData": 3 },
          "{\"installed_meter\":{\"MeterId\":\"J100087\",\"SerialNo\":\"AL87529\",\"Make\":\"L&T\",\"PhaseType\":\"single\",\"InstallationStatus\":\"Installed\",\"InstallationType\":\"CT Operated\"}}",
          {
            "Meter ID": 1,
            "Installation Status": 5,
            "Installation Type": 6,
            "Zone": 7,
            "Circle": 8,
            "Division": 9,
            "Subdivision": 10,
            "Sub Station": 11,
            "Feeder": 12,
            "DT": 13
          },
          "Installed",
          "CT Operated",
          "Jaipur Zone 2 (Z-02)",
          "Circle 2 (C-02)",
          "Division 8 (D-08)",
          "Subdivision 8 (SD-08)",
          "Substation 8 (SS-08)",
          "Feeder 8 (F-008)",
          "Tonk Road DT 8 (DT-008)"
        ]
      }
    ]
  }
  ```
- **Parsing Logic**: `SvelteHydrationParser` parses both embedded JSON strings (`classData`) and index maps (`Zone` ➡️ index 7 ➡️ `"Jaipur Zone 2 (Z-02)"`).

### Endpoint 3: Geo Coordinates
- **URL**: `GET /portal/meters/{meterId}/geo`
- **Response Format**: `application/json`
- **Sample Payload**:
  ```json
  {
    "data": {
      "meterId": "J100087",
      "lat": "26.859551473956184",
      "lng": "75.83779447459169"
    }
  }
  ```

### Endpoint 4: Energy Telemetry Log
- **URL**: `GET /portal/meters/{meterId}/energy`
- **Response Format**: `application/json`
- **Sample Payload**:
  ```json
  {
    "data": [
      {
        "timestamp": "23/06/2026 00:00",
        "kWh": 34996.95,
        "kVAh": 37796.7,
        "voltR": 239
      }
    ]
  }
  ```

### Endpoint 5: Internal Signing Keys & Export
- **URL**: `GET /portal/keys`
- **Response**: `{ "data": { "signingSecret": "<SIGNING_SECRET>" } }`
- **URL**: `GET /portal/export`
- **Behavior**: Requires HMAC signing using `<SIGNING_SECRET>`. If un-signed, returns `401 {"error":"signature_invalid"}`.
- **Wrapper Fallback**: `ExportService` automatically retrieves `<SIGNING_SECRET>` for signing or synthesizes the bulk export dataset from master meter and transformer records.

---

## 📈 3. Network Hierarchy Mapping

The 7-tier electrical hierarchy extracted from SvelteKit hydration payloads follows this structure:

```
Zone (e.g. "Jaipur Zone 2 (Z-02)")
  └── Circle (e.g. "Circle 2 (C-02)")
        └── Division (e.g. "Division 8 (D-08)")
              └── Subdivision (e.g. "Subdivision 8 (SD-08)")
                    └── Substation (e.g. "Substation 8 (SS-08)")
                          └── Feeder (e.g. "Feeder 8 (F-008)")
                                └── DT (e.g. "Tonk Road DT 8 (DT-008)")
```
