# upload_instagram_electron.py
import pyautogui
import time
import os
import traceback
from typing import Optional, Tuple

import calibration

try:
    import cv2
    import numpy as np
    import mss
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "../images")

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
    for img in image_list:
        loc = safe_locate(img, confidence=confidence, retries=retries, delay=delay)
        if loc:
            _log(f"Matched variant: {img}")
            return loc
    _log(f"No variant matched from: {image_list}")
    return None


def locate_multiscale(image_name: str, confidence=0.7, scales=None):
    if not HAS_CV2:
        return None
    path = img_path(image_name)
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
        _log(f"  multiscale match '{image_name}' scale={best[3]} confidence={best[0]:.2f}")
        return (best[1], best[2])
    return None


def calibrated_point(action: str):
    pt = calibration.get_point("instagram", action)
    return tuple(pt) if pt else None


def click_point(pt: Tuple[int, int]):
    if DRY_RUN:
        _log(f" DRY RUN click @ {pt}")
        return
    pyautogui.click(pt)


def click_or_fallback(image_name: str, fallback_coords: Optional[Tuple[int, int]] = None,
                      retries=DEFAULT_RETRIES, delay=DEFAULT_DELAY, confidence=DEFAULT_CONFIDENCE,
                      calibration_action: Optional[str] = None) -> bool:
    loc = safe_locate(image_name, confidence=confidence, retries=retries, delay=delay)
    if loc:
        click_point((loc.x, loc.y))
        _log(f" Clicked image {image_name} at {loc}")
        return True
    ms_loc = locate_multiscale(image_name, confidence=max(confidence - 0.1, 0.6))
    if ms_loc:
        click_point(ms_loc)
        _log(f" Clicked via multiscale match {image_name} at {ms_loc}")
        return True
    if calibration_action:
        point = calibrated_point(calibration_action)
        if point:
            click_point(point)
            _log(f" Clicked via saved calibration point '{calibration_action}': {point}")
            return True
    if fallback_coords:
        click_point(fallback_coords)
        _log(f" Fallback click {image_name} at {fallback_coords}")
        return True
    _log(f" No image, multiscale, calibration, or fallback for {image_name}")
    return False


def hover_then_find(image_name: str, hover_coords: Tuple[int, int],
                    confidence=DEFAULT_CONFIDENCE, retries=3, delay=0.2,
                    calibration_action: Optional[str] = None) -> Optional[pyautogui.Point]:
    _log(f" Hovering at {hover_coords} to reveal {image_name}")
    if not DRY_RUN:
        pyautogui.moveTo(hover_coords[0], hover_coords[1], duration=0.12)
        time.sleep(0.18)
    loc = safe_locate(image_name, confidence=confidence, retries=retries, delay=delay)
    if loc:
        return loc
    ms_loc = locate_multiscale(image_name, confidence=max(confidence - 0.1, 0.6))
    if ms_loc:
        return pyautogui.Point(ms_loc[0], ms_loc[1])
    if calibration_action:
        point = calibrated_point(calibration_action)
        if point:
            _log(f" Using saved calibration point for '{calibration_action}': {point}")
            return pyautogui.Point(point[0], point[1])
    return None


def wait_for_file_dialog_close(video_file: str, paste_path_func, max_wait=FILE_DIALOG_TIMEOUT) -> bool:
    start = time.time()
    time.sleep(0.2)
    while time.time() - start < max_wait:
        next_btn = safe_locate('insta_next_file.png', confidence=0.70, retries=1, delay=0.25)
        select_btn = safe_locate('insta_select_file.png', confidence=0.72, retries=1, delay=0.25)
        if next_btn:
            _log("  Detected 'Next' -> dialog closed.")
            return True
        if not select_btn:
            _log("  'Select file' gone -> dialog closed.")
            return True
        time.sleep(0.2)
    _log("  Dialog still open after timeout. Retrying paste...")
    paste_path_func(video_file)
    time.sleep(0.4)
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
            "insta_new_create_button.png", "insta_create_button.png",
            "new_ig_post_btn.png", "insta_select_file.png",
            "insta_next_file.png", "insta_caption_new.png", "insta_share_file.png",
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
    if not post_loc:
        ms = locate_multiscale("new_ig_post_btn.png", confidence=0.68)
        if ms:
            post_loc = pyautogui.Point(ms[0], ms[1])
    if post_loc:
        click_point((post_loc.x, post_loc.y))
        _log("Clicked 'Post' (image).")
        return True
    select_loc = safe_locate("insta_select_file.png", confidence=0.75, retries=2, delay=0.25)
    if select_loc:
        _log("Select-file visible — continuing.")
        return True
    cal_post = calibrated_point("post")
    if cal_post:
        click_point(cal_post)
        _log(f"Clicked 'Post' via saved calibration point: {cal_post}")
        return True
    _log("Falling back to coords for Post.")
    click_point(FALLBACKS["new_post"])
    time.sleep(0.4)
    select_loc_after = safe_locate("insta_select_file.png", confidence=0.72, retries=2, delay=0.35)
    if select_loc_after:
        _log("Select-file appeared after fallback.")
        return True
    _log("Fallback click did not produce select-file UI.")
    return False


def upload_instagram(caption: str, video_file: str, paste_path_func) -> bool:
    """Full PAG upload. Used in legacy mode."""
    try:
        _log("START Instagram upload sequence (full PAG)")
        create_loc = hover_then_find("insta_new_create_button.png", hover_coords=FALLBACKS["create"],
                                      calibration_action="create")
        if create_loc:
            click_point((create_loc.x, create_loc.y))
            _log(" Clicked insta_new_create_button.png after hover.")
        else:
            clicked = click_or_fallback("insta_create_button.png", FALLBACKS["create"],
                                         calibration_action="create")
            if not clicked:
                _log("Could not open create menu, aborting.")
                return False
        time.sleep(0.2)

        if not try_click_post_or_skip():
            _log("Could not select Post — aborting.")
            return False
        time.sleep(0.2)

        if not click_or_fallback("insta_select_file.png", FALLBACKS["select_file"],
                                  calibration_action="select_file"):
            _log("Could not click select file — aborting.")
            return False

        time.sleep(0.2)
        paste_path_func(video_file)

        ok = wait_for_file_dialog_close(video_file, paste_path_func, max_wait=FILE_DIALOG_TIMEOUT)
        if not ok:
            _log("File dialog did not close — aborting.")
            return False
        _log("File accepted.")

        _log("PAG: waiting for crop button...")
        time.sleep(0.2)

        crop_btn = safe_locate_any(
            ["insta_crop_button.png", "insta_crop_button_small.png"],
            confidence=0.7, retries=10, delay=0.2
        )
        if crop_btn:
            _log(f"PAG: clicking crop button at {crop_btn}...")
            pyautogui.click(crop_btn.x, crop_btn.y)
        else:
            ms_crop = locate_multiscale("insta_crop_button.png", confidence=0.65)
            cal_crop = calibrated_point("crop_button")
            if ms_crop:
                _log(f"PAG: crop button found via multiscale at {ms_crop}, clicking...")
                pyautogui.click(ms_crop)
            elif cal_crop:
                _log(f"PAG: crop button via saved calibration point: {cal_crop}")
                pyautogui.click(cal_crop)
            else:
                _log("PAG: crop button not found by any tier, using coords (631, 987)...")
                pyautogui.click(631, 987)

        time.sleep(0.2)

        nine_sixteen = safe_locate_any(["insta_916_small.png"], confidence=0.7, retries=8, delay=0.2)
        if nine_sixteen:
            _log(f"PAG: clicking 9:16 at {nine_sixteen}...")
            pyautogui.click(nine_sixteen.x, nine_sixteen.y)
        else:
            ms_916 = locate_multiscale("insta_916_small.png", confidence=0.65)
            cal_916 = calibrated_point("nine_sixteen")
            if ms_916:
                _log(f"PAG: 9:16 found via multiscale at {ms_916}, clicking...")
                pyautogui.click(ms_916)
            elif cal_916:
                _log(f"PAG: 9:16 via saved calibration point: {cal_916}")
                pyautogui.click(cal_916)
            else:
                _log("PAG: 9:16 image not found by any tier, using coords (668, 853)...")
                pyautogui.click(668, 853)

        time.sleep(0.2)
        _log("PAG: crop done.")

        if not click_or_fallback("insta_next_file.png", FALLBACKS["next1"], calibration_action="next1"):
            _log("Missing first Next — abort.")
            return False
        time.sleep(0.2)
        if not click_or_fallback("insta_next_file.png", FALLBACKS["next2"], calibration_action="next2"):
            _log("Missing second Next — abort.")
            return False
        time.sleep(0.2)

        if not click_or_fallback("insta_caption_new.png", FALLBACKS["caption"], calibration_action="caption"):
            _log("Caption box not found; keyboard fallback.")
            if not DRY_RUN:
                pyautogui.hotkey("tab")
                time.sleep(0.15)
                pyautogui.typewrite(caption, interval=0.03)
        else:
            if not DRY_RUN:
                pyautogui.write(caption, interval=0.03)
        time.sleep(0.2)
        pyautogui.scroll(-800)
        time.sleep(0.2)

        if not click_or_fallback("insta_share_file.png", FALLBACKS["share"], calibration_action="share"):
            _log("Could not find Share — aborting.")
            return False

        _log("Clicked Share — upload attempted.")
        return True

    except Exception:
        _log("Unhandled exception:")
        traceback.print_exc()
        return False


def select_file_only(video_file: str, paste_path_func, select_crop: bool = False) -> bool:
    """
    Called in hybrid mode. PAG handles file selection + crop. DOM handles
    Create/Post before this and everything from crop onward through Share
    (confirmed working end-to-end).
    """
    _log("PAG: select_file_only — reaching Select File button")
    time.sleep(0.2)

    got_it = False

    loc = safe_locate("insta_select_file.png", confidence=DEFAULT_CONFIDENCE,
                       retries=DEFAULT_RETRIES, delay=DEFAULT_DELAY)
    if loc:
        click_point((loc.x, loc.y))
        _log(f" Clicked image insta_select_file.png at {loc}")
        got_it = True

    if not got_it:
        ms_loc = locate_multiscale("insta_select_file.png", confidence=max(DEFAULT_CONFIDENCE - 0.1, 0.6))
        if ms_loc:
            click_point(ms_loc)
            _log(f" Clicked via multiscale match at {ms_loc}")
            got_it = True

    if not got_it:
        # Primary approach — confirmed live: one Tab lands focus directly
        # on 'Select from computer', Enter opens the native picker. Real
        # OS-level key events via PAG, so Chrome treats them as trusted
        # the same way it treats physical keyboard input — this is what
        # actually opens the native dialog, unlike a DOM .click() on this
        # same button (confirmed blocked: "File chooser dialog can only
        # be shown with a user activation").
        _log(" Tab once + Enter to reach 'Select from computer'...")
        pyautogui.press('tab')
        time.sleep(0.2)
        pyautogui.press('enter')
        time.sleep(0.3)
        got_it = True

    if not got_it:
        cal = calibrated_point("select_file")
        if cal:
            click_point(cal)
            _log(f" Clicked via saved calibration point: {cal}")
            got_it = True
        else:
            click_point(FALLBACKS["select_file"])
            _log(f" Fallback click at {FALLBACKS['select_file']}")
            got_it = True

    time.sleep(0.2)
    _log(f"PAG: pasting file path: {video_file}")
    paste_path_func(video_file)

    if select_crop:
        _log("PAG: waiting for crop button to appear...")
        crop_btn = safe_locate_any(
            ["insta_crop_button.png", "insta_crop_button_small.png"],
            confidence=0.7, retries=20, delay=0.2
        )
        if crop_btn:
            _log(f"PAG: crop button found at {crop_btn}, clicking...")
            pyautogui.click(crop_btn.x, crop_btn.y)
        else:
            ms_crop = locate_multiscale("insta_crop_button.png", confidence=0.65)
            cal_crop = calibrated_point("crop_button")
            if ms_crop:
                _log(f"PAG: crop button found via multiscale at {ms_crop}, clicking...")
                pyautogui.click(ms_crop)
            elif cal_crop:
                _log(f"PAG: crop button via saved calibration point: {cal_crop}")
                pyautogui.click(cal_crop)
            else:
                _log("PAG: crop button not found by any tier, using coords (631, 987)...")
                pyautogui.click(631, 987)
        time.sleep(0.2)

        nine_sixteen = safe_locate_any(["insta_916_small.png"], confidence=0.7, retries=8, delay=0.2)
        if nine_sixteen:
            _log(f"PAG: clicking 9:16 at {nine_sixteen}...")
            pyautogui.click(nine_sixteen.x, nine_sixteen.y)
        else:
            ms_916 = locate_multiscale("insta_916_small.png", confidence=0.65)
            cal_916 = calibrated_point("nine_sixteen")
            if ms_916:
                _log(f"PAG: 9:16 found via multiscale at {ms_916}, clicking...")
                pyautogui.click(ms_916)
            elif cal_916:
                _log(f"PAG: 9:16 via saved calibration point: {cal_916}")
                pyautogui.click(cal_916)
            else:
                _log("PAG: 9:16 image not found by any tier, using coords (668, 853)...")
                pyautogui.click(668, 853)

        time.sleep(0.2)
        _log("PAG: crop done.")
    else:
        time.sleep(0.2)

    _log("PAG: file selection done. DOM takes over.")
    return True


def write_caption_pag(caption: str) -> bool:
    _log("PAG: writing caption via coordinate fallback")
    if click_or_fallback("insta_caption_new.png", FALLBACKS["caption"], calibration_action="caption"):
        if not DRY_RUN:
            pyautogui.write(caption, interval=0.03)
        _log("PAG: caption written.")
        return True
    _log("PAG: caption fallback failed.")
    return False

def select_crop_pag() -> bool:
    _log("PAG: Clicking crop button...")
    crop_pt = calibrated_point("crop_button") or (631, 987)
    pyautogui.click(crop_pt)
    time.sleep(0.2)
    _log("PAG: Clicking 9:16 option...")
    ratio_pt = calibrated_point("nine_sixteen") or (668, 853)
    pyautogui.click(ratio_pt)
    time.sleep(0.2)
    _log("PAG: Crop selected.")
    return True

if __name__ == "__main__":
    print("Running as script. DRY_RUN:", DRY_RUN)
    diagnose_images()