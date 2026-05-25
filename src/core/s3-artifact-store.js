/**
 * S3-compatible artifact store (AWS S3, Cloudflare R2, MinIO).
 * Implements the same interface as ArtifactStore for drop-in use.
 */

const { STAGE_FILENAMES } = require('./artifact-store');

function objectKey(prefix, runId, stage, filename) {
  return `${prefix}/${runId}/${stage}/${filename}`;
}

class S3ArtifactStore {
  /**
   * @param {object} opts
   * @param {string} opts.bucket
   * @param {string} opts.region
   * @param {string} [opts.endpoint]
   * @param {string} opts.accessKeyId
   * @param {string} opts.secretAccessKey
   * @param {string} [opts.prefix]
   */
  constructor(opts) {
    this.bucket = opts.bucket;
    this.prefix = (opts.prefix || 'artifacts').replace(/\/+$/, '');
    this._client = this._createClient(opts);
  }

  _createClient(opts) {
    let S3Client;
    try {
      ({ S3Client } = require('@aws-sdk/client-s3'));
    } catch {
      throw new Error(
        'ARTIFACT_STORAGE=s3 requires @aws-sdk/client-s3. Run: npm install @aws-sdk/client-s3'
      );
    }

    const config = {
      region: opts.region || 'auto',
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    };
    if (opts.endpoint) {
      config.endpoint = opts.endpoint;
      config.forcePathStyle = true;
    }
    return new S3Client(config);
  }

  _commands() {
    return require('@aws-sdk/client-s3');
  }

  _key(runId, stage, filename) {
    return objectKey(this.prefix, runId, stage, filename);
  }

  async _exists(key) {
    const { HeadObjectCommand } = this._commands();
    try {
      await this._client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async writeArtifact(runId, stage, filename, data) {
    const key = this._key(runId, stage, filename);
    if (await this._exists(key)) {
      console.log(`[ArtifactStore:S3] Skip (immutable): ${runId.slice(0, 8)}/${stage}/${filename}`);
      return { skipped: true, path: key };
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const { PutObjectCommand } = this._commands();
    await this._client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: 'application/json',
    }));

    console.log(`[ArtifactStore:S3] Written: ${runId.slice(0, 8)}/${stage}/${filename} (${content.length}B)`);
    return { written: true, path: key, size: content.length };
  }

  async writeStageArtifact(runId, stage, data) {
    const filename = STAGE_FILENAMES[stage] || `${stage}.json`;
    return this.writeArtifact(runId, stage, filename, data);
  }

  async updateArtifact(runId, stage, filename, data) {
    const key = this._key(runId, stage, filename);
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const { PutObjectCommand } = this._commands();
    await this._client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: 'application/json',
    }));
    console.log(`[ArtifactStore:S3] Updated: ${runId.slice(0, 8)}/${stage}/${filename} (${content.length}B)`);
    return { updated: true, path: key, size: content.length };
  }

  async updateStageArtifact(runId, stage, data) {
    const filename = STAGE_FILENAMES[stage] || `${stage}.json`;
    return this.updateArtifact(runId, stage, filename, data);
  }

  async readArtifact(runId, stage, filename) {
    const key = this._key(runId, stage, filename);
    const { GetObjectCommand } = this._commands();
    try {
      const res = await this._client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const content = await res.Body.transformToString('utf8');
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async listArtifacts(runId, stage = null) {
    const { ListObjectsV2Command } = this._commands();
    const prefix = stage
      ? `${this.prefix}/${runId}/${stage}/`
      : `${this.prefix}/${runId}/`;

    const results = [];
    let continuationToken;

    do {
      const res = await this._client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const obj of res.Contents || []) {
        if (!obj.Key || obj.Key.endsWith('/')) continue;
        const rel = obj.Key.slice(`${this.prefix}/${runId}/`.length);
        const slash = rel.indexOf('/');
        if (slash === -1) continue;
        const s = rel.slice(0, slash);
        const filename = rel.slice(slash + 1);
        results.push({
          runId,
          stage: s,
          filename,
          size: obj.Size || 0,
          createdAt: (obj.LastModified || new Date()).toISOString(),
          url: `/api/pipeline/${runId}/artifacts/${s}/${filename}`,
        });
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async buildReplay(runId, events) {
    const artifacts = await this.listArtifacts(runId);
    const artifactsByStage = {};
    for (const artifact of artifacts) {
      if (!artifactsByStage[artifact.stage]) artifactsByStage[artifact.stage] = [];
      artifactsByStage[artifact.stage].push(artifact);
    }

    const timeline = [];
    for (const event of events) {
      let payload = event.payload;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { /* keep */ }
      }

      timeline.push({
        type: 'event',
        timestamp: event.created_at,
        stage: event.stage,
        status: event.status,
        data: payload,
      });

      if (event.status === 'completed' && artifactsByStage[event.stage]) {
        for (const artifact of artifactsByStage[event.stage]) {
          timeline.push({
            type: 'artifact',
            timestamp: artifact.createdAt,
            stage: artifact.stage,
            filename: artifact.filename,
            size: artifact.size,
            url: artifact.url,
          });
        }
      }
    }

    return {
      runId,
      artifactCount: artifacts.length,
      eventCount: events.length,
      timeline,
      artifacts: artifactsByStage,
    };
  }

  async hasArtifacts(runId) {
    const { ListObjectsV2Command } = this._commands();
    const res = await this._client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: `${this.prefix}/${runId}/`,
      MaxKeys: 1,
    }));
    return (res.Contents || []).length > 0;
  }
}

module.exports = { S3ArtifactStore, STAGE_FILENAMES };
