const assert = require('assert');
const { buildAuditPacket, buildGateDecision } = require('../../src/lib/audit-packet');

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n=== Audit Packet Tests ===');

test('builds a hashed packet for external AI work', () => {
  const packet = buildAuditPacket({
    title: 'Cursor PR review',
    source: { type: 'ai_coding_tool', tool: 'cursor', external_id: 'pr-123' },
    spec: 'Add a billing portal button and verify webhook handling.',
    files: [{ path: 'src/routes/billing.js', content: 'console.log("billing");' }],
    checks: [{ name: 'Unit tests', status: 'passed', terminal: true }],
    approvals: [{ actor: 'eng@example.com', decision: 'approved' }],
  }, { generatedAt: '2026-05-25T00:00:00.000Z' });

  assert.strictEqual(packet.source.tool, 'cursor');
  assert.strictEqual(packet.files.length, 1);
  assert.match(packet.files[0].sha256, /^[a-f0-9]{64}$/);
  assert.strictEqual(packet.gate.decision, 'approved');
  assert.strictEqual(packet.gate.deployable, true);
  assert.match(packet.packet_hash, /^sha256:[a-f0-9]{64}$/);
});

test('blocks deploy when terminal checks fail', () => {
  const gate = buildGateDecision([
    { name: 'Security scan', status: 'failed', terminal: true },
  ]);

  assert.strictEqual(gate.decision, 'blocked');
  assert.strictEqual(gate.deployable, false);
});

test('requires review when no checks are supplied', () => {
  const packet = buildAuditPacket({
    title: 'Lovable export',
    source: { tool: 'lovable' },
    spec: 'Marketing site export for client handoff.',
    files: [{ path: 'index.html', content: '<h1>Hello</h1>' }],
  }, { generatedAt: '2026-05-25T00:00:00.000Z' });

  assert.strictEqual(packet.gate.decision, 'needs_review');
  assert.strictEqual(packet.gate.deployable, false);
});

test('packet hash is deterministic for identical evidence', () => {
  const input = {
    title: 'Agency delivery',
    spec: 'Client requested a verified landing page.',
    files: [{ path: 'index.html', content: '<h1>Acme</h1>' }],
    checks: [{ name: 'Build', status: 'passed' }],
  };

  const a = buildAuditPacket(input, { generatedAt: '2026-05-25T00:00:00.000Z' });
  const b = buildAuditPacket(input, { generatedAt: '2026-05-25T00:00:00.000Z' });
  assert.strictEqual(a.packet_hash, b.packet_hash);
});

if (process.exitCode) process.exit(process.exitCode);
console.log('All audit packet tests passed');
