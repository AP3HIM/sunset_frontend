# utils.py
#
# Launches Chrome with CDP remote debugging enabled, using your actual
# default Chrome profile — so you stay logged into TikTok/Instagram/etc
# exactly like normal, same as it's always worked. No separate automation
# profile, no first-time login setup.
#
# IMPORTANT CAVEAT: Chrome only applies --remote-debugging-port on a fresh
# launch. If Chrome is already running against your default profile, a
# second launch just opens a new window in that existing process and
# silently ignores the debug flag — CDP never becomes available. So this
# closes any running Chrome first, then relaunches it with debugging on.
# Your logins/cookies live on disk and are untouched by this — you won't
# get logged out — but any other Chrome tabs/windows you had open will
# close when this runs. That's a real Chrome behavior, not something we
# can avoid while still using your real profile.

import os
import time
import subprocess
import pyautogui  # still used by amp/ scripts for keyboard typing/paste, kept as a dependency
import pygetwindow as gw

import cdp_bridge as cdp

CDP_PORT = 9222

_CHROME_CANDIDATE_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.join(
        os.environ.get("LOCALAPPDATA", ""),
        "Google", "Chrome", "Application", "chrome.exe",
    ),
]


def find_chrome_exe():
    for path in _CHROME_CANDIDATE_PATHS:
        if path and os.path.exists(path):
            return path

    try:
        import winreg
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
            value, _ = winreg.QueryValueEx(key, None)
            if value and os.path.exists(value):
                return value
    except Exception:
        pass

    return None


def find_default_chrome_profile_dir():
    """Your real Chrome profile — logins, cookies, everything, exactly like
    opening Chrome normally."""
    return os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "User Data"
    )


def _close_existing_chrome(wait_timeout=10):
    """Required so the debug-port flag actually applies on relaunch — see
    module docstring. Cookies/logins are disk-persisted and unaffected.
    Polls for actual process exit instead of guessing with a fixed sleep —
    a fixed sleep is a race condition if Chrome takes longer to exit."""
    try:
        result = subprocess.run(
            ["taskkill", "/IM", "chrome.exe", "/F"],
            capture_output=True, text=True, timeout=10,
        )
        detail = (result.stdout or result.stderr or "").strip()
        print(f" taskkill: {detail or '(no chrome.exe was running)'}")
    except Exception as e:
        print(f" (non-fatal) taskkill failed: {e}")

    deadline = time.time() + wait_timeout
    while time.time() < deadline:
        try:
            check = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq chrome.exe"],
                capture_output=True, text=True, timeout=5,
            )
            if "chrome.exe" not in check.stdout:
                return True
        except Exception:
            break
        time.sleep(0.5)
    print(" (warning) chrome.exe may still be running after taskkill — proceeding anyway")
    return False


def launch_chrome_cdp(initial_url="about:blank", port=CDP_PORT, timeout=15, retry=True):
    """
    Closes any running Chrome, relaunches it with remote debugging enabled
    against your real default profile, and returns a connected CDPSession
    for the initial tab. Returns None on failure. Retries once if the CDP
    endpoint doesn't come up in time.

    IDEMPOTENT: if CDP is already live (e.g. from a previous call in this
    same run), skips closing/relaunching Chrome entirely and just opens a
    new tab in the existing debug-enabled instance. This is what stops it
    from closing your tabs on every single attempt.
    """
    if cdp.wait_for_cdp_ready(port=port, timeout=1.5):
        print(" CDP already live — reusing existing debug-enabled Chrome, not closing anything")
        ws_url = cdp.open_tab(initial_url, port=port)
        if ws_url:
            return cdp.connect(ws_url)
        # fall through to a full relaunch if opening a new tab somehow failed

    chrome_exe = find_chrome_exe()
    if not chrome_exe:
        print(" Could not locate chrome.exe in the usual install paths.")
        return None

    profile_dir = find_default_chrome_profile_dir()
    _close_existing_chrome()

    args = [
        chrome_exe,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--new-window",
        initial_url,
    ]
    print(f" Launching: {' '.join(args)}")

    try:
        subprocess.Popen(args)
        print(" Launched Chrome with CDP enabled (your default profile)")
    except Exception as e:
        print(" Chrome launch failed:", e)
        return None

    if not cdp.wait_for_cdp_ready(port=port, timeout=timeout):
        if retry:
            print(" Retrying once — closing and relaunching...")
            return launch_chrome_cdp(initial_url, port=port, timeout=timeout, retry=False)
        print(" Chrome did not expose the CDP endpoint in time.")
        print(f" Manual check: open a browser or run "
              f"'Invoke-WebRequest http://127.0.0.1:{port}/json/version' in PowerShell "
              f"to see if the endpoint is actually up.")
        return None

    _try_focus_chrome_window()

    ws_url = cdp.find_tab(initial_url.replace("https://", "").replace("http://", ""), port=port)
    if not ws_url:
        ws_url = cdp.find_tab("", port=port)
    if not ws_url:
        print(" Could not find a CDP target tab after launch.")
        return None

    return cdp.connect(ws_url)

def _chrome_is_running():
    try:
        check = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq chrome.exe"],
            capture_output=True, text=True, timeout=5,
        )
        return "chrome.exe" in check.stdout
    except Exception:
        return False


def launch_chrome_with_extension(extension_path=None, profile_dir=None):
    """
    Only closes/relaunches Chrome if it isn't already running.
    --load-extension only takes effect on a genuinely fresh process, but
    forcing a close on every automation run destroys the user's open
    tabs — not acceptable for real users. If Chrome is already running,
    we assume this app launched it earlier with the extension loaded and
    reuse it as-is.
    """
    extension_path = extension_path or os.environ.get("SUNSET_EXTENSION_PATH")
    if not extension_path or not os.path.isdir(extension_path):
        print(f" No valid extension path ({extension_path!r}) — falling back to plain Chrome launch.")
        return launch_chrome()

    if _chrome_is_running():
        print(" Chrome is already running — reusing it, not closing any tabs.")
        return

    chrome_exe = find_chrome_exe()
    if not chrome_exe:
        print(" Could not locate chrome.exe — falling back to plain Chrome launch.")
        return launch_chrome()

    profile_dir = profile_dir or find_default_chrome_profile_dir()

    args = [
        chrome_exe,
        f"--load-extension={extension_path}",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--disable-session-crashed-bubble",
        "--new-window",
    ]
    print(f" Launching Chrome with extension pre-loaded: {' '.join(args)}")

    try:
        subprocess.Popen(args)
        print(" Launched Chrome with SunsetUploader extension loaded automatically.")
        time.sleep(3)
    except Exception as e:
        print(" Chrome launch with extension failed:", e)
        return launch_chrome()

    chrome_window = None
    for _ in range(10):
        windows = gw.getWindowsWithTitle("Chrome")
        if windows:
            chrome_window = windows[0]
            break
        time.sleep(1)

    if chrome_window:
        try:
            chrome_window.activate()
            chrome_window.maximize()
            print(" Activated and maximized Chrome window")
        except Exception as e:
            print(" Failed to manipulate Chrome window:", e)

def _try_focus_chrome_window():
    try:
        for _ in range(10):
            windows = gw.getWindowsWithTitle("Chrome")
            if windows:
                windows[0].activate()
                windows[0].maximize()
                return
            time.sleep(0.5)
    except Exception:
        pass  # cosmetic only, never fatal


def open_url_cdp(session, url, delay=2.0):
    """Navigate the current CDP session's tab to `url` directly — replaces
    ctrl+t + typing the address bar. No keyboard race conditions."""
    if session is None:
        print(" open_url_cdp: no session, cannot navigate")
        return False
    session.send("Page.navigate", {"url": url})
    print(f" Navigated to {url}")
    time.sleep(delay)
    return True


# ---------------------------------------------------------------------------
# Legacy functions kept for backward compatibility with any code path still
# calling them directly (e.g. modes other than 'full' in upload.py that
# haven't been migrated yet). Prefer launch_chrome_cdp()/open_url_cdp() for
# any new code.
# ---------------------------------------------------------------------------

def launch_chrome():
    try:
        os.startfile("chrome")
        print(" Launched Chrome (legacy path, no CDP)")
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
    print(f" Opened {site_name} (legacy path)")
    time.sleep(delay)