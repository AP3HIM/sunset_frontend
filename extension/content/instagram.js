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
  showStatus("started");

  try {
    baselineTexts = snapshotTexts();

    console.log("STEP 1-2: Opening Create and choosing Post...");
    showStatus("opening the Create menu…");
    const via = await openCreateAndChoosePost();
    console.log("STEP 1-2 DONE via:", via);
    await sleep(500);

    // Focus "Select from computer" ourselves (focusing is allowed from a
    // page script; only the actual click that opens the native file
    // dialog needs a real keypress). Python then only has to press Enter,
    // instead of guessing how many Tabs it takes to get there.
    console.log("STEP 2b: Focusing 'Select from computer'...");
    showStatus("getting the file picker ready…");
    const focused = await focusSelectFromComputer();
    if (focused) chrome.runtime.sendMessage({ type: "IG_SELECT_FOCUSED" });
    chrome.runtime.sendMessage({ type: "IG_POST_CLICKED" });
    showStatus(focused
      ? "file picker ready — waiting for the file to be selected…"
      : "waiting for the file to be selected…");
    await sleep(800);

    // File selection happens here via PAG in the real flow — the waits
    // below (waitForCropAndSelect916, clickNextButton) already poll with
    // generous timeouts, so they naturally wait through however long PAG
    // takes to select the file in parallel. No explicit sync needed here.

    console.log("STEP 2.5: Selecting 9:16 crop...");
    showStatus("setting 9:16 crop…");
    await waitForCropAndSelect916();
    console.log("STEP 2.5 DONE");

    console.log("STEP 3: Waiting for first Next...");
    showStatus("clicking Next (1 of 2)…");
    await clickNextButton();
    console.log("STEP 3 DONE: First Next clicked");
    await sleep(800);

    console.log("STEP 4: Waiting for second Next (filters screen)...");
    showStatus("clicking Next (2 of 2)…");
    await clickNextButton();
    console.log("STEP 4 DONE: Second Next clicked");
    await sleep(800);

    console.log("STEP 5: Focusing caption box (PAG types the actual text)...");
    showStatus("finding the caption box…");
    await focusCaptionBox();
    console.log("STEP 5 DONE: caption box focused");
    chrome.runtime.sendMessage({ type: "IG_CAPTION_READY" });

    // STEP 5.5 is the fix: wait for PAG's typing to actually finish
    // instead of a blind fixed delay. Same proven pattern as TikTok's
    // pre-Post wait — poll the box's text until it stops changing.
    console.log("STEP 5.5: Waiting for caption to finish typing...");
    showStatus("waiting for the caption to finish typing…");
    await waitForCaptionToStabilize();
    console.log("STEP 5.5 DONE");

    console.log("STEP 6: Clicking Share...");
    showStatus("clicking Share…");
    await clickShare();
    console.log("STEP 6 DONE: Share clicked");

    console.log("=== SunsetUploader: Instagram DOM flow COMPLETE ===");
    showStatus("done ✓");

  } catch (err) {
    console.error("SunsetUploader: DOM flow failed at step:", err);
    showStatus("FAILED — " + err, true);
  }
}

/* ---------- Utilities ---------- */

// On-screen status banner (top-left of the Instagram tab) so you can SEE
// which step the DOM flow is on, or which one failed, without opening
// DevTools. Purely informational: it never intercepts clicks.
function showStatus(text, isError = false) {
  try {
    let el = document.getElementById("sunset-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "sunset-status";
      el.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:2147483647;padding:8px 12px;" +
        "border-radius:8px;font:13px/1.3 system-ui,sans-serif;color:#fff;" +
        "box-shadow:0 2px 8px rgba(0,0,0,.4);max-width:380px;pointer-events:none;";
      (document.body || document.documentElement).appendChild(el);
    }
    el.style.background = isError ? "#b3261e" : "#222";
    el.textContent = "SunsetUploader: " + text;
  } catch (e) { /* cosmetic only, never fatal */ }
}

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

// FIX: Instagram renamed this field's aria-label from "Write a caption..."
// to "Add a caption..." at some point — confirmed from a live DOM dump
// (the old hardcoded selector matched neither "found" nor fired a useful
// error, it just polled until timeout). Tries both current and legacy
// labels so a future rename back (or an A/B test) doesn't silently break
// this again the same way. Add any newly-observed label to this list if
// it breaks a third time.
const CAPTION_BOX_LABELS = ["Add a caption...", "Write a caption..."];

function findCaptionBox() {
  for (const label of CAPTION_BOX_LABELS) {
    const el = document.querySelector(`[aria-label="${label}"][contenteditable="true"]`);
    if (el) return el;
  }
  return null;
}

// Same proven pattern as tiktok.js — polls the caption box's actual text
// until it stops changing for a full stableWindowMs, instead of guessing
// a fixed delay is long enough for PAG to finish typing.
async function waitForCaptionToStabilize(stableWindowMs = 1500, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastText = null;
  let lastChangeTime = Date.now();

  while (Date.now() < deadline) {
    const box = findCaptionBox();
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

// ---- Create -> Post -------------------------------------------------------

let baselineTexts = new Set();

function normText(el) {
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

// Short pieces of text currently on the page. Taken before the first click so
// that, if the Post option can't be found, the error can list exactly what
// appeared after clicking Create (i.e. what Instagram is calling things now).
function snapshotTexts() {
  const out = new Set();
  document.querySelectorAll("span").forEach((el) => {
    const t = normText(el);
    if (t && t.length <= 30) out.add(t);
  });
  return out;
}

function newTextsSinceBaseline() {
  const now = snapshotTexts();
  return [...now].filter((t) => !baselineTexts.has(t)).slice(0, 12);
}

function findCreateButton() {
  const svg = document.querySelector('svg[aria-label="New post"]');
  return svg ? (svg.closest('[aria-selected]') || svg) : null;
}

function findPostOption() {
  const els = document.querySelectorAll('span, [role="menuitem"], [role="button"], a');
  for (const el of els) {
    if (normText(el).toLowerCase() === "post") return el;
  }
  return null;
}

// An element that is actually rendered (not display:none / detached).
function isShown(el) {
  return !!el && el.getClientRects().length > 0;
}

// True once the file picker is on screen. The real signal is the "Select from
// computer" button itself, so this doesn't depend on how Instagram wraps the
// modal (role="dialog" or not). On some accounts clicking Create goes straight
// to this; on others it shows a menu with "Post" first.
function isCreateDialogOpen() {
  if (findSelectFromComputer()) return true;
  const d = document.querySelector('div[role="dialog"]');
  return !!d && /create new post|drag photos and videos/i.test(d.textContent || "");
}

async function waitFor(check, timeoutMs, pollMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = check();
    if (v) return v;
    await sleep(pollMs);
  }
  return null;
}

// Opens the Create menu and chooses Post, retrying if a click gets lost.
// A click that lands before the page is fully ready does nothing, which used
// to leave this waiting 30s for a menu that never opened. Now: click Create,
// give the menu a few seconds, and if it never shows, try again. Also handles
// Create opening the dialog directly (no Post step).
async function openCreateAndChoosePost(totalTimeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < totalTimeoutMs) {
    if (isCreateDialogOpen()) return "dialog";

    let post = findPostOption();
    if (!post) {
      const create = findCreateButton();
      if (!create) { await sleep(300); continue; }
      console.log("  clicking Create");
      showStatus("clicking Create…");
      create.click();
      post = await waitFor(() => (isCreateDialogOpen() ? "dialog" : findPostOption()), 3500);
      if (post === "dialog") return "dialog";
    }

    if (post) {
      console.log("  clicking Post option");
      showStatus("choosing Post from the menu…");
      post.click();
      if (await waitFor(isCreateDialogOpen, 5000)) return "post";
      console.log("  dialog didn't open after clicking Post — trying again");
    }
  }
  const seen = newTextsSinceBaseline();
  throw `Timeout waiting for: "Post (menu option)". New text on screen after clicking Create: ` +
        (seen.length ? seen.join(" | ") : "(nothing new appeared)");
}

function findSelectFromComputer() {
  const els = document.querySelectorAll('button, [role="button"]');
  for (const el of els) {
    if (normText(el).toLowerCase() === "select from computer" && isShown(el)) return el;
  }
  return null;
}

async function focusSelectFromComputer(timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const btn = findSelectFromComputer();
    if (btn) {
      btn.focus();
      // Modals often move focus around right after they open, so confirm it
      // STAYED on the button before telling Python to press Enter.
      await sleep(350);
      if (document.activeElement === btn) return true;
      console.log("  focus moved away from 'Select from computer' — refocusing");
    }
    await sleep(250);
  }
  return false;
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
      const box = findCaptionBox();

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