console.log("SunsetUploader background.js LOADED");

const startedYouTubeTabs = new Set();
const startedXTabs = new Set();
const startedInstagramTabs = new Set();

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
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("PAGE COMPLETE:", tab.url);
  }

  if (changeInfo.status === "complete" &&
      tab.url?.includes("studio.youtube.com")) {
    if (startedYouTubeTabs.has(tabId)) {
      console.log("YOUTUBE: already triggered for this tab, skipping.");
    } else {
      startedYouTubeTabs.add(tabId);
      console.log("YOUTUBE URL MATCHED (loose check):", tab.url);
      setTimeout(() => {
        sendWithRetry(tabId, { type: "START_YT_UPLOAD" });
      }, 6000);
    }
  }

  if (changeInfo.status === "complete" &&
      tab.url?.includes("x.com/compose/post")) {
    if (startedXTabs.has(tabId)) {
      console.log("X: already triggered for this tab, skipping.");
    } else {
      startedXTabs.add(tabId);
      console.log("X COMPOSE MATCHED:", tab.url);
      setTimeout(() => {
        sendWithRetry(tabId, { type: "START_X_UPLOAD" });
      }, 2000);
    }
  }

  if (changeInfo.status === "complete" &&
      tab.url?.includes("tiktok.com")) {
    console.log("TIKTOK URL MATCHED (loose check):", tab.url);
    setTimeout(() => {
      sendWithRetry(tabId, { type: "START_TT_POST" });
    }, 24000);
  }

  if (changeInfo.status === "complete" &&
      tab.url?.includes("instagram.com") &&
      tab.url?.includes("sunset_upload=1")) {
    if (startedInstagramTabs.has(tabId)) {
      console.log("INSTAGRAM: already triggered for this tab, skipping.");
    } else {
      startedInstagramTabs.add(tabId);
      console.log("INSTAGRAM AUTOMATION TAB MATCHED:", tab.url);
      setTimeout(() => {
        sendWithRetry(tabId, { type: "START_IG_UPLOAD", caption: "" });
      }, 2000);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  startedYouTubeTabs.delete(tabId);
  startedXTabs.delete(tabId);
  startedInstagramTabs.delete(tabId);
});