import psutil
import time
import os

while True:
    os.system("clear")

    print("================================")
    print("       SERVERPULSE MONITOR")
    print("================================")
    print()

    cpu = psutil.cpu_percent(interval=1)

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    uptime_seconds = time.time() - psutil.boot_time()
    uptime_hours = uptime_seconds / 3600

    print(f"CPU Usage      : {cpu}%")
    print(f"RAM Usage      : {memory.percent}%")
    print(f"RAM Available  : {memory.available / (1024 ** 3):.2f} GB")
    print(f"Disk Usage     : {disk.percent}%")
    print(f"Disk Free      : {disk.free / (1024 ** 3):.2f} GB")
    print(f"Uptime         : {uptime_hours:.2f} hours")

    print()
    print("Refreshing every 3 seconds...")
    
    time.sleep(3)
