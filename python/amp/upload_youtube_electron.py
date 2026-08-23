# amp/upload_youtube_electron.py
import pyautogui
import time
import os
import random

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


def human_click(x, y):
    """Click with slight jitter and natural mouse movement to avoid bot detection."""
    jx = x + random.randint(-3, 3)
    jy = y + random.randint(-3, 3)
    pyautogui.moveTo(jx, jy, duration=random.uniform(0.08, 0.18))
    time.sleep(random.uniform(0.05, 0.12))
    pyautogui.click()


def paste_file_path(video_file):
    """Paste video path into the OS file dialog and confirm."""
    import pyperclip
    pyperclip.copy(video_file)
    time.sleep(0.3)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.4)
    pyautogui.press('enter')
    _log(f"Pasted file path: {video_file}")


def select_file_only(video_file, paste_path_func=None):
    """
    Called in hybrid mode after DOM has clicked Create and Upload videos.
    PAG clicks Select Files, pastes the path, and exits.
    DOM handles everything after file selection.
    """
    _log("PAG: Looking for Select Files button...")
    time.sleep(2)

    select_btn = safe_locate('yt_select_files.png', confidence=0.7, retries=8, delay=0.8)
    if select_btn:
        human_click(select_btn.x, select_btn.y)
        _log("PAG: Clicked Select Files by image match.")
    else:
        _log("PAG: Image not found. Trying fallback coordinates...")
        for x, y in SELECT_FILES_COORDS:
            human_click(x, y)
            time.sleep(0.5)
            # Check if file dialog opened by trying to paste
            break

    time.sleep(1.5)
    _log(f"PAG: Pasting file path: {video_file}")
    if paste_path_func:
        paste_path_func(video_file)
    else:
        paste_file_path(video_file)

    _log("PAG: File selection done. DOM takes over.")


def write_title_pag(caption):
    _log("PAG: Waiting for details page to load...")
    time.sleep(4)  # wait for YT details page after file upload
    
    _log("PAG: Clicking title box (725, 415)...")
    pyautogui.click(725, 415)
    time.sleep(1.0)
    
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

    # Create button
    btn = safe_locate('yt_create_button.png', confidence=0.7)
    if btn:
        human_click(btn.x, btn.y)
    else:
        _log("Could not find Create button. Aborting.")
        return False
    time.sleep(random.uniform(0.8, 1.4))

    # Upload video option
    btn = safe_locate('yt_upload_video.png', confidence=0.7)
    if btn:
        human_click(btn.x, btn.y)
    else:
        _log("Could not find Upload videos. Aborting.")
        return False
    time.sleep(random.uniform(0.8, 1.4))

    # Select files
    select_file_only(video_file, paste_path_func)

    _log("Full PAG mode: file selected. Note — use hybrid mode for title/publish.")

    # write_title_pag(caption)

    return True