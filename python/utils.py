import os
import time
import pyautogui
import pygetwindow as gw

def launch_chrome():
    try:
        os.startfile("chrome")
        print(" Launched Chrome")
        time.sleep(3)
    except Exception as e:
        print(" Chrome launch failed:", e)
        return

    chrome_window = None
    for _ in range(10):
        windows = gw.getWindowsWithTitle("Chrome")
        if windows:
            chrome_window = windows[0]
            break
        time.sleep(1)

    if not chrome_window:
        print(" Could not detect Chrome window.")
        return

    try:
        chrome_window.activate()
        chrome_window.maximize()
        print(" Activated and maximized Chrome window")
    except Exception as e:
        print(" Failed to manipulate Chrome window:", e)

def open_new_tab_and_search(site_name, delay=6):
    pyautogui.hotkey('ctrl', 't')
    time.sleep(0.5)
    pyautogui.write(site_name)
    pyautogui.press('enter')
    print(f" Opened {site_name}")
    time.sleep(delay)
