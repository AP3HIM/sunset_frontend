# upload_instagram_electron.py
import pyautogui
import time
import os
import traceback
from typing import Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "../images")

# === CONFIG ===
DEFAULT_RETRIES = 4
DEFAULT_DELAY = 0.6
DEFAULT_CONFIDENCE = 0.8
FILE_DIALOG_TIMEOUT = 8
DRY_RUN = False

FALLBACKS = {
    "create": (41, 770),
    "new_post": (121, 791),
    "select_file": (945, 757),
    "next1": (1271, 289),
    "next2": (1482, 284),
    "caption": (1285, 491),
    "share": (1479, 285),
}


def _log(*args, **kwargs):
    print("[IG-UPLOAD]", *args, **kwargs)


def img_path(image_name: str) -> str:
    return os.path.join(IMAGES_DIR, image_name)


def safe_locate(image_name: str, confidence=DEFAULT_CONFIDENCE,
                retries=DEFAULT_RETRIES, delay=DEFAULT_DELAY) -> Optional[pyautogui.Point]:
    path = img_path(image_name)
    for i in range(retries):
        try:
            loc = pyautogui.locateCenterOnScreen(path, confidence=confidence)
        except Exception as e:
            loc = None
            _log(f" safe_locate exception for {image_name}: {e}")
        if loc:
            _log(f"  found {image_name} @ {loc} (attempt {i+1})")
            return loc
        time.sleep(delay)
    _log(f"  did not find {image_name} (searched {retries}x)")
    return None

def safe_locate_any(image_list, confidence=0.7, retries=5, delay=0.5):
    """Try multiple image variants in order, return first match."""
    for img in image_list:
        loc = safe_locate(img, confidence=confidence, retries=retries, delay=delay)
        if loc:
            _log(f"Matched variant: {img}")
            return loc
    _log(f"No variant matched from: {image_list}")
    return None

def click_point(pt: Tuple[int, int]):
    if DRY_RUN:
        _log(f" DRY RUN click @ {pt}")
        return
    pyautogui.click(pt)


def click_or_fallback(image_name: str, fallback_coords: Optional[Tuple[int, int]] = None,
                      retries=DEFAULT_RETRIES, delay=DEFAULT_DELAY, confidence=DEFAULT_CONFIDENCE) -> bool:
    loc = safe_locate(image_name, confidence=confidence, retries=retries, delay=delay)
    if loc:
        click_point((loc.x, loc.y))
        _log(f" Clicked image {image_name} at {loc}")
        return True
    if fallback_coords:
        click_point(fallback_coords)
        _log(f" Fallback click {image_name} at {fallback_coords}")
        return True
    _log(f" No image or fallback for {image_name}")
    return False


def hover_then_find(image_name: str, hover_coords: Tuple[int, int],
                    confidence=DEFAULT_CONFIDENCE, retries=3, delay=0.2) -> Optional[pyautogui.Point]:
    _log(f" Hovering at {hover_coords} to reveal {image_name}")
    if not DRY_RUN:
        pyautogui.moveTo(hover_coords[0], hover_coords[1], duration=0.12)
        time.sleep(0.18)
    return safe_locate(image_name, confidence=confidence, retries=retries, delay=delay)


def wait_for_file_dialog_close(video_file: str, paste_path_func, max_wait=FILE_DIALOG_TIMEOUT) -> bool:
    start = time.time()
    time.sleep(0.6)
    while time.time() - start < max_wait:
        next_btn = safe_locate('insta_next_file.png', confidence=0.70, retries=1, delay=0.25)
        select_btn = safe_locate('insta_select_file.png', confidence=0.72, retries=1, delay=0.25)
        if next_btn:
            _log("  Detected 'Next' -> dialog closed.")
            return True
        if not select_btn:
            _log("  'Select file' gone -> dialog closed.")
            return True
        time.sleep(0.35)

    # Dialog still open after timeout — paste likely didn't register. Retry once.
    _log("  Dialog still open after timeout. Retrying paste...")
    paste_path_func(video_file)
    time.sleep(2.0)

    next_btn = safe_locate('insta_next_file.png', confidence=0.70, retries=2, delay=0.3)
    select_btn = safe_locate('insta_select_file.png', confidence=0.72, retries=2, delay=0.3)
    if next_btn or not select_btn:
        _log("  Dialog closed after retry paste.")
        return True

    _log("  Dialog still present after retry — giving up.")
    return False

def diagnose_images(image_list=None):
    if image_list is None:
        image_list = [
            "insta_new_create_button.png",
            "insta_create_button.png",
            "new_ig_post_btn.png",
            "insta_select_file.png",
            "insta_next_file.png",
            "insta_caption_new.png",
            "insta_share_file.png",
        ]
    results = {}
    _log("Running diagnose_images()")
    for img in image_list:
        found = safe_locate(img, retries=2, delay=0.2, confidence=0.75)
        results[img] = bool(found)
        _log(f"  {img}: {'FOUND' if found else 'MISSING'}")
    return results


def try_click_post_or_skip() -> bool:
    post_loc = safe_locate("new_ig_post_btn.png", confidence=0.78, retries=2, delay=0.25)
    if post_loc:
        click_point((post_loc.x, post_loc.y))
        _log("Clicked 'Post' (image).")
        return True
    select_loc = safe_locate("insta_select_file.png", confidence=0.75, retries=2, delay=0.25)
    if select_loc:
        _log("Select-file visible — continuing.")
        return True
    _log("Falling back to coords for Post.")
    click_point(FALLBACKS["new_post"])
    time.sleep(0.45)
    select_loc_after = safe_locate("insta_select_file.png", confidence=0.72, retries=2, delay=0.35)
    if select_loc_after:
        _log("Select-file appeared after fallback.")
        return True
    _log("Fallback click did not produce select-file UI.")
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Original full-PAG upload — UNTOUCHED
# ─────────────────────────────────────────────────────────────────────────────

def upload_instagram(caption: str, video_file: str, paste_path_func) -> bool:
    """
    Full PAG upload. Used in legacy mode. Do not modify.
    """
    try:
        _log("START Instagram upload sequence (full PAG)")
        create_loc = hover_then_find("insta_new_create_button.png", hover_coords=FALLBACKS["create"])
        if create_loc:
            click_point((create_loc.x, create_loc.y))
            _log(" Clicked insta_new_create_button.png after hover.")
        else:
            clicked = click_or_fallback("insta_create_button.png", FALLBACKS["create"])
            if not clicked:
                _log("Could not open create menu, aborting.")
                return False
        time.sleep(0.6)

        if not try_click_post_or_skip():
            _log("Could not select Post — aborting.")
            return False
        time.sleep(0.6)

        if not click_or_fallback("insta_select_file.png", FALLBACKS["select_file"]):
            _log("Could not click select file — aborting.")
            return False

        time.sleep(1.0)
        paste_path_func(video_file)

        ok = wait_for_file_dialog_close(video_file, paste_path_func, max_wait=FILE_DIALOG_TIMEOUT)
        if not ok:
            _log("File dialog did not close — aborting.")
            return False
        _log("File accepted.")

        # Crop to 9:16
        _log("PAG: waiting for crop button...")
        time.sleep(1.2)

        crop_btn = safe_locate_any(
            ["insta_crop_button.png", "insta_crop_button_small.png"],
            confidence=0.7, retries=10, delay=0.6
        )
        if crop_btn:
            _log(f"PAG: clicking crop button at {crop_btn}...")
            pyautogui.click(crop_btn.x, crop_btn.y)
        else:
            _log("PAG: crop button not found by image, using coords (631, 987)...")
            pyautogui.click(631, 987)

        time.sleep(0.8)

        nine_sixteen = safe_locate_any(
            ["insta_916_small.png"],
            confidence=0.7, retries=8, delay=0.6
        )
        if nine_sixteen:
            _log(f"PAG: clicking 9:16 at {nine_sixteen}...")
            pyautogui.click(nine_sixteen.x, nine_sixteen.y)
        else:
            _log("PAG: 9:16 image not found, using coords (668, 853)...")
            pyautogui.click(668, 853)

        time.sleep(0.2)
        _log("PAG: crop done.")

        if not click_or_fallback("insta_next_file.png", FALLBACKS["next1"]):
            _log("Missing first Next — abort.")
            return False
        time.sleep(0.6)
        if not click_or_fallback("insta_next_file.png", FALLBACKS["next2"]):
            _log("Missing second Next — abort.")
            return False
        time.sleep(0.6)

        if not click_or_fallback("insta_caption_new.png", FALLBACKS["caption"]):
            _log("Caption box not found; keyboard fallback.")
            if not DRY_RUN:
                pyautogui.hotkey("tab")
                time.sleep(0.15)
                pyautogui.typewrite(caption, interval=0.03)
        else:
            if not DRY_RUN:
                pyautogui.write(caption, interval=0.03)
        time.sleep(0.4)
        pyautogui.scroll(-800)
        time.sleep(0.6)

        if not click_or_fallback("insta_share_file.png", FALLBACKS["share"]):
            _log("Could not find Share — aborting.")
            return False

        _log("Clicked Share — upload attempted.")
        return True

    except Exception:
        _log("Unhandled exception:")
        traceback.print_exc()
        return False


# ─────────────────────────────────────────────────────────────────────────────
# NEW: select_file_only — called in hybrid mode
# PAG just handles file selection. DOM did Create/Post already.
# ─────────────────────────────────────────────────────────────────────────────

def select_file_only(video_file: str, paste_path_func, select_crop: bool = False) -> bool:
    _log("PAG: select_file_only — clicking Select File button")
    time.sleep(1.5)

    if not click_or_fallback("insta_select_file.png", FALLBACKS["select_file"]):
        _log("Could not find Select File — aborting.")
        return False

    time.sleep(0.5)
    _log(f"PAG: pasting file path: {video_file}")
    paste_path_func(video_file)

    if select_crop:
        _log("PAG: waiting for crop button to appear...")
        crop_btn = safe_locate_any(
            ["insta_crop_button.png", "insta_crop_button_small.png"],
            confidence=0.7, retries=20, delay=0.8
        )
        if crop_btn:
            _log(f"PAG: crop button found at {crop_btn}, clicking...")
            pyautogui.click(crop_btn.x, crop_btn.y)
        else:
            _log("PAG: crop button not found by image, using coords (631, 987)...")
            pyautogui.click(631, 987)
        time.sleep(1.2)

        nine_sixteen = safe_locate_any(
            ["insta_916_small.png"],
            confidence=0.7, retries=8, delay=0.6
        )
        if nine_sixteen:
            _log(f"PAG: clicking 9:16 at {nine_sixteen}...")
            pyautogui.click(nine_sixteen.x, nine_sixteen.y)
        else:
            _log("PAG: 9:16 image not found, using coords (668, 853)...")
            pyautogui.click(668, 853)

        time.sleep(0.5)
        _log("PAG: crop done.")
    else:
        time.sleep(5)

    _log("PAG: file selection done. DOM takes over.")
    return True

# ─────────────────────────────────────────────────────────────────────────────
# NEW: write_caption_pag — PAG fallback for caption if DOM fails
# ─────────────────────────────────────────────────────────────────────────────

def write_caption_pag(caption: str) -> bool:
    """
    PAG fallback for caption injection.
    Clicks known caption coordinates and types.
    """
    _log("PAG: writing caption via coordinate fallback")
    if click_or_fallback("insta_caption_new.png", FALLBACKS["caption"]):
        if not DRY_RUN:
            pyautogui.write(caption, interval=0.03)
        _log("PAG: caption written.")
        return True
    _log("PAG: caption fallback failed.")
    return False

def select_crop_pag() -> bool:
    """PAG fallback for 9:16 crop selection using known coords."""
    _log("PAG: Clicking crop button via coords...")
    pyautogui.click(631, 987)  # Select crop button
    time.sleep(0.8)
    _log("PAG: Clicking 9:16 option via coords...")
    pyautogui.click(668, 853)  # 9:16 option
    time.sleep(0.4)
    _log("PAG: Crop selected.")
    return True

if __name__ == "__main__":
    print("Running as script. DRY_RUN:", DRY_RUN)
    diagnose_images()