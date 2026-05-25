/**
 * External audit packets.
 *
 * Stores verifiable evidence bundles for work produced by BuildOrbit-adjacent
 * tools such as Cursor, Lovable, agencies, internal agents, or manual delivery.
 */

exports.name = '041_audit_packets';

exports.up = async (client) => {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_packets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      source_type VARCHAR(100) NOT NULL DEFAULT 'manual',
      source_tool VARCHAR(100) NOT NULL DEFAULT 'external',
      source_url TEXT,
      external_id TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'needs_review',
      gate_decision VARCHAR(100) NOT NULL DEFAULT 'needs_review',
      evidence_score INTEGER NOT NULL DEFAULT 0,
      packet_hash VARCHAR(80) NOT NULL,
      packet JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_packets_user_created
      ON audit_packets (user_id, created_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_packets_hash
      ON audit_packets (packet_hash)
  `);
};

exports.down = async (client) => {
  await client.query(`DROP TABLE IF EXISTS audit_packets`);
};
