from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import time
import subprocess
import platform


app = FastAPI(title="ServerPulse API")


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "ServerPulse API is running"
    }


# --------------------------------------------------
# Server Statistics
# --------------------------------------------------

@app.get("/api/stats")
def get_stats():

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    uptime_seconds = time.time() - psutil.boot_time()

    return {
        "cpu": psutil.cpu_percent(interval=0.5),
        "ram": memory.percent,
        "ram_available_gb": round(
            memory.available / (1024 ** 3), 2
        ),
        "disk": disk.percent,
        "disk_free_gb": round(
            disk.free / (1024 ** 3), 2
        ),
        "uptime_hours": round(
            uptime_seconds / 3600, 2
        ),
    }


# --------------------------------------------------
# Running Processes
# --------------------------------------------------

@app.get("/api/processes")
def get_processes():

    processes = []

    for process in psutil.process_iter(
        [
            "pid",
            "name",
            "username",
            "cpu_percent",
            "memory_percent",
        ]
    ):
        try:
            info = process.info

            cpu_val = info.get("cpu_percent")
            mem_val = info.get("memory_percent")

            processes.append({
                "pid": info.get("pid", 0),
                "name": info.get("name") or "Unknown",
                "user": info.get("username") or "Unknown",
                "cpu": round(cpu_val if cpu_val is not None else 0.0, 1),
                "memory": round(mem_val if mem_val is not None else 0.0, 1),
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess,
        ):
            continue

    processes.sort(
        key=lambda process: process["cpu"],
        reverse=True,
    )

    return {
        "processes": processes[:15]
    }


# --------------------------------------------------
# Linux Services
# --------------------------------------------------

@app.get("/api/services")
def get_services():

    services = []

    try:
        result = subprocess.run(
            [
                "systemctl",
                "list-units",
                "--type=service",
                "--all",
                "--plain",
                "--no-pager",
                "--no-legend",
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        for line in result.stdout.splitlines():

            parts = line.split(None, 4)

            # Strip leading status marker/bullet if output by systemd
            if parts and parts[0] in ("●", "*", "-", "x", "×"):
                parts = parts[1:]

            if len(parts) < 4:
                continue

            service_name = parts[0]
            load_state = parts[1]
            active_state = parts[2]
            sub_state = parts[3]

            services.append({
                "name": service_name,
                "load": load_state,
                "active": active_state,
                "status": sub_state,
            })

    except Exception as error:

        return {
            "services": [],
            "summary": {
                "total": 0,
                "running": 0,
                "inactive": 0,
                "failed": 0,
            },
            "error": str(error),
        }

    running = sum(
        1
        for service in services
        if service["status"] == "running"
    )

    inactive = sum(
        1
        for service in services
        if service["status"] == "dead"
    )

    failed = sum(
        1
        for service in services
        if service["active"] == "failed" or service["status"] == "failed"
    )

    return {
        "services": services[:20],
        "summary": {
            "total": len(services),
            "running": running,
            "inactive": inactive,
            "failed": failed,
        },
    }


@app.get("/api/system")
def get_system_info():
    os_name = platform.system()
    try:
        if hasattr(platform, "freedesktop_os_release"):
            freedesktop_data = platform.freedesktop_os_release()
            os_name = freedesktop_data.get("PRETTY_NAME") or os_name
    except Exception:
        pass

    return {
        "hostname": platform.node(),
        "os": os_name,
        "os_release": platform.release(),
        "kernel": platform.release(),
        "architecture": platform.machine(),
    }
