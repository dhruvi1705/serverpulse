import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

function App() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
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

  const [alerts, setAlerts] = useState([]);

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

  useEffect(() => {
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

        setStats(data);
        setServerOnline(true);
        setLastUpdated(new Date());

        setPerformanceData((previousData) => [
          ...previousData.slice(-11),
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            cpu: data.cpu,
            ram: data.ram,
          },
        ]);
      } catch (error) {
        console.error("Server connection failed:", error);
        setServerOnline(false);
        return;
      }

      // Processes
      try {
        const processResponse = await fetch(
          "http://127.0.0.1:8000/api/processes"
        );

        if (!processResponse.ok) {
          throw new Error("Failed to fetch processes");
        }

        const processData = await processResponse.json();

        setProcesses(processData.processes);
      } catch (error) {
        console.error("Failed to fetch processes:", error);
      }

      // Services
      try {
        const serviceResponse = await fetch(
          "http://127.0.0.1:8000/api/services"
        );

        if (!serviceResponse.ok) {
          throw new Error("Failed to fetch services");
        }

        const serviceData = await serviceResponse.json();

        setServices(serviceData.services);
        setServiceSummary(serviceData.summary);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      }

      // System information
      try {
        const systemResponse = await fetch(
          "http://127.0.0.1:8000/api/system"
        );

        if (!systemResponse.ok) {
          throw new Error("Failed to fetch system information");
        }

        const systemData = await systemResponse.json();

        setSystemInfo(systemData);
      } catch (error) {
        console.error("Failed to fetch system information:", error);
      }
    };

    // Fetch immediately
    fetchStats();

    // Fetch every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
  const newAlerts = [];

  if (stats.cpu >= 90) {
    newAlerts.push({
      id: "cpu-critical",
      type: "critical",
      title: "High CPU usage",
      message: `CPU usage is ${stats.cpu}%`,
    });
  } else if (stats.cpu >= 70) {
    newAlerts.push({
      id: "cpu-warning",
      type: "warning",
      title: "Elevated CPU usage",
      message: `CPU usage is ${stats.cpu}%`,
    });
  }

  if (stats.ram >= 90) {
    newAlerts.push({
      id: "ram-critical",
      type: "critical",
      title: "High memory usage",
      message: `Memory usage is ${stats.ram}%`,
    });
  } else if (stats.ram >= 70) {
    newAlerts.push({
      id: "ram-warning",
      type: "warning",
      title: "Elevated memory usage",
      message: `Memory usage is ${stats.ram}%`,
    });
  }

  if (stats.disk >= 90) {
    newAlerts.push({
      id: "disk-critical",
      type: "critical",
      title: "High disk usage",
      message: `Disk usage is ${stats.disk}%`,
    });
  } else if (stats.disk >= 70) {
    newAlerts.push({
      id: "disk-warning",
      type: "warning",
      title: "Elevated disk usage",
      message: `Disk usage is ${stats.disk}%`,
    });
  }

  if (serviceSummary.failed > 0) {
    newAlerts.push({
      id: "service-failed",
      type: "critical",
      title: "Failed service detected",
      message: `${serviceSummary.failed} service(s) failed`,
    });
  }

  setAlerts(newAlerts);
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

            <button className="flex w-full items-center gap-3 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm">
              <LayoutDashboard size={17} />
              Dashboard
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <Server size={17} />
              Servers
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <Cpu size={17} />
              CPU
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <MemoryStick size={17} />
              Memory
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <HardDrive size={17} />
              Storage
            </button>

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Management
            </p>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <Activity size={17} />
              Processes
            </button>

           <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
  <div className="flex items-center gap-3">
    <Bell size={17} />
    Alerts
  </div>

  {alerts.length > 0 && (
  <span
    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
      alerts.some((alert) => alert.type === "critical")
        ? "bg-rose-50 text-rose-500"
        : "bg-amber-50 text-amber-600"
    }`}
  >
    {alerts.length}
  </span>
)}
</button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
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
          />
        )}

        {/* Main */}
        <main className="flex-1">

          {/* Top Bar */}
          <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6 lg:px-8">

            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
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
              <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-50">
                <Bell size={19} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
              </button>

              {/* User */}
              <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                  R
                </div>

                <div className="hidden sm:block">
                  <p className="text-xs font-semibold">
                    Admin
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Administrator
                  </p>
                </div>

                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 lg:p-8">

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
                  className={`h-2.5 w-2.5 rounded-full ${stats.cpu >= 90 ||
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
                  {stats.cpu >= 90 ||
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
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

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
            {/* Charts */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">

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

                  <button className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs text-slate-500">
                    Last 30 min
                    <ChevronDown
                      size={13}
                      className="ml-2 inline"
                    />
                  </button>
                </div>

                {/* Real Performance Graph */}
                <div className="relative mt-7 h-64 overflow-hidden rounded-xl bg-slate-50 p-3">

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
            </div>

            {/* Health */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

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
                      {Math.round(
                        100 -
                        (stats.cpu * 0.4 +
                          stats.ram * 0.4 +
                          stats.disk * 0.2)
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
            className={`rounded-xl px-4 py-3 ${
              alert.type === "critical"
                ? "bg-rose-50"
                : "bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  alert.type === "critical"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`}
              />

              <div>
                <p
                  className={`text-sm font-medium ${
                    alert.type === "critical"
                      ? "text-rose-700"
                      : "text-amber-700"
                  }`}
                >
                  {alert.title}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    alert.type === "critical"
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

            {/* Server Information */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  Server Information
                </h3>

                <button className="text-xs font-medium text-indigo-600">
                  View Details
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  ["Hostname", systemInfo.hostname],
                  ["Operating System", systemInfo.os],
                  ["OS Release", systemInfo.os_release],
                  ["Architecture", systemInfo.architecture],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-[11px] text-slate-400">
                      {label}
                    </p>

                    <p className="mt-1 truncate text-sm font-medium text-slate-700">
                      {value}
                    </p>
                  </div>
                ))
                }
              </div>
            </div>

            {/* Processes */}
<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:row-span-2">
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

                <table className="w-full table-fixed text-left sm:table-auto">

                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="w-[15%] px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        PID
                      </th>

                      <th className="w-[45%] px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Process
                      </th>

                      <th className="w-[20%] px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        CPU
                      </th>

                      <th className="w-[20%] px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Memory
                      </th>

                      <th className="hidden px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:table-cell">
                        User
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {processes.map((process) => (
                      <tr
                        key={process.pid}
                        className="border-b border-slate-50 last:border-0"
                      >

                        <td className="px-2 py-3 text-xs font-medium text-slate-500">
                          {process.pid}
                        </td>

                        <td className="break-words px-2 py-3 text-sm font-medium text-slate-700">
                          {process.name}
                        </td>

                        <td className="px-2 py-3 text-xs text-slate-500">
                          {process.cpu}%
                        </td>

                        <td className="px-2 py-3 text-xs text-slate-500">
                          {process.memory}%
                        </td>

                        <td className="hidden max-w-[100px] truncate px-2 py-3 text-xs text-slate-400 sm:table-cell">
                          {process.user}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>

           <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Services</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Linux system services
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-600">
                    {serviceSummary.running} Running
                  </span>

                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-500">
                    {serviceSummary.inactive} Inactive
                  </span>

                  {serviceSummary.failed > 0 && (
                    <span className="rounded-lg bg-rose-50 px-3 py-1.5 font-medium text-rose-500">
                      {serviceSummary.failed} Failed
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full table-fixed text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="w-1/2 pb-3 font-medium">
                        Service
                      </th>

                      <th className="hidden pb-3 font-medium sm:table-cell sm:w-1/5">
                        Load
                      </th>

                      <th className="w-1/4 pb-3 font-medium sm:w-1/5">
                        Active
                      </th>

                      <th className="w-1/4 pb-3 font-medium sm:w-1/5">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {services.map((service) => (
                      <tr
                        key={service.name}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="break-words py-3 text-sm font-medium text-slate-700">
                          {service.name}
                        </td>

                        <td className="hidden py-3 text-sm text-slate-500 sm:table-cell">
                          {service.load}
                        </td>
                        <td className="py-3 text-sm text-slate-500">
                          {service.active}
                        </td>

                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.status === "running"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-500"
                              }`}
                          >
                            {service.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main >
      </div >
    </div >
  );
}

export default App;