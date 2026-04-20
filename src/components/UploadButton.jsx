import { useState } from "react";
import { getUploadUrl, uploadFileToR2 } from "../services/api";
import "../css/UploadButton.css";

export default function UploadButton({ video, caption, platforms, setLogs }) {
  const [isRunning, setIsRunning] = useState(false);

  const log = (msg) => setLogs((prev) => [...prev, msg]);

  const openNativeFilePicker = async () => {
    alert("If the app can't resolve the full path, re-drop the file or restart the app.");
  };

  const handleUpload = async () => {
    if (!video || !caption || platforms.length === 0) {
      alert("Please select a video, write a caption, and choose platforms.");
      return;
    }

    let videoPath = video.path || video.fullPath || null;
    const looksRelative = (p) =>
      !p || (!p.includes("/") && !p.includes("\\") && !p.includes(":"));

    if (looksRelative(videoPath) && window.electronAPI?.getFilePath) {
      try {
        const resolved = await window.electronAPI.getFilePath(
          video.name || video.file?.name
        );
        if (resolved) videoPath = resolved;
      } catch (err) {
        console.error("Error calling getFilePath:", err);
      }
    }

    if (!videoPath) {
      await openNativeFilePicker();
      return;
    }

    console.log("Video path:", videoPath);
    setLogs([]);
    setIsRunning(true);

    if (window.electronAPI) {
      window.electronAPI.onPythonLog((line) => log(line));

      const hasNewAPI =
        typeof window.electronAPI.openPlatformWindow === "function";

      if (window.electronAPI) {
          window.electronAPI.onPythonLog((line) => log(line));

          try {
            const platformArgs =
              platforms.length > 0 ? ["--platforms", ...platforms] : [];
            await window.electronAPI.runPythonUploader([
              "--caption", caption,
              "--video", videoPath,
              ...platformArgs,
            ]);
          } catch (err) {
            log(`Error: ${err.message || err}`);
          } finally {
            setIsRunning(false);
          }
          return;
        }
        else {
        try {
          const platformArgs =
            platforms.length > 0 ? ["--platforms", ...platforms] : [];
          await window.electronAPI.runPythonUploader([
            "--caption", caption,
            "--video", videoPath,
            ...platformArgs,
          ]);
        } catch (err) {
          log(`Error: ${err.message || err}`);
        } finally {
          setIsRunning(false);
        }
      }
      return;
    }

    // Web workflow
    try {
      log("Requesting upload URL...");
      const { upload_url, public_url } = await getUploadUrl(video.name);
      log("Uploading to R2...");
      await uploadFileToR2(upload_url, video);
      log(`Upload successful! File accessible at: ${public_url}`);
    } catch (err) {
      log(`Error: ${err.message || err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (window.electronAPI) {
      const msg = await window.electronAPI.stopPythonUploader();
      log(msg);
    }
    setIsRunning(false);
  };

  return (
    <div className="upload-button-container">
      {!isRunning ? (
        <button className="upload-button" onClick={handleUpload}>
          Start Upload
        </button>
      ) : (
        <button className="stop-button" onClick={handleStop}>
          Stop Upload
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube hybrid
// DOM: Create, Upload videos, details page, title, not for kids,
//      Next x3, Public, Publish
// PAG: file selection only
// ─────────────────────────────────────────────────────────────────────────────

async function runYouTubeHybrid(videoPath, caption, log) {
  const api = window.electronAPI;

  log("Opening YouTube Studio...");
  const windowId = await api.openPlatformWindow(
    "youtube",
    "https://studio.youtube.com"
  );
  log(`Window opened (id: ${windowId})`);

  log("Waiting for page to load...");
  await api.waitForPlatformLoad(windowId);
  await new Promise(r => setTimeout(r, 2000)); // YT Studio hydrates slowly
  log("Page loaded.");

  // ── DOM: Click Create ─────────────────────────────────────────────────────
  log("DOM: Clicking Create...");
  const createResult = await api.injectJS(windowId, `
    new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const els = document.querySelectorAll('button, tp-yt-paper-item, yt-icon-button');
        for (const el of els) {
          const label = el.innerText || el.getAttribute('aria-label') || el.getAttribute('title');
          if (label?.trim() === 'Create') {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && !el.disabled && el.offsetParent !== null) {
              el.scrollIntoView({ block: 'center' });
              el.click();
              clearInterval(iv);
              resolve({ ok: true });
              return;
            }
          }
        }
        if (Date.now() - start > 20000) { clearInterval(iv); resolve({ ok: false, error: 'Create not found' }); }
      }, 300);
    })
  `);
  if (!createResult?.ok) { log(`DOM: Create failed. Aborting.`); await api.closePlatformWindow(windowId); throw new Error("YT Create not found"); }
  log("DOM: Create clicked.");
  await new Promise(r => setTimeout(r, 800));

  // ── DOM: Click Upload videos ──────────────────────────────────────────────
  log("DOM: Clicking Upload videos...");
  await clickYTText(api, windowId, "Upload videos", 15000, log);
  log("DOM: Upload videos clicked.");
  await new Promise(r => setTimeout(r, 1000));

  // ── PAG: Select file ──────────────────────────────────────────────────────
  log("PAG: Selecting file...");
  try {
    await api.runPythonUploader([
      "--mode", "file-select-only",
      "--platforms", "youtube",
      "--video", videoPath,
      "--caption", caption,
    ]);
  } catch (err) {
    log(`PAG file selection failed: ${err}`);
    await api.closePlatformWindow(windowId);
    throw new Error("YouTube file selection failed");
  }
  log("PAG: File selected.");

  // ── DOM: Wait for details page then fill title ────────────────────────────
  log("DOM: Waiting for details page...");
  const titleSafe = JSON.stringify(caption);
  const detailsResult = await api.injectJS(windowId, `
    new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const boxes = document.querySelectorAll('#textbox');
        if (boxes.length >= 2) {
          clearInterval(iv);
          boxes[0].focus();
          boxes[0].innerText = ${titleSafe};
          boxes[0].dispatchEvent(new Event('input', { bubbles: true }));
          resolve({ ok: true });
        }
        if (Date.now() - start > 60000) { clearInterval(iv); resolve({ ok: false }); }
      }, 500);
    })
  `);
  if (detailsResult?.ok) { log("DOM: Title set."); } else { log("DOM: Title timeout — continuing anyway."); }
  await new Promise(r => setTimeout(r, 500));

  // ── DOM: Set Not for kids ─────────────────────────────────────────────────
  log("DOM: Setting Not for kids...");
  await api.injectJS(windowId, `
    new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const radios = document.querySelectorAll('tp-yt-paper-radio-button');
        for (const r of radios) {
          if (r.innerText?.toLowerCase().includes('not made for kids')) {
            r.click();
            clearInterval(iv);
            resolve({ ok: true });
            return;
          }
        }
        if (Date.now() - start > 20000) { clearInterval(iv); resolve({ ok: false }); }
      }, 400);
    })
  `);
  log("DOM: Not for kids set.");
  await new Promise(r => setTimeout(r, 500));

  // ── DOM: Click Next x3 ───────────────────────────────────────────────────
  for (let i = 1; i <= 3; i++) {
    log(`DOM: Clicking Next (${i}/3)...`);
    await clickYTText(api, windowId, "Next", 20000, log);
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── DOM: Set Public ───────────────────────────────────────────────────────
  log("DOM: Setting Public...");
  await api.injectJS(windowId, `
    new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const radios = document.querySelectorAll('tp-yt-paper-radio-button');
        for (const r of radios) {
          if (r.innerText?.includes('Public')) {
            r.click();
            clearInterval(iv);
            resolve({ ok: true });
            return;
          }
        }
        if (Date.now() - start > 20000) { clearInterval(iv); resolve({ ok: false }); }
      }, 400);
    })
  `);
  log("DOM: Public set.");
  await new Promise(r => setTimeout(r, 500));

  // ── DOM: Click Publish ────────────────────────────────────────────────────
  log("DOM: Clicking Publish...");
  await clickYTText(api, windowId, "Publish", 20000, log);
  log("DOM: Publish clicked. YouTube upload complete!");

  await new Promise(r => setTimeout(r, 4000));
  await api.closePlatformWindow(windowId);
  log("YouTube window closed.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — click by text in YT window (buttons, paper-items, yt-icon-buttons)
// ─────────────────────────────────────────────────────────────────────────────

async function clickYTText(api, windowId, text, timeout = 20000, log) {
  const result = await api.injectJS(windowId, `
    new Promise((resolve) => {
      const target = ${JSON.stringify(text)};
      const start = Date.now();
      const iv = setInterval(() => {
        const els = document.querySelectorAll('button, tp-yt-paper-item, yt-icon-button');
        for (const el of els) {
          const label = el.innerText || el.getAttribute('aria-label') || el.getAttribute('title');
          if (label?.trim() === target) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && !el.disabled && el.offsetParent !== null) {
              el.scrollIntoView({ block: 'center' });
              el.click();
              clearInterval(iv);
              resolve({ ok: true });
              return;
            }
          }
        }
        if (Date.now() - start > ${timeout}) {
          clearInterval(iv);
          resolve({ ok: false, error: target + ' not found' });
        }
      }, 300);
    })
  `);
  if (!result?.ok) log(`DOM: "${text}" not found — ${result?.error}`);
  return result?.ok === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// TikTok hybrid (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

async function runTikTokHybrid(videoPath, caption, log) {
  const api = window.electronAPI;
  log("Opening TikTok upload page...");
  const windowId = await api.openPlatformWindow("tiktok", "https://www.tiktok.com/upload");
  log(`Window opened (id: ${windowId})`);
  log("Waiting for page to load...");
  await api.waitForPlatformLoad(windowId);
  log("Page loaded.");
  log("PAG: Selecting file...");
  try {
    await api.runPythonUploader(["--mode", "file-select-only", "--platforms", "tiktok", "--video", videoPath, "--caption", caption]);
  } catch (err) {
    log(`PAG file selection failed: ${err}`);
    await api.closePlatformWindow(windowId);
    throw new Error("File selection failed");
  }
  log("PAG: File selected.");
  log("Waiting for TikTok editor...");
  const editorReady = await api.injectJS(windowId, `
    new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const el = document.querySelector('[contenteditable="true"]') || document.querySelector('video');
        if (el) { clearInterval(iv); resolve(true); }
        if (Date.now() - start > 60000) { clearInterval(iv); reject('timeout'); }
      }, 500);
    })
  `);
  if (!editorReady?.ok) {
    await runPAGCaptionAndPost(videoPath, caption, false, false, log);
    await api.closePlatformWindow(windowId);
    return;
  }
  log("Editor ready.");
  const captionSafe = JSON.stringify(caption);
  const captionResult = await api.injectJS(windowId, `
    (async () => {
      const caption = ${captionSafe};
      const getBox = () => { const boxes = document.querySelectorAll('[contenteditable="true"]'); for (const b of boxes) { if (b.offsetParent !== null) return b; } return null; };
      let box = null;
      for (let i = 0; i < 20; i++) { box = getBox(); if (box) break; await new Promise(r => setTimeout(r, 300)); }
      if (!box) return { ok: false, error: 'Caption box not found' };
      box.focus(); box.click();
      box.innerText = '';
      box.dispatchEvent(new Event('input', { bubbles: true }));
      const range = document.createRange(); range.selectNodeContents(box); range.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      for (const char of caption) {
        box.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        box.innerText += char;
        box.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
        box.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        await new Promise(r => setTimeout(r, 35));
      }
      box.blur(); await new Promise(r => setTimeout(r, 800));
      return { ok: true };
    })()
  `);
  const domCaptionOk = captionResult?.ok === true;
  log(domCaptionOk ? "DOM: Caption injected." : `DOM: Caption failed. PAG will handle.`);
  const postResult = await api.injectJS(windowId, `
    new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.innerText?.toLowerCase() || '';
          const aria = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const skip = text.includes('exit') || text.includes('discard') || text.includes('leave') || text.includes('cancel');
          const isPost = text === 'post' || aria === 'post' || btn.dataset?.e2e === 'post-button';
          const clickable = btn.offsetParent !== null && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';
          if (isPost && !skip && clickable) { btn.scrollIntoView({ block: 'center' }); btn.click(); clearInterval(iv); resolve({ ok: true }); return; }
        }
        if (Date.now() - start > 15000) { clearInterval(iv); resolve({ ok: false, error: 'Post button not found' }); }
      }, 400);
    })
  `);
  const domPostOk = postResult?.ok === true;
  log(domPostOk ? "DOM: Post clicked." : "DOM: Post failed. PAG will handle.");
  if (!domCaptionOk || !domPostOk) await runPAGCaptionAndPost(videoPath, caption, domCaptionOk, domPostOk, log);
  await new Promise(r => setTimeout(r, 3000));
  await api.closePlatformWindow(windowId);
  log("TikTok window closed.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Instagram hybrid (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

async function runInstagramHybrid(videoPath, caption, log) {
  const api = window.electronAPI;
  log("Opening Instagram...");
  const windowId = await api.openPlatformWindow("instagram", "https://www.instagram.com");
  await api.waitForPlatformLoad(windowId);
  log("Page loaded.");
  log("DOM: Clicking Create...");
  const createResult = await api.injectJS(windowId, `new Promise((resolve) => { const start = Date.now(); const iv = setInterval(() => { const els = document.querySelectorAll('div, span, button'); for (const el of els) { if (el.innerText?.trim().toLowerCase() === 'create' && el.offsetParent !== null) { el.click(); clearInterval(iv); resolve({ ok: true }); return; } } if (Date.now() - start > 15000) { clearInterval(iv); resolve({ ok: false }); } }, 300); })`);
  if (!createResult?.ok) { await api.closePlatformWindow(windowId); throw new Error("Instagram Create not found"); }
  await new Promise(r => setTimeout(r, 800));
  log("DOM: Clicking Post...");
  await api.injectJS(windowId, `new Promise((resolve) => { const start = Date.now(); const iv = setInterval(() => { const els = document.querySelectorAll('div, span, button'); for (const el of els) { if (el.innerText?.trim().toLowerCase() === 'post' && el.offsetParent !== null) { el.click(); clearInterval(iv); resolve({ ok: true }); return; } } if (Date.now() - start > 10000) { clearInterval(iv); resolve({ ok: false }); } }, 300); })`);
  await new Promise(r => setTimeout(r, 800));
  log("PAG: Selecting file...");
  await api.runPythonUploader(["--mode", "file-select-only", "--platforms", "instagram", "--video", videoPath, "--caption", caption]);
  log("PAG: File selected.");
  await clickIGText(api, windowId, "next", 30000, log);
  await new Promise(r => setTimeout(r, 800));
  await clickIGText(api, windowId, "next", 15000, log);
  await new Promise(r => setTimeout(r, 800));
  log("PAG: Writing caption...");
  await api.runPythonUploader(["--mode", "pag-fallback", "--platforms", "instagram", "--video", videoPath, "--caption", caption, "--dom-caption", "0", "--dom-post", "1"]);
  await new Promise(r => setTimeout(r, 600));
  log("DOM: Clicking Share...");
  await clickIGText(api, windowId, "share", 20000, log);
  log("Instagram upload complete!");
  await new Promise(r => setTimeout(r, 3000));
  await api.closePlatformWindow(windowId);
  log("Instagram window closed.");
}

async function clickIGText(api, windowId, text, timeout, log) {
  const result = await api.injectJS(windowId, `new Promise((resolve) => { const target = ${JSON.stringify(text)}; const start = Date.now(); const iv = setInterval(() => { const els = document.querySelectorAll('div, span, button'); for (const el of els) { if (el.innerText?.trim().toLowerCase() === target && el.offsetParent !== null) { el.click(); clearInterval(iv); resolve({ ok: true }); return; } } if (Date.now() - start > ${timeout}) { clearInterval(iv); resolve({ ok: false }); } }, 300); })`);
  if (!result?.ok) log(`DOM: "${text}" not found`);
  return result?.ok === true;
}

async function runPAGCaptionAndPost(videoPath, caption, domCaptionOk, domPostOk, log) {
  try {
    await window.electronAPI.runPythonUploader(["--mode", "pag-fallback", "--platforms", "tiktok", "--video", videoPath, "--caption", caption, "--dom-caption", domCaptionOk ? "1" : "0", "--dom-post", domPostOk ? "1" : "0"]);
    log("PAG fallback complete.");
  } catch (err) {
    log(`PAG fallback error: ${err}`);
  }
}

async function runLegacyPAG(platforms, videoPath, caption, log) {
  await window.electronAPI.runPythonUploader(["--caption", caption, "--video", videoPath, "--platforms", ...platforms]);
}