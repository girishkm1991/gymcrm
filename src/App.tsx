import React, { useState, useEffect } from "react";
import { 
  Dumbbell, Activity, Users, Calendar, DollarSign, Heart, Sliders, Globe, FileText, 
  Camera, Sparkles, MessageSquare, LogOut, Menu, X, UserCheck,
  ChevronLeft, ChevronRight, Settings, HelpCircle, PanelLeftClose, PanelLeftOpen, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
import SaaSBillingView from "./components/SaaSBillingView";
import PlaceholderFutureView from "./components/PlaceholderFutureView";
import { RegistrationView } from "./components/RegistrationView";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("DASHBOARD");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false); // Collapsible Sidebar State

  // States for sub-form navigation and back-routing transitions
  const [initialFormState, setInitialFormState] = useState<"LIST" | "ADD" | "EDIT" | "PROFILE">("LIST");
  const [membersBackTarget, setMembersBackTarget] = useState<"DASHBOARD" | "LIST">("LIST");

  const handleSetTab = (tab: string, form?: "LIST" | "ADD" | "EDIT" | "PROFILE", backTo?: "DASHBOARD" | "LIST") => {
    setActiveTab(tab);
    if (tab === "MEMBERS") {
      setInitialFormState(form || "LIST");
      setMembersBackTarget(backTo || "LIST");
    }
  };

  // Restore authenticated session states
  useEffect(() => {
    const savedUser = localStorage.getItem("imvelogym_user") || localStorage.getItem("gymflow_user");
    const savedToken = localStorage.getItem("imvelogym_token") || localStorage.getItem("gymflow_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      // Inject token into Axios interceptors
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }

    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener("imvelogym-unauthorized", handleUnauthorized);
    window.addEventListener("gymflow-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("imvelogym-unauthorized", handleUnauthorized);
      window.removeEventListener("gymflow-unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (userProfile: any, authToken: string) => {
    setUser(userProfile);
    setToken(authToken);
    localStorage.setItem("imvelogym_user", JSON.stringify(userProfile));
    localStorage.setItem("imvelogym_token", authToken);
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
    localStorage.removeItem("imvelogym_user");
    localStorage.removeItem("imvelogym_token");
    localStorage.removeItem("gymflow_user");
    localStorage.removeItem("gymflow_token");
    delete api.defaults.headers.common["Authorization"];
    setActiveTab("DASHBOARD");
  };

  // Login view is rendered if no authenticated user
  if (!user) {
    if (isRegistering) {
      return (
        <RegistrationView
          onBackToLogin={() => setIsRegistering(false)}
          onRegistrationSuccess={(userProfile, authToken) => {
            setIsRegistering(false);
            handleLoginSuccess(userProfile, authToken);
          }}
        />
      );
    }
    return <LoginView onLoginSuccess={handleLoginSuccess} onRegisterClick={() => setIsRegistering(true)} />;
  }

  // Sidebar Menu Items with role constraints
  const NAVIGATION_ITEMS = [
    { id: "DASHBOARD", label: "Dashboard", icon: Activity, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "RECEPTIONIST", "MEMBER"] },
    { id: "MEMBERS", label: "Members CRM", icon: Users, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "RECEPTIONIST"] },
    { id: "ATTENDANCE", label: "Attendance Log", icon: Calendar, roles: ["SUPER_ADMIN", "GYM_OWNER", "RECEPTIONIST"] },
    { id: "PAYMENTS", label: "Payments Billing", icon: DollarSign, roles: ["SUPER_ADMIN", "GYM_OWNER", "RECEPTIONIST"] },
    { id: "WORKOUT", label: "Workouts & Diet", icon: Dumbbell, roles: ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "RECEPTIONIST", "MEMBER"] },
    { id: "STAFF", label: "Staff Invites", icon: Sliders, roles: ["SUPER_ADMIN", "GYM_OWNER"] },
    { id: "SAAS", label: "Multi-Tenant SaaS", icon: Globe, roles: ["SUPER_ADMIN"] },
    { id: "SAAS_BILLING", label: "SaaS Billing", icon: CreditCard, roles: ["SUPER_ADMIN", "GYM_OWNER"] },
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
    // Route guard check: Only allow tabs present in the user's role-allowed sets
    const hasPermission = NAVIGATION_ITEMS.some(item => item.id === activeTab && item.roles.includes(user.role)) ||
                          FUTURE_MODULES.some(item => item.id === activeTab && item.roles.includes(user.role));
                          
    if (!hasPermission) {
      const defaultTab = user.role === "SUPER_ADMIN" ? "SAAS" : "DASHBOARD";
      setTimeout(() => setActiveTab(defaultTab), 0);
      return <DashboardView user={user} setTab={handleSetTab} />;
    }

    switch (activeTab) {
      case "DASHBOARD":
        return <DashboardView user={user} setTab={handleSetTab} />;
      case "MEMBERS":
        return (
          <MembersView 
            user={user} 
            setTab={handleSetTab}
            initialForm={initialFormState}
            backTarget={membersBackTarget}
            onBack={() => {
              if (membersBackTarget === "DASHBOARD") {
                setActiveTab("DASHBOARD");
              }
              setInitialFormState("LIST");
              setMembersBackTarget("LIST");
            }}
          />
        );
      case "ATTENDANCE":
        return <AttendanceView user={user} setTab={handleSetTab} />;
      case "PAYMENTS":
        return <PaymentsView user={user} setTab={handleSetTab} />;
      case "WORKOUT":
        return <WorkoutDietView user={user} />;
      case "STAFF":
        return <StaffView user={user} setTab={handleSetTab} />;
      case "SAAS":
        return <GymsSaaSView user={user} />;
      case "SAAS_BILLING":
        return <SaaSBillingView user={user} />;
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
        return <DashboardView user={user} setTab={handleSetTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#FF7A00] selection:text-black">
      
      {/* 1. MOBILE RESPONSIVE NAV BAR HEADER */}
      <div className="md:hidden bg-[#171717]/95 border-b border-[#2A2A2A] p-4 flex justify-between items-center z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#FF7A00] to-amber-600 rounded-xl flex items-center justify-center font-bold text-black text-base tracking-tighter shadow-[0_0_15px_rgba(255,122,0,0.3)]">
            IG
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Imvelo<span className="text-[#FF7A00]">GYM</span></span>
        </div>
        
        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-[#171717] border border-[#2A2A2A] rounded-xl text-zinc-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. MAIN DESKTOP SIDEBAR NAVIGATION */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-40 bg-[#171717] border-r border-[#2A2A2A] flex flex-col justify-between p-4 transform transition-all duration-300 ease-in-out shrink-0
          ${isCollapsed ? "w-20" : "w-66"}
          ${isMobileMenuOpen ? "translate-x-0 w-66" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="space-y-5">
          {/* Brand header / collapse trigger row */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#FF7A00] to-amber-600 rounded-xl flex items-center justify-center font-black text-black text-sm tracking-tighter shadow-[0_0_12px_rgba(255,122,0,0.3)]">
                IG
              </div>
              {(!isCollapsed || isMobileMenuOpen) && (
                <div>
                  <span className="font-extrabold text-white text-base tracking-tight block">Imvelo<span className="text-[#FF7A00]">GYM</span></span>
                  <span className="text-[8px] text-[#A0A0A0] font-mono uppercase tracking-widest block mt-0.5">SaaS Enterprise</span>
                </div>
              )}
            </div>

            {/* Collapse toggle button for desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-zinc-400 hover:text-white hover:border-zinc-600 transition"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* User profile card (collapsible) */}
          <div className="bg-[#0A0A0A] rounded-2xl p-3 border border-[#2A2A2A] flex items-center gap-2.5 overflow-hidden">
            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 transition-all ${isCollapsed && !isMobileMenuOpen ? "bg-[#FF7A00]/15 text-[#FF7A00] border border-[#FF7A00]/30" : "bg-gradient-to-br from-[#FF7A00]/20 to-orange-400/5 text-[#FF7A00] border border-[#FF7A00]/20"}`}>
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="overflow-hidden">
                <span className="text-white font-semibold text-xs truncate block">{user.fullName}</span>
                <span className="text-[9px] text-[#FF7A00] font-mono tracking-wider block font-semibold mt-0.5 uppercase">{user.role.replace("_", " ")}</span>
              </div>
            )}
          </div>

          {/* Nav groups */}
          <nav className="space-y-4 text-xs font-semibold">
            {/* Core Modules List */}
            <div className="space-y-1">
              {(!isCollapsed || isMobileMenuOpen) && (
                <span className="text-[9px] font-mono text-[#A0A0A0] block uppercase tracking-widest pl-3 mb-1.5">Business Desk</span>
              )}
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
                      w-full py-2.5 px-3.5 rounded-xl flex items-center gap-3 transition-all outline-none text-left cursor-pointer relative group
                      ${isActive 
                        ? "bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/25 font-bold shadow-[0_0_15px_rgba(255,122,0,0.06)]" 
                        : "text-[#A0A0A0] border border-transparent hover:text-white hover:bg-white/5"}
                    `}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[#FF7A00]" : "text-zinc-400 group-hover:text-zinc-200"}`} />
                    {(!isCollapsed || isMobileMenuOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Tooltip on collapsed state */}
                    {isCollapsed && !isMobileMenuOpen && (
                      <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2A2A] shadow-xl">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Smart / Future Integrations */}
            {allowedFuture.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-[#2A2A2A]">
                {(!isCollapsed || isMobileMenuOpen) && (
                  <span className="text-[9px] font-mono text-[#A0A0A0] block uppercase tracking-widest pl-3 mb-1.5">Integrations</span>
                )}
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
                        w-full py-2.5 px-3.5 rounded-xl flex items-center gap-3 transition-all outline-none text-left cursor-pointer relative group
                        ${isActive 
                          ? "bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/25 font-bold" 
                          : "text-[#A0A0A0] border border-transparent hover:text-white hover:bg-white/5"}
                      `}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[#FF7A00]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                      {(!isCollapsed || isMobileMenuOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Tooltip on collapsed state */}
                      {isCollapsed && !isMobileMenuOpen && (
                        <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-[#2A2A2A] shadow-xl">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Logout bottom row item */}
        <div className="pt-3 border-t border-[#2A2A2A]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 hover:bg-[#EF4444]/10 hover:text-red-400 border border-transparent hover:border-[#EF4444]/20 rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-[#A0A0A0] cursor-pointer text-left relative group"
          >
            <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
            {(!isCollapsed || isMobileMenuOpen) && (
              <span>Sign Out</span>
            )}
            
            {isCollapsed && !isMobileMenuOpen && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-[#EF4444] text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Sign Out Session
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKPLACE CANVAS */}
      <main className="flex-1 bg-[#0A0A0A] p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col justify-between min-h-screen">
        
        {/* Animated Active Component Mount */}
        <div className="flex-1 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderActiveComponent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. PREMIUM FOOTER */}
        <footer className="border-t border-[#2A2A2A] pt-4 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#A0A0A0] font-medium font-mono">
          <div>
            &copy; {new Date().getFullYear()} <span className="text-white font-bold">ImveloGYM</span> Technologies. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-[#FF7A00] transition">Privacy Policy</a>
            <span className="text-zinc-800">&bull;</span>
            <a href="#terms" className="hover:text-[#FF7A00] transition">Terms of Service</a>
            <span className="text-zinc-800">&bull;</span>
            <a href="#support" className="hover:text-[#FF7A00] transition">Support</a>
            <span className="text-zinc-800">&bull;</span>
            <span className="bg-[#2A2A2A] text-zinc-300 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">v4.2.0</span>
          </div>
        </footer>
      </main>

    </div>
  );
}
