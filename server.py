from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psutil
import time
from datetime import datetime
import subprocess
import platform
import sqlite3
from pathlib import Path


app = FastAPI(title="ServerPulse API")

# Database configuration
DB_PATH = Path(__file__).resolve().parent / "serverpulse.db"


def init_db():
    try:
        with sqlite3.connect(DB_PATH, timeout=5.0) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    cpu REAL NOT NULL,
                    ram REAL NOT NULL,
                    disk REAL NOT NULL
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
                ON metrics(timestamp)
            """)
            conn.commit()
    except Exception as error:
        print(f"Failed to initialize database: {error}")


def save_metric(timestamp: float, cpu: float, ram: float, disk: float):
    try:
        with sqlite3.connect(DB_PATH, timeout=5.0) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO metrics (timestamp, cpu, ram, disk) VALUES (?, ?, ?, ?)",
                (timestamp, cpu, ram, disk)
            )
            # Retention cleanup: delete records older than 25 hours
            retention_cutoff = timestamp - (25 * 3600)
            cursor.execute(
                "DELETE FROM metrics WHERE timestamp < ?",
                (retention_cutoff,)
            )
            conn.commit()
    except Exception as error:
        print(f"Database error while saving metrics: {error}")


# Ensure DB and table exist on startup
init_db()


@app.on_event("startup")
def on_startup():
    init_db()


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
    try:
        current_time = time.time()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        uptime_seconds = current_time - psutil.boot_time()

        cpu_val = psutil.cpu_percent(interval=0.5)
        ram_val = memory.percent
        ram_avail = round(memory.available / (1024 ** 3), 2)
        disk_val = disk.percent
        disk_free = round(disk.free / (1024 ** 3), 2)
        uptime_h = round(uptime_seconds / 3600, 2)

        # Save metric snapshot to SQLite
        save_metric(current_time, cpu_val, ram_val, disk_val)

        return {
            "cpu": cpu_val,
            "ram": ram_val,
            "ram_available_gb": ram_avail,
            "disk": disk_val,
            "disk_free_gb": disk_free,
            "uptime_hours": uptime_h,
        }
    except Exception as error:
        return {
            "cpu": 0.0,
            "ram": 0.0,
            "ram_available_gb": 0.0,
            "disk": 0.0,
            "disk_free_gb": 0.0,
            "uptime_hours": 0.0,
            "error": str(error),
        }


# --------------------------------------------------
# Metric History
# --------------------------------------------------

RANGE_MAP = {
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "6h": 6 * 60 * 60,
    "24h": 24 * 60 * 60,
}


@app.get("/api/history")
def get_history(range: str = Query(...)):
    if range not in RANGE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid range parameter. Supported ranges: {', '.join(RANGE_MAP.keys())}"
        )

    now = time.time()
    cutoff = now - RANGE_MAP[range]

    try:
        with sqlite3.connect(DB_PATH, timeout=5.0) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT timestamp, cpu, ram, disk
                FROM metrics
                WHERE timestamp >= ?
                ORDER BY timestamp ASC
                """,
                (cutoff,)
            )
            rows = cursor.fetchall()

        points = []
        for ts, cpu, ram, disk in rows:
            time_str = datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            points.append({
                "timestamp": ts,
                "time": time_str,
                "cpu": cpu,
                "ram": ram,
                "disk": disk,
            })

        return {
            "range": range,
            "points": points,
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch metric history: {str(error)}"
        )


# --------------------------------------------------
# Running Processes
# --------------------------------------------------

@app.get("/api/processes")
def get_processes():
    processes = []

    try:
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
    except Exception as error:
        return {
            "processes": [],
            "error": str(error),
        }

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

    # Sort services so failed services are at the top, then running services, then inactive
    def service_sort_key(s):
        if s["active"] == "failed" or s["status"] == "failed":
            return (0, s["name"])
        if s["status"] == "running":
            return (1, s["name"])
        return (2, s["name"])

    services.sort(key=service_sort_key)

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
    os_release = platform.release()
    try:
        if hasattr(platform, "freedesktop_os_release"):
            freedesktop_data = platform.freedesktop_os_release()
            os_name = freedesktop_data.get("PRETTY_NAME") or freedesktop_data.get("NAME") or os_name
            os_release = (
                freedesktop_data.get("VERSION_ID")
                or freedesktop_data.get("VERSION")
                or os_release
            )
    except Exception:
        pass

    return {
        "hostname": platform.node(),
        "os": os_name,
        "os_release": os_release,
        "kernel": platform.release(),
        "architecture": platform.machine(),
    }
