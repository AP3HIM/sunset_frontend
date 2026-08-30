# upload_tiktok_electron.py
#
# Post is handled entirely by the Chrome extension (tiktok.js), auto-
# triggered by background.js ~24s after any tiktok.com page load — that
# happens independently of this file, outside Python entirely. This file
# only handles what the extension can't: selecting the video file (needs a
# trusted OS-level click to open the native file dialog) and typing the
# caption. Tiered click strategy for those two:
#   Tier 1 — Multi-scale OpenCV image match. Resolution-tolerant.
#   Tier 1.5 — This machine's saved calibration point (see calibration.py).
#              The guaranteed backup — set up once per machine.
#   Tier 3 — Blind coordinate box. Last resort, kept so this never
#            regresses below the original behavior.
#
# `session`/`cdp_bridge` below are dead code from an earlier CDP-based
# approach that got blocked by Chrome's own security policy on this
# project's machines — session is always None in current usage (upload.py
# never passes one), so those tiers always no-op safely. Left in place
# rather than ripped out mid-project; harmless either way.

import os
import time
import random
import json
import pyautogui
import pyperclip

import cdp_bridge as bridge
import calibration

try:
    import cv2
    import numpy as np
    import mss
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# -------------------
# Paths
# -------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, '../images')

SIGNALS_DIR = os.path.join(os.path.expanduser("~"), "sunsetuploader", "signals")
os.makedirs(SIGNALS_DIR, exist_ok=True)


def _log(*args):
    print("[TikTok-UPLOAD]", *args)


# -------------------
# Legacy fallback config (Tier 3 — unchanged from before, kept as safety net)
# -------------------
SELECT_VIDEO_BOX = ((397, 325), (1827, 853))
CAPTION_FALLBACK = [
    (881, 641), (885, 645), (877, 637), (890, 641),
    (875, 643), (881, 635), (880, 648), (888, 638), (873, 646)
]


# -------------------
# Utilities
# -------------------

