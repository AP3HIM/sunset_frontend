# calibration.py
#
# Lets each machine record its own exact click coordinates once, instead of
# relying purely on image matching or a blind random-point-in-a-box guess.
# This is a per-machine safety net: run it once on a new machine, and every
# platform's click_target() calls will prefer these exact recorded points
# over the old legacy random-box fallback.
#
# USAGE (run manually, not part of the normal upload flow):
#   .\python.exe calibration.py tiktok select_video caption post
#
# For each action name given, it'll prompt you to hover your mouse over the
# real button on your real screen, then switch back to this terminal and
# press Enter. It captures wherever your mouse actually is at that moment.

import os
import sys
import json
import time
import pyautogui

CALIBRATION_PATH = os.path.join(
    os.path.expanduser("~"), "sunsetuploader", "click_calibration.json"
)


def load_calibration():
    if not os.path.exists(CALIBRATION_PATH):
        return {}
    try:
        with open(CALIBRATION_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_calibration(data):
    os.makedirs(os.path.dirname(CALIBRATION_PATH), exist_ok=True)
    with open(CALIBRATION_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_point(platform, action):
    """Returns (x, y) if this machine has a recorded point for
    platform/action, else None."""
    data = load_calibration()
    entry = data.get(platform, {}).get(action)
    if entry and len(entry) == 2:
        return tuple(entry)
    return None


def record_point(platform, action):
    """Prompts the user to hover + Enter, captures pyautogui.position()."""
    print(f"\n--- Calibrating: {platform} / {action} ---")
    print(f"1. Switch to the {platform} browser window.")
    print(f"2. Hover your mouse exactly over the '{action}' target (don't click).")
    print(f"3. Switch back to this terminal and press Enter.")
    input("   Ready? Press Enter when your mouse is positioned...")
    x, y = pyautogui.position()
    print(f"   Captured: ({x}, {y})")
    return x, y


def run_calibration_cli(platform, actions):
    data = load_calibration()
    data.setdefault(platform, {})

    for action in actions:
        x, y = record_point(platform, action)
        data[platform][action] = [x, y]

    save_calibration(data)
    print(f"\nSaved calibration to: {CALIBRATION_PATH}")
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python calibration.py <platform> <action1> [action2] [action3] ...")
        print("Example: python calibration.py tiktok select_video caption post")
        sys.exit(1)

    platform_arg = sys.argv[1]
    actions_arg = sys.argv[2:]
    run_calibration_cli(platform_arg, actions_arg)