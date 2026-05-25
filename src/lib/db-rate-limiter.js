/**
 * PostgreSQL-backed sliding-window rate limiter.
 * Works across multiple app instances (unlike in-memory Maps).
 */

const WINDOW_MS_DEFAULT = 60 * 60 * 1000;

/**
 * @param {import('pg').Pool} pool
 * @param {string} scope - Namespace, e.g. "a2a"
 * @param {string|number} keyId
 * @param {{ limit?: number, windowMs?: number }} [opts]
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
async function checkDbRateLimit(pool, scope, keyId, opts = {}) {
  const limit = opts.limit ?? 10;
  const windowMs = opts.windowMs ?? WINDOW_MS_DEFAULT;
  const rateKey = `${scope}:${keyId}`;

  const { rows } = await pool.query(
    `INSERT INTO api_rate_limits (rate_key, count, window_start)
     VALUES ($1, 1, NOW())
     ON CONFLICT (rate_key) DO UPDATE SET
       count = CASE
         WHEN api_rate_limits.window_start < NOW() - ($3::text)::interval
         THEN 1
         ELSE api_rate_limits.count + 1
       END,
       window_start = CASE
         WHEN api_rate_limits.window_start < NOW() - ($3::text)::interval
         THEN NOW()
         ELSE api_rate_limits.window_start
       END
     RETURNING count, EXTRACT(EPOCH FROM window_start) * 1000 AS window_start_ms`,
    [rateKey,`${windowMs} milliseconds`]
  );

  const row = rows[0];
  const count = row.count;
  const windowStart = Number(row.window_start_ms);
  const resetAt = windowStart + windowMs;

  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

module.exports = { checkDbRateLimit, WINDOW_MS_DEFAULT };
