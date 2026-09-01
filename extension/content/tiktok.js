console.log("SunsetUploader: TikTok content script loaded");

let uploadStarted = false;

chrome.runtime.sendMessage({
  type: "DOM_READY_TT",
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TT_UPLOAD") {
    if (uploadStarted) {
      console.log("SunsetUploader: TikTok upload already started");
      return;
    }

    uploadStarted = true;
    startTikTokUpload();
  }

  if (message.type === "START_TT_POST") {
    clickTikTokPost();
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(element) {
  return (
    element &&
    element.offsetParent !== null &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

async function startTikTokUpload() {
  console.log("SunsetUploader: waiting for Select Video button...");

  const deadline = Date.now() + 60000;

  while (Date.now() < deadline) {
    const button = document.querySelector(
      '[data-e2e="select_video_button"]'
    );

    if (button && isVisible(button)) {
      console.log("SunsetUploader: Select Video button found");

      button.scrollIntoView({
        block: "center",
        inline: "center",
      });

      await sleep(250);

      button.click();

      console.log("SunsetUploader: Select Video clicked");

      chrome.runtime.sendMessage({
        type: "TT_FILE_PICKER_OPENED",
      });

      return;
    }

    await sleep(200);
  }

  console.error(
    "SunsetUploader: Select Video button was never found"
  );

  uploadStarted = false;
}

async function waitForCaptionToStabilize(
  stableWindowMs = 1500,
  timeoutMs = 30000
) {
  console.log("Waiting for caption to fully finish typing...");

  const deadline = Date.now() + timeoutMs;
  let lastText = null;
  let lastChangeTime = Date.now();

  while (Date.now() < deadline) {
    const box = document.querySelector(
      '[contenteditable="true"]'
    );

    const currentText = box?.innerText?.trim() || "";

    if (currentText !== lastText) {
      lastText = currentText;
      lastChangeTime = Date.now();
    }

    if (
      currentText.length > 0 &&
      Date.now() - lastChangeTime >= stableWindowMs
    ) {
      console.log("Caption stabilized:", currentText);
      return true;
    }

    await sleep(300);
  }

  console.warn("Caption never stabilized.");
  return false;
}

async function clickTikTokPost() {
  await waitForCaptionToStabilize();

  console.log("Looking for Post button...");

  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    const postBtn = document.querySelector(
      '[data-e2e="post_video_button"]'
    );

    if (
      postBtn &&
      isVisible(postBtn) &&
      postBtn.getAttribute("aria-disabled") !== "true"
    ) {
      postBtn.scrollIntoView({
        block: "center",
        inline: "center",
      });

      await sleep(200);

      postBtn.click();

      console.log("Post button clicked.");

      await sleep(2000);

      const errorDismissed =
        await dismissErrorIfPresent();

      if (errorDismissed) {
        console.log("Error dismissed, retrying post...");
        await sleep(1000);
        continue;
      }

      await handleContentCheckModal();

      uploadStarted = false;
      return true;
    }

    await sleep(500);
  }

  console.error("Post button never became ready.");
  uploadStarted = false;
  return false;
}

async function dismissErrorIfPresent() {
  const buttons = document.querySelectorAll("button");

  for (const btn of buttons) {
    const label =
      btn.querySelector(".TUXButton-label")?.innerText?.trim() ||
      btn.innerText?.trim();

    if (
      label === "Try again" ||
      label === "Retry" ||
      label === "OK"
    ) {
      console.log(`Error dialog found: "${label}"`);

      btn.click();

      await sleep(800);

      return true;
    }
  }

  return false;
}

async function handleContentCheckModal() {
  console.log("Checking for content-check modal...");

  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const buttons = document.querySelectorAll("button");

    for (const btn of buttons) {
      const label =
        btn.querySelector(".TUXButton-label")?.innerText?.trim();

      if (label === "Post now") {
        console.log("Clicking Post now.");

        btn.click();

        return true;
      }
    }

    await sleep(400);
  }

  console.log("No content-check modal appeared.");
  return false;
}