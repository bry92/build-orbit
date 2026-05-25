/**
 * Artifact store factory — local filesystem (default) or S3-compatible object storage.
 *
 * Set ARTIFACT_STORAGE=s3 for production durable storage (R2, S3, MinIO).
 */

const path = require('path');
const { ArtifactStore } = require('../core/artifact-store');

function validateS3Config() {
  const required = [
    'ARTIFACT_S3_BUCKET',
    'ARTIFACT_S3_ACCESS_KEY_ID',
    'ARTIFACT_S3_SECRET_ACCESS_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `ARTIFACT_STORAGE=s3 requires: ${missing.join(', ')}`
    );
  }
}

/**
 * @returns {import('../core/artifact-store').ArtifactStore | import('../core/s3-artifact-store').S3ArtifactStore}
 */
function createArtifactStore() {
  const mode = (process.env.ARTIFACT_STORAGE || 'local').toLowerCase();

  if (mode === 's3') {
    validateS3Config();
    const { S3ArtifactStore } = require('../core/s3-artifact-store');
    const store = new S3ArtifactStore({
      bucket: process.env.ARTIFACT_S3_BUCKET,
      region: process.env.ARTIFACT_S3_REGION || 'auto',
      endpoint: process.env.ARTIFACT_S3_ENDPOINT || undefined,
      accessKeyId: process.env.ARTIFACT_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.ARTIFACT_S3_SECRET_ACCESS_KEY,
      prefix: process.env.ARTIFACT_S3_PREFIX || 'artifacts',
    });
    console.log(`[ArtifactStore] S3 mode: bucket=${process.env.ARTIFACT_S3_BUCKET}`);
    return store;
  }

  const localPath = process.env.ARTIFACT_LOCAL_PATH || './artifacts';
  return new ArtifactStore(path.resolve(localPath));
}

module.exports = { createArtifactStore };
