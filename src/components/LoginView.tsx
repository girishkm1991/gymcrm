import React, { useState } from "react";
import { Dumbbell, Shield, User, Lock, Mail, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import api from "../services/api";

interface LoginViewProps {
  onLoginSuccess: (userProfile: any, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [infoStatus, setInfoStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Elite predefined sandbox accounts
  const DESKTOP_DEMOS = [
    { name: "Global Admin", email: "admin@gymflow.com", role: "SUPER_ADMIN", desc: "SaaS Multi-Gym Manager" },
    { name: "Gym Owner", email: "owner@gymflow.com", role: "GYM_OWNER", desc: "Marcus Aurelius (Elite Club)" },
    { name: "Coach Zara", email: "trainer@gymflow.com", role: "TRAINER", desc: "Fitness Workout & Diet Plans" },
    { name: "Sarah reception", email: "receptionist@gymflow.com", role: "RECEPTIONIST", desc: "Member Registries" },
    { name: "Hemsworth VIP", email: "member@gymflow.com", role: "MEMBER", desc: "Chris H. Workout Board" }
  ];

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorStatus("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    setInfoStatus(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { user, token } = response.data;
      onLoginSuccess(user, token);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Invalid mail or account credentials.";
      setErrorStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail || !newPassword) {
      setErrorStatus("All fields are mandatory to reset.");
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    setInfoStatus(null);

    try {
      const response = await api.post("/auth/reset", { email: recoverEmail, newPassword });
      setInfoStatus(response.data.message || "Password updated successfully!");
      setIsForgotMode(false);
      setEmail(recoverEmail);
      setPassword(newPassword);
    } catch (err: any) {
      setErrorStatus(err.response?.data?.error || "Error updating password record.");
    } finally {
      setLoading(false);
    }
  };

  const triggerInstantLogin = async (demoMail: string) => {
    setLoading(true);
    setErrorStatus(null);
    setInfoStatus(null);

    try {
      const response = await api.post("/auth/login", {
        email: demoMail,
        password: "password123",
      });
      const { user, token } = response.data;
      onLoginSuccess(user, token);
    } catch (err: any) {
      setErrorStatus("Failed to access demo account. Recheck database seed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative md:overflow-y-auto bg-[radial-gradient(circle_at_top_right,_#1a1a1a_0%,_#000_100%)] selection:bg-orange-500 selection:text-black">
      {/* Background visual graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative z-10">
        
        {/* Logo/Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-black text-black text-2xl italic shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              GF
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-white">
              GYMFLOW<span className="text-orange-500">.</span>
            </h1>
          </div>
          <p className="text-zinc-500 text-xs tracking-wider uppercase font-mono !mt-3">
            Multi-Role Cloud Console
          </p>
        </div>

        {/* Feedback Notices */}
        {errorStatus && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        {infoStatus && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{infoStatus}</span>
          </div>
        )}

        {/* Auth Forms */}
        {!isForgotMode ? (
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 font-mono">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="email"
                  placeholder="name@gymflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-400 font-mono">SECURE PASSWORD</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(true);
                    setErrorStatus(null);
                    setInfoStatus(null);
                  }}
                  className="text-xs text-amber-500 hover:underline hover:text-amber-400"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Sign In to GymFlow"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4 animate-slideDown">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-500" /> Administrative Reset
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Provides visual recovery for on-premise accounts. Authenticate to set a custom key override instantly.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 font-mono">ACCOUNT EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="email"
                  placeholder="owner@gymflow.com"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 font-mono">NEW NEW PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setErrorStatus(null);
                  setInfoStatus(null);
                }}
                className="flex-1 h-11 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 font-semibold rounded-xl text-sm transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 bg-amber-500 text-black hover:bg-amber-400 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                {loading ? "Revising..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}

        {/* Preset Instant Demo Logins Pane */}
        <div className="border-t border-zinc-900 pt-5 space-y-3">
          <span className="text-xs font-bold font-mono tracking-widest text-amber-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
            ONE-CLICK INSTANT DEMO SWIFT-LOGIN:
          </span>
          <div className="grid grid-cols-2 gap-2 text-left">
            {DESKTOP_DEMOS.map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => triggerInstantLogin(d.email)}
                className="bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 border border-zinc-800/40 rounded-xl p-2.5 text-left transition-all active:scale-95 group cursor-pointer"
                id={`demo-btn-${d.role.toLowerCase()}`}
              >
                <div className="text-[11px] font-bold text-white group-hover:text-amber-400 font-mono">
                  {d.name}
                </div>
                <div className="text-[9px] text-zinc-400 truncate mt-0.5">
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-zinc-500 font-mono">
          GymFlow CRM Secure Sandbox Mode v1.0.0
        </div>
      </div>
    </div>
  );
}
