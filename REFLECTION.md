# Engineering Reflection, Assumptions & Self-Review

This document provides a candid engineering reflection on the development of the Urja Meter Ops API Wrapper, detailing assumptions, tradeoffs, difficult technical challenges, self-criticism, and future roadmap.

---

## 📌 1. Our Assumptions

1. **Legacy Portal Source of Truth**: The legacy application (`https://urja-ops.flockenergy.tech`) remains the single source of truth for smart meter, network, and telemetry data.
2. **Cookie-Based Authentication**: Cookie session token authentication (`__Secure-better-auth.session_token`) is sufficient for legacy communication; no additional OAuth or JWT layer exists on the legacy portal.
3. **No CSRF Tokens**: No CSRF tokens are required beyond SvelteKit's built-in `Origin` / `Referer` header verification.
4. **Read-Only Scope**: API consumers require read access for queries, details, telemetry, and export; no data mutation endpoints are required.
5. **Stable 7-Tier Hierarchy**: Network hierarchy levels (Zone -> Circle -> Division -> Subdivision -> Substation -> Feeder -> DT) are structurally uniform across smart meters.
6. **Pre-Flight Validation Benefit**: Validating requests with Zod before communicating with the legacy host prevents unnecessary load on upstream infrastructure.
7. **Single Retry Strategy**: Retrying authentication at most once (`MAX_RETRY=1`) is sufficient to handle genuine session expirations without risking infinite login loops.

---

## ⚖️ 2. Our Tradeoffs

- **Simplicity over Unnecessary Abstraction**: We opted for direct service orchestration over complex CQRS or event-driven patterns, as the assignment scope is read-only.
- **No Local Database**: We intentionally avoided adding a database to eliminate data sync lag and state duplication with the legacy portal.
- **No Caching Layer**: We avoided introducing Redis or in-memory caching to guarantee freshness for live telemetry data.
- **Express + TypeScript Stack**: Selected for low resource consumption, rapid execution, and widespread maintainability.

---

## 🧩 3. Most Difficult Challenges

1. **SvelteKit Hydration Node Parsing**:
   - **Challenge**: SvelteKit's `/meters/{id}/__data.json` returns nested node trees and index-mapped arrays rather than standard object keys.
   - **Solution**: Developed `SvelteHydrationParser`, an Anti-Corruption parser that recursively traverses node data, decodes embedded JSON strings (`classData`), and maps index references to key names (`Zone`, `Circle`, `DT`).

2. **SvelteKit CSRF Protection on `POST /login`**:
   - **Challenge**: Legacy form submissions failed with 415 or 403 when sent via standard HTTP tools.
   - **Solution**: Discovered SvelteKit's origin check requirements and attached explicit `Origin: https://urja-ops.flockenergy.tech` and `Referer: https://urja-ops.flockenergy.tech/login` headers with `application/x-www-form-urlencoded` payloads.

3. **Handling Network Firewall Blocks (Sophos Firewall)**:
   - **Challenge**: Corporate/college Wi-Fi firewalls intercepted calls to `/portal/*` and returned Sophos 403 HTML block pages.
   - **Solution**: Enhanced `pingHealth()` and `isAuthenticationExpired()` to detect firewall block pages, preventing false positive auth retry loops and returning clean `502 Bad Gateway` error envelopes.

---

## 🚫 4. What We Intentionally Did Not Build

To keep the scope clean and targeted, we intentionally excluded:
- Local persistent database
- Public consumer API authentication (API keys / OAuth)
- Redis caching
- Role-Based Access Control (RBAC)
- Real-time WebSockets / SSE stream
- Admin & monitoring dashboards
- Container orchestration (Kubernetes / Helm)

---

## 🔮 5. If We Had More Time

- **Consumer Authentication**: Implement API key or JWT bearer authentication for public API consumers.
- **Redis Caching**: Add short-lived TTL caching (60s) for slow-changing meter hierarchy data.
- **Rate-Limit Tiers**: Implement rate limiting per API key.
- **Prometheus Metrics**: Expose `/metrics` for latency and error monitoring.
- **Docker & CI/CD**: Add multi-stage Dockerfiles and GitHub Actions automated testing workflows.

---

## ⚠️ 6. Mistakes We Made

- **Initial Underestimation of SvelteKit Hydration**: Initially assumed `__data.json` returned standard flat JSON objects, requiring a pivot to build index-mapped array resolution.
- **Misidentifying Signature 401s**: Initially treated any 401 status as session expiration before discovering that `/portal/export` requires HMAC signing keys from `/portal/keys`.

---

## 🔬 7. Self-Review & Criticism

- **Test Suite Scope**: While Jest and Supertest test coverage is strong across transformers, session manager, and routes, adding mock integration tests for multi-page pagination would further strengthen testing.
- **Documentation Completeness**: Created a complete 6-document technical suite (`README.md`, `PROTOCOL.md`, `ARCHITECTURE.md`, `API_MAPPING.md`, `LEGACY_ENDPOINTS.md`, `REFLECTION.md`) and OpenAPI specification to ensure clear project handover.
