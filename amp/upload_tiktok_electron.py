# upload_tiktok_electron.py
import pyautogui
import time
import os
import random
import pyperclip
import json

# -------------------
# Paths (unchanged)
# -------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, '../images')

SIGNALS_DIR = r"C:\Users\adipa\sunsetuploader\signals"
os.makedirs(SIGNALS_DIR, exist_ok=True)

def _log(*args):
    print("[TikTok-UPLOAD]", *args)

# -------------------
# Configuration
# -------------------
SELECT_VIDEO_BOX = ((397, 325), (1827, 853))
CAPTION_FALLBACK = [
    (881, 641), (885, 645), (877, 637), (890, 641),
    (875, 643), (881, 635), (880, 648), (888, 638), (873, 646)
]

# Post button config
POST_BUTTON_COORDS = [
    (357, 1009),
    (474, 1006),
    (586, 1008),
]
POST_BUTTON_COLOR     = (254, 44, 85)
POST_BUTTON_TOLERANCE = 15

# -------------------
# Utilities
# -------------------

def write_tiktok_ready_signal(caption, video_file):
    payload = {
        "platform": "tiktok",
        "caption": caption,
        "video": video_file,
        "status": "READY",
        "timestamp": time.time()
    }
    signal_path = os.path.join(SIGNALS_DIR, "tiktok_ready.json")
    with open(signal_path, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    print(" TikTok ready signal written.")


def safe_locate(image_name, confidence=0.75, retries=15, delay=0.6):
    img_path = os.path.join(IMAGES_DIR, image_name)
    for _ in range(retries):
        try:
            pt = pyautogui.locateCenterOnScreen(img_path, confidence=confidence)
        except Exception:
            pt = None
        if pt:
            return pt
        time.sleep(delay)
    return None


def click_random_in_box(upper_left, bottom_right):
    x = random.randint(upper_left[0], bottom_right[0])
    y = random.randint(upper_left[1], bottom_right[1])
    pyautogui.click(x, y)
    return x, y


def write_caption(caption):
    for x, y in CAPTION_FALLBACK:
        try:
            pyautogui.click(x, y)
            time.sleep(0.4)
            pyautogui.hotkey('ctrl', 'a')
            pyautogui.press('backspace')
            pyautogui.write(caption, interval=0.05)
            print(f" Caption entered at ({x}, {y}).")
            
            # Extra buffer so typing is fully committed before extension checks for it
            time.sleep(2.0)
            
            return True
        except Exception:
            continue
    print(" Failed to write caption.")
    return False

def paste_file_path(video_file):
    pyperclip.copy(video_file)
    for attempt in range(3):
        pyautogui.hotkey("ctrl", "v")
        time.sleep(2)
        pyautogui.press("enter")
        time.sleep(0.8)
        if not pyautogui.locateOnScreen(
            os.path.join(IMAGES_DIR, "select_file.png"), confidence=0.75
        ):
            print(" File path pasted successfully.")
            return True
        print(f" Retry {attempt+1}: File dialog still open, trying again.")
    print(" Failed to close file dialog after pasting path.")
    return False


# -------------------
# Three-stage Post button
# -------------------

def strong_click(x, y):
    pyautogui.moveTo(x, y, duration=0.05)
    pyautogui.mouseDown()
    time.sleep(0.05)
    pyautogui.mouseUp()


def click_wave(coords_list, label, repeat_per_coord=3, wait=0.15):
    print(f" [{label}] Clicking {len(coords_list)} coords x{repeat_per_coord}...")
    for (cx, cy) in coords_list:
        for _ in range(repeat_per_coord):
            jx = cx + random.randint(-4, 4)
            jy = cy + random.randint(-3, 3)
            strong_click(jx, jy)
            time.sleep(wait)

def safe_locate_any(image_list, confidence=0.7, retries=5, delay=0.5):
    """Try multiple image variants in order, return first match."""
    for img in image_list:
        loc = safe_locate(img, confidence=confidence, retries=retries, delay=delay)
        if loc:
            _log(f"Matched variant: {img}")
            return loc
    _log(f"No variant matched from: {image_list}")
    return None
'''
def wait_for_post_button(max_wait=180, check_interval=2):
    """
    Three-stage Post button detection:
      Stage 1 — RGB color check (button turns red when ready)
      Stage 2 — Image match (post_file.png)
      Stage 3 — Coordinate sweep fallback
    """
    print(" Waiting for Post button...")
    start = time.time()
    post_img_path = os.path.join(IMAGES_DIR, "post_file.png")

    while time.time() - start < max_wait:
        # Stage 1: RGB color check
        try:
            pixel = pyautogui.screenshot().getpixel(POST_BUTTON_COORDS[1])
            print(f" Current pixel at post coords: {pixel}")
        except Exception as e:
            print(f" Screenshot error: {e}")
            pixel = None

        if pixel and all(
            abs(pixel[i] - POST_BUTTON_COLOR[i]) <= POST_BUTTON_TOLERANCE
            for i in range(3)
        ):
            print(f" [Stage 1] RGB confirmed red button (color={pixel}). Clicking...")
            click_wave(POST_BUTTON_COORDS, "RGB Confirmed", repeat_per_coord=3, wait=0.15)
            return True

        time.sleep(3)

        # Stage 2: Image match
        btn_loc = safe_locate_any(["post_file.png", "post_file_small.png"], confidence=0.75, retries=1, delay=0.1)

        if btn_loc:
            print(f" [Stage 2] Image match at {btn_loc}. Clicking...")
            for _ in range(4):
                jx = btn_loc[0] + random.randint(-3, 3)
                jy = btn_loc[1] + random.randint(-3, 3)
                strong_click(jx, jy)
                time.sleep(0.15)
            return True

        # Stage 3: Coordinate sweep
        print(" [Stage 3] No RGB or image match. Forcing coordinate sweep...")
        click_wave(POST_BUTTON_COORDS, "Fallback Sweep", repeat_per_coord=2, wait=0.25)
        pyautogui.scroll(-600)
        time.sleep(check_interval)

    # Final failsafe
    print(" Timeout reached. Running final failsafe click wave...")
    click_wave(POST_BUTTON_COORDS, "Failsafe", repeat_per_coord=4, wait=0.2)
    return False
'''

# -------------------
# Main Upload Logic
# -------------------

def upload(caption, video_file, paste_path_func=None):
    print(" Starting TikTok upload process...")
    time.sleep(8)

    # Step 1: Click Select video
    print(" Looking for 'Select video' button...")
    select_btn = safe_locate('select_file.png', confidence=0.75, retries=10, delay=0.5)
    if select_btn:
        pyautogui.click(select_btn)
        print(" Clicked 'Select video' by image.")
    else:
        print(" 'Select video' not found. Clicking inside known area...")
        click_random_in_box(*SELECT_VIDEO_BOX)

    # Step 2: Paste file path
    time.sleep(1)
    print(f" Pasting path: {video_file}")
    if paste_path_func:
        paste_path_func(video_file)
    else:
        paste_file_path(video_file)

    # Step 3: Wait for caption box and write caption
    time.sleep(3)
    print(" Writing caption...")
    write_caption(caption)

    '''
    # Step 4: Scroll down and click Post via three-stage detection
    print(" Scrolling down to Post button...")
   # pyautogui.moveTo(960, 600)   # center of screen — over the main TikTok page
    time.sleep(0.3)
    pyautogui.scroll(-1000000)
    time.sleep(1.5)              # give the page time to finish scrolling
    wait_for_post_button()
    '''

    write_tiktok_ready_signal(caption, video_file)
    print(" TikTok post completed successfully!")