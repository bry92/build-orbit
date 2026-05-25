/**
 * Distributed API rate limiting (A2A and other scopes).
 * Replaces in-memory-only counters for multi-instance deploys.
 */

exports.name = '040_api_rate_limits';

exports.up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      rate_key VARCHAR(128) PRIMARY KEY,
      count INT NOT NULL DEFAULT 1,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window
      ON api_rate_limits (window_start)
  `);
};

exports.down = async (client) => {
  await client.query(`DROP TABLE IF EXISTS api_rate_limits`);
};
