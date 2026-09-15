// scripts/ensure-python.js
//
// Wired in as "predist" so npm runs this automatically before every
// `npm run dist` — regardless of which desktop you're building from.
// If python/python.exe is already there (your home desktop), it does
// nothing and the build is instant, same as before. If it's missing
// (any other machine), it pulls the known-good bundle from R2 first,
// so electron-builder's extraFiles step always has something real to
// copy. This is what closes the "works on my machine" gap for good.
//
// One-time setup: paste your R2 public URL into BUNDLE_URL below.

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const PYTHON_DIR = path.join(__dirname, "..", "python");
const MARKER_FILE = path.join(PYTHON_DIR, "python.exe");
const ZIP_PATH = path.join(__dirname, "..", ".python-bundle.zip");

// <-- PASTE YOUR R2 PUBLIC URL HERE (or set PYTHON_BUNDLE_URL as an env var
//     if you'd rather not hardcode it).
const BUNDLE_URL =
  process.env.PYTHON_BUNDLE_URL ||
  "https://pub-43d67fd31663489299bd1b6ceecde0d0.r2.dev/python-bundle.zip";

function alreadyPresent() {
  return fs.existsSync(MARKER_FILE);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        // Follow one redirect — some presigned/public URLs 302 once.
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function main() {
  if (alreadyPresent()) {
    console.log(
      "[ensure-python] python/python.exe already present — skipping download."
    );
    return;
  }

  if (BUNDLE_URL.includes("REPLACE-ME")) {
    throw new Error(
      "[ensure-python] python/ is missing on this machine AND no BUNDLE_URL is configured yet. " +
        "Paste your R2 public URL into scripts/ensure-python.js (BUNDLE_URL) first."
    );
  }

  console.log(
    `[ensure-python] python/ missing or incomplete on this machine. Fetching bundle from R2...`
  );
  await download(BUNDLE_URL, ZIP_PATH);

  console.log("[ensure-python] Extracting...");
  fs.mkdirSync(PYTHON_DIR, { recursive: true });
  // Windows 10 (1803+) ships bsdtar as `tar`, which handles .zip fine —
  // no extra npm dependency needed for this.
  execFileSync("tar", ["-xf", ZIP_PATH, "-C", PYTHON_DIR], {
    stdio: "inherit",
  });

  fs.unlinkSync(ZIP_PATH);

  if (!alreadyPresent()) {
    throw new Error(
      "[ensure-python] Extraction finished but python.exe still isn't there — " +
        "check that python-bundle.zip's internal structure puts python.exe at its root, " +
        "not nested inside an extra folder."
    );
  }

  console.log("[ensure-python] Done — python/python.exe is in place.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});