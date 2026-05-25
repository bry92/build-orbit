# BuildOrbit

BuildOrbit is an Express/PostgreSQL app that runs AI-assisted build pipelines, stores generated artifacts, supports GitHub OAuth, sends transactional email, and manages subscriptions through Stripe.

## Requirements

- Node.js 20.x
- PostgreSQL
- Platform-managed environment variables for production secrets
- Durable artifact storage: S3/R2/MinIO or an explicitly mounted persistent disk

## Local Development

```bash
npm install
npm run dev
```

Local development needs at least `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=development`, and either `OPENAI_API_KEY` or `MOCK_MODE=true`. `JWT_SECRET` must be at least 32 bytes.

## Tests

CI runs on every push and pull request to `main` or `master` and executes:

```bash
npm test
```

The test command maps to `node scripts/run-unit-tests.js`.

## Production Configuration

Secrets must live in the platform environment, never in the repository. `.env.example` documents the required variables and intentionally contains no secret values.

On Render, the service start command should be:

```bash
node scripts/migrate-and-start.js
```

If deploy logs show `Running 'node server.js'`, update the service setting or re-sync `render.yaml` before redeploying so migrations run before the app starts.

Required production settings:

- `NODE_ENV=production`
- `MOCK_MODE=false`
- `DATABASE_URL`
- `JWT_SECRET` with at least 32 bytes
- `OPENAI_API_KEY`
- `APP_URL`, used for email links, Stripe redirects, GitHub OAuth, and CLI endpoints
- `ARTIFACT_STORAGE=s3` plus S3/R2 credentials, or `ARTIFACT_LOCAL_DURABLE=true` for a mounted persistent disk
- `STRIPE_WEBHOOK_SECRET` when `STRIPE_SECRET_KEY` is configured
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` together when GitHub OAuth is enabled

GitHub OAuth callback URL must match:

```text
${APP_URL}/auth/github/callback
```

## Health Checks

Render uses `healthCheckPath: /health`. The `/health` and `/health/ready` endpoints verify PostgreSQL with `SELECT 1`; `/health/live` only checks that the process is running.

## Artifact Storage

Production artifacts should not rely on ephemeral instance disk. Use `ARTIFACT_STORAGE=s3` for object storage. Local storage is intended for development unless it points at a mounted durable disk and `ARTIFACT_LOCAL_DURABLE=true` is set.

## Billing

Billing routes use Stripe Checkout, signed webhooks, and Customer Portal. Webhook signature verification is required in production whenever `STRIPE_SECRET_KEY` is set. The current documented plan is `$49/month`.

## Email

Transactional email is sent through the Polsia email proxy. Production verification should cover magic links, password reset, welcome email, credit warning, and subscription confirmation on the configured `APP_URL` domain.

## Observability

Every request receives an `x-request-id`; request start and finish logs are structured JSON and include the correlation ID.

## Evidence Layer

BuildOrbit can wrap work produced outside the pipeline, including Cursor, Lovable, agencies, internal AI agents, or manual delivery. Authenticated users can create an audit packet:

```http
POST /api/audit-packets
Content-Type: application/json
```

```json
{
  "title": "Cursor PR review",
  "source": { "type": "ai_coding_tool", "tool": "cursor", "external_id": "pr-123" },
  "spec": "Add a billing portal button and verify webhook handling.",
  "files": [{ "path": "src/routes/billing.js", "content": "..." }],
  "checks": [{ "name": "Unit tests", "status": "passed", "terminal": true }],
  "approvals": [{ "actor": "eng@example.com", "decision": "approved" }]
}
```

The response includes file SHA-256 hashes, a packet hash, verification status, an evidence score, and a deploy gate decision. Packets can be listed with `GET /api/audit-packets`, read with `GET /api/audit-packets/:id`, and exported with `GET /api/audit-packets/:id/export`.

## Legal

The app serves `/terms` and `/privacy`. The privacy page documents operational data retention expectations; both pages require legal review before public launch.
