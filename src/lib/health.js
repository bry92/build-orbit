/**
 * Health check helpers for liveness and readiness probes.
 */

/**
 * Ping PostgreSQL with a lightweight query.
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
async function checkDatabase(pool) {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * @param {import('pg').Pool} pool
 */
function registerHealthRoutes(app, pool) {
  // Liveness — process is up (no dependency checks)
  app.get('/health/live', (req, res) => {
    res.json({ status: 'ok', requestId: req.id });
  });

  // Readiness — dependencies required to serve traffic
  app.get('/health/ready', async (req, res) => {
    const database = await checkDatabase(pool);
    const ready = database.ok;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      requestId: req.id,
      checks: { database },
    });
  });

  // Primary probe (Render healthCheckPath) — includes DB check
  app.get('/health', async (req, res) => {
    const database = await checkDatabase(pool);
    const healthy = database.ok;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      requestId: req.id,
      checks: { database },
    });
  });
}

module.exports = { checkDatabase, registerHealthRoutes };
