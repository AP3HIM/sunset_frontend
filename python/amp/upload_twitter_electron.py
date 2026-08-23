# upload_twitter_electron.py
import pyautogui
import time
import os
import pyperclip
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, '../images')

def safe_locate(image_name, confidence=0.8, retries=3, delay=0.5):
    path = os.path.join(IMAGES_DIR, image_name)
    for _ in range(retries):
        try:
            loc = pyautogui.locateCenterOnScreen(path, confidence=confidence)
        except Exception:
            loc = None
        if loc:
            return loc
        time.sleep(delay)
    return None

def click_or_fallback(image_name, fallback_coords=None, confidence=0.8, retries=3, delay=0.5):
    for _ in range(retries):
        loc = safe_locate(image_name, confidence=confidence, retries=1, delay=delay)
        if loc:
            pyautogui.click(loc)
            print(f"  Clicked {image_name} at {loc}")
            return True
        time.sleep(delay)
    if fallback_coords:
        pyautogui.click(fallback_coords)
        print(f"  Fallback: clicked {image_name} coords {fallback_coords}")
        return True
    print(f"  Failed to find {image_name}")
    return False

def type_or_paste(text):
    """Try clipboard paste first, fall back to typing if paste fails."""
    try:
        old = None
        try:
            old = pyperclip.paste()
        except Exception:
            old = None
        pyperclip.copy(text)
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.05)
        if old is not None:
            # restore clipboard
            time.sleep(0.05)
            pyperclip.copy(old)
        print("  Caption pasted using clipboard")
        return True
    except Exception as e:
        print(f"  Clipboard paste failed ({e}), falling back to typing...")
        try:
            pyautogui.write(text, interval=0.03)
            return True
        except Exception as e2:
            print(f"  Typing also failed: {e2}")
            return False

def verify_caption_set(expected, verify_delay=0.15):
    """
    Ctrl+A, Ctrl+C, check clipboard contains the expected text (substring).
    Returns True if verification succeeded, False otherwise.
    """
    try:
        old_clip = None
        try:
            old_clip = pyperclip.paste()
        except Exception:
            old_clip = None

        pyautogui.hotkey("ctrl", "a")
        time.sleep(0.05)
        pyautogui.hotkey("ctrl", "c")
        time.sleep(verify_delay)
        got = ""
        try:
            got = pyperclip.paste() or ""
        except Exception:
            got = ""

        # restore clipboard
        if old_clip is not None:
            try:
                pyperclip.copy(old_clip)
            except Exception:
                pass

        ok = expected.strip() and (expected.strip() in got)
        print(f"  Verification clipboard snapshot: {repr(got)[:120]} -> {'OK' if ok else 'NOT OK'}")
        return ok
    except Exception as e:
        print(f"  verify_caption_set error: {e}")
        return False

def post_with_ctrl_enter(delay=1.5):
    focus_x, focus_y = 608, 768  # safe fallback focus point for posting
    print(f"  Waiting {delay}s before sending Ctrl+Enter...")
    time.sleep(delay)
    pyautogui.click(focus_x, focus_y)  # refocus
    time.sleep(0.1)
    pyautogui.hotkey("ctrl", "enter")
    print("  Sent Ctrl+Enter (posted!)")

def upload_twitter(caption, video_file, paste_path_func):
    """
    caption: text to post
    video_file: local absolute path (string)
    paste_path_func: function(video_path) that will paste the file path into the OS file dialog and press enter
    """
    try:
        print(" Twitter: focus caption box (image -> fallback)")
        if not click_or_fallback("twitter_caption_box.png", fallback_coords=(928, 357), confidence=0.6):
            print("  WARNING: caption click fallback used / image not found")

        time.sleep(0.3)

        # Try to paste/type and verify consistency; retry up to 3 times
        success = False
        for attempt in range(3):
            print(f"  Caption attempt #{attempt+1}")
            if not type_or_paste(caption):
                time.sleep(0.2)
                continue
            time.sleep(0.25)
            if verify_caption_set(caption):
                success = True
                break
            else:
                # try clicking the caption area again before retry
                print("  Caption not found after paste — retrying focus & paste")
                click_or_fallback("twitter_caption_box.png", fallback_coords=(928, 357), confidence=0.6)
                time.sleep(0.2)

        if not success:
            print("  ERROR: caption could not be reliably entered. Proceeding anyway (may fail).")

        print(" Twitter: find media upload and paste file path")
        if not click_or_fallback("twitter_media_button.png", fallback_coords=(621, 510), confidence=0.7):
            print("  Could not find media upload button; aborting media attach")
            return

        time.sleep(0.5)
        # paste file path in file dialog (paste_path_func should press Enter)
        for i in range(3):
            try:
                paste_path_func(video_file)
                print("  paste_path_func called")
                break
            except Exception as e:
                print(f"  paste_path_func failed ({e}), retrying...")
                time.sleep(0.5)

        # allow time for file to upload into twitter UI
        time.sleep(2.0)

        # final post
        post_with_ctrl_enter(delay=1.5)
        print("  Done with Twitter upload")

    except Exception as e:
        print("Unexpected error in upload_twitter:")
        traceback.print_exc()


# Standalone runner so you can test this file by itself:
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--caption", required=True)
    parser.add_argument("--video", required=True)
    args = parser.parse_args()

    def paste_path_and_confirm(path):
        # small helper for local testing: put path into clipboard + Ctrl+V + Enter
        try:
            old = None
            try:
                old = pyperclip.paste()
            except Exception:
                old = None
            pyperclip.copy(path)
            time.sleep(0.05)
            pyautogui.hotkey("ctrl", "v")
            time.sleep(0.05)
            pyautogui.press("enter")
            time.sleep(0.1)
            if old is not None:
                pyperclip.copy(old)
            print("  Pasted video path via clipboard helper")
        except Exception as e:
            print("  paste_path_and_confirm helper failed:", e)

    print("Running Twitter upload standalone test")
    time.sleep(1.0)
    upload_twitter(args.caption, args.video, paste_path_and_confirm)
