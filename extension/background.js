console.log("SunsetUploader Companion: background loaded");

// This extension is a companion to the SunsetUploader desktop app. It only
// acts while that app is running: the app opens a small server on this
// computer (127.0.0.1:8765), and every action below is gated on reaching it.
// If the app isn't running, the extension does nothing at all — so normal
// browsing on TikTok or Instagram is never touched.
const SIGNAL_BASE = "http://127.0.0.1:8765/signal";

const startedTabs = { ig: new Set(), tt: new Set() };

// Rehydrate in-memory state if the service worker was restarted while a tab
// we already handled is still open.
chrome.storage.session.get(null).then((all) => {
  for (const key of Object.keys(all)) {
    const m = key.match(/^started_(ig|tt)_(\d+)$/);
    if (m) startedTabs[m[1]].add(Number(m[2]));
  }
});

// Synchronous check-and-set so two near-simultaneous page-load events for the
// same tab can never both start a flow.
function claim(kind, tabId) {
  if (startedTabs[kind].has(tabId)) return false;
  startedTabs[kind].add(tabId);
  chrome.storage.session.set({ [`started_${kind}_${tabId}`]: true });
  return true;
}

function sendWithRetry(tabId, message, attempts = 6, delay = 1000) {
  chrome.tabs.sendMessage(tabId, message, () => {
    const err = chrome.runtime.lastError;
    // The page scripts receive these messages but never send a reply, so
    // Chrome reports "message port closed before a response was received".
    // That means the message WAS delivered; retrying it would just re-send it.
    if (err && /message port closed/i.test(err.message)) return;
    if (err) {
      console.log("SunsetUploader Companion: send failed (retrying):", err.message);
      if (attempts > 0) {
        setTimeout(() => sendWithRetry(tabId, message, attempts - 1, delay), delay);
      } else {
        console.error("SunsetUploader Companion: gave up sending", message.type, "to tab", tabId);
      }
    }
  });
}

// Reaching the desktop app's local server = "the app is running". The same
// request also tells the app this extension is installed and alive.
async function desktopAppIsRunning() {
  try {
    await fetch(`${SIGNAL_BASE}/extension-ready`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

function relay(signalName) {
  fetch(`${SIGNAL_BASE}/${signalName}`, { method: "POST" }).catch(() => {});
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "IG_SELECT_FOCUSED") relay("ig-select-focused");
  if (message.type === "IG_POST_CLICKED") relay("ig-post-clicked");
  if (message.type === "IG_CAPTION_READY") relay("ig-caption-ready");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const host = hostOf(tab.url);
  const isTikTok = host === "www.tiktok.com";
  const isInstagram = host === "www.instagram.com";
  if (!isTikTok && !isInstagram) return;

  // Gate: do nothing unless the desktop app is running.
  if (!(await desktopAppIsRunning())) return;

  if (isTikTok && claim("tt", tabId)) {
    console.log("SunsetUploader Companion: TikTok tab matched:", tab.url);
    setTimeout(() => sendWithRetry(tabId, { type: "START_TT_POST" }), 24000);
  }

  if (isInstagram && claim("ig", tabId)) {
    console.log("SunsetUploader Companion: Instagram tab matched:", tab.url);
    setTimeout(() => sendWithRetry(tabId, { type: "START_IG_UPLOAD", caption: "" }), 2000);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const kind of Object.keys(startedTabs)) startedTabs[kind].delete(tabId);
  chrome.storage.session.remove(["ig", "tt"].map((k) => `started_${k}_${tabId}`));
});
