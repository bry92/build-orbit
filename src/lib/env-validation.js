/**
 * Environment Variable Validation — Fail-Fast Boot Check
 *
 * Validates all required env vars at server startup. Catches missing credentials
 * before the first request, preventing silent failures and late-stage discovery.
 *
 * Required (hard): DATABASE_URL, JWT_SECRET, NODE_ENV
 * Conditionally required (by feature): OPENAI_API_KEY, STRIPE_SECRET_KEY, GITHUB_CLIENT_ID
 */

/**
 * Validate all environment variables.
 * Throws an error immediately if any required var is missing or invalid.
 */
function validateEnvironment() {
  const errors = [];

  // ── Hard Requirements ──────────────────────────────────────────────────────

  // DATABASE_URL: PostgreSQL connection string (required always)
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL: PostgreSQL connection string required');
  }

  // JWT_SECRET: ≥32 bytes for cryptographic signing (required always)
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET: Must be set (≥32 bytes)');
  } else if (Buffer.from(process.env.JWT_SECRET).length < 32) {
    errors.push('JWT_SECRET: Must be at least 32 bytes (currently ' + Buffer.from(process.env.JWT_SECRET).length + ')');
  }

  // NODE_ENV: Controls feature flags, security headers, logging
  if (!process.env.NODE_ENV || !['production', 'development', 'test'].includes(process.env.NODE_ENV.toLowerCase())) {
    errors.push('NODE_ENV: Must be "production", "development", or "test"');
  }

  // ── Conditional Requirements ──────────────────────────────────────────────

  // OPENAI_API_KEY: Used by all pipeline phases (plan, code, verify)
  // Required unless in MOCK_MODE
  if (!process.env.OPENAI_API_KEY && process.env.MOCK_MODE !== 'true') {
    errors.push('OPENAI_API_KEY: Required unless MOCK_MODE=true');
  }

  // STRIPE_SECRET_KEY: Used for subscription billing
  // Optional — only required if the app actively initializes Stripe.
  // If Stripe initialization is conditional and gracefully fails, this is not required.
  // Uncomment if Stripe is a hard requirement:
  // if (!process.env.STRIPE_SECRET_KEY) {
  //   errors.push('STRIPE_SECRET_KEY: Required for subscription billing');
  // }

  // GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET: GitHub OAuth flow
  // Optional but both must be set if GitHub integration is enabled
  const hasGitHubId = !!process.env.GITHUB_CLIENT_ID;
  const hasGitHubSecret = !!process.env.GITHUB_CLIENT_SECRET;
  if (hasGitHubId !== hasGitHubSecret) {
    errors.push('GitHub OAuth: Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together');
  }

  const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  const artifactStorage = (process.env.ARTIFACT_STORAGE || 'local').toLowerCase();

  // STRIPE_WEBHOOK_SECRET: required in production when Stripe billing is enabled
  if (isProduction && hasStripe && !process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET: Required in production when STRIPE_SECRET_KEY is set');
  }

  // S3/R2 artifact storage
  if (artifactStorage === 's3') {
    if (!process.env.ARTIFACT_S3_BUCKET) {
      errors.push('ARTIFACT_S3_BUCKET: Required when ARTIFACT_STORAGE=s3');
    }
    if (!process.env.ARTIFACT_S3_ACCESS_KEY_ID) {
      errors.push('ARTIFACT_S3_ACCESS_KEY_ID: Required when ARTIFACT_STORAGE=s3');
    }
    if (!process.env.ARTIFACT_S3_SECRET_ACCESS_KEY) {
      errors.push('ARTIFACT_S3_SECRET_ACCESS_KEY: Required when ARTIFACT_STORAGE=s3');
    }
  } else if (artifactStorage !== 'local') {
    errors.push('ARTIFACT_STORAGE: Must be "local" or "s3"');
  }

  // Production artifacts must survive instance restarts. Local filesystem mode is
  // only acceptable when it points at an explicitly documented durable mount.
  if (isProduction && artifactStorage === 'local' && process.env.ARTIFACT_LOCAL_DURABLE !== 'true') {
    errors.push('ARTIFACT_STORAGE: Production must use ARTIFACT_STORAGE=s3 or set ARTIFACT_LOCAL_DURABLE=true for a mounted persistent disk');
  }

  // ── Security Checks ────────────────────────────────────────────────────────

  // Fail-safe: MOCK_MODE must never be true in production
  if (process.env.MOCK_MODE === 'true' && process.env.NODE_ENV?.toLowerCase() === 'production') {
    errors.push('MOCK_MODE=true in production: Security violation. MOCK_MODE must be false in production.');
  }

  // ── Collect and Report ─────────────────────────────────────────────────────

  if (errors.length > 0) {
    const message = 'FATAL: Environment validation failed:\n\n' +
      errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') +
      '\n\nSee .env.example for required variables.';
    console.error(message);
    process.exit(1);
  }

  // Success: log what was validated
  console.log('[ENV] ✓ All required environment variables are set');
  return true;
}

module.exports = { validateEnvironment };
