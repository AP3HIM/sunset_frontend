console.log("SunsetUploader: X/Twitter content script loaded — v1");

let sunsetXStarted = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "START_X_UPLOAD") return;
  if (sunsetXStarted) {
    console.log("SunsetUploader: START_X_UPLOAD received again, ignoring.");
    return;
  }
  sunsetXStarted = true;
  console.log("SunsetUploader: received START_X_UPLOAD");
  startXFlow();
});

async function startXFlow() {
  console.log("=== SunsetUploader: Starting X DOM flow ===");
  try {
    console.log("STEP 1: Waiting for compose box (auto-focused)...");
    await waitForComposeBox();
    console.log("STEP 1 DONE");
    chrome.runtime.sendMessage({ type: "X_COMPOSE_READY" });

    // Fired in parallel, not awaited — this only ever does something if
    // the Grok/Upload A/B menu actually appears after PAG clicks the media
    // button. Accounts that never see that menu are unaffected; this just
    // polls quietly and times out doing nothing.
    watchForGrokMenuAndHandle();

    console.log("STEP 2: Waiting for media to actually attach...");
    await waitForMediaAttached();
    console.log("STEP 2 DONE");

    console.log("STEP 3: Refocusing compose box before Ctrl+Enter...");
    refocusComposeBox();
    console.log("STEP 3 DONE");
    chrome.runtime.sendMessage({ type: "X_REFOCUSED" });

    console.log("=== SunsetUploader: X DOM flow COMPLETE ===");
  } catch (err) {
    console.error("SunsetUploader: X DOM flow failed:", err);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function exactText(el, text) {
  return el.textContent?.trim() === text;
}

function findMenuItemByText(text) {
  const items = document.querySelectorAll('[role="menuitem"]');
  for (const item of items) {
    const span = item.querySelector("span");
    if (span && exactText(span, text)) return item;
  }
  return null;
}

// Some accounts are A/B tested into a "Generate with Grok" vs. "Upload"
// menu on the media button instead of going straight to the native file
// picker. This watches for that menu (bounded poll, ~4s) and, only if it
// actually appears, clicks "Upload" by exact text match — not by position
// ("first/top option"), since menu order is exactly the kind of thing that
// isn't safe to assume will stay fixed. Accounts without this test never
// show the menu, so this resolves false and nothing happens — no added
// step, no behavior change for them.
async function watchForGrokMenuAndHandle(timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const grokItem = findMenuItemByText("Generate with Grok");
    if (grokItem) {
      console.log("SunsetUploader: Grok A/B menu detected — clicking Upload instead");
      const uploadItem = findMenuItemByText("Upload");
      if (uploadItem) {
        uploadItem.click();
        chrome.runtime.sendMessage({ type: "X_GROK_MENU_HANDLED" });
        return true;
      }
      console.warn("SunsetUploader: Grok menu seen but 'Upload' item not found");
      return false;
    }
    await sleep(200);
  }
  return false; // no menu ever appeared — normal (non-test) account
}

function getComposeBox() {
  return document.querySelector('[data-testid="tweetTextarea_0"]') ||
         document.querySelector('[role="textbox"][contenteditable="true"]');
}

function waitForComposeBox(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (getComposeBox()) { resolve(true); return; }
      if (Date.now() - start > timeout) { reject("compose box never appeared"); return; }
      setTimeout(check, 300);
    };
    check();
  });
}

function waitForMediaAttached(timeout = 20000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      // Twitter shows a "Remove media" control once a file is attached.
      const removeBtn = [...document.querySelectorAll('[aria-label]')]
        .find(el => el.getAttribute('aria-label')?.toLowerCase().includes('remove'));
      const preview = document.querySelector('[data-testid="attachments"]');
      if (removeBtn || preview) { console.log("  media attachment detected"); resolve(true); return; }
      if (Date.now() - start > timeout) {
        console.warn("  media never confirmed attached — continuing anyway");
        resolve(false);
        return;
      }
      setTimeout(check, 300);
    };
    check();
  });
}

function refocusComposeBox() {
  const box = getComposeBox();
  if (box) {
    box.focus();
    box.click();
    console.log("  compose box refocused");
  } else {
    console.warn("  could not find compose box to refocus");
  }
}