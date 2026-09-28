from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import psutil
import time

app = FastAPI(title="ServerPulse API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "ServerPulse API is running"
    }


@app.get("/api/stats")
def get_stats():

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    uptime_seconds = time.time() - psutil.boot_time()

    return {
        "cpu": psutil.cpu_percent(interval=0.5),
        "ram": memory.percent,
        "ram_available_gb": round(memory.available / (1024 ** 3), 2),
        "disk": disk.percent,
        "disk_free_gb": round(disk.free / (1024 ** 3), 2),
        "uptime_hours": round(uptime_seconds / 3600, 2)
    }
