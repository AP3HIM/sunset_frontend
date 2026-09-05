console.log("SunsetUploader background.js LOADED");
console.log("SunsetUploader background.js LOADED v4");

const startedTabs = { yt: new Set(), x: new Set(), ig: new Set() };

// Rehydrate in-memory state on worker startup/respawn so a freshly
// respawned worker doesn't forget it already fired for a tab that's
// still open.
chrome.storage.session.get(null).then((all) => {
  for (const key of Object.keys(all)) {
    const m = key.match(/^started_(yt|x|ig)_(\d+)$/);
    if (m) startedTabs[m[1]].add(Number(m[2]));
  }
});

// Synchronous claim — this is the actual fix. No `await` happens before
// the check-and-set, so two near-simultaneous onUpdated firings for the
// same tab can never both pass. Storage write below is fire-and-forget,
// purely for respawn persistence, not part of the decision.
function claim(kind, tabId) {
  if (startedTabs[kind].has(tabId)) return false;
  startedTabs[kind].add(tabId);
  chrome.storage.session.set({ [`started_${kind}_${tabId}`]: true });
  return true;
}

function sendWithRetry(tabId, message, attempts = 6, delay = 1000) {
  chrome.tabs.sendMessage(tabId, message, () => {
    if (chrome.runtime.lastError) {
      console.log("SunsetUploader: send failed (retrying):", chrome.runtime.lastError.message);
      if (attempts > 0) {
        setTimeout(() => sendWithRetry(tabId, message, attempts - 1, delay), delay);
      } else {
        console.error("SunsetUploader: gave up sending", message.type, "to tab", tabId);
      }
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "YT_DETAILS_READY") {
    fetch("http://127.0.0.1:8765/signal/ready", { method: "POST" }).catch(() => {});
  }
  if (message.type === "YT_PUBLISH_FALLBACK_NEEDED") {
    fetch("http://127.0.0.1:8765/signal/publish-fallback-needed", { method: "POST" }).catch(() => {});
  }
  if (message.type === "X_COMPOSE_READY") {
    fetch("http://127.0.0.1:8765/signal/x-compose-ready", { method: "POST" }).catch(() => {});
  }
  if (message.type === "X_REFOCUSED") {
    fetch("http://127.0.0.1:8765/signal/x-refocused", { method: "POST" }).catch(() => {});
  }
  if (message.type === "IG_POST_CLICKED") {
    fetch("http://127.0.0.1:8765/signal/ig-post-clicked", { method: "POST" }).catch(() => {});
  }
  if (message.type === "IG_CAPTION_READY") {
    fetch("http://127.0.0.1:8765/signal/ig-caption-ready", { method: "POST" }).catch(() => {});
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  console.log("PAGE COMPLETE:", tab.url);

  if (tab.url?.includes("studio.youtube.com")) {
    if (!claim("yt", tabId)) {
      console.log("YOUTUBE: already triggered for this tab, skipping.");
    } else {
      console.log("YOUTUBE URL MATCHED (loose check):", tab.url);
      setTimeout(() => sendWithRetry(tabId, { type: "START_YT_UPLOAD" }), 6000);
    }
  }

  if (tab.url?.includes("x.com/compose/post")) {
    if (!claim("x", tabId)) {
      console.log("X: already triggered for this tab, skipping.");
    } else {
      console.log("X COMPOSE MATCHED:", tab.url);
      setTimeout(() => sendWithRetry(tabId, { type: "START_X_UPLOAD" }), 2000);
    }
  }

  if (tab.url?.includes("tiktok.com")) {
    console.log("TIKTOK URL MATCHED (loose check):", tab.url);
    setTimeout(() => sendWithRetry(tabId, { type: "START_TT_POST" }), 24000);
  }

  if (tab.url?.includes("instagram.com") && tab.url?.includes("sunset_upload=1")) {
    if (!claim("ig", tabId)) {
      console.log("INSTAGRAM: already triggered for this tab, skipping.");
    } else {
      console.log("INSTAGRAM AUTOMATION TAB MATCHED:", tab.url);
      setTimeout(() => sendWithRetry(tabId, { type: "START_IG_UPLOAD", caption: "" }), 2000);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const kind of Object.keys(startedTabs)) startedTabs[kind].delete(tabId);
  chrome.storage.session.remove(["yt", "x", "ig"].map(k => `started_${k}_${tabId}`));
});