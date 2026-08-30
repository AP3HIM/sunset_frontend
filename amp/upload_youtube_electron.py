# amp/upload_youtube_electron.py
import pyautogui
import time
import os
import random

import calibration

try:
    import cv2
    import numpy as np
    import mss
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, '../images')

# Fallback coords for select files button
SELECT_FILES_COORDS = [
    (640, 400), (638, 398), (642, 402), (637, 401), (643, 399)
]


def _log(*args):
    print("[YT-UPLOAD]", *args)


def safe_locate(image_name, confidence=0.7, retries=5, delay=0.8):
    img_path = os.path.join(IMAGES_DIR, image_name)
    for i in range(retries):
        try:
            pt = pyautogui.locateCenterOnScreen(img_path, confidence=confidence)
        except Exception:
            pt = None
        if pt:
            _log(f"Found {image_name} at {pt} (attempt {i+1})")
            return pt
        time.sleep(delay)
    _log(f"Could not find {image_name} after {retries} attempts")
    return None


def locate_multiscale(image_name, confidence=0.65, scales=None):
    """Scale-tolerant fallback — same technique used for TikTok/Instagram."""
    if not HAS_CV2:
        return None

    path = os.path.join(IMAGES_DIR, image_name)
    if not os.path.exists(path):
        return None

    template = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
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


def calibrated_point(action):
    pt = calibration.get_point("youtube", action)
    return tuple(pt) if pt else None


def human_click(x, y):
    """Click with slight jitter and natural mouse movement to avoid bot detection."""
    jx = x + random.randint(-3, 3)
    jy = y + random.randint(-3, 3)
    pyautogui.moveTo(jx, jy, duration=random.uniform(0.08, 0.18))
    time.sleep(random.uniform(0.05, 0.12))
    pyautogui.click()


def tab_and_enter(tab_count, label, delay_between=0.15, post_delay=0.5):
    """
    Presses Tab `tab_count` times then Enter — real OS-level key events, so
    Chrome treats them as fully trusted input (same as physical keyboard),
    unlike a content script's .click(). Tab order tends to survive page
    redesigns better than exact pixel positions too, so this is a genuinely
    more robust tier than image matching for controls reachable this way,
    not just a shortcut.
    """
    _log(f"Tab x{tab_count} + Enter for: {label}")
    for _ in range(tab_count):
        pyautogui.press('tab')
        time.sleep(delay_between)
    pyautogui.press('enter')
    time.sleep(post_delay)


def paste_file_path(video_file):
    """Paste video path into the OS file dialog and confirm."""
    import pyperclip
    pyperclip.copy(video_file)
    time.sleep(0.3)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.4)
    pyautogui.press('enter')
    _log(f"Pasted file path: {video_file}")


def click_create():
    """
    Clicks YouTube Studio's Create button. This needs an actual mouse
    click since nothing has keyboard focus yet at page load — Tab
    navigation only becomes useful once focus is already somewhere on
    the page. Standard tier chain: image -> multiscale -> calibration ->
    hardcoded fallback.
    """
    btn = safe_locate('yt_create_button.png', confidence=0.7)
    if btn:
        human_click(btn.x, btn.y)
        return True

    ms = locate_multiscale('yt_create_button.png')
    if ms:
        human_click(*ms)
        return True

    cal = calibrated_point("create")
    if cal:
        _log(f"Clicking Create via saved calibration point: {cal}")
        human_click(*cal)
        return True

    _log("Could not find Create button through any tier.")
    return False


def select_upload_videos():
    """
    After Create is clicked, a dropdown with 4 options appears — 'Upload
    videos' is always first. One Tab reliably lands on it, Enter activates
    it. Falls back to the old image match if tab order ever changes.
    """
    time.sleep(0.4)
    ms = locate_multiscale('yt_upload_video.png')
    if ms:
        _log(f"'Upload videos' found via multiscale at {ms}, clicking.")
        human_click(*ms)
        return True

    # Primary approach — keyboard, not image/coordinates.
    tab_and_enter(1, "Upload videos (first item in Create dropdown)")
    return True


def select_file_only(video_file, paste_path_func=None):
    """
    Called in hybrid mode. PAG clicks Create, selects 'Upload videos', and
    handles the native file dialog — the three things DOM structurally
    can't do (Create/dropdown reliably, and the native file picker never).
    DOM handles everything from the details page onward.
    """
    _log("PAG: Clicking Create...")
    if not click_create():
        _log("PAG: Could not click Create — aborting select_file_only.")
        return False
    time.sleep(0.3)

    _log("PAG: Selecting 'Upload videos'...")
    select_upload_videos()
    time.sleep(1.0)

    _log("PAG: Reaching Select Files button...")
    select_btn = safe_locate('yt_select_files.png', confidence=0.7, retries=4, delay=0.6)
    if select_btn:
        human_click(select_btn.x, select_btn.y)
        _log("PAG: Clicked Select Files by image match.")
    else:
        ms = locate_multiscale('yt_select_files.png')
        if ms:
            _log(f"PAG: Clicked Select Files via multiscale match at {ms}.")
            human_click(*ms)
        else:
            # Tab x3 + Enter is the default, primary approach here — no
            # per-machine setup needed, works the same on every screen.
            # Calibration deliberately isn't checked in this branch: once
            # Tab is attempted there's no reliable way to detect whether it
            # "worked" and decide to also try calibration afterward, so
            # committing to the one dependable mechanism beats a fallback
            # we can't actually verify triggered correctly.
            tab_and_enter(3, "Select Files button")

    time.sleep(1.5)
    _log(f"PAG: Pasting file path: {video_file}")
    if paste_path_func:
        paste_path_func(video_file)
    else:
        paste_file_path(video_file)

    _log("PAG: File selection done. DOM takes over.")
    return True


def write_title_pag(caption):
    """
    Kept as a PAG fallback for title entry, though DOM should own this now
    per your testing (caption box auto-focuses, DOM handles the rest).
    Leaving this in place as a safety net in case DOM's title-fill needs
    to fall back.
    """
    _log("PAG: Waiting for details page to load...")
    time.sleep(4)

    title_loc = None
    ms = locate_multiscale('yt_title_box.png')
    if ms:
        title_loc = ms
        _log(f"PAG: Title box found via multiscale at {ms}.")
    else:
        cal = calibrated_point("caption")
        if cal:
            title_loc = cal
            _log(f"PAG: Title box via saved calibration point: {cal}")

    if not title_loc:
        title_loc = (725, 415)
        _log(f"PAG: No multiscale/calibration match, using legacy coords {title_loc}...")

    pyautogui.click(*title_loc)
    time.sleep(0.8)

    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.4)
    pyautogui.press('backspace')
    time.sleep(0.3)

    pyautogui.write(caption, interval=0.07)
    _log(f"PAG: Title written: {caption}")
    return True


def upload_youtube(caption, video_file, paste_path_func=None):
    """
    Legacy full PAG upload. Kept for fallback.
    Not recommended for regular use — use hybrid mode instead.
    """
    _log("Starting YouTube upload (full PAG legacy mode)...")

    if not click_create():
        _log("Could not find Create button. Aborting.")
        return False
    time.sleep(random.uniform(0.8, 1.4))

    select_upload_videos()
    time.sleep(random.uniform(0.8, 1.4))

    select_file_only(video_file, paste_path_func)

    _log("Full PAG mode: file selected. Note — use hybrid mode for title/publish.")

    return True