# upload.py
import os
import time
import argparse
import platform
import subprocess

import sys

script_dir = os.path.dirname(os.path.abspath(__file__)) 
if script_dir not in sys.path: 
    sys.path.insert(0, script_dir)

import pyautogui


try:
    import pyperclip
except ImportError:
    pyperclip = None

from amp import upload_instagram_electron, upload_tiktok_electron, upload_twitter_electron, upload_youtube_electron
from utils import launch_chrome, open_new_tab_and_search, launch_chrome_cdp

print("Raw sys.argv:", sys.argv)


def copy_to_clipboard(text):
    if pyperclip:
        pyperclip.copy(text)
        return True
    plat = platform.system()
    try:
        if plat == "Windows":
            p = subprocess.Popen(['clip'], stdin=subprocess.PIPE, shell=True)
            p.stdin.write(text.encode('utf-8'))
            p.stdin.close()
        elif plat == "Darwin":
            p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            p.stdin.write(text.encode('utf-8'))
            p.stdin.close()
        else:
            p = subprocess.Popen(['xclip', '-selection', 'clipboard'], stdin=subprocess.PIPE)
            p.stdin.write(text.encode('utf-8'))
            p.stdin.close()
        return True
    except Exception:
        return False


def paste_path_and_confirm(abs_path):
    try:
        old_clip = pyperclip.paste() if pyperclip else None
    except:
        old_clip = None

    print(f"[DEBUG] Pasting file path: {abs_path}")
    ok = copy_to_clipboard(abs_path)
    time.sleep(0.25)
    if not ok:
        print("[DEBUG] Clipboard copy failed, typing manually")
        pyautogui.write(abs_path, interval=0.02)
    else:
        if platform.system() == 'Darwin':
            pyautogui.hotkey('command', 'v')
        else:
            pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.25)
    pyautogui.press('enter')
    print("[DEBUG] Pressed ENTER after pasting")

    if pyperclip and old_clip is not None:
        time.sleep(0.1)
        pyperclip.copy(old_clip)


def write_youtube_signal(caption, video_file):
    import json
    signals_dir = os.path.join(os.path.expanduser("~"), "sunsetuploader", "signals")
    os.makedirs(signals_dir, exist_ok=True)
    payload = {
        "caption": caption,
        "description": "",
        "video": video_file,
        "status": "READY",
    }
    signal_path = os.path.join(signals_dir, "youtube_ready.json")
    with open(signal_path, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    print(f"[YT] Signal written to {signal_path}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--caption',     type=str, default="")
    parser.add_argument('--video',       type=str, required=True)
    parser.add_argument('--platforms',   nargs='+', action='append', default=[])
    parser.add_argument('--mode',        type=str, default="full",
                        choices=["full", "file-select-only", "pag-fallback", "write-title", "write-title-retry", "crop-select"])
    parser.add_argument('--dom-caption', type=str, default="0")
    parser.add_argument('--dom-post',    type=str, default="0")

    args = parser.parse_args()

    caption        = args.caption
    video          = os.path.abspath(args.video)
    platforms      = [p for group in args.platforms for p in group]
    mode           = args.mode
    dom_caption_ok = args.dom_caption == "1"
    dom_post_ok    = args.dom_post    == "1"

    print(f"DEBUG: caption={caption!r}, video={video!r}, platforms={platforms!r}, mode={mode!r}")
    print(f"File exists? {os.path.exists(video)}")

    # ── file-select-only ─────────────────────────────────────────────────────
    if mode == "file-select-only":
        platform_arg = platforms[0] if platforms else None
        print(f"File-select-only for: {platform_arg}")
        if platform_arg == "tiktok":
            upload_tiktok_electron.select_file_only(video, paste_path_and_confirm)
        elif platform_arg == "instagram":
            upload_instagram_electron.select_file_only(video, paste_path_and_confirm, select_crop=True)  # <-- add this
        elif platform_arg == "youtube":
            upload_youtube_electron.select_file_only(video, paste_path_and_confirm)
        elif platform_arg == "twitter":
            upload_twitter_electron.select_file_only(video, paste_path_and_confirm)
        print("File selection complete.")
        return

    # ── pag-fallback ─────────────────────────────────────────────────────────
    if mode == "pag-fallback":
        platform_arg = platforms[0] if platforms else None
        print(f"PAG fallback for: {platform_arg}, dom_caption={dom_caption_ok}, dom_post={dom_post_ok}")

        if platform_arg == "tiktok":
            if not dom_caption_ok:
                upload_tiktok_electron.write_caption_pag(caption)
            if not dom_post_ok:
                pyautogui.moveTo(960, 600)
                time.sleep(0.3)
                pyautogui.scroll(-10000)
                time.sleep(0.5)
                upload_tiktok_electron.wait_for_post_button()

        elif platform_arg == "instagram":
            if not dom_caption_ok:
                upload_instagram_electron.write_caption_pag(caption)
            # Share handled by DOM

        # YouTube has no pag-fallback needed — DOM handles everything after file select

        print("PAG fallback complete.")
        return
    
    # ── write-title ───────────────────────────────────────────────────────────────
    if mode == "write-title":
        print(f"Write-title mode: caption={caption!r}")
        upload_youtube_electron.write_title_pag(caption)
        print("write-title complete.")
        return

    if mode == "write-title-retry":
        print(f"Write-title-retry mode: caption={caption!r}")
        upload_youtube_electron.write_title_pag_retry(caption)
        print("write-title-retry complete.")
        return

    if mode == "crop-select":
        print("Crop-select mode: PAG clicking 9:16 coords")
        upload_instagram_electron.select_crop_pag()
        print("Crop select complete.")
        return

    # ── full legacy PAG ───────────────────────────────────────────────────────
    print(f"Full PAG mode for: {platforms}")

    launch_chrome()
    time.sleep(1)

    if 'tiktok' in platforms:
        try:
            open_new_tab_and_search("tiktok.com/upload", delay=1.5)
            upload_tiktok_electron.upload(caption, video, paste_path_and_confirm)
        except Exception as e:
            print(f"Error during TikTok upload: {e}")

    if 'instagram' in platforms:
        try:
            open_new_tab_and_search("instagram.com/", delay=1.5)
            upload_instagram_electron.upload_instagram(caption, video, paste_path_and_confirm)
        except Exception as e:
            print(f"Error during Instagram upload: {e}")

    if 'twitter' in platforms:
        try:
            open_new_tab_and_search("twitter.com/compose/tweet", delay=1.5)
            upload_twitter_electron.upload_twitter(caption, video, paste_path_and_confirm)
        except Exception as e:
            print(f"Error during Twitter upload: {e}")

    if 'youtube' in platforms:
        try:
            open_new_tab_and_search("studio.youtube.com", delay=6.0)
            upload_youtube_electron.select_file_only(video, paste_path_and_confirm)
            upload_youtube_electron.write_title_pag(caption)
        except Exception as e:
            print(f"Error during YouTube upload: {e}")

    print("Upload process complete!")


if __name__ == "__main__":
    main()