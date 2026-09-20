# Pixie MCP server

This MCP 2.x server exposes Pixie's deterministic consumer-insurance demo to an AI client. It shares the same Python functions as the FastAPI routes. Models do not set prices.

The Home tool currently supports renter or tenant insurance through the existing Toronto tenant engine. It does not implement or claim a homeowner tariff. Auto estimates come from the bundled synthetic listings and pricing table in `api/fixtures/consumer_demo.json`. Every result says that it is illustrative and not an insurer quote or offer.

Privacy is part of the tool boundary. `get_policy_summary` returns coverage and renewal facts without a name, address, contact value, driver licence, or VIN. There is no `get_full_profile` tool. `prepare_application` and `request_recovery_handoff` require explicit consent plus `confirm_demo_only=true`; they prepare unsent demo records and never submit to a carrier.

`assess_drive_context` accepts route points rounded to at most three decimal places plus aggregate speeding and hard-brake counts. It returns separate behavior and synthetic Toronto route-context scores, every factor's provenance, and the transparent 75/25 coaching composite. It stores nothing, returns no coordinates, uses no identity input, and cannot affect a quote or premium.

Install and run over standard input/output:

```bash
cd mcp
uv sync
uv run pixie-mcp
```

For local Streamable HTTP, use a separate port from the FastAPI service:

```bash
cd mcp
uv run pixie-mcp --transport streamable-http --host 127.0.0.1 --port 8010
```

The MCP endpoint is `http://127.0.0.1:8010/mcp`.

Run the protocol-level tests:

```bash
cd mcp
uv run pytest -q
```
