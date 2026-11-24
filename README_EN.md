<!--
SPDX-License-Identifier: Apache-2.0
SPDX-FileCopyrightText: 2026 Desktiny contributors
-->

Tiếng Việt: [README.md](README.md)

# Desktiny

*Desk + destiny: a digital office for public agencies and organizations.* Formerly named DX Workspace; the
internal names in source code, database and containers are still `dx_workspace` / `dx-workspace`.

This is a short English summary of the Vietnamese [README.md](README.md), which is the authoritative document.

## What it is

Desktiny is an Open-Core platform for the OLP PMNM 2026 contest (DX-OS):

- a **headless Core API** (FastAPI): principals/ACL, schemas and records, versioned file storage, workflow
  engine and a hash-chained audit log. It serves no web pages; everything goes through `/core/v1/`
  (OpenAPI at `/core/v1/docs`);
- a **Workspace app** (FastAPI + Vue 3 / TypeScript) built on top of Core: organization chart, Drive,
  forms, cases and approvals, tasks, chat, news feed, reports, a visual process designer, AI features
  (off by default; AI only proposes, never decides), plugins and industry packs.

This is a development/pilot release: the Compose setup is not a production configuration. See
[docs/acceptance.md](docs/acceptance.md) for what has and has not been verified.

## Architecture

| Tier | Components | Responsibility |
|---|---|---|
| Tier 1: headless Core (API only) | `core-api`, `core-worker`, Keycloak, Nginx API gateway, PostgreSQL, RustFS (S3), Valkey | Principal/ACL, schema/record, storage/versioning, workflow, audit |
| Tier 2: application with UI | Workspace: `workspace-api`, `workspace-worker`, Vue web app | Organization, Drive, forms, cases, submissions, decisions |
| Tier 2: technical admin tool | Core admin (`apps/core-admin`, `/console/`) | Just another client of the Core API; no Core logic inside |
| Optional integration | ONLYOFFICE Docs | Editor, runs as a separate service |

Core and Workspace use separate databases and never share ORM or SQL. Core must keep serving other clients
when Workspace is stopped (see [`examples/core-client`](examples/core-client)). Details:
[docs/architecture.md](docs/architecture.md).

## Quick start (Docker Compose)

Requirements: Docker Desktop (Linux containers) with Compose v2, Python 3.13 (standard library only for the
bootstrap), and a free local port `8080`. Run everything from the repository root.

```bash
# 1. Generate dev configuration and per-machine random credentials (no fixed passwords in source)
python scripts/bootstrap.py

# 2. Build and start the Workspace profile
docker compose --env-file .env -f infra/compose/compose.yaml --profile workspace up --build -d

# 3. Load labelled demo data (two departments and demo relations)
python scripts/seed.py --confirm-demo
```

- Workspace: <http://localhost:8080/>
- Core admin: <http://localhost:8080/console/>
- Keycloak admin console: <http://localhost:8080/identity/admin/>
- Demo accounts created by the bootstrap: `director`, `manager`, `staff`, `manager-b`, `staff-b`,
  `technical-admin`. Passwords are random and are written to
  `infra/identity/generated/demo-credentials.txt` on your machine; do not commit that file or `.env`.

Core only (no Workspace): use `--profile core` instead of `--profile workspace`. Optional ONLYOFFICE: add
`--profile office` after setting `ONLYOFFICE_ENABLED=true` in `.env`. Full installation guide (Ubuntu/Windows,
Docker and local): [docs/installation.md](docs/installation.md).

## Build from source

See [BUILD.md](BUILD.md): `make venv deps build test`, then `make install PREFIX=...`.

## Documentation

- [Architecture](docs/architecture.md) and [installation](docs/installation.md)
- [AI features](docs/ai-features.md): 18 features, all off by default; Claude, OpenAI, Gemini, DeepSeek or
  local Ollama / vLLM
- [Business processes, simulation and tracing](docs/process-packages.md)
- [Plugins](docs/plugins.md) and [industry packs](docs/packs.md): extend the product without changing the core code
- [Operations](docs/operations.md), [security](docs/security.md), [demo script](docs/demo.md)
- [Acceptance checklist](docs/acceptance.md), [self-review against the contest criteria](SELF_REVIEW.md)
- [Changelog](CHANGELOG.md); current version is V3.1 (3.1.0)

## License

First-party code is licensed under **Apache-2.0** ([LICENSE](LICENSE), SPDX `Apache-2.0`, checked with
[REUSE](https://reuse.software/)). Third-party components and their licenses are listed in
[THIRD_PARTY.md](THIRD_PARTY.md); notices are in [NOTICE](NOTICE). ONLYOFFICE (AGPL-3.0, optional) runs as a
separate service over HTTP and is not linked into the code.

## Contributing and releases

- How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); security
  reports: [SECURITY.md](SECURITY.md).
- Issues: <https://github.com/Dking2007/DXOS_Desktiny/issues>
- Releases: <https://github.com/Dking2007/DXOS_Desktiny/releases>. The official artifacts are
  `dxos-X.tar.gz` together with `SHA256SUMS`; verify the checksum before installing. The "Source code (zip)"
  and "Source code (tar.gz)" entries are added automatically by GitHub and are not the official artifact.
