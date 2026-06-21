import React, { useEffect, useState } from "react";
import { 
  Users, Calendar, CreditCard, Award, ArrowUpRight, DollarSign, Clock, CheckSquare, Dumbbell, Activity, Utensils, BellRing
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";
import api from "../services/api";

interface DashboardViewProps {
  user: any;
  setTab: (tab: string) => void;
}

export default function DashboardView({ user, setTab }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const statsRes = await api.get("/dashboard/stats");
        setStats(statsRes.data);

        const summaryRes = await api.get("/dashboard/summary");
        setSummary(summaryRes.data);

        const notifRes = await api.get("/notifications");
        setNotifications(notifRes.data.slice(0, 4)); // Only show top 4 alerts
      } catch (err) {
        console.error("Failed to load dashboard metrics.", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Cell color variations for Super Admin Subscription distribution
  const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6"];

  if (user.role === "SUPER_ADMIN") {
    return (
      <div className="space-y-6 text-zinc-100">
        
        {/* Header Header */}
        <div className="border-b border-zinc-850 pb-4">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            Super Admin Global Console
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Global SaaS Health Operations across multi-branch franchises.
          </p>
        </div>

        {/* Global Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span className="text-xs font-mono font-bold tracking-widest uppercase">Total Gyms</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-white">{stats?.totalGyms || 0}</div>
            <div className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">100%</span> active containers
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span className="text-xs font-mono font-bold tracking-widest uppercase">Active Tenants</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-white">{stats?.activeGyms || 0}</div>
            <div className="text-xs text-zinc-500">Subscription standing stable</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span className="text-xs font-mono font-bold tracking-widest uppercase">Suspended Labs</span>
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-black text-white text-red-400">{stats?.suspendedGyms || 0}</div>
            <div className="text-xs text-zinc-500">Awaiting clearance</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span className="text-xs font-mono font-bold tracking-widest uppercase">SaaS License Share</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-500">${stats?.saasRevenue || 0}</div>
            <div className="text-xs text-zinc-500">15% platform pricing cuts</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gym growth timelines */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold font-mono tracking-wider text-white uppercase">Tenant Registration Timeline</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyGrowths || []}>
                  <defs>
                    <linearGradient id="gymSlope" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} width={25} />
                  <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#fff" }} />
                  <Area type="monotone" dataKey="gyms" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#gymSlope)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SaaS subscription split */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold font-mono tracking-wider text-white uppercase">Licensing Tiers</h3>
            <div className="h-56 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.revenueDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(stats?.revenueDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 text-xs flex-wrap font-mono">
              {(stats?.revenueDistribution || []).map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="text-zinc-400 capitalize">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Call for sandbox admin */}
        <div className="bg-zinc-950 p-6 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
          <p className="text-zinc-400 text-sm">
            Interested in adding more gyms to this multi-tenant database? Use the <span className="text-amber-500 font-semibold">Franchise Control</span> tab in the sidebar.
          </p>
          <button 
            type="button"
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500 rounded-xl text-xs text-white cursor-pointer transition-all active:scale-95"
            onClick={() => setTab("gymsSaaS")}
          >
            Go to Franchise Control panel
          </button>
        </div>
      </div>
    );
  }

  // MEMBER DASHBOARD BOARD
  if (user.role === "MEMBER") {
    // Standard Member View showing personal progress
    return (
      <div className="space-y-6 text-zinc-100">
        
        {/* Welcome Board */}
        <div className="border-b border-zinc-850 pb-4">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            Hey CrossFit Champion, {user.fullName}!
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Check your physical stats, assigned training logs, diet, and dynamic invoices inside of your portal.
          </p>
        </div>

        {/* Member cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">My BMI Metrics</div>
              <div className="text-2xl font-bold text-white">26.3</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Mild Overweight • 95 kg</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">My Membership</div>
              <div className="text-2xl font-bold text-emerald-400">Active</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Olympic Golden Club</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">My Weekly Workouts</div>
              <div className="text-2xl font-bold text-white">3 Days/Wk</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Assigned by Zara Thorne</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">Attended Classes</div>
              <div className="text-2xl font-bold text-white">7 Logs</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Manual Attendance approved</div>
            </div>
          </div>
        </div>

        {/* Workout and Diet sidebars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-500" /> Assigned Routine
              </h3>
              <button 
                type="button"
                className="text-xs text-amber-500 hover:underline"
                onClick={() => setTab("workouts")}
              >
                View Exercises
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-sm space-y-1">
                <div className="font-bold text-white">Barbell Back Squats</div>
                <div className="text-xs text-zinc-400">4 Sets • 12, 10, 8, 6 Reps • 15 Mins</div>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-sm space-y-1">
                <div className="font-bold text-white">Incline Dumbbell Press</div>
                <div className="text-xs text-zinc-400">3 Sets • 10, 10, 8 Reps • 12 Mins</div>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-sm space-y-1">
                <div className="font-bold text-white">Weighted Pull-Ups</div>
                <div className="text-xs text-zinc-400">3 Sets • AMRAP Reps • 10 Mins</div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-500" /> Diet Program Targets
              </h3>
              <button 
                type="button"
                className="text-xs text-amber-500 hover:underline"
                onClick={() => setTab("workouts")}
              >
                View Meals
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-center rounded-xl">
                <div className="text-zinc-500 text-[10px] font-mono uppercase">Calories</div>
                <div className="text-lg font-black text-white mt-1">2,800</div>
                <div className="text-[10px] text-zinc-400">kcal target</div>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-center rounded-xl">
                <div className="text-zinc-500 text-[10px] font-mono uppercase">Protein</div>
                <div className="text-lg font-black text-emerald-400 mt-1">180g</div>
                <div className="text-[10px] text-zinc-400">lean building</div>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-center rounded-xl">
                <div className="text-zinc-500 text-[10px] font-mono uppercase">Water Intake</div>
                <div className="text-lg font-black text-blue-400 mt-1">4.0L</div>
                <div className="text-[10px] text-zinc-400">hydration rate</div>
              </div>
            </div>
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
              <strong className="text-white block mb-1">Coach Notes:</strong>
              No carbonated sugar beverages allowed. Limit sodium. Cheat meal reserved only once in 15 days on Sunday bounds.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRAINER AND RECEPTIONIST / OWNER PORTAL VIEW
  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Title Board */}
      <div className="border-b border-zinc-900 pb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-zinc-500 text-xs font-bold tracking-widest uppercase font-mono">OVERVIEW PERFORMANCE</h2>
          <h3 className="text-4xl font-black italic mt-1 text-white uppercase tracking-tighter">DASHBOARD</h3>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setTab("members")}
            className="px-4.5 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-extrabold rounded-xl text-xs cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.25)]"
          >
            Add New Member
          </button>
          <button 
            type="button"
            onClick={() => setTab("payments")}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
          >
            Collect Fees
          </button>
        </div>
      </div>

      {/* Grid count stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Gym Members */}
        <div className="bg-[#111111] border border-zinc-800 p-6 rounded-3xl relative overflow-hidden transition-all hover:border-zinc-700">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Total Members</span>
            <Users className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-white mt-2">{stats?.totalMembers || 0}</div>
          <span className="text-[10px] text-zinc-500 block mt-2">Active CRM profiles</span>
        </div>

        {/* Attendance Today */}
        <div className="bg-[#111111] border border-zinc-800 p-6 rounded-3xl relative overflow-hidden transition-all hover:border-zinc-700">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Today's Attendance</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-white mt-2">{stats?.todayAttendance || 0}</div>
          <span className="text-[10px] text-emerald-400 block mt-2 font-mono">
            {stats?.attendancePercentage || 0}% active today
          </span>
        </div>

        {/* Pending Fees */}
        <div className="bg-[#111111] border border-zinc-805 p-6 rounded-3xl relative overflow-hidden transition-all hover:border-zinc-700">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Pending Fees</span>
            <span className="text-[10px] font-bold text-red-500 font-mono tracking-wider">DUE</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-red-400 mt-2">${stats?.pendingFees || 0}</div>
          <span className="text-[10px] text-zinc-500 block mt-2">Awaiting capture</span>
        </div>

        {/* Highlighted Orange Card - Monthly Collection */}
        <div className="bg-orange-500 p-6 rounded-3xl text-black shadow-[0_0_30px_rgba(249,115,22,0.2)]">
          <div className="text-black/60 text-[10px] font-mono font-bold tracking-wider uppercase">Monthly Revenue</div>
          <div className="text-3xl md:text-4xl font-black mt-2">${stats?.monthlyRevenue || stats?.todayCollection || 0}</div>
          <div className="text-black/80 text-[10px] mt-2 font-bold italic">Highest standing peak</div>
        </div>
      </div>

      {/* SaaS Live Branch KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* New Members This Month */}
        <div className="bg-[#111111] border border-zinc-800 p-4.5 rounded-2xl">
          <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">New Signups (Month)</div>
          <div className="text-2xl font-black text-white mt-1">+{summary?.newMembersThisMonth || 0}</div>
        </div>

        {/* Renewals Due */}
        <div className="bg-[#111111] border border-zinc-800 p-4.5 rounded-2xl">
          <div className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full inline-block"></span> Renewals Due
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">{summary?.renewalsCount || 0} Members</div>
        </div>

        {/* Frozen Members */}
        <div className="bg-[#111111] border border-zinc-800 p-4.5 rounded-2xl">
          <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Frozen Accounts</div>
          <div className="text-2xl font-black text-zinc-400 mt-1">{summary?.frozenCount || 0} Inactive</div>
        </div>

        {/* Today's Birthdays */}
        <div className="bg-[#111111] border border-zinc-800 p-4.5 rounded-2xl overflow-hidden col-span-2">
          <div className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Birthdays Today 🎂</div>
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto">
            {summary?.todaysBirthdays?.length === 0 ? (
              <span className="text-[10px] text-zinc-500 font-mono">No birthdays today</span>
            ) : (
              summary?.todaysBirthdays?.map((b: any) => (
                <div key={b.id} className="flex items-center gap-1 bg-zinc-950 p-1.5 pr-2.5 rounded-lg border border-zinc-900 shrink-0">
                  <img src={b.photo} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <span className="text-[10px] text-zinc-300 font-bold max-w-[80px] truncate">{b.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Week Expiries Panel */}
      {summary?.expiriesThisWeek?.length > 0 && (
        <div className="bg-[#111111]/90 border border-amber-500/10 p-5 rounded-3xl space-y-3.5">
          <div className="text-xs font-bold font-mono text-amber-500 tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> TARGET EXPIRATIONS THIS WEEK ({summary.expiriesThisWeek.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.expiriesThisWeek.map((ex: any) => (
              <div key={ex.memberId} className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{ex.name}</div>
                  <div className="text-[9px] text-zinc-500 font-mono">{ex.planName}</div>
                </div>
                <div className="text-right text-[10px] font-mono text-amber-400">
                  Ends: {ex.expiryDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main split: Charts left + Alerts right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* REVENUE TIMELINE CHART (2 Spans) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase">Revenue collection slope</h3>
            <span className="text-xs text-zinc-400 font-mono">Vast USD currency values</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueChart || []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} width={35} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", color: "#fff" }} />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BROADCASTED SYSTEM ALERTS FEED */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-amber-500" /> Active Notices
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full font-mono">MVP</span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">No active broadcasts.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold py-0.5 px-1.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-amber-500">
                      {n.type}
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      {n.createdAt.split("T")[0]}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs">{n.title}</h4>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lower split metrics: Attendances Bar Charts + Demographic Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Log attendance counts */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase">Weekday attendance densities</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.attendanceChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} width={25} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", color: "#fff" }} />
                <Bar dataKey="attendance" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signups trend */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase">New signups growth</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.newMemberChart || []}>
                <defs>
                  <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} width={20} />
                <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", color: "#fff" }} />
                <Area type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#memberGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