def write_tiktok_ready_signal(caption, video_file):
    payload = {
        "platform": "tiktok",
        "caption": caption,
        "video": video_file,
        "status": "READY",
        "timestamp": time.time(),
    }
    signal_path = os.path.join(SIGNALS_DIR, "tiktok_ready.json")
    with open(signal_path, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    _log("Ready signal written.")


def click_random_in_box(upper_left, bottom_right):
    x = random.randint(upper_left[0], bottom_right[0])
    y = random.randint(upper_left[1], bottom_right[1])
    pyautogui.click(x, y)
    return x, y


def locate_multiscale(image_name, confidence=0.75, scales=None):
    """Tier 1: scale-tolerant template match. Fixes the actual root cause of
    your image-match failures — your reference images were captured at one
    laptop's resolution/DPI and pyautogui does literal pixel matching, so it
    silently fails on any other screen. This tries a range of scale factors."""
    if not HAS_CV2:
        _log("cv2 not available, skipping multiscale match")
        return None

    img_path = os.path.join(IMAGES_DIR, image_name)
    if not os.path.exists(img_path):
        _log(f"reference image missing: {img_path}")
        return None

    template = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if template is None:
        return None

    scales = scales or [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5]

    with mss.mss() as sct:
        screen = np.array(sct.grab(sct.monitors[1]))
    screen_gray = cv2.cvtColor(screen, cv2.COLOR_BGRA2GRAY)

    best = None
    for scale in scales:
        resized = cv2.resize(template, None, fx=scale, fy=scale)
        th, tw = resized.shape
        if th > screen_gray.shape[0] or tw > screen_gray.shape[1]:
            continue
        result = cv2.matchTemplate(screen_gray, resized, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)
        if max_val >= confidence and (best is None or max_val > best[0]):
            cx = max_loc[0] + tw // 2
            cy = max_loc[1] + th // 2
            best = (max_val, cx, cy, scale)

    if best:
        _log(f"multiscale match '{image_name}' scale={best[3]} confidence={best[0]:.2f}")
        return (best[1], best[2])
    return None


def verified_tab_to(session, target_text, max_tabs=12):
    """Tier 2: press Tab via the bridge, read back activeElement after each
    press, stop when it matches target_text. Deterministic, not a blind
    coordinate guess."""
    if not session:
        return False
    target = target_text.lower()
    for i in range(max_tabs):
        bridge.press_key(session, "Tab")
        time.sleep(0.15)
        info = bridge.active_element(session)
        if not info:
            continue
        combined = f"{info.get('text','')} {info.get('aria','')}".lower()
        if target in combined:
            _log(f"Tab-nav landed on target after {i+1} presses: {info}")
            return True
    _log(f"Tab-nav could not find '{target_text}' within {max_tabs} presses")
    return False


def click_target(session, text, image_name=None, legacy_fallback=None, legacy_label="",
                  calibration_action=None):
    """Runs the full tier chain for one click action. Returns True/False.

    calibration_action: key to look up in this machine's recorded click
    calibration (see calibration.py), e.g. 'select_video', 'caption', 'post'.
    If this machine has a recorded point for it, that's tried before falling
    all the way back to the blind random-box guess.
    """
    # With CDP, "reachable" just means we have a live session — there's no
    # separate server to ping like the old HTTP bridge had.
    bridge_up = session is not None

    # Tier 0: bridge click-by-text
    if bridge_up:
        if bridge.click_text(session, text):
            return True

    # Tier 1: multiscale image match
    if image_name:
        loc = locate_multiscale(image_name)
        if loc:
            pyautogui.click(loc)
            _log(f"clicked via multiscale image match: {image_name}")
            return True

    # Tier 1.5: this machine's own recorded calibration point, if any —
    # more reliable than a blind box guess because it's the real spot on
    # this real screen, captured by a human once.
    if calibration_action:
        point = calibration.get_point("tiktok", calibration_action)
        if point:
            pyautogui.click(point)
            _log(f"clicked via saved calibration point for '{calibration_action}': {point}")
            return True

    # Tier 2: verified tab navigation (also needs the bridge)
    if bridge_up and verified_tab_to(session, text):
        bridge.press_key(session, "Enter")
        return True

    # Tier 3: legacy coordinate fallback
    if legacy_fallback:
        _log(f"falling back to legacy coordinates for '{legacy_label or text}' — "
             f"this is the fragile path, expect it to be wrong on non-dev machines. "
             f"Run 'python calibration.py tiktok {calibration_action or text}' once on this "
             f"machine to fix this permanently.")
        legacy_fallback()
        return True

    return False


def _dialog_still_open():
    """True if the native file-open dialog still appears to be showing.
    Wrapped defensively — a broken pyautogui/pyscreeze/Pillow install should
    never crash the whole upload over an optional verification check."""
    try:
        if HAS_CV2:
            return locate_multiscale("select_file.png") is not None
        return pyautogui.locateOnScreen(
            os.path.join(IMAGES_DIR, "select_file.png"), confidence=0.75
        ) is not None
    except Exception as e:
        _log(f"dialog-open check failed ({e}) — assuming dialog is closed and continuing")
        return False


def paste_file_path(video_file):
    """Native OS file dialog — already resolution-independent, unchanged."""
    pyperclip.copy(video_file)
    for attempt in range(3):
        pyautogui.hotkey("ctrl", "v")
        time.sleep(2)
        pyautogui.press("enter")
        time.sleep(0.8)
        if not _dialog_still_open():
            _log("File path pasted successfully.")
            return True
        _log(f"Retry {attempt+1}: File dialog still open, trying again.")
    _log("Failed to close file dialog after pasting path.")
    return False


def _click_first_caption_fallback():
    x, y = CAPTION_FALLBACK[0]
    pyautogui.click(x, y)


def write_caption(session, caption):
    # Primary approach: once the upload page loads, a single Tab press
    # lands focus directly on the caption box — confirmed reliable, no
    # click, no image, no calibration needed. Real OS-level keypress via
    # PAG, same trust category as physical keyboard input.
    _log("Tab to reach caption box...")
    pyautogui.press('tab')
    time.sleep(0.3)

    pyautogui.hotkey('ctrl', 'a')
    pyautogui.press('backspace')
    pyautogui.write(caption, interval=0.05)
    time.sleep(2.0)
    _log("Caption entered.")
    return True


def write_caption_legacy_click_based(session, caption):
    """
    Kept as a manual fallback, not part of the default flow anymore — the
    Tab-based approach above is simpler and doesn't depend on image/
    calibration data existing at all. If Tab-to-caption is ever found
    unreliable (e.g. TikTok changes tab order), this is what to swap back
    to in write_caption() above.
    """
    ok = False
    if session is not None:
        ok = bridge.click_selector(
            session, ".public-DraftEditor-content[contenteditable='true']"
        )

    # Fall through to the normal tier chain (image match / verified tab /
    # legacy coords) if the selector-based click didn't work — TikTok could
    # change this class name in a future redesign.
    if not ok:
        ok = click_target(
            session,
            text="caption",
            image_name="caption_box.png",
            legacy_fallback=_click_first_caption_fallback,
            legacy_label="caption box",
            calibration_action="caption",
        )

    if not ok:
        _log("Failed to reach caption box through any tier.")
        return False

    time.sleep(0.4)
    pyautogui.hotkey('ctrl', 'a')
    pyautogui.press('backspace')
    pyautogui.write(caption, interval=0.05)
    time.sleep(2.0)
    _log("Caption entered.")
    return True

def select_file_only(video_path, paste_path_and_confirm):
    """
    Electron already opened TikTok and clicked the file input.

    The Electron/Chromium native Windows file picker is now active.
    Do NOT open Chrome.
    Do NOT navigate to TikTok.
    Do NOT click TikTok coordinates.

    Only type the video path into the currently active native file dialog
    and press Enter/Open.
    """

    if not video_path:
        raise ValueError("No video path provided")

    video_path = os.path.abspath(video_path)

    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video file does not exist: {video_path}")

    print(f"TIKTOK ELECTRON: selecting file in active Electron dialog")
    print(f"TIKTOK ELECTRON: {video_path}", flush=True)

    # Give Electron's native Windows file picker a moment to become active.
    time.sleep(0.8)

    # This MUST only interact with the currently active Windows file picker.
    # It does not launch Chrome.
    paste_path_and_confirm(video_path)

    print("TIKTOK ELECTRON: file path submitted", flush=True)


# -------------------
# Main Upload Logic
# -------------------

def upload(caption, video_file, paste_path_func=None, session=None):
    """
    NOTE on argument order: paste_path_func stays 3rd positional to match
    the calling convention used for every platform in upload.py
    (platform.upload(caption, video, paste_path_and_confirm)). session
    is keyword-only-by-convention with a safe None default, so callers that
    don't pass it (like your current upload.py) never break — they just
    don't get Tier 0 yet.
    """
    _log("Starting TikTok upload process...")
    time.sleep(8)

    _log("Looking for 'Select video' button...")
    found = click_target(
        session,
        text="select video",
        image_name="select_file.png",
        legacy_fallback=lambda: click_random_in_box(*SELECT_VIDEO_BOX),
        legacy_label="select video box",
        calibration_action="select_video",
    )
    if not found:
        _log("Could not reach 'Select video' through any tier — aborting.")
        return False

    time.sleep(1)
    _log(f"Pasting path: {video_file}")
    if paste_path_func:
        paste_path_func(video_file)
    else:
        paste_file_path(video_file)

    time.sleep(3)
    _log("Writing caption...")
    write_caption(session, caption)

    # Post is handled entirely by the Chrome extension now (tiktok.js,
    # triggered by background.js ~24s after page load). It watches the
    # live DOM for the caption to stabilize and for TikTok's own JS to
    # enable the Post button, then clicks it — including retrying past
    # error dialogs and the content-check modal. Nothing for Python to do
    # here anymore. Requires the extension to be loaded in this Chrome
    # profile (chrome://extensions -> Developer mode -> Load unpacked) —
    # one-time setup per machine, same as calibration.

    write_tiktok_ready_signal(caption, video_file)
    _log("TikTok post completed successfully!")
    return True