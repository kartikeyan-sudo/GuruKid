import psutil

def get_ram():
    mem = psutil.virtual_memory()
    return round(mem.percent, 1)
