try:
    import win32gui
except ImportError:  # platform guard
    win32gui = None


def get_active_window_title():
    if not win32gui:
        return "unknown"
    try:
        handle = win32gui.GetForegroundWindow()
        return win32gui.GetWindowText(handle)
    except Exception:
        return "unknown"
