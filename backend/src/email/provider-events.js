const PROVIDER_EVENT_TYPES = {
  EMAIL_PROVIDER_CHECKED: 'EMAIL_PROVIDER_CHECKED',
  EMAIL_PROVIDER_ACCEPTED: 'EMAIL_PROVIDER_ACCEPTED',
  EMAIL_PROVIDER_REJECTED: 'EMAIL_PROVIDER_REJECTED',
  EMAIL_PROVIDER_UNAVAILABLE: 'EMAIL_PROVIDER_UNAVAILABLE',
};

async function emitProviderEvent() {}

async function probeProviderOnStartup() {
  return { ok: true };
}

module.exports = { PROVIDER_EVENT_TYPES, emitProviderEvent, probeProviderOnStartup };
