'use strict';

const crypto = require('crypto');

const MAX_FILES = 200;
const MAX_FILE_BYTES = 500_000;
const MAX_CHECKS = 200;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => {
      return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
    }).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['pass', 'passed', 'success', 'ok'].includes(value)) return 'passed';
  if (['fail', 'failed', 'error', 'rejected'].includes(value)) return 'failed';
  if (['warn', 'warning', 'risk'].includes(value)) return 'warning';
  if (['skip', 'skipped', 'not_applicable'].includes(value)) return 'skipped';
  return 'unknown';
}

function normalizeFiles(files = []) {
  if (!Array.isArray(files)) return [];

  return files.slice(0, MAX_FILES).map((file) => {
    const path = String(file.path || file.filename || '').replace(/\\/g, '/').slice(0, 500);
    const content = file.content == null ? '' : String(file.content);
    const truncated = Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES;
    const storedContent = truncated
      ? content.slice(0, MAX_FILE_BYTES)
      : content;

    return {
      path,
      size_bytes: Buffer.byteLength(content, 'utf8'),
      sha256: sha256(content),
      content_truncated: truncated,
      language: file.language || inferLanguage(path),
      role: file.role || null,
      content_preview: storedContent.slice(0, 2000),
    };
  }).filter((file) => file.path);
}

function normalizeChecks(checks = []) {
  if (!Array.isArray(checks)) return [];

  return checks.slice(0, MAX_CHECKS).map((check) => {
    const status = normalizeStatus(check.status || (check.passed === true ? 'passed' : check.passed === false ? 'failed' : null));
    return {
      name: String(check.name || check.check || 'Unnamed check').slice(0, 300),
      status,
      category: String(check.category || 'verification').slice(0, 100),
      terminal: Boolean(check.terminal),
      details: check.details ? String(check.details).slice(0, 2000) : null,
      evidence_url: check.evidence_url ? String(check.evidence_url).slice(0, 1000) : null,
    };
  });
}

function inferLanguage(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    py: 'python',
    sql: 'sql',
  };
  return map[ext] || null;
}

function buildGateDecision(checks, policy = {}) {
  const requireChecks = policy.require_checks !== false;
  const blockOnWarnings = policy.block_on_warnings === true;
  const failed = checks.filter((check) => check.status === 'failed');
  const terminalFailed = failed.filter((check) => check.terminal);
  const warnings = checks.filter((check) => check.status === 'warning');

  if (requireChecks && checks.length === 0) {
    return {
      decision: 'needs_review',
      reason: 'No verification checks were supplied.',
      deployable: false,
    };
  }

  if (terminalFailed.length > 0) {
    return {
      decision: 'blocked',
      reason: `${terminalFailed.length} terminal check(s) failed.`,
      deployable: false,
    };
  }

  if (failed.length > 0) {
    return {
      decision: 'needs_review',
      reason: `${failed.length} non-terminal check(s) failed.`,
      deployable: false,
    };
  }

  if (blockOnWarnings && warnings.length > 0) {
    return {
      decision: 'needs_review',
      reason: `${warnings.length} warning check(s) require review.`,
      deployable: false,
    };
  }

  return {
    decision: warnings.length > 0 ? 'approved_with_warnings' : 'approved',
    reason: warnings.length > 0 ? `${warnings.length} warning check(s) recorded.` : 'All supplied checks passed.',
    deployable: true,
  };
}

function computeEvidenceScore({ spec, files, checks, approvals }) {
  let score = 0;
  if (spec && spec.trim().length >= 20) score += 20;
  if (files.length > 0) score += 25;
  if (checks.length > 0) score += 25;
  if (checks.some((check) => check.status === 'passed')) score += 10;
  if (approvals.length > 0) score += 10;
  if (files.every((file) => file.sha256)) score += 10;
  return Math.min(score, 100);
}

function buildAuditPacket(input, opts = {}) {
  const now = opts.generatedAt || new Date().toISOString();
  const files = normalizeFiles(input.files);
  const checks = normalizeChecks(input.checks);
  const approvals = Array.isArray(input.approvals) ? input.approvals.slice(0, 50).map((approval) => ({
    actor: String(approval.actor || 'unknown').slice(0, 200),
    decision: String(approval.decision || 'approved').slice(0, 100),
    timestamp: approval.timestamp || now,
    note: approval.note ? String(approval.note).slice(0, 1000) : null,
  })) : [];
  const spec = String(input.spec || input.prompt || '').slice(0, 100_000);
  const source = {
    type: String(input.source?.type || input.source_type || 'manual').slice(0, 100),
    tool: String(input.source?.tool || input.tool || 'external').slice(0, 100),
    url: input.source?.url || input.source_url || null,
    external_id: input.source?.external_id || input.external_id || null,
  };
  const gate = buildGateDecision(checks, input.policy || {});
  const evidenceScore = computeEvidenceScore({ spec, files, checks, approvals });

  const packet = {
    schema_version: 'audit_packet.v1',
    title: String(input.title || 'Untitled audit packet').slice(0, 300),
    business_context: input.business_context ? String(input.business_context).slice(0, 5000) : null,
    source,
    spec,
    files,
    checks,
    approvals,
    gate,
    evidence_score: evidenceScore,
    generated_at: now,
    generated_by: 'BuildOrbit Evidence Layer',
  };

  packet.packet_hash = `sha256:${sha256(canonicalJson({ ...packet, packet_hash: undefined }))}`;
  return packet;
}

module.exports = {
  buildAuditPacket,
  buildGateDecision,
  canonicalJson,
  normalizeChecks,
  normalizeFiles,
};
