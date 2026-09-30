import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";


import {
  LayoutDashboard,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  CircleCheck,
  CircleX,
  Plus,
  RefreshCw,
  ExternalLink,
  User,
  LogOut,
  Check,
  AlertTriangle,
} from "lucide-react";

function MetricCard({ title, value, subtitle, icon: Icon, trend, positive }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-500" : "text-rose-500"
              }`}
          >
            {positive ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {trend}
          </div>
        )}
      </div>

      <p className="mt-5 text-sm text-slate-500">{title}</p>

      <h3 className="mt-1 text-2xl font-bold text-slate-800">
        {value}
      </h3>

      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

const timeRangeApiMap = {
  "Last 15 min": "15m",
  "Last 30 min": "30m",
  "Last 1 hour": "1h",
  "Last 6 hours": "6h",
  "Last 24 hours": "24h",
};

function App() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [serverOnline, setServerOnline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("Last 30 min");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const timeRangeRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    ram_available_gb: 0,
    disk: 0,
    disk_free_gb: 0,
    uptime_hours: 0,
  });

  const [performanceData, setPerformanceData] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceSummary, setServiceSummary] = useState({
    total: 0,
    running: 0,
    inactive: 0,
    failed: 0,
  });

  const [systemInfo, setSystemInfo] = useState({
    hostname: "",
    os: "",
    os_release: "",
    kernel: "",
    architecture: "",
  });

  const getStatus = (value, warning, critical) => {
    if (value >= critical) {
      return {
        label: "Critical",
        color: "text-rose-500",
        dot: "bg-rose-500",
      };
    }

    if (value >= warning) {
      return {
        label: "Warning",
        color: "text-amber-500",
        dot: "bg-amber-500",
      };
    }

    return {
      label: "Normal",
      color: "text-emerald-500",
      dot: "bg-emerald-500",
    };
  };

  const fetchStatsRef = useRef(null);
  const fetchHistoryRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      // Main server health check
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/stats"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch server stats");
        }

        const data = await response.json();

        if (!isMounted) return;
        setStats(data);
        setServerOnline(true);
        setLastUpdated(new Date());

        const now = Date.now();
        setPerformanceData((previousData) => [
          ...previousData.slice(-8999),
          {
            timestamp: now,
            time: new Date(now).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            cpu: data.cpu,
            ram: data.ram,
            disk: data.disk,
          },
        ]);
      } catch (error) {
        console.error("Server connection failed:", error);
        if (isMounted) setServerOnline(false);
        return;
      }

      // Processes
      try {
        const processResponse = await fetch(
          "http://127.0.0.1:8000/api/processes"
        );

        if (processResponse.ok) {
          const processData = await processResponse.json();
          if (isMounted) {
            setProcesses(processData.processes || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch processes:", error);
      }

      // Services
      try {
        const serviceResponse = await fetch(
          "http://127.0.0.1:8000/api/services"
        );

        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          if (isMounted) {
            setServices(serviceData.services || []);
            if (serviceData.summary) {
              setServiceSummary(serviceData.summary);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch services:", error);
      }

      // System information
      try {
        const systemResponse = await fetch(
          "http://127.0.0.1:8000/api/system"
        );

        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          if (isMounted) {
            setSystemInfo(systemData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch system information:", error);
      }
    };

    fetchStatsRef.current = fetchStats;

    // Fetch immediately
    fetchStats();

    // Fetch every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        timeRangeRef.current &&
        !timeRangeRef.current.contains(event.target)
      ) {
        setIsTimeRangeOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchHistory = useCallback(async (selectedRange) => {
    if (fetchHistoryRef.current) {
      await fetchHistoryRef.current(selectedRange);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchHistoryData = async (selectedRange) => {
      const apiRange = timeRangeApiMap[selectedRange] || "30m";

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/history?range=${apiRange}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch performance history");
        }

        const data = await response.json();
        if (!isMounted) return;
        setHistoryData(Array.isArray(data.points) ? data.points : []);
        setHistoryError(null);
      } catch (error) {
        console.error("Failed to fetch performance history:", error);
        if (!isMounted) return;
        setHistoryError("Unable to load performance history.");
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    fetchHistoryRef.current = fetchHistoryData;
    fetchHistoryData(timeRange);

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  const chartData = useMemo(() => {
    return historyData.map((point) => {
      const rawTs =
        typeof point.timestamp === "number"
          ? point.timestamp
          : Number(point.timestamp);
      const ms = rawTs > 1e11 ? rawTs : rawTs * 1000;
      const date = new Date(ms);
      return {
        ...point,
        time: !isNaN(date.getTime())
          ? date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : point.time || "",
      };
    });
  }, [historyData]);

  const alerts = useMemo(() => {
    const list = [];

    if (stats.cpu >= 90) {
      list.push({
        id: "cpu-critical",
        type: "critical",
        title: "High CPU usage",
        message: `CPU usage is ${stats.cpu}%`,
      });
    } else if (stats.cpu >= 70) {
      list.push({
        id: "cpu-warning",
        type: "warning",
        title: "Elevated CPU usage",
        message: `CPU usage is ${stats.cpu}%`,
      });
    }

    if (stats.ram >= 90) {
      list.push({
        id: "ram-critical",
        type: "critical",
        title: "High memory usage",
        message: `Memory usage is ${stats.ram}%`,
      });
    } else if (stats.ram >= 70) {
      list.push({
        id: "ram-warning",
        type: "warning",
        title: "Elevated memory usage",
        message: `Memory usage is ${stats.ram}%`,
      });
    }

    if (stats.disk >= 90) {
      list.push({
        id: "disk-critical",
        type: "critical",
        title: "High disk usage",
        message: `Disk usage is ${stats.disk}%`,
      });
    } else if (stats.disk >= 70) {
      list.push({
        id: "disk-warning",
        type: "warning",
        title: "Elevated disk usage",
        message: `Disk usage is ${stats.disk}%`,
      });
    }

    if (serviceSummary.failed > 0) {
      list.push({
        id: "service-failed",
        type: "critical",
        title: "Failed service detected",
        message: `${serviceSummary.failed} service(s) failed`,
      });
    }

    return list;
  }, [stats, serviceSummary]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-slate-100 bg-white px-4 py-6 transition-transform duration-300 lg:static lg:z-auto lg:block lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >

          <div className="mb-6 flex justify-end lg:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Logo */}
          <div className="px-3">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600">
              ServerPulse
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              Linux Monitoring
            </p>
          </div>

          {/* Navigation */}
          <nav className="mt-8 space-y-1">

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Overview
            </p>

            <button
              onClick={() => {
                setActivePage("Dashboard");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Dashboard"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActivePage("Servers");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Servers"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <Server size={17} />
              Servers
            </button>

            <button
              onClick={() => {
                setActivePage("CPU");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "CPU"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <Cpu size={17} />
              CPU
            </button>

            <button
              onClick={() => {
                setActivePage("Memory");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Memory"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <MemoryStick size={17} />
              Memory
            </button>
            <button
              onClick={() => {
                setActivePage("Storage");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Storage"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <HardDrive size={17} />
              Storage
            </button>

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Management
            </p>

            <button
              onClick={() => {
                setActivePage("Processes");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Processes"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <Activity size={17} />
              Processes
            </button>

            <button
              onClick={() => {
                setActivePage("Alerts");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Alerts"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={17} />
                Alerts
              </div>

              {alerts.length > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${activePage === "Alerts"
                    ? "bg-white/20 text-white"
                    : alerts.some((alert) => alert.type === "critical")
                      ? "bg-rose-50 text-rose-500"
                      : "bg-amber-50 text-amber-600"
                    }`}
                >
                  {alerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActivePage("Settings");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePage === "Settings"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <Settings size={17} />
              Settings
            </button>
          </nav>

          {/* Server Status */}
          <div className="mt-10 rounded-2xl bg-indigo-50 p-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${serverOnline
                  ? "bg-emerald-500"
                  : "bg-rose-500"
                  }`}
              />

              <span className="text-xs font-semibold text-slate-700">
                {serverOnline ? "Server Online" : "Server Offline"}
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              {systemInfo.os || "Linux"} • Local Server
            </p>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Main */}
        <main className="flex-1">

          {/* Top Bar */}
          <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6 lg:px-8">

            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-xs text-slate-400">
                ServerPulse
              </p>

              <h2 className="text-lg font-semibold text-slate-800">
                Overview
              </h2>
            </div>

            <div className="flex items-center gap-4">

              {/* Search */}
              <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 md:flex">
                <Search size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400">
                  Search
                </span>
              </div>

              {/* Notification */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((prev) => !prev);
                    setIsProfileOpen(false);
                    setIsTimeRangeOpen(false);
                  }}
                  className={`relative rounded-xl p-2 transition ${
                    isNotificationsOpen
                      ? "bg-slate-100 text-indigo-600"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                  aria-label="Notifications"
                  aria-haspopup="menu"
                  aria-expanded={isNotificationsOpen}
                >
                  <Bell size={19} />
                  {alerts.length > 0 && (
                    <span
                      className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${
                        alerts.some((alert) => alert.type === "critical")
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl ring-1 ring-slate-900/5 sm:w-96 z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">
                          Notifications
                        </h3>
                        <span className="flex h-5 items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-semibold text-slate-600">
                          {alerts.length}
                        </span>
                      </div>

                      {alerts.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-400">
                          {alerts.filter((a) => a.type === "critical").length} critical
                        </span>
                      )}
                    </div>

                    <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                      {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <CircleCheck size={20} />
                          </div>
                          <p className="mt-3 text-xs font-semibold text-slate-700">
                            No active alerts
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            All server metrics are within normal parameters
                          </p>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 rounded-xl p-3 text-xs transition ${
                              alert.type === "critical"
                                ? "border border-rose-100/80 bg-rose-50/70"
                                : alert.type === "warning"
                                  ? "border border-amber-100/80 bg-amber-50/70"
                                  : "border border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {alert.type === "critical" ? (
                                <CircleX size={16} className="text-rose-600" />
                              ) : alert.type === "warning" ? (
                                <AlertTriangle
                                  size={16}
                                  className="text-amber-600"
                                />
                              ) : (
                                <CircleCheck
                                  size={16}
                                  className="text-indigo-600"
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={`font-semibold ${
                                    alert.type === "critical"
                                      ? "text-rose-900"
                                      : alert.type === "warning"
                                        ? "text-amber-900"
                                        : "text-slate-800"
                                  }`}
                                >
                                  {alert.title}
                                </p>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    alert.type === "critical"
                                      ? "bg-rose-200/60 text-rose-700"
                                      : alert.type === "warning"
                                        ? "bg-amber-200/60 text-amber-700"
                                        : "bg-slate-200/60 text-slate-700"
                                  }`}
                                >
                                  {alert.type}
                                </span>
                              </div>
                              <p
                                className={`mt-0.5 ${
                                  alert.type === "critical"
                                    ? "text-rose-700/90"
                                    : alert.type === "warning"
                                      ? "text-amber-700/90"
                                      : "text-slate-500"
                                }`}
                              >
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div
                className="relative border-l border-slate-100 pl-4"
                ref={profileRef}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((prev) => !prev);
                    setIsNotificationsOpen(false);
                    setIsTimeRangeOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  className={`flex items-center gap-2 rounded-xl p-1.5 transition ${
                    isProfileOpen ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                    R
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold text-slate-800">
                      Admin
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Administrator
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>

                {isProfileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 z-50"
                  >
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-800">
                        Admin
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Administrator
                      </p>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <User size={15} className="text-slate-400" />
                        Profile
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActivePage("Settings");
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Settings size={15} className="text-slate-400" />
                        Settings
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        role="menuitem"
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 opacity-60"
                        title="Authentication is not configured"
                      >
                        <LogOut size={15} className="text-slate-400" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 lg:p-8">
            {activePage === "CPU" ? (
              <div>
                {/* CPU Page Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      CPU Monitoring
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Real-time CPU utilization and performance
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getStatus(stats.cpu, 70, 90).dot
                        }`}
                    />

                    <span
                      className={`text-xs font-medium ${getStatus(stats.cpu, 70, 90).color
                        }`}
                    >
                      {getStatus(stats.cpu, 70, 90).label}
                    </span>
                  </div>
                </div>

                {/* CPU Stats */}
                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">

                  {/* Current CPU */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Cpu size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Current Usage
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          {stats.cpu}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CPU Performance Chart */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        CPU Performance
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Recent CPU utilization readings
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      CPU
                    </div>
                  </div>

                  <div className="mt-6 h-72">

                    {performanceData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Collecting CPU data...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData}>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />

                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />

                          <Tooltip
                            formatter={(value) => [`${value}%`, "CPU"]}
                          />

                          <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={false}
                            name="CPU"
                          />

                        </LineChart>
                      </ResponsiveContainer>
                    )}

                  </div>
                </div>

                {/* CPU Status */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <h3 className="font-semibold text-slate-800">
                    CPU Status
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Current CPU health based on configured thresholds
                  </p>

                  <div className="mt-5">

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Utilization
                      </span>

                      <span className="font-medium text-slate-700">
                        {stats.cpu}%
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className={`h-full rounded-full ${stats.cpu >= 90
                          ? "bg-rose-500"
                          : stats.cpu >= 70
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                          }`}
                        style={{
                          width: `${Math.min(stats.cpu, 100)}%`,
                        }}
                      />

                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === "Memory" ? (
              <div>
                {/* Memory Page Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      Memory Monitoring
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Real-time RAM utilization and memory performance
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getStatus(stats.ram, 70, 90).dot
                        }`}
                    />

                    <span
                      className={`text-xs font-medium ${getStatus(stats.ram, 70, 90).color
                        }`}
                    >
                      {getStatus(stats.ram, 70, 90).label}
                    </span>
                  </div>
                </div>

                {/* Memory Stats */}
                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Current Usage */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <MemoryStick size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Current Usage
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          {stats.ram}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Available Memory */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-400">
                      Available Memory
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      {stats.ram_available_gb} GB
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Memory currently available
                    </p>
                  </div>
                </div>

                {/* Memory Performance Chart */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Memory Performance
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Recent RAM utilization readings
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      RAM
                    </div>
                  </div>

                  <div className="mt-6 h-72">

                    {performanceData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Collecting memory data...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData}>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />

                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />

                          <Tooltip
                            formatter={(value) => [`${value}%`, "RAM"]}
                          />

                          <Line
                            type="monotone"
                            dataKey="ram"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={false}
                            name="RAM"
                          />

                        </LineChart>
                      </ResponsiveContainer>
                    )}

                  </div>
                </div>

                {/* Memory Status */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <h3 className="font-semibold text-slate-800">
                    Memory Status
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Current RAM health based on configured thresholds
                  </p>

                  <div className="mt-5">

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Memory Utilization
                      </span>

                      <span className="font-medium text-slate-700">
                        {stats.ram}%
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className={`h-full rounded-full ${stats.ram >= 90
                          ? "bg-rose-500"
                          : stats.ram >= 70
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                          }`}
                        style={{
                          width: `${Math.min(stats.ram, 100)}%`,
                        }}
                      />

                    </div>

                    <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                      <span>0%</span>
                      <span>70% Warning</span>
                      <span>90% Critical</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === "Storage" ? (
              <div>
                {/* Storage Page Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      Storage Monitoring
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Real-time disk utilization and storage capacity
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getStatus(stats.disk, 70, 90).dot
                        }`}
                    />

                    <span
                      className={`text-xs font-medium ${getStatus(stats.disk, 70, 90).color
                        }`}
                    >
                      {getStatus(stats.disk, 70, 90).label}
                    </span>
                  </div>
                </div>

                {/* Storage Stats */}
                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Current Usage */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <HardDrive size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Current Usage
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          {stats.disk}%
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Current disk utilization
                    </p>
                  </div>

                  {/* Free Storage */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-400">
                      Free Storage
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      {stats.disk_free_gb} GB
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Available disk space
                    </p>
                  </div>
                </div>

                {/* Storage Performance Chart */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Storage Performance
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Recent disk utilization readings
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Disk
                    </div>
                  </div>

                  <div className="mt-6 h-72">

                    {performanceData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Collecting storage data...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData}>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />

                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />

                          <Tooltip
                            formatter={(value) => [`${value}%`, "Disk"]}
                          />

                          <Line
                            type="monotone"
                            dataKey="disk"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={false}
                            name="Disk"
                          />

                        </LineChart>
                      </ResponsiveContainer>
                    )}

                  </div>
                </div>

                {/* Storage Status */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                  <h3 className="font-semibold text-slate-800">
                    Storage Status
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Current disk health based on configured thresholds
                  </p>

                  <div className="mt-5">

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Disk Utilization
                      </span>

                      <span className="font-medium text-slate-700">
                        {stats.disk}%
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className={`h-full rounded-full ${stats.disk >= 90
                          ? "bg-rose-500"
                          : stats.disk >= 70
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                          }`}
                        style={{
                          width: `${Math.min(stats.disk, 100)}%`,
                        }}
                      />

                    </div>

                    <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                      <span>0%</span>
                      <span>70% Warning</span>
                      <span>90% Critical</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === "Servers" ? (
              <div>
                {/* Servers Page Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      Servers
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Manage and monitor your connected Linux servers
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white opacity-90 shadow-sm transition hover:bg-indigo-700"
                      title="Multi-server registration coming in a future update"
                    >
                      <Plus size={16} />
                      Add Server
                    </button>
                  </div>
                </div>

                {/* Server Summary Cards */}
                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {/* Connected Servers */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Server size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Connected Servers
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          1
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Currently monitored
                    </p>
                  </div>

                  {/* Online */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CircleCheck size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Online
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          {serverOnline ? 1 : 0}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Server responding normally
                    </p>
                  </div>

                  {/* Offline */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <CircleX size={21} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Offline
                        </p>

                        <p className="text-2xl font-bold text-slate-800">
                          {serverOnline ? 0 : 1}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      {serverOnline
                        ? "No disconnected servers"
                        : "Server disconnected"}
                    </p>
                  </div>
                </div>

                {/* Current Server Card */}
                <div className="mt-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  {/* Card Header */}
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Server size={24} />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {systemInfo.hostname || "Linux Server"}
                        </h3>

                        <p className="text-xs text-slate-400">
                          {systemInfo.os || "Linux"} • Local Server
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold ring-1 shadow-sm ${
                        serverOnline
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
                          : "bg-rose-50 text-rose-700 ring-rose-200/60"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          serverOnline ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {serverOnline ? "Online" : "Offline"}
                    </div>
                  </div>

                  {/* Server Information Grid */}
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Hostname
                      </p>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-slate-700"
                        title={systemInfo.hostname}
                      >
                        {systemInfo.hostname || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Operating System
                      </p>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-slate-700"
                        title={systemInfo.os}
                      >
                        {systemInfo.os || "Linux"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        OS Release
                      </p>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-slate-700"
                        title={systemInfo.os_release}
                      >
                        {systemInfo.os_release || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Kernel
                      </p>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-slate-700"
                        title={systemInfo.kernel}
                      >
                        {systemInfo.kernel || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Architecture
                      </p>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-slate-700"
                        title={systemInfo.architecture}
                      >
                        {systemInfo.architecture || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Uptime
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                        {stats.uptime_hours
                          ? `${stats.uptime_hours} hours`
                          : "0 hours"}
                      </p>
                    </div>
                  </div>

                  {/* Server Resource Health */}
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Server Resource Health
                    </h4>

                    <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
                      {/* CPU */}
                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Cpu size={15} className="text-slate-500" />
                            <span className="font-medium text-slate-600">
                              CPU Usage
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800">
                            {stats.cpu}%
                          </span>
                        </div>

                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.cpu >= 90
                                ? "bg-rose-500"
                                : stats.cpu >= 70
                                  ? "bg-amber-500"
                                  : "bg-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(stats.cpu, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* RAM */}
                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <MemoryStick size={15} className="text-slate-500" />
                            <span className="font-medium text-slate-600">
                              RAM Usage
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800">
                            {stats.ram}%
                          </span>
                        </div>

                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.ram >= 90
                                ? "bg-rose-500"
                                : stats.ram >= 70
                                  ? "bg-amber-500"
                                  : "bg-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(stats.ram, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Disk */}
                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <HardDrive size={15} className="text-slate-500" />
                            <span className="font-medium text-slate-600">
                              Disk Usage
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800">
                            {stats.disk}%
                          </span>
                        </div>

                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.disk >= 90
                                ? "bg-rose-500"
                                : stats.disk >= 70
                                  ? "bg-amber-500"
                                  : "bg-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(stats.disk, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Server Card Actions */}
                  <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                    <div className="text-xs text-slate-400">
                      {lastUpdated
                        ? `Last updated at ${lastUpdated.toLocaleTimeString()}`
                        : "Real-time telemetry active"}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsRefreshing(true);
                          if (fetchStatsRef.current) {
                            await fetchStatsRef.current();
                          }
                          await fetchHistory(timeRange);
                          setTimeout(() => setIsRefreshing(false), 500);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <RefreshCw
                          size={14}
                          className={
                            isRefreshing ? "animate-spin text-indigo-600" : ""
                          }
                        />
                        Refresh
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePage("Dashboard")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                      >
                        View Details
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === "Dashboard" ? (
              <>
                {/* Welcome */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      Server Overview

                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Monitor your Linux server performance in real time.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${!serverOnline
                        ? "bg-rose-500"
                        : stats.cpu >= 90 ||
                          stats.ram >= 90 ||
                          stats.disk >= 90 ||
                          serviceSummary.failed > 0
                          ? "bg-rose-500"
                          : stats.cpu >= 70 ||
                            stats.ram >= 70 ||
                            stats.disk >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                    />

                    <span className="text-xs font-medium text-slate-600">
                      {!serverOnline
                        ? "Server unreachable / Offline"
                        : stats.cpu >= 90 ||
                          stats.ram >= 90 ||
                          stats.disk >= 90 ||
                          serviceSummary.failed > 0
                          ? "Critical system issue"
                          : stats.cpu >= 70 ||
                            stats.ram >= 70 ||
                            stats.disk >= 70
                            ? "System needs attention"
                            : "All systems operational"}
                    </span>

                    {serverOnline && lastUpdated && (
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        • Updated {lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <MetricCard
                    title="CPU Usage"
                    value={`${stats.cpu}%`}
                    subtitle="Current utilization"
                    icon={Cpu}
                  />

                  <MetricCard
                    title="Memory Usage"
                    value={`${stats.ram}%`}
                    subtitle={`${stats.ram_available_gb} GB available`}
                    icon={MemoryStick}
                  />

                  <MetricCard
                    title="Disk Usage"
                    value={`${stats.disk}%`}
                    subtitle={`${stats.disk_free_gb} GB free`}
                    icon={HardDrive}
                  />

                  <MetricCard
                    title="Uptime"
                    value={`${stats.uptime_hours} hrs`}
                    subtitle="System uptime"
                    icon={Activity}
                  />
                </div>

                {/* Charts & Health */}
                <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-3">

                  {/* Performance */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          Performance
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          Server activity over time
                        </p>
                      </div>

                      <div className="relative" ref={timeRangeRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsTimeRangeOpen((prev) => !prev);
                            setIsNotificationsOpen(false);
                            setIsProfileOpen(false);
                          }}
                          aria-haspopup="menu"
                          aria-expanded={isTimeRangeOpen}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                        >
                          <span>{timeRange}</span>
                          <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${
                              isTimeRangeOpen ? "rotate-180 text-indigo-600" : "text-slate-400"
                            }`}
                          />
                        </button>

                        {isTimeRangeOpen && (
                          <div
                            role="menu"
                            className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg ring-1 ring-slate-900/5 z-50"
                          >
                            {[
                              "Last 15 min",
                              "Last 30 min",
                              "Last 1 hour",
                              "Last 6 hours",
                              "Last 24 hours",
                            ].map((option) => (
                              <button
                                key={option}
                                role="menuitem"
                                type="button"
                                onClick={() => {
                                  if (option !== timeRange) {
                                    setHistoryLoading(true);
                                    setTimeRange(option);
                                  }
                                  setIsTimeRangeOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-xs transition ${
                                  timeRange === option
                                    ? "bg-indigo-50 font-semibold text-indigo-600"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span>{option}</span>
                                {timeRange === option && (
                                  <Check size={13} className="text-indigo-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Real Performance Graph */}
                    <div className="relative mt-7 h-64 overflow-hidden rounded-xl bg-slate-50 p-3">

                      {historyLoading ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Loading performance history...
                        </div>
                      ) : historyError ? (
                        <div className="flex h-full items-center justify-center text-sm text-rose-500">
                          {historyError}
                        </div>
                      ) : chartData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          No performance history available yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>

                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#e2e8f0"
                            />

                            <XAxis
                              dataKey="time"
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />

                            <YAxis
                              domain={[0, 100]}
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${value}%`}
                            />

                            <Tooltip
                              labelFormatter={(label) => label}
                              formatter={(value, name) => [
                                `${value}%`,
                                name === "cpu" ? "CPU" : "Memory",
                              ]}
                            />

                            <Line
                              type="monotone"
                              dataKey="cpu"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={false}
                              name="cpu"
                            />

                            <Line
                              type="monotone"
                              dataKey="ram"
                              stroke="#22d3ee"
                              strokeWidth={2}
                              dot={false}
                              name="ram"
                            />

                          </LineChart>
                        </ResponsiveContainer>
                      )}

                    </div>

                    {/* Graph Legend */}
                    <div className="mt-4 flex items-center gap-5 text-xs text-slate-400">

                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        CPU
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Memory
                      </div>

                    </div>

                  </div>

                  {/* Health */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-1">

                    <h3 className="font-semibold text-slate-800">
                      Server Health
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Current system status
                    </p>

                    <div className="mt-7 flex justify-center">
                      <div className="flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-indigo-100">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-slate-800">
                            {Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  100 -
                                  (stats.cpu * 0.4 +
                                    stats.ram * 0.4 +
                                    stats.disk * 0.2)
                                )
                              )
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            Health Score
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 space-y-4">

                      {[
                        ["CPU", getStatus(stats.cpu, 70, 90)],
                        ["Memory", getStatus(stats.ram, 70, 90)],
                        ["Disk", getStatus(stats.disk, 70, 90)],
                      ].map(([name, status]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${status.dot}`} />

                            <span className="text-sm text-slate-600">
                              {name}
                            </span>
                          </div>

                          <span className={`text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      ))}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${serviceSummary.failed > 0
                              ? "bg-rose-500"
                              : "bg-emerald-500"
                              }`}
                          />

                          <span className="text-sm text-slate-600">
                            Services
                          </span>
                        </div>

                        <span
                          className={`text-xs font-medium ${serviceSummary.failed > 0
                            ? "text-rose-500"
                            : "text-emerald-500"
                            }`}
                        >
                          {services.length === 0
                            ? "Checking..."
                            : serviceSummary.failed > 0
                              ? `${serviceSummary.failed} Failed`
                              : "Normal"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Active Alerts */}
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Active Alerts
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Current server warnings and issues
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <Bell size={18} />
                    </div>
                  </div>

                  <div className="mt-5">
                    {alerts.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                        <div>
                          <p className="text-sm font-medium text-emerald-700">
                            No active alerts
                          </p>

                          <p className="text-xs text-emerald-600">
                            Your server is operating within normal thresholds.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`rounded-xl px-4 py-3 ${alert.type === "critical"
                              ? "bg-rose-50"
                              : "bg-amber-50"
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${alert.type === "critical"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                                  }`}
                              />

                              <div>
                                <p
                                  className={`text-sm font-medium ${alert.type === "critical"
                                    ? "text-rose-700"
                                    : "text-amber-700"
                                    }`}
                                >
                                  {alert.title}
                                </p>

                                <p
                                  className={`mt-1 text-xs ${alert.type === "critical"
                                    ? "text-rose-600"
                                    : "text-amber-600"
                                    }`}
                                >
                                  {alert.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Cards */}
                <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">

                  {/* Left Column: Server Information & Services */}
                  <div className="space-y-5">

                    {/* Server Information */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            Server Information
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Hardware and operating system
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          ["Hostname", systemInfo.hostname || "—"],
                          ["Operating System", systemInfo.os || "—"],
                          ["OS Release", systemInfo.os_release || "—"],
                          ["Kernel", systemInfo.kernel || "—"],
                          ["Architecture", systemInfo.architecture || "—"],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl bg-slate-50 p-3.5"
                          >
                            <p className="text-[11px] font-medium text-slate-400">
                              {label}
                            </p>

                            <p
                              className="mt-1 truncate text-sm font-medium text-slate-700"
                              title={value}
                            >
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Services */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">Services</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Linux system services
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-600">
                            {serviceSummary.running} Running
                          </span>

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                            {serviceSummary.inactive} Inactive
                          </span>

                          {serviceSummary.failed > 0 && (
                            <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-500">
                              {serviceSummary.failed} Failed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-400">
                              <th className="px-3 pb-3 font-medium">
                                Service
                              </th>

                              <th className="hidden w-24 px-3 pb-3 font-medium sm:table-cell">
                                Load
                              </th>

                              <th className="w-24 px-3 pb-3 font-medium">
                                Active
                              </th>

                              <th className="w-24 px-3 pb-3 font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {services.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                                  No services detected
                                </td>
                              </tr>
                            ) : (
                              services.map((service) => (
                                <tr
                                  key={service.name}
                                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                                >
                                  <td className="break-all px-3 py-3 text-sm font-medium text-slate-700">
                                    {service.name}
                                  </td>

                                  <td className="hidden px-3 py-3 text-xs text-slate-500 sm:table-cell">
                                    {service.load}
                                  </td>
                                  <td className="px-3 py-3 text-xs text-slate-500">
                                    {service.active}
                                  </td>

                                  <td className="px-3 py-3">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.active === "failed" ||
                                        service.status === "failed"
                                        ? "bg-rose-50 text-rose-500"
                                        : service.status === "running"
                                          ? "bg-emerald-50 text-emerald-600"
                                          : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                      {service.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Processes */}
                  <div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            Processes
                          </h3>

                          <p className="mt-1 mb-2 text-xs text-slate-400">
                            Top processes by CPU usage
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 font-medium text-indigo-600">
                            {processes.length} processes
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="w-16 px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                PID
                              </th>

                              <th className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Process
                              </th>

                              <th className="w-20 px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                CPU
                              </th>

                              <th className="w-20 px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Memory
                              </th>

                              <th className="hidden w-24 px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:table-cell">
                                User
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {processes.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                                  No processes found
                                </td>
                              </tr>
                            ) : (
                              processes.map((process) => (
                                <tr
                                  key={process.pid}
                                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                                >
                                  <td className="px-3 py-3 text-xs font-mono font-medium text-slate-500">
                                    {process.pid}
                                  </td>

                                  <td className="break-all px-3 py-3 text-sm font-medium text-slate-700">
                                    {process.name}
                                  </td>

                                  <td className="px-3 py-3 text-xs text-slate-500">
                                    {process.cpu}%
                                  </td>

                                  <td className="px-3 py-3 text-xs text-slate-500">
                                    {process.memory}%
                                  </td>

                                  <td
                                    className="hidden max-w-[100px] truncate px-3 py-3 text-xs text-slate-400 sm:table-cell"
                                    title={process.user}
                                  >
                                    {process.user}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>


              </>
            ) : (
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                    {activePage === "Processes" && (
                      <Activity size={26} />
                    )}

                    {activePage === "Alerts" && (
                      <Bell size={26} />
                    )}

                    {activePage === "Settings" && (
                      <Settings size={26} />
                    )}

                  </div>

                  <h1 className="mt-5 text-2xl font-bold text-slate-800">
                    {activePage}
                  </h1>

                  <p className="mt-2 text-sm text-slate-400">
                    This section is ready to be built.
                  </p>

                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;