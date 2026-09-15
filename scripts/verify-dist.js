// scripts/verify-dist.js
//
// Wired in as "postdist" so npm runs this automatically right after
// electron-builder finishes. Exactly one job: make sure the installer
// that just got built actually contains resources/python/python.exe.
// This is the check that would have caught the broken installer before
// it ever reached a real user — from here on, a build that fails this
// check is a build you never upload.

const fs = require("fs");
const path = require("path");

// electron-builder's default output dir is "dist". If you've set
// "directories.output" in package.json to something else, update this.
const OUTPUT_DIR = path.join(__dirname, "..", "dist");

function findPythonExe(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findPythonExe(full);
      if (found) return found;
    } else if (
      entry.name === "python.exe" &&
      full.split(path.sep).includes("resources")
    ) {
      return full;
    }
  }
  return null;
}

const found = findPythonExe(OUTPUT_DIR);

if (!found) {
  console.error(
    `\n❌ VERIFICATION FAILED — no resources/python/python.exe found anywhere under "${OUTPUT_DIR}".\n` +
      "This installer would NOT work for a real user. Do not upload it.\n" +
      "Check that scripts/ensure-python.js ran successfully above, and that python/ is populated.\n"
  );
  process.exit(1);
}

console.log(`[verify-dist] Confirmed present: ${found}`);
console.log("[verify-dist] Safe to upload.");