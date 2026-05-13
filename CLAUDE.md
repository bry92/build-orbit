# BuildOrbit

## What this app does
BuildOrbit is a glass-box AI execution pipeline for regulated industries. Users submit tasks; a deterministic 6-phase pipeline (Intent Gate → Plan → Scaffold → Code → Save → Verify) executes them visibly with a complete audit trail. Designed for legal, finance, and healthcare teams that require explainable AI.

## Stack
Node.js 20 + Express + Neon PostgreSQL + Render deploy + Stripe billing

## Directory map
- `server.js` — Express entry point (legacy god file, do not add to)
- `routes/` — Express route modules (auth, billing, analytics, compliance, CLI, A2A, verify-fix)
- `migrations/` — node-pg-migrate JS migration files (DDL lives here by design)
- `agents/` — Agent phase implementations (intent-gate, builder, qa, ops)
- `buildorbit-frontend/` — React 18 + Vite + TypeScript frontend; builds to public/react-build/
- `public/` — Static frontend (HTML pages, CSS, JS); public/react-build/ is Vite output (do not edit directly)
- `public/css/buildorbit.css` — Main design system stylesheet (light theme tokens)
- `public/css/design-dna.css` — Legacy dark-mode design tokens (no longer injected into generated apps — Tailwind CDN used instead)
- `public/css/responsive.css` — Global responsive/overflow fixes, loaded on all pages
- `services/` — Shared agent services (webFetch.js — URL fetching with guardrails)
- `lib/` — Shared utilities (analytics, run-trace, constraint learner, manifest-constants, file-tree-parser)
- `src/lib/destructive-change-detector.js` — Pre-commit safety check; hard-blocks catastrophic rewrites (CatastrophicRewriteError)
- `src/mcp/` — MCP connector framework: mcp-client.js (JSON-RPC transport), mcp-registry.js (per-user server pool), mcp-audit.js (pipeline_events writer), pipeline-mcp-bridge.js (phase helper), built-ins/ (postgres, git, filesystem in-process servers)
- `src/routes/mcp.js` — REST API for MCP connection management (/api/mcp/*)
- `src/` — Refactored module tree (mirrors root, ongoing port)
- `backend/` — New backend modules (TypeScript, strict architecture)
- `tests/` — Integration + unit tests

## Database
- `pipeline_runs` — Each task execution, phase states, costs, github_repo selection, github_pr_url, source_repo, polsia_app_url, catastrophic_block (JSONB — block stats when SAVE is hard-blocked)
- `pipeline_events` — Immutable event log per run
- `pipeline_traces` — Execution DAG (nodes + edges for View Trace)
- `deployments` — Deployed artifacts per run
- `users` — Accounts, credits, subscription status, stripe_customer_id
- `magic_links` — One-time auth links
- `api_keys` / `api_tokens` — External API access
- `memory_items` — Compounding knowledge per user/org
- `governance_schema` — ACL + compliance rules
- `analytics_events` — Page view tracking
- `github_connections` — Per-user GitHub OAuth token (AES-256-GCM encrypted) + GitHub identity
- `nuclear_conversations` — NuclearAgent conversation memory (history JSONB, 30-msg window, current_run_id pointer)
- `mcp_connections` — Per-user MCP server configs (transport, JSONB config, enabled flag)

## External integrations
- Stripe — subscription billing ($49/mo), payment links via Polsia proxy
- Render — hosting, auto-deploy on push to main
- Neon — PostgreSQL (DATABASE_URL)
- Anthropic — LLM calls for pipeline phases
- OpenAI — GPT-4o tool-calling for NuclearAgent action routing (OPENAI_API_KEY, falls back to keyword router if absent)
- Sapiom — web research + browser automation for agents
- GitHub OAuth — user repo connect/push (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
- Browserbase — cloud browser sessions for VERIFY phase visual screenshots (BROWSERBASE_API_KEY, optional)
- Polsia R2 — CDN hosting for generated static builds (POLSIA_API_KEY, auto-provisioned)

## Recent changes
- 2026-05-13: FEATURE — Serena MCP codebase intelligence integrated into NuclearAgent pipeline (task #1545937). Added `src/mcp/built-ins/serena.js` (in-process Node.js, no Python/Docker) with 7 tools: analyze_codebase, get_file_structure, find_symbol, find_references, list_imports, check_diagnostics, onboard_project. Registered as 4th built-in in `mcp-registry.js`. Wired into PLAN phase (codebase analysis before planning), CODE phase (file structure context for symbol-aware generation), and VERIFY phase (structural diagnostics check). Bridge helper at `src/lib/serena-pipeline.js`. All integrations fail-open — Serena unavailability never blocks the pipeline.
- 2026-05-13: FEATURE — Free vs Pro comparison section added to landing page (task #1531274). Side-by-side comparison grid placed below value props section. Shows Free Trial (10 credits, no card) vs Pro ($49/mo: unlimited builds, priority queue, GitHub auto-push, custom domains). Glassmorphism dark-card style with cyan accents. Mobile-responsive: stacks vertically, Pro shows first. CSS added to `public/css/orbital-theme.css`. CTA links to `/signup` (Free) and `/pricing` (Pro).
- 2026-05-13: BUGFIX — Fix button and Fix All button now render in VERIFY phase (task #1535657). Ported Fix button UI from legacy HTML to React `VerifyDetail` component in `PhaseDetail.tsx`. Each failed check shows 🔧 Fix button; multiple failures show "Fix All" button. Buttons call `/api/pipeline/:runId/verify-fix` endpoint, track per-check state (fixing/success/exhausted), and refresh run data after fix. Added `triggerVerifyFix` API wrapper in `api.ts` and Fix button CSS in `Pipeline.css`.
- 2026-05-13: BUGFIX — Keyboard events no longer bubble from expanded phase cards (task #1536040). Added `onKeyDown` handler with `stopPropagation()` to the detail panel in `PhaseCard.tsx`. Escape inside expanded card collapses it without triggering global Esc handlers (Sidebar, ChatWidget). All other keyboard events (typing, arrow keys, Enter) are trapped within the panel. Global shortcuts still work when no card is expanded.
- 2026-05-12: BUGFIX — WebSocket auto-reconnect with exponential backoff (task #1536038). Rewrote `state/websocket.ts` with connection manager: 1s→2s→4s→8s→16s→30s backoff on unexpected drops, no retry on clean close (code 1000), auto re-subscribe on reconnect. Run.tsx shows "Reconnecting…" indicator when WS is retrying. Stops reconnect when run completes/fails.

