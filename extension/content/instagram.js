console.log("SunsetUploader: Instagram content script loaded");

let sunsetIGStarted = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "START_IG_UPLOAD") return;
  if (sunsetIGStarted) {
    console.log("SunsetUploader: START_IG_UPLOAD received again, ignoring — already running.");
    return;
  }
  sunsetIGStarted = true;
  console.log("SunsetUploader: received START_IG_UPLOAD, caption:", message.caption);
  startInstagramFlow(message.caption);
});

async function startInstagramFlow(caption) {
  console.log("=== SunsetUploader: Starting Instagram DOM flow ===");

  try {
    console.log("STEP 1: Clicking Create...");
    await clickCreate();
    console.log("STEP 1 DONE: Create clicked");
    await sleep(800);

    console.log("STEP 2: Clicking Post option...");
    await clickPostOption();
    console.log("STEP 2 DONE: Post clicked");
    await sleep(800);

    // File selection happens here via PAG in the real flow — the waits
    // below (waitForCropAndSelect916, clickNextButton) already poll with
    // generous timeouts, so they naturally wait through however long PAG
    // takes to select the file in parallel. No explicit sync needed here.

    console.log("STEP 2.5: Selecting 9:16 crop...");
    await waitForCropAndSelect916();
    console.log("STEP 2.5 DONE");

    console.log("STEP 3: Waiting for first Next...");
    await clickNextButton();
    console.log("STEP 3 DONE: First Next clicked");
    await sleep(800);

    console.log("STEP 4: Waiting for second Next (filters screen)...");
    await clickNextButton();
    console.log("STEP 4 DONE: Second Next clicked");
    await sleep(800);

    console.log("STEP 5: Focusing caption box (PAG types the actual text)...");
    await focusCaptionBox();
    console.log("STEP 5 DONE: caption box focused");

    // STEP 5.5 is the fix: wait for PAG's typing to actually finish
    // instead of a blind fixed delay. Same proven pattern as TikTok's
    // pre-Post wait — poll the box's text until it stops changing.
    console.log("STEP 5.5: Waiting for caption to finish typing...");
    await waitForCaptionToStabilize();
    console.log("STEP 5.5 DONE");

    console.log("STEP 6: Clicking Share...");
    await clickShare();
    console.log("STEP 6 DONE: Share clicked");

    console.log("=== SunsetUploader: Instagram DOM flow COMPLETE ===");

  } catch (err) {
    console.error("SunsetUploader: DOM flow failed at step:", err);
  }
}

/* ---------- Utilities ---------- */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function waitForElementAndClick(finder, label, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryFind = () => {
      let el;
      try {
        el = finder();
      } catch {
        el = null;
      }

      if (el) {
        console.log(`  waitForElementAndClick: found "${label}" ->`, el);
        console.log(`  aria-label: ${el.getAttribute('aria-label')}, in dialog: ${!!el.closest('[role="dialog"]')}`);
        el.click();
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        reject(`Timeout waiting for: "${label}"`);
        return;
      }

      setTimeout(tryFind, 300);
    };

    tryFind();
  });
}

function exactText(el, text) {
  return el.textContent?.trim() === text;
}

// Same proven pattern as tiktok.js — polls the caption box's actual text
// until it stops changing for a full stableWindowMs, instead of guessing
// a fixed delay is long enough for PAG to finish typing.
async function waitForCaptionToStabilize(stableWindowMs = 1500, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastText = null;
  let lastChangeTime = Date.now();

  while (Date.now() < deadline) {
    const box = document.querySelector(
      '[aria-label="Write a caption..."][contenteditable="true"]'
    );
    const currentText = box?.innerText?.trim() || "";

    if (currentText !== lastText) {
      lastText = currentText;
      lastChangeTime = Date.now();
    }

    if (currentText.length > 0 && (Date.now() - lastChangeTime) >= stableWindowMs) {
      console.log("  Caption stabilized:", currentText);
      return true;
    }

    await sleep(300);
  }
  console.warn("  Caption never stabilized — continuing anyway.");
  return false;
}

/* ---------- Steps ---------- */

function clickCreate() {
  return waitForElementAndClick(() => {
    const svg = document.querySelector('svg[aria-label="New post"]');
    return svg?.closest('[aria-selected]') || svg;
  }, "Create (New post icon)");
}

function clickPostOption() {
  return waitForElementAndClick(() => {
    const spans = document.querySelectorAll("span");
    for (const span of spans) {
      if (exactText(span, "Post")) return span;
    }
    return null;
  }, "Post (menu option)");
}

async function waitForCropAndSelect916() {
  console.log("Looking for Instagram crop controls...");
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const cropIcon = document.querySelector('svg[aria-label="Select crop"]');
    if (cropIcon) {
      console.log("Found crop button");
      const cropClickTarget = cropIcon.closest("div") || cropIcon;
      cropClickTarget.click();
      await sleep(500);

      const spans = document.querySelectorAll("span");
      for (const span of spans) {
        if (exactText(span, "9:16")) {
          console.log("Found 9:16 option");
          span.click();
          await sleep(300);
          return true;
        }
      }
    }
    await sleep(300);
  }
  console.log("Could not find crop controls");
  return false;
}

function clickNextButton() {
  return waitForElementAndClick(() => {
    const candidates = document.querySelectorAll('[role="button"]');
    for (const el of candidates) {
      if (exactText(el, "Next")) return el;
    }
    return null;
  }, "Next");
}

function clickShare() {
  return waitForElementAndClick(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const scope = dialog || document;
    const candidates = scope.querySelectorAll('[role="button"]');
    for (const el of candidates) {
      if (exactText(el, "Share")) return el;
    }
    return null;
  }, "Share (scoped to dialog)");
}

function focusCaptionBox(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryFocus = () => {
      const box = document.querySelector(
        '[aria-label="Write a caption..."][contenteditable="true"]'
      );

      if (box && box.offsetParent !== null) {
        box.focus();
        box.click();
        console.log("  Caption box focused:", box);
        resolve(true);
        return;
      }

      if (Date.now() - start > timeout) {
        reject("Timeout waiting for caption box");
        return;
      }

      setTimeout(tryFocus, 300);
    };

    tryFocus();
  });
}