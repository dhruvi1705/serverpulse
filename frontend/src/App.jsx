import { useEffect, useState } from "react";

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
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    ram_available_gb: 0,
    disk: 0,
    disk_free_gb: 0,
    uptime_hours: 0,
  });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch server stats:", error);
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-60 border-r border-slate-100 bg-white px-4 py-6 lg:block">

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

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <Bell size={17} />
              Alerts
            </button>

            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              <Settings size={17} />
              Settings
            </button>
          </nav>

          {/* Server Status */}
          <div className="mt-10 rounded-2xl bg-indigo-50 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">
                Server Online
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Ubuntu • Local Server
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">

          {/* Top Bar */}
          <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6 lg:px-8">

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
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600">
                  All systems operational
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

                {/* Graph placeholder */}
                <div className="relative mt-7 h-64 overflow-hidden rounded-xl bg-slate-50">

                  <div className="absolute inset-x-0 top-12 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-24 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-36 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-48 border-t border-dashed border-slate-200" />

                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">

                    {[25, 45, 32, 60, 42, 70, 48, 82, 55, 68, 45, 75].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="w-[5%] rounded-t-md bg-indigo-400/70"
                          style={{ height: `${height}%` }}
                        />
                      )
                    )}

                  </div>
                </div>

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
                        98
                      </p>
                      <p className="text-xs text-slate-400">
                        Health Score
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 space-y-4">

                  {[
                    ["CPU", "Normal"],
                    ["Memory", "Normal"],
                    ["Disk", "Healthy"],
                    ["Services", "Running"],
                  ].map(([name, status]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-slate-600">
                          {name}
                        </span>
                      </div>

                      <span className="text-xs font-medium text-emerald-500">
                        {status}
                      </span>
                    </div>
                  ))}

                </div>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

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

                <div className="mt-5 grid grid-cols-2 gap-4">

                  {[
                    ["Hostname", "LAPTOP-QJBJUN20"],
                    ["Operating System", "Ubuntu"],
                    ["Kernel", "WSL2 Linux"],
                    ["Monitoring", "Active"],
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
                  ))}

                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    Recent Activity
                  </h3>

                  <button className="text-xs font-medium text-indigo-600">
                    See More
                  </button>
                </div>

                <div className="mt-5 space-y-4">

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />

                    <div className="flex-1">
                      <p className="text-sm text-slate-600">
                        Server monitoring started
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Just now
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />

                    <div className="flex-1">
                      <p className="text-sm text-slate-600">
                        System metrics collected
                      </p>

                      <p className="text-[11px] text-slate-400">
                        2 minutes ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />

                    <div className="flex-1">
                      <p className="text-sm text-slate-600">
                        Monitoring service checked
                      </p>

                      <p className="text-[11px] text-slate-400">
                        5 minutes ago
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;