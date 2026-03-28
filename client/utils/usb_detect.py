import psutil

def is_usb_present():
    for disk in psutil.disk_partitions():
        if "removable" in disk.opts.lower():
            return True
    return False
