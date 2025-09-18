# Business Days API (TypeScript)

API that calculates business dates/times in Colombia (America/Bogota) and returns result in UTC.

## Requirements
- Node.js 18+ (recommended)
- npm

## Installation
```bash
cd business-days-api
npm install
```

## Run (development)
```bash
npm run dev
```

This uses `ts-node` to run the TypeScript directly (no build step).

## Build & Run (production)
```bash
npm run build
npm start
```

## Endpoint
`GET /` (root)

Query parameters (exact names required):
- `days` (optional, integer >= 0)
- `hours` (optional, integer >= 0)
- `date` (optional, UTC ISO8601 **with trailing Z**) — if provided will be used as the starting point

At least one of `days` or `hours` must be provided.

## Response (success)
Content-Type: application/json
HTTP 200
```json
{ "date": "2025-08-01T14:00:00Z" }
```

## Errors (example)
HTTP 400 / 503:
```json
{ "error": "InvalidParameters", "message": "Detail of the error" }
```

## Notes
- The service attempts to fetch the official holidays JSON from:
  `https://content.capta.co/Recruitment/WorkingDays.json`
  on first request and caches it in memory. If the fetch fails, the endpoint will return 503 with a clear error message.
- All time calculations are done in `America/Bogota` timezone using `luxon`. The final result is returned in UTC with `Z`.

## Examples (curl)
```bash
# Add 1 business hour from now (Colombia time):
curl "http://localhost:3000/?hours=1"

# Provide a date (UTC with Z) and add days+hours
curl "http://localhost:3000/?date=2025-04-10T15:00:00.000Z&days=5&hours=4"
```
