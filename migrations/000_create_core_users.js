/**
 * Migration 000: Core users table
 *
 * Fresh production databases must have users before auth, magic-link,
 * API-token, billing, and admin migrations run. Older boot paths created this
 * table outside the numbered migrations, which broke fresh Render databases.
 */
module.exports = {
  name: '000_create_core_users',

  up: async (client) => {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'trial',
        subscription_plan VARCHAR(255),
        subscription_expires_at TIMESTAMPTZ,
        subscription_updated_at TIMESTAMPTZ,
        task_credits INTEGER NOT NULL DEFAULT 10
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
        ON users (LOWER(email))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS users_stripe_subscription_id_idx
        ON users (stripe_subscription_id)
    `);
  },

  down: async (client) => {
    await client.query(`DROP INDEX IF EXISTS users_stripe_subscription_id_idx`);
    await client.query(`DROP INDEX IF EXISTS users_email_unique_idx`);
    await client.query(`DROP TABLE IF EXISTS users`);
  },
};
