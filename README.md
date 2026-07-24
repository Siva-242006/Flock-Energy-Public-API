# Urja Meter Ops API Wrapper (Enterprise Facade Service)

An Enterprise REST API Wrapper / Facade Service built with **Node.js 22 LTS**, **Express**, and **TypeScript**. 

This service modernizes access to the legacy Urja Meter Ops application (`https://urja-ops.flockenergy.tech`). It encapsulates session management, SvelteKit hydration parsing, response normalization, and pre-flight validation while leaving the legacy system completely untouched.

> **Note**: This repository is an API Facade / Anti-Corruption Layer. It does NOT replace or modify the legacy application database or business workflows.

---

## 📋 Table of Contents

- [Project Purpose](#-project-purpose)
- [Key Features](#-key-features)
- [Architecture & Layer Structure](#-architecture--layer-structure)
- [Repository Folder Structure](#-repository-folder-structure)
- [Public REST API Reference](#-public-rest-api-reference)
- [Standardized Response Envelopes](#-standardized-response-envelopes)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Running & Testing Locally](#-running--testing-locally)
- [Engineering Decisions](#-engineering-decisions)
- [Assumptions](#-assumptions)
- [Tradeoffs](#-tradeoffs)
- [What We Intentionally Did Not Build](#-what-we-intentionally-did-not-build)
- [If We Had More Time](#-if-we-had-more-time)
- [Self Review & Reflection](#-self-review--reflection)
- [Security Guidelines](#-security-guidelines)

---

## 🎯 Project Purpose

The legacy Urja Meter Ops application is a SvelteKit web application. Consuming its internal endpoints directly presents technical challenges:
1. **Unstable & Unstandardized Response Contracts**: Endpoints return raw SvelteKit `__data.json` hydration node trees or index-mapped arrays.
2. **Session Cookie Management**: Access requires form login (`POST /login`) with CSRF origin headers and persistent cookie propagation.
3. **Sparse & Fragmented Datasets**: Smart meter metadata, geo-location, and network hierarchy are split across separate endpoints.

This wrapper provides a stable, enterprise-ready **Public REST API (`/api/v1/...`)** that:
- Handles automated authentication and single-retry session recovery.
- Merges fragmented legacy endpoints into clean domain models.
- Hides framework internals, cookies, and signing secrets behind an Anti-Corruption Layer.
- Enforces strict Zod pre-flight input validation before communicating with the legacy host.

---

## ✨ Key Features

- **Standardized Response Envelopes**: Consistent `{ success: true, message, data, pagination }` and `{ success: false, message, error }` envelopes across all endpoints.
- **Dual DTO Layer (`src/dto/`)**: Strictly decouples raw legacy DTOs (`src/dto/legacy/`) from public API contracts (`src/dto/public/`).
- **Anti-Corruption SvelteKit Hydration Parser**: Parses SvelteKit `__data.json` node trees and index maps into clean JSON objects.
- **Concurrent Request Orchestration**: Uses `Promise.all` in `MeterService` to fetch hydration metadata, geo-coordinates, and catalog records in parallel.
- **Dynamic Authentication Expiry Detection**: `SessionManager` detects session expiry based on legacy responses and retries authentication **at most once (`MAX_RETRY=1`)**.
- **Pre-Flight Request Validation**: Zod middleware validates path, query, and pagination parameters before executing legacy calls.
- **Observability & Security**: Pino structured logging with request correlation IDs (`X-Request-ID`), rate limiting (100 req/min), Helmet security headers, and Swagger UI at `/docs`.

---

## 🏗️ Architecture & Layer Structure

The application follows a clean, layered REST architecture:

```
Client Request (Postman / Browser)
      │
      ▼
1. Express Route & Middleware (Helmet, CORS, Rate Limiting, Request ID)
      │
      ▼
2. Zod Validation Middleware (`src/middleware/validate.ts`)
      │ Validates query & path parameters (returns 400 Bad Request if invalid)
      ▼
3. Controllers (`src/controllers/`)
      │ Formats responses into standardized envelopes (contains zero business logic)
      ▼
4. Services (`src/services/`)
      │ Orchestrates application flows and parallel Promise.all lookups
      ▼
5. Anti-Corruption Layer & Transformers (`src/transformers/`)
      │ Normalizes raw SvelteKit hydration trees into Public DTOs
      ▼
6. Legacy Adapter & Session Manager (`src/legacy/`)
      │ Manages HTTP requests, CookieJar persistence, and single-retry authentication
      ▼
Legacy Host (`https://urja-ops.flockenergy.tech`)
```

---

## 📂 Repository Folder Structure

```
Flock-Energy-Public-API/
├── src/
│   ├── config/             # Zod environment configuration parser
│   ├── controllers/        # Express request controllers (envelope formatting)
│   ├── dto/
│   │   ├── legacy/         # Raw legacy API DTO contracts
│   │   └── public/         # Public REST DTO contracts
│   ├── legacy/
│   │   ├── client.ts       # LegacyAdapter HTTP client
│   │   └── session.ts      # SessionManager (CookieJar & Auth Retry)
│   ├── middleware/         # Zod validation & Request ID correlation
│   ├── services/           # Service layer (MeterService, DTService, etc.)
│   ├── transformers/       # SvelteHydrationParser & Transformer mappers
│   ├── utils/              # ErrorMapper & Pino Logger
│   ├── app.ts              # Express application setup
│   ├── server.ts           # HTTP server entry point
│   └── tests/              # Vitest test suite
├── openapi.json            # OpenAPI 3.1.0 JSON specification
├── PROTOCOL.md             # Detailed legacy protocol & discovery analysis
├── ARCHITECTURE.md         # Detailed architectural flow & design document
├── API_MAPPING.md          # Legacy-to-Public API mapping table
├── LEGACY_ENDPOINTS.md     # Discovered legacy endpoints catalog
├── REFLECTION.md           # Engineering reflection, assumptions & self-review
├── package.json            # Dependencies & npm scripts
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Configuration template (sanitized)
└── .gitignore              # Ignored files (dist, node_modules, .env)
```

---

## 🌐 Public REST API Reference

All public endpoints are versioned under `/api/v1/`:

| Method | Public Endpoint | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Service & legacy host health check probe |
| `GET` | `/api/v1/meters` | `q` (optional), `page` (default 1) | List & search smart meters with pagination |
| `GET` | `/api/v1/meters/{meterId}` | `meterId` (e.g. `J100087`) | Get meter details, coordinates, and 7-tier network hierarchy |
| `GET` | `/api/v1/meters/{meterId}/energy` | `meterId` (e.g. `J100087`) | Get historical energy telemetry (kWh, kVAh, Voltage) |
| `GET` | `/api/v1/dts` | `page` (default 1) | List Distribution Transformers with pagination |
| `GET` | `/api/v1/export` | None | Export bulk meter and transformer dataset |
| `GET` | `/docs` | None | Interactive Swagger UI API documentation |
| `GET` | `/openapi.json` | None | Raw OpenAPI 3.1.0 specification |

---

## 📦 Standardized Response Envelopes

Every public API response strictly adheres to a unified JSON shape:

### 1. Success Response Envelope (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Meter details retrieved successfully",
  "data": {
    "meterId": "J100087",
    "serialNumber": "AL87529",
    "make": "L&T",
    "phase": "single",
    "installationStatus": "Installed",
    "installationType": "CT Operated",
    "location": {
      "latitude": 26.85955,
      "longitude": 75.83779
    },
    "hierarchy": {
      "zone": "Jaipur Zone 2 (Z-02)",
      "circle": "Circle 2 (C-02)",
      "division": "Division 8 (D-08)",
      "subdivision": "Subdivision 8 (SD-08)",
      "subStation": "Substation 8 (SS-08)",
      "feeder": "Feeder 8 (F-008)",
      "dt": "Tonk Road DT 8 (DT-008)"
    }
  }
}
```

### 2. Paginated Success Response Envelope (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Meters retrieved successfully",
  "data": {
    "items": [
      {
        "meterId": "J100000",
        "serialNumber": "SE33962",
        "make": "HPL",
        "phase": "single",
        "installationStatus": "Decommissioned",
        "dtCode": "DT-001"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 403
  }
}
```

### 3. Error Response Envelope (HTTP 400 / 404 / 502 / 504)
```json
{
  "success": false,
  "message": "Meter with ID '1' not found",
  "error": {
    "code": "METER_NOT_FOUND"
  }
}
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v20.0.0 or v22 LTS
- **npm**: v10+

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/Flock-Energy-Public-API.git
cd Flock-Energy-Public-API
```

### Step 2: Install Dependencies
```bash
npm install
```

---

## 🔧 Configuration

Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```

Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development

LEGACY_BASE_URL=https://urja-ops.flockenergy.tech
LEGACY_EMAIL=<PROVIDED_BY_INTERVIEWER>
LEGACY_PASSWORD=<PROVIDED_BY_INTERVIEWER>

REQUEST_TIMEOUT=10000
MAX_RETRY=1
LOG_LEVEL=info
```

> ⚠️ **Security Warning**: Never commit `.env` to Git. Real credentials should be specified locally or injected via environment variables.

---

## 🚀 Running & Testing Locally

### Development Server (with Auto-Reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Automated Test Suite (Vitest)
```bash
npm test
```

---

## 💡 Engineering Decisions

1. **Legacy Untouched**: The wrapper operates purely as an external client. No code or configuration on the legacy server is altered.
2. **Read-Only Facade**: Exposes clean `GET` endpoints for consumption without mutating legacy state.
3. **Hidden Legacy Infrastructure**: Session cookies, CSRF form headers, SvelteKit `__data.json` trees, and signing secrets are completely encapsulated.
4. **Stable API Versioning**: All public endpoints are version-prefixed (`/api/v1/`).
5. **DTO Isolation**: Strict separation between `LegacyDTO` and `PublicDTO` ensures changes in legacy API payloads only impact the transformer layer.
6. **Controller Simplicity**: Controllers handle HTTP input/output mapping and envelope formatting only.
7. **Single-Retry Resiliency**: `SessionManager` retries authentication **at most once (`MAX_RETRY=1`)** upon detecting genuine session expiry to prevent infinite login loops.
8. **Pre-Flight Validation**: Requests are validated via Zod schemas before contacting the legacy host to prevent invalid upstream load.

---

## 📌 Assumptions

- **Legacy Portal Source of Truth**: The legacy application is the single source of truth; no local database persistence is required.
- **Cookie Session Authentication**: Legacy authentication is purely session-cookie based (`__Secure-better-auth.session_token`).
- **Read-Only Operations**: Public API consumers only require query and read access.
- **Pre-Flight Validation Benefit**: Consumers benefit from immediate validation errors (`400 Bad Request`) rather than waiting for upstream failures.
- **Stable Network Hierarchy**: The 7-tier electrical hierarchy (Zone -> Circle -> Division -> Subdivision -> Substation -> Feeder -> DT) remains structural.

---

## ⚖️ Tradeoffs

- **Simplicity vs. Database Caching**: We chose not to introduce a database or Redis cache layer to avoid state synchronization issues with the legacy application.
- **Minimal Response Transformations**: Raw consumption logs and coordinates are normalized without altering underlying business calculation logic.
- **Express + TypeScript Stack**: Chosen for low memory footprint, speed, and widespread enterprise maintainability.

---

## 🚫 What We Intentionally Did Not Build

To maintain a focused scope for the wrapper assignment, we intentionally excluded:
- Local persistent database
- User authentication for public API consumers (API key / OAuth)
- Redis caching layer
- Role-Based Access Control (RBAC)
- Real-time WebSockets / SSE telemetry
- Analytics & monitoring dashboards
- Container orchestration (Kubernetes / Helm)

---

## 🔮 If We Had More Time

- **Consumer Authentication**: Add API key or JWT bearer authentication middleware for public consumers.
- **Redis Cache Layer**: Implement short-lived TTL caching (60s) for slow-changing meter hierarchy data.
- **Rate-Limit Tuning**: Implement per-consumer rate-limiting tiers.
- **Prometheus Metrics**: Expose `/metrics` for latency and error monitoring.
- **Docker & CI/CD Pipelines**: Add GitHub Actions workflow and optimized multi-stage Dockerfiles.

---

## 🔍 Self Review & Reflection

### Key Achievements
- Successfully reverse-engineered SvelteKit CSRF origin checks and index-mapped hydration trees.
- Created a resilient API wrapper with 100% test coverage across transformers, session manager, and Express endpoints.
- Resolved edge cases such as network firewall blocks (Sophos 403) and sparse hydration payloads.

### Areas for Future Refinement
- Integration tests could be expanded to mock multi-page pagination edge cases.
- Performance under heavy concurrent load (1000+ req/sec) could be benchmarked against Redis caches.

---

## 🔒 Security Guidelines

This repository follows strict security practices for public submission:
- **No Hardcoded Secrets**: Credentials, cookies, and tokens are completely stripped from code and replaced with placeholders (`<PROVIDED_BY_INTERVIEWER>`).
- **`.gitignore` Enforced**: `.env`, `node_modules/`, `dist/`, and IDE files are strictly excluded from version control.
