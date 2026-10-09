importScripts("shared/settings.js");

const RULESET = "telemetry";

async function syncTelemetryRuleset() {
  const { blockTelemetry } = await BYTM.loadSettings();
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    blockTelemetry ? { enableRulesetIds: [RULESET] } : { disableRulesetIds: [RULESET] }
  );
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  // v1.1: the background saver became opt-in (it would undercut the minimum quality).
  if (stored.videoSaver === true && !stored.migratedSaverOptIn) {
    await chrome.storage.sync.set({ videoSaver: false, migratedSaverOptIn: true });
    stored.videoSaver = false;
  }
  const missing = {};
  for (const [key, value] of Object.entries(BYTM.DEFAULTS)) {
    if (!(key in stored)) missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.sync.set(missing);
  await syncTelemetryRuleset();
});

chrome.runtime.onStartup.addListener(syncTelemetryRuleset);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "blockTelemetry" in changes) syncTelemetryRuleset();
});
