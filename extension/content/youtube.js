console.log("SunsetUploader: YouTube content script loaded — v6");

let sunsetYTStarted = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "START_YT_UPLOAD") return;
  if (sunsetYTStarted) {
    console.log("SunsetUploader: START_YT_UPLOAD received again, ignoring — already running.");
    return;
  }
  sunsetYTStarted = true;
  console.log("SunsetUploader: received START_YT_UPLOAD");
  startYouTubeFlow();
});

async function startYouTubeFlow() {
  console.log("=== SunsetUploader: Starting YouTube DOM flow ===");
  try {
    console.log("STEP 1: Waiting for details page (PAG owns Create/Upload/Select Files)...");
    await waitForDetailsPage();
    console.log("STEP 1 DONE: Details page loaded");

    console.log("STEP 1.5: Waiting for title box to actually be focused...");
    await waitForTitleBoxFocused();
    console.log("STEP 1.5 DONE");
    chrome.runtime.sendMessage({ type: "YT_DETAILS_READY" });

    console.log("STEP 2: Waiting for title to finish typing...");
    await waitForTitleToStabilize();
    console.log("STEP 2 DONE");

    console.log("STEP 3: Setting Not for kids...");
    await setNotForKids();
    console.log("STEP 3 DONE");
    await sleep(500);

    console.log("STEP 4: Clicking Next x3...");
    await clickNext(3);
    console.log("STEP 4 DONE");
    await sleep(500);

    console.log("STEP 5: Setting Public...");
    await setPublic();
    console.log("STEP 5 DONE");
    await sleep(500);

    console.log("STEP 6: Clicking Publish or Save...");
    try {
      await waitForAndClickText("Publish");
    } catch {
      console.log("  'Publish' not found, trying 'Save'...");
      await waitForAndClickText("Save");
    }
    console.log("STEP 6 DONE");

    console.log("STEP 7: Checking for a 'Publish anyway' confirmation dialog...");
    await handlePublishAnywayDialog();
    console.log("STEP 7 DONE");

    console.log("STEP 7: Checking for a 'Publish anyway' confirmation dialog...");
    const handledByDom = await handlePublishAnywayDialog();
    if (!handledByDom) {
      console.log("  DOM didn't confirm the dialog — asking Python to try Tab+Enter as a fallback.");
      chrome.runtime.sendMessage({ type: "YT_PUBLISH_FALLBACK_NEEDED" });
    }
    console.log("STEP 7 DONE");

    console.log("=== SunsetUploader: YouTube DOM flow COMPLETE ===");
  } catch (err) {
    console.error("SunsetUploader: YouTube DOM flow failed:", err);
  }
}

async function waitForTitleToStabilize(stableWindowMs = 1500, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastText = null;
  let lastChangeTime = Date.now();
  while (Date.now() < deadline) {
    const boxes = document.querySelectorAll('#textbox');
    const titleBox = boxes[0];
    const currentText = titleBox?.innerText?.trim() || "";
    if (currentText !== lastText) {
      lastText = currentText;
      lastChangeTime = Date.now();
    }
    if (currentText.length > 0 && (Date.now() - lastChangeTime) >= stableWindowMs) {
      console.log("  Title stabilized:", currentText);
      return true;
    }
    await sleep(300);
  }
  console.warn("  Title never stabilized — continuing anyway.");
  return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function observeUntil(fn) {
  return new Promise((resolve) => {
    try { if (fn()) { resolve(); return; } } catch {}
    const observer = new MutationObserver(() => {
      try { if (fn()) { observer.disconnect(); resolve(); } } catch {}
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function waitForTitleBoxFocused(timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const boxes = document.querySelectorAll('#textbox');
    const titleBox = boxes[0];
    if (titleBox && document.activeElement === titleBox) {
      console.log("  Title box is focused.");
      return true;
    }
    await sleep(150);
  }
  console.warn("  Title box never confirmed focused — signaling ready anyway.");
  return true; // don't block PAG forever if YT's focus behavior ever changes
}

function waitForAndClickText(text, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    console.log(`  waitForAndClickText: looking for "${text}"...`);
    const interval = setInterval(() => {
      const els = document.querySelectorAll("button, tp-yt-paper-item, yt-icon-button");
      for (const el of els) {
        const label = el.innerText || el.getAttribute("aria-label") || el.getAttribute("title");
        if (label?.trim() === text) {
          const rect = el.getBoundingClientRect();
          const clickable = rect.width > 0 && rect.height > 0 && !el.disabled && el.offsetParent !== null;
          if (!clickable) continue;
          el.scrollIntoView({ block: "center" });
          el.click();
          console.log(`  waitForAndClickText: clicked "${text}"`);
          clearInterval(interval);
          resolve();
          return;
        }
      }
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        console.error(`  waitForAndClickText: TIMEOUT for "${text}"`);
        reject(`Timed out waiting for "${text}"`);
      }
    }, 300);
  });
}

function waitForDetailsPage() {
  console.log("  waitForDetailsPage: waiting for #textbox elements...");
  return observeUntil(() => {
    const boxes = document.querySelectorAll("#textbox");
    console.log(`  waitForDetailsPage: found ${boxes.length} textboxes`);
    return boxes.length >= 2;
  });
}

function setNotForKids() {
  return observeUntil(() => {
    const radios = document.querySelectorAll("tp-yt-paper-radio-button");
    for (const r of radios) {
      if (r.innerText?.toLowerCase().includes("not made for kids")) {
        r.click();
        console.log("  setNotForKids: clicked");
        return true;
      }
    }
    return false;
  });
}

async function clickNext(times) {
  for (let i = 0; i < times; i++) {
    console.log(`  clickNext: ${i + 1}/${times}`);
    await waitForAndClickText("Next");
    await sleep(800);
  }
}

function setPublic() {
  return observeUntil(() => {
    const radios = document.querySelectorAll("tp-yt-paper-radio-button");
    for (const r of radios) {
      if (r.innerText?.includes("Public")) {
        r.click();
        console.log("  setPublic: clicked");
        return true;
      }
    }
    return false;
  });
}

async function handlePublishAnywayDialog(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const candidates = document.querySelectorAll('[role="button"], button, tp-yt-paper-button');
    for (const el of candidates) {
      const label = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
      if (label === "publish anyway") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && !el.disabled) {
          el.scrollIntoView({ block: "center" });
          el.click();
          console.log("  handlePublishAnywayDialog: clicked", label);
          return true;
        }
      }
    }
    await sleep(300);
  }
  console.log("  handlePublishAnywayDialog: no confirmation dialog found within timeout.");
  return false;
}