'use strict';

const express = require('express');
const { buildAuditPacket } = require('../lib/audit-packet');

const UUID_RE = /^[0-9a-f-]{36}$/i;

function createAuditPacketsRouter({ pool, auth }) {
  const router = express.Router();

  router.use(auth.requireApiAuth);

  router.post('/', async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const packet = buildAuditPacket(req.body || {});
      const { rows } = await pool.query(
        `INSERT INTO audit_packets
          (user_id, title, source_type, source_tool, source_url, external_id,
           status, gate_decision, evidence_score, packet_hash, packet)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, created_at`,
        [
          userId,
          packet.title,
          packet.source.type,
          packet.source.tool,
          packet.source.url,
          packet.source.external_id,
          packet.gate.deployable ? 'verified' : 'needs_review',
          packet.gate.decision,
          packet.evidence_score,
          packet.packet_hash,
          JSON.stringify(packet),
        ]
      );

      res.status(201).json({
        success: true,
        id: rows[0].id,
        created_at: rows[0].created_at,
        packet,
      });
    } catch (err) {
      console.error('[AuditPackets] create error:', err);
      res.status(500).json({ success: false, message: 'Failed to create audit packet' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { rows } = await pool.query(
        `SELECT id, title, source_type, source_tool, status, gate_decision,
                evidence_score, packet_hash, created_at
           FROM audit_packets
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 100`,
        [userId]
      );

      res.json({ success: true, packets: rows });
    } catch (err) {
      console.error('[AuditPackets] list error:', err);
      res.status(500).json({ success: false, message: 'Failed to list audit packets' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const row = await getOwnedPacket(pool, req.params.id, req.user?.userId);
      if (!row) return res.status(404).json({ success: false, message: 'Audit packet not found' });
      res.json({ success: true, id: row.id, created_at: row.created_at, packet: row.packet });
    } catch (err) {
      console.error('[AuditPackets] get error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch audit packet' });
    }
  });

  router.get('/:id/export', async (req, res) => {
    try {
      const row = await getOwnedPacket(pool, req.params.id, req.user?.userId);
      if (!row) return res.status(404).json({ success: false, message: 'Audit packet not found' });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="buildorbit-audit-${row.id.slice(0, 8)}.json"`);
      res.json({
        id: row.id,
        created_at: row.created_at,
        packet: row.packet,
      });
    } catch (err) {
      console.error('[AuditPackets] export error:', err);
      res.status(500).json({ success: false, message: 'Failed to export audit packet' });
    }
  });

  return router;
}

async function getOwnedPacket(pool, id, userId) {
  if (!id || !UUID_RE.test(id) || !userId) return null;
  const { rows } = await pool.query(
    `SELECT id, created_at, packet
       FROM audit_packets
      WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

module.exports = { createAuditPacketsRouter };
