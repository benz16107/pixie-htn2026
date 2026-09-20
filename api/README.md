# Pixie API

Run the shared FastAPI service from this directory:

```bash
uv sync
uv run uvicorn atlas_api.app:app --host 127.0.0.1 --port 8000
```

Consumer endpoints include the existing deterministic tenant quote at `POST /quote/tenant`, the tenant-only Home entry point at `POST /quote/home`, bundled demo vehicles at `GET /consumer/vehicles`, same-scenario comparisons at `POST /consumer/vehicles/compare`, deterministic Auto estimates at `POST /quote/auto`, and combined scenarios at `POST /quote/scenario`.

Auto request example:

```json
{
  "vehicleId": "corolla-le-2023",
  "annualKmBand": "10000_20000",
  "parking": "driveway",
  "deductible": 1000,
  "claims5yr": 0
}
```

Auto and combined results are explicitly illustrative. Their receipt arithmetic comes from `fixtures/consumer_demo.json`, with a source on every line. No model produces a price.

Privacy-limited demo routes are `GET /policies/{policy_id}/summary`, `POST /applications/prepare`, `POST /recovery/handoffs`, and `GET /recovery/handoffs/{recovery_id}`. Application and recovery writes require explicit consent and `confirmDemoOnly: true`; neither route submits or sends anything.

`POST /driving/context` accepts 2 to 50 route points rounded to at most three decimal places, a distance, and aggregate speeding and hard-brake counts. It classifies each point against bundled synthetic Toronto examples for a school approach, a dense intersection and building corridor, or a lower-complexity corridor. The response separates the event-based behavior score from the route-context score, then shows their 75/25 composite and every contribution. Route context estimates exposure and attention needs, not driver quality. The service stores nothing, returns no coordinates, uses no identity input, and cannot change a quote or premium.

Run tests with:

```bash
SENTRY_DSN_API= uv run pytest -q
```
