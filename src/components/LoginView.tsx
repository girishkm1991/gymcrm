import React, { useState, useEffect } from "react";
import { 
  Shield, User, Lock, Mail, ChevronRight, AlertCircle, RefreshCw, 
  Eye, EyeOff, Dumbbell, Calendar, DollarSign, Users, FileText, Sparkles, CheckCircle2,
  CreditCard, Globe, Cloud, Check, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";

interface LoginViewProps {
  onLoginSuccess: (userProfile: any, token: string) => void;
  onRegisterClick: () => void;
}

export default function LoginView({ onLoginSuccess, onRegisterClick }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  
  // Custom toast notifications inside the screen
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; message: string }[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // States for forced password change on first login
  const [isForcePassChangeMode, setIsForcePassChangeMode] = useState(false);
  const [forceEmail, setForceEmail] = useState("");
  const [forceCurrentPassword, setForceCurrentPassword] = useState("");
  const [newPassVal, setNewPassVal] = useState("");
  const [confirmNewPassVal, setConfirmNewPassVal] = useState("");

  // Presets
  const DESKTOP_DEMOS = [
    { name: "Global Admin", email: "admin@gymflow.com", role: "SUPER_ADMIN", desc: "SaaS Multi-Gym Manager" },
    { name: "Gym Owner", email: "owner@gymflow.com", role: "GYM_OWNER", desc: "Marcus Aurelius (Elite Club)" },
    { name: "Coach Zara", email: "trainer@gymflow.com", role: "TRAINER", desc: "Fitness Workout & Diet Plans" },
    { name: "Sarah reception", email: "receptionist@gymflow.com", role: "RECEPTIONIST", desc: "Member Registries" },
    { name: "Hemsworth VIP", email: "member@gymflow.com", role: "MEMBER", desc: "Chris H. Workout Board" }
  ];

  // Try to pre-fill email if remember me was checked before
  useEffect(() => {
    const savedEmail = localStorage.getItem("imvelogym_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast("error", "Email address is required.");
      return;
    }
    if (!password) {
      addToast("error", "Please provide your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { user, token } = response.data;

      if (rememberMe) {
        localStorage.setItem("imvelogym_remembered_email", email);
      } else {
        localStorage.removeItem("imvelogym_remembered_email");
      }

      // Check if temporary preset password protocol is required
      if (user.forcePasswordChange) {
        setIsForcePassChangeMode(true);
        setForceEmail(email);
        setForceCurrentPassword(password);
        setNewPassVal("");
        setConfirmNewPassVal("");
        addToast("info", "Security Protocol: Temporary admin credentials detected. A password update is required.");
        setLoading(false);
        return;
      }

      addToast("success", `Welcome back, ${user.fullName}!`);
      setTimeout(() => {
        onLoginSuccess(user, token);
      }, 800);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Invalid login credentials. Please try again.";
      addToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassVal || !confirmNewPassVal) {
      addToast("error", "Please provide and confirm your new secure password.");
      return;
    }
    if (newPassVal === forceCurrentPassword) {
      addToast("error", "New password cannot be identical to the temporary password.");
      return;
    }
    if (newPassVal !== confirmNewPassVal) {
      addToast("error", "Passwords do not match.");
      return;
    }
    if (newPassVal.length < 6) {
      addToast("error", "Password must be at least 6 characters in length.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/force-change-password", {
        email: forceEmail,
        currentPassword: forceCurrentPassword,
        newPassword: newPassVal
      });
      addToast("success", "Password updated successfully. You may now sign in.");
      setIsForcePassChangeMode(false);
      setPassword("");
    } catch (err: any) {
      addToast("error", err.response?.data?.error || "Error saving credentials. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail || !newPassword) {
      addToast("error", "All fields are mandatory to trigger manual update overrides.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/reset", { email: recoverEmail, newPassword });
      addToast("success", response.data.message || "Credential override configured!");
      setIsForgotMode(false);
      setEmail(recoverEmail);
      setPassword(newPassword);
    } catch (err: any) {
      addToast("error", err.response?.data?.error || "Error configuring login overrides.");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoMail: string) => {
    setEmail(demoMail);
    setPassword(demoMail === "admin@gymflow.com" ? "Admin@123" : "password123");
    setIsForgotMode(false);
    setIsForcePassChangeMode(false);
    addToast("info", `Prefilled demo configuration for: ${demoMail}`);
  };

  const features = [
    { label: "Members", desc: "Digital member profiles, bio-metrics tracking & waivers", icon: Users },
    { label: "Attendance", desc: "Automated scan triggers, logs and check-in audits", icon: Calendar },
    { label: "Billing", desc: "Ledgers, custom dynamic plans and automated receipts", icon: DollarSign },
    { label: "Staff", desc: "Clear secure role assignments and operation audits", icon: Shield },
    { label: "Reports", desc: "PDF statements, monthly growth metrics matrices", icon: FileText },
    { label: "AI Coach", desc: "Workout generation backed by Gemini engine models", icon: Sparkles }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Absolute Dynamic Overlay Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md pointer-events-auto ${
                t.type === "success" 
                  ? "bg-[#10B981]/15 border-[#10B981]/35 text-[#10B981]" 
                  : t.type === "error" 
                    ? "bg-[#EF4444]/15 border-[#EF4444]/35 text-[#EF4444]" 
                    : "bg-[#F59E0B]/15 border-[#F59E0B]/35 text-[#F59E0B]"
              }`}
            >
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
              {t.type === "info" && <Shield className="w-5 h-5 shrink-0" />}
              <div className="text-xs font-semibold leading-relaxed">
                {t.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* LEFT SIDE: Premium Fitness Background & Features Card Section */}
      <div className="w-full md:w-[48%] relative hidden md:flex flex-col justify-between p-12 overflow-hidden border-r border-[#2A2A2A]">
        {/* Background Image with optimized scaling parameters */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center scale-105 filter saturate-110 brightness-[0.35]" 
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200')` 
          }}
        />
        
        {/* Atmospheric vignette overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40 z-1" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0A0A0A]/95 z-1" />
        
        {/* Brand header mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#FF7A00] to-amber-600 rounded-xl flex items-center justify-center font-black text-black text-sm tracking-tighter shadow-[0_0_15px_rgba(255,122,0,0.35)]">
            IG
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">Imvelo<span className="text-[#FF7A00]">GYM</span></span>
        </div>

        {/* Catchy headline */}
        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-bold font-mono text-[#FF7A00] tracking-widest uppercase bg-[#FF7A00]/10 px-3 py-1.5 rounded-full border border-[#FF7A00]/20">
              ULTIMATE SAAS PLATFORM
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none mt-4">
              Manage Your Gym <br />
              <span className="text-[#FF7A00] bg-gradient-to-r from-[#FF7A00] to-amber-500 bg-clip-text text-transparent">Smarter.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 pt-6">
            {features.map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-[#171717]/60 border border-[#2A2A2A]/40 backdrop-blur-md rounded-xl p-3 flex gap-2.5 items-start group hover:border-[#FF7A00]/20 transition-all hover:bg-[#171717]/80"
                >
                  <div className="p-1.5 rounded-lg bg-[#FF7A00]/10 text-[#FF7A00] group-hover:bg-[#FF7A00]/20 transition-all">
                    <FeatIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#FF7A00] transition-colors">{feat.label}</div>
                    <div className="text-[10px] text-[#A0A0A0] mt-0.5 leading-snug">{feat.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Small security assurance footer */}
        <div className="relative z-10 text-[10px] text-[#A0A0A0]/60 font-mono flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#10B981]" />
          <span>PCI-DSS Secured &bull; 256-Bit SSL Encrypted Database Node Vault</span>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Login Canvas Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10 bg-[#0A0A0A]">
        
        {/* Circle mesh gradients */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-[#FF7A00]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[420px] space-y-8">
          
          {/* Logo mark for mobile viewport */}
          <div className="text-center space-y-3 md:hidden">
            <div className="inline-flex items-center gap-2.5 bg-[#171717] px-4 py-2 rounded-2xl border border-[#2A2A2A]">
              <div className="w-7 h-7 bg-gradient-to-br from-[#FF7A00] to-amber-600 rounded-lg flex items-center justify-center font-bold text-black text-xs shadow-md">
                IG
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">Imvelo<span className="text-[#FF7A00]">GYM</span></span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
            <p className="text-xs text-[#A0A0A0]">Enter account details to access your dashboard</p>
          </div>

          {/* Desktop header titles */}
          <div className="hidden md:block space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
            <p className="text-xs text-[#A0A0A0]">Access your real-time ImveloGYM workspace statistics</p>
          </div>

          {/* Main conditional flow containers */}
          <AnimatePresence mode="wait">
            {isForcePassChangeMode ? (
              <motion.form 
                key="force"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForcePasswordChangeSubmit} 
                className="space-y-4 bg-[#171717] p-6 rounded-2xl border border-[#2A2A2A] shadow-xl"
              >
                <div className="space-y-1.5">
                  <h2 className="text-xs font-black text-[#FF7A00] font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 animate-pulse" /> Security Protocols
                  </h2>
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                    First login credential change protocol. Please set a secure custom password.
                  </p>
                </div>

                {/* Password field indicator */}
                <div className="space-y-1.5 focus-within:text-[#FF7A00] transition-colors">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider font-mono">NEW SECURE PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassVal}
                      onChange={(e) => setNewPassVal(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-[#FF7A00] rounded-xl py-3 pl-10 pr-4 text-white text-xs focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:text-[#FF7A00] transition-colors">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider font-mono">CONFIRM PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmNewPassVal}
                      onChange={(e) => setConfirmNewPassVal(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-[#FF7A00] rounded-xl py-3 pl-10 pr-4 text-white text-xs focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-[#FF7A00] to-orange-600 hover:brightness-110 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_20px_rgba(255,122,0,0.25)] disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save New Password"}
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsForcePassChangeMode(false)}
                  className="w-full h-10 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-zinc-900 text-zinc-400 font-bold rounded-xl text-xs transition-all text-center cursor-pointer"
                >
                  Go Back
                </button>
              </motion.form>
            ) : !isForgotMode ? (
              <motion.form 
                key="signin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleManualLogin} 
                className="space-y-4"
              >
                {/* Email input field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider font-mono">EMAIL ADDRESS</label>
                  </div>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 transition-colors group-focus-within:text-[#FF7A00]" />
                    <input
                      type="email"
                      placeholder="name@imvelogym.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#171717] border border-[#2A2A2A] focus:border-[#FF7A00]/50 focus:outline-none rounded-xl py-3.5 pl-11 pr-4 text-white text-xs transition-all placeholder:text-zinc-600"
                      required
                    />
                  </div>
                </div>

                {/* Password input field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider font-mono">PASSWORD</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                      }}
                      className="text-[10px] text-[#FF7A00] hover:underline font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 transition-colors group-focus-within:text-[#FF7A00]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#171717] border border-[#2A2A2A] focus:border-[#FF7A00]/50 focus:outline-none rounded-xl py-3.5 pl-11 pr-12 text-white text-xs transition-all placeholder:text-zinc-600 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me box */}
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-[#FF7A00] w-3.5 h-3.5 bg-zinc-900 border-[#2A2A2A] rounded focus:ring-0"
                    />
                    <span className="text-[11px] text-[#A0A0A0] font-medium font-sans">Remember email address</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#FF7A00] hover:bg-orange-600 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-[0_4px_25px_rgba(255,122,0,0.22)] disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Secure Authentication</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Custom Create Gym Account line */}
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="w-full h-11 border border-[#2A2A2A] bg-transparent hover:bg-white/5 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  Create Gym Account / Register Tenant
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 bg-[#171717] p-6 rounded-2xl border border-[#2A2A2A] text-center"
              >
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-[#FF7A00] mx-auto">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-sm">Automated Cloud Recoveries</h3>
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                    Database level security policies require local administrator overrides to reset.
                  </p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-3 border border-[#2A2A2A] text-center">
                  <span className="text-[9px] font-bold font-mono tracking-widest text-[#FF7A00] block">SMTP DISPATCH</span>
                  <span className="text-xs font-bold text-white block mt-0.5">SERVICE COMING SOON</span>
                </div>

                <p className="text-[10px] text-zinc-500 text-left leading-relaxed leading-normal">
                  Our cloud email server is temporarily offline for compliance. To log in with sample accounts, use our instant development presets or execute manual database seeding.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                    }}
                    className="w-full h-10 bg-[#0A0A0A] hover:bg-zinc-900 border border-[#2A2A2A] text-zinc-300 font-bold rounded-xl text-xs transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium marketing panel: Why Choose ImveloGYM? */}
          <div className="border-t border-[#2A2A2A] pt-6 space-y-4">
            <div className="text-center md:text-left">
              <h3 className="text-xs font-bold font-mono text-[#FF7A00] tracking-widest uppercase bg-[#FF7A00]/10 px-3 py-1.5 rounded-full border border-[#FF7A00]/20 inline-block">
                Why Choose ImveloGYM?
              </h3>
              <p className="text-[11px] text-[#A0A0A0] mt-2 leading-relaxed font-sans">
                Unlock the ultimate digital athletic platform built for scale, member engagement, and enterprise efficiency.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-2">
              {[
                { label: "Member Management", icon: Users },
                { label: "Attendance Tracking", icon: Calendar },
                { label: "Billing & Payments", icon: CreditCard },
                { label: "Workout & Diet Plans", icon: Dumbbell },
                { label: "AI Fitness Assistant", icon: Sparkles },
                { label: "Secure Role-Based Access", icon: Shield },
                { label: "Multi-Branch Support", icon: Globe },
                { label: "Cloud Backup", icon: Cloud }
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={idx} 
                    className="bg-[#171717] hover:bg-[#1D1D1D] hover:border-[#FF7A00]/30 border border-[#2A2A2A] rounded-xl p-2.5 flex items-center gap-2.5 transition-all text-left group"
                  >
                    <div className="p-1 rounded-lg bg-[#FF7A00]/10 text-[#FF7A00] shrink-0 group-hover:bg-[#FF7A00]/20 transition-all">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[#FF7A00] text-xs font-bold shrink-0">✓</span>
                      <span className="text-[11px] font-bold text-zinc-100 truncate tracking-tight font-sans">{feat.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Premium Footer badge */}
            <div className="border-t border-[#2A2A2A]/55 pt-4 flex items-center justify-between">
              <span className="text-[10px] text-[#A0A0A0] font-mono tracking-wider uppercase">
                ✓ Trusted by Modern Fitness Centers
              </span>

              {/* Dev credentials pane toggler - only rendered on development/localhost and completely hidden in production */}
              {(((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === "development" || window.location.hostname === "localhost")) && (
                <button
                  type="button"
                  onClick={() => setShowDevTools(!showDevTools)}
                  className="p-1 text-zinc-600 hover:text-[#FF7A00] transition-colors rounded-lg bg-[#111] border border-zinc-800"
                  title="Dev Prefill Helpers"
                  id="dev-prefills-toggle"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Collapsible development seeds list - Only in Localhost/DEV environment */}
            {showDevTools && (((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === "development" || window.location.hostname === "localhost")) && (
              <div className="bg-[#111] border border-zinc-800 p-3 rounded-xl space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#FF7A00] rounded-full animate-ping"></span>
                  <span className="text-[9px] font-bold font-mono tracking-widest text-[#FF7A00] uppercase">
                    LOCALLY MOUNTED DEV PREFILLS:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {DESKTOP_DEMOS.map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      onClick={() => selectDemoAccount(d.email)}
                      className="bg-[#171717] hover:bg-zinc-900 hover:border-[#FF7A00]/40 border border-[#2A2A2A] rounded-xl p-2.5 text-left transition-all active:scale-95 group cursor-pointer"
                      id={`demo-btn-${d.role.toLowerCase()}`}
                    >
                      <div className="text-[10px] font-bold text-white group-hover:text-[#FF7A00] font-mono transition-colors">
                        {d.name}
                      </div>
                      <div className="text-[9px] text-[#A0A0A0] truncate mt-0.5 font-mono">
                        {d.role}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-zinc-650 font-mono pt-4 select-none">
            ImveloGYM Secure Hub Mode v4.2.0 (Local Node Host)
          </div>
        </div>
      </div>
    </div>
  );
}
