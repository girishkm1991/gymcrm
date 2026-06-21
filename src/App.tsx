import React, { useState, useEffect } from "react";
import { 
  Dumbbell, Activity, Users, Calendar, DollarSign, Heart, Sliders, Globe, FileText, 
  Camera, Sparkles, MessageSquare, LogOut, Menu, X, UserCheck
} from "lucide-react";
import api from "./services/api";

// View Imports
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import MembersView from "./components/MembersView";
import AttendanceView from "./components/AttendanceView";
import PaymentsView from "./components/PaymentsView";
import WorkoutDietView from "./components/WorkoutDietView";
import StaffView from "./components/StaffView";
import GymsSaaSView from "./components/GymsSaaSView";
import ReportsView from "./components/ReportsView";
import PlaceholderFutureView from "./components/PlaceholderFutureView";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("DASHBOARD");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Restore authenticated session states
  useEffect(() => {
    const savedUser = localStorage.getItem("gymflow_user");
    const savedToken = localStorage.getItem("gymflow_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      // Inject token into Axios interceptors
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }
  }, []);

  const handleLoginSuccess = (userProfile: any, authToken: string) => {
    setUser(userProfile);
    setToken(authToken);
    localStorage.setItem("gymflow_user", JSON.stringify(userProfile));
    localStorage.setItem("gymflow_token", authToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    
    // Redirect Super Admin to multi-tenant by default if they want
    if (userProfile.role === "SUPER_ADMIN") {
      setActiveTab("SAAS");
    } else {
      setActiveTab("DASHBOARD");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("gymflow_user");
    localStorage.removeItem("gymflow_token");
    delete api.defaults.headers.common["Authorization"];
    setActiveTab("DASHBOARD");
  };

  // Login view is rendered if no authenticated user
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar Menu Items with role constraints
  const NAVIGATION_ITEMS = [
    { id: "DASHBOARD", label: "Dashboard", icon: Activity, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "RECEPTIONIST", "MEMBER"] },
    { id: "MEMBERS", label: "Members CRM", icon: Users, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "RECEPTIONIST"] },
    { id: "ATTENDANCE", label: "Attendance Log", icon: Calendar, roles: ["SUPER_ADMIN", "GYM_OWNER", "RECEPTIONIST"] },
    { id: "PAYMENTS", label: "Payments Billing", icon: DollarSign, roles: ["SUPER_ADMIN", "GYM_OWNER", "RECEPTIONIST"] },
    { id: "WORKOUT", label: "Workouts & Diet", icon: Dumbbell, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER"] },
    { id: "STAFF", label: "Staff Invites", icon: Sliders, roles: ["SUPER_ADMIN", "GYM_OWNER"] },
    { id: "SAAS", label: "Multi-Tenant SaaS", icon: Globe, roles: ["SUPER_ADMIN"] },
    { id: "REPORTS", label: "Reports & Audits", icon: FileText, roles: ["SUPER_ADMIN", "GYM_OWNER", "RECEPTIONIST"] },
  ];

  const FUTURE_MODULES = [
    { id: "CAM_ATTENDANCE", label: "Camera Biometrics", icon: Camera, roles: ["SUPER_ADMIN", "GYM_OWNER"] },
    { id: "AI_WORKOUT", label: "GenAI Gym Coach", icon: Sparkles, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER"] },
    { id: "WHATSAPP", label: "WhatsApp Alerts", icon: MessageSquare, roles: ["SUPER_ADMIN", "GYM_OWNER"] },
  ];

  // Filtering modules by active roles
  const allowedNav = NAVIGATION_ITEMS.filter(item => item.roles.includes(user.role));
  const allowedFuture = FUTURE_MODULES.filter(item => item.roles.includes(user.role));

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "DASHBOARD":
        return <DashboardView user={user} setTab={setActiveTab} />;
      case "MEMBERS":
        return <MembersView user={user} />;
      case "ATTENDANCE":
        return <AttendanceView user={user} />;
      case "PAYMENTS":
        return <PaymentsView user={user} />;
      case "WORKOUT":
        return <WorkoutDietView user={user} />;
      case "STAFF":
        return <StaffView user={user} />;
      case "SAAS":
        return <GymsSaaSView user={user} />;
      case "REPORTS":
        return <ReportsView user={user} />;
        
      // Future experimental placeholders
      case "CAM_ATTENDANCE":
        return (
          <PlaceholderFutureView 
            title="Overhead Camera Biometrics Attendance Feed" 
            description="Track athlete entries, count daily workout repetitions, and identify membership credential sharing instantly using computer vision recognition triggers behind your on-premise camera stream." 
          />
        );
      case "AI_WORKOUT":
        return (
          <PlaceholderFutureView 
            title="GenAI Athletic Routine Architect" 
            description="Leverage pre-trained Google Gemini 1.5 flash weights and smart context memory schemas to map physical attributes, muscle sore ratings, and historic progress curves into highly customized muscle building and high-calorie diets." 
          />
        );
      case "WHATSAPP":
        return (
          <PlaceholderFutureView 
            title="WhatsApp automated cloud dispatch" 
            description="Onboard custom WhatsApp business numbers to broadcast direct automated invoices, membership payment alerts, training milestone reminders, or friendly birthday wishes seamlessly." 
          />
        );
      default:
        return <DashboardView user={user} setTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-orange-500 selection:text-black">
      
      {/* 1. MOBILE RESPONSIVE NAV BAR HEADER */}
      <div className="md:hidden bg-[#0A0A0A] border-b border-orange-500/20 p-4 flex justify-between items-center z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black text-black text-lg italic">
            GF
          </div>
          <span className="font-bold text-white text-lg tracking-tighter">GYMFLOW<span className="text-orange-500 font-black">.</span></span>
        </div>
        
        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* 2. MAIN DESKTOP SIDEBAR NAVIGATION */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-orange-500/20 flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out shrink-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="space-y-6">
          {/* Brand logo (hidden on mobile header double) */}
          <div className="hidden md:flex items-center gap-3 pb-4 border-b border-zinc-800/80">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black text-black text-xl italic shadow-[0_0_15px_rgba(249,115,22,0.35)]">
              GF
            </div>
            <div>
              <span className="font-bold text-white tracking-tighter text-xl block">GYMFLOW<span className="text-orange-500 font-black">.</span></span>
              <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-widest block mt-0.5">SECURE PORTAL</span>
            </div>
          </div>

          {/* User profile capsule card */}
          <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 font-black flex items-center justify-center text-xs">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="text-white font-bold text-xs truncate block">{user.fullName}</span>
              <span className="text-[10px] text-orange-500 font-mono tracking-wider block font-bold mt-0.5">{user.role}</span>
            </div>
          </div>

          {/* Nav groups */}
          <nav className="space-y-4 text-xs font-medium">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-zinc-655 block uppercase tracking-widest pl-3 mb-2">SYSTEM CONFIG</span>
              {allowedNav.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`nav-item-${item.id.toLowerCase()}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all outline-none font-semibold text-left cursor-pointer
                      ${isActive 
                        ? "bg-orange-500/10 text-orange-500 font-bold border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                        : "text-zinc-550 hover:text-white hover:bg-zinc-900/40"}
                    `}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? "bg-orange-500" : "bg-zinc-700"}`} />
                    <IconComponent className={`w-4 h-4 shrink-0 -ml-0.5 ${isActive ? "text-orange-500" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {allowedFuture.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-zinc-800/80">
                <span className="text-[9px] font-mono text-zinc-655 block uppercase tracking-widest pl-3 mb-2">BETA LAB MODULES</span>
                {allowedFuture.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`nav-item-${item.id.toLowerCase()}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`
                        w-full py-3 px-4 rounded-xl flex items-center gap-3 transition-all outline-none text-left cursor-pointer
                        ${isActive 
                          ? "bg-orange-500/10 text-orange-500 font-bold border border-orange-500/20" 
                          : "text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900/20"}
                      `}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-orange-500" : "bg-zinc-800"}`} />
                      <IconComponent className={`w-4 h-4 shrink-0 -ml-0.5 ${isActive ? "text-orange-500" : "text-zinc-600"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Logout bottom row item */}
        <div className="pt-4 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-3 bg-[#0A0A0A] hover:bg-red-500/10 hover:text-red-400 border border-zinc-900 rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-zinc-400 cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-zinc-500 hover:text-red-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKPLACE CANVAS */}
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,_#1a1a1a_0%,_#000_100%)] p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderActiveComponent()}
      </main>

    </div>
  );
}
