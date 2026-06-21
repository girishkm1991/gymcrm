import React, { useState } from "react";
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Lock, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  CreditCard,
  Image as ImageIcon,
  KeyRound,
  RotateCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";

interface RegistrationViewProps {
  onBackToLogin: () => void;
  onRegistrationSuccess: (user: any, token: string) => void;
}

export function RegistrationView({ onBackToLogin, onRegistrationSuccess }: RegistrationViewProps) {
  // Wizard Step State: 1 | 2 | 3 | 4 (Success)
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  // 1. Gym Information
  const [gymName, setGymName] = useState("");
  const [gymLogo, setGymLogo] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // 2. Owner Information
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 3. Business Details
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [gstNumber, setGstNumber] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // Password Validation Checklists
  const isPasswordLong = ownerPassword.length >= 6;
  const passwordsMatch = ownerPassword === confirmPassword && confirmPassword.length > 0;

  // Real-time step validation
  const validateStep = (s: number): boolean => {
    setErrorMessage(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (s === 1) {
      if (!gymName.trim()) return triggerError("Gym Name is required.");
      if (!address.trim()) return triggerError("Street Address is required.");
      if (!city.trim()) return triggerError("City is required.");
      if (!state.trim()) return triggerError("State or Province is required.");
      if (!pincode.trim()) return triggerError("Pincode / Zip Code is required.");
      if (!phone.trim()) return triggerError("Gym Contact Phone is required.");
      if (!email.trim() || !emailRegex.test(email)) return triggerError("A valid Gym Email address is required.");
    } else if (s === 2) {
      if (!ownerName.trim()) return triggerError("Owner Full Name is required.");
      if (!ownerPhone.trim()) return triggerError("Mobile Number is required.");
      if (!ownerEmail.trim() || !emailRegex.test(ownerEmail)) return triggerError("A valid Personal Email address is required.");
      if (!ownerPassword) return triggerError("Password is required.");
      if (ownerPassword.length < 6) return triggerError("Password must be at least 6 characters.");
      if (ownerPassword !== confirmPassword) return triggerError("Passwords do not match.");
    } else if (s === 3) {
      if (!timezone) return triggerError("Please select a Time Zone.");
      if (!currency) return triggerError("Please select a standard Currency.");
      if (!acceptTerms || !acceptPrivacy) return triggerError("You must read and accept both Terms & Conditions and Privacy Policy to continue.");
    }
    return true;
  };

  const triggerError = (msg: string): boolean => {
    setErrorMessage(msg);
    return false;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      onBackToLogin();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/auth/register", {
        gymName,
        gymLogo,
        address,
        city,
        state,
        country,
        pincode,
        phone,
        email,
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerPassword,
        confirmPassword,
        timezone,
        currency,
        gstNumber,
        acceptTerms,
        acceptPrivacy
      });

      // API outputs { user, token, message }
      const { user, token } = response.data;

      // Advance to success tab
      setStep(4);
      setTimeout(() => {
        onRegistrationSuccess(user, token);
      }, 2500);

    } catch (err: any) {
      const serverErr = err.response?.data?.error || "Registration encountered an unexpected transactional failure.";
      setErrorMessage(serverErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative bg-[radial-gradient(circle_at_top_right,_#1a1a1a_0%,_#000_100%)] selection:bg-orange-500 selection:text-black md:overflow-y-auto">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl relative z-10">
        
        {/* Header Header */}
        <div className="flex justify-between items-center pb-5 border-b border-zinc-900 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-black text-xl italic shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              GF
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Register Gym Workspace
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                SaaS Multi-Tenant Onboarding
              </p>
            </div>
          </div>
          
          {step <= 3 && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-orange-500 font-bold">{step}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">3</span>
            </div>
          )}
        </div>

        {/* Real-time Validation Banner */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs mb-6 flex items-start gap-2.5 animate-pulse">
            <span className="font-bold font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] shrink-0 uppercase">ERROR</span>
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Wizard Steps */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Gym Core Information */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-orange-500/10 rounded-2xl p-4 border border-orange-500/10 flex gap-3.5">
                  <Building2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-orange-500 uppercase font-mono tracking-wider">Gym Information</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Enter the commercial profile of your establishment. This will customize your public invoices, receipt stamps, and membership catalog.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">GYM BRAND NAME *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="e.g. Iron Forge Gymnasium"
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">LOGO URL (OPTIONAL)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="url"
                        placeholder="e.g. https://domain.com/logo.png"
                        value={gymLogo}
                        onChange={(e) => setGymLogo(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">STREET ADDRESS *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="e.g. Suite 101, Powerhouse Boulevard"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">CITY *</label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">STATE / REGION *</label>
                    <input
                      type="text"
                      placeholder="e.g. California"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">COUNTRY *</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="e.g. USA"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">POSTAL PINCODE / ZIP *</label>
                    <input
                      type="text"
                      placeholder="e.g. 94103"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">OFFICIAL GYM PHONE *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="tel"
                        placeholder="e.g. +1 (555) 0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">CORNER EMAIL ADDRESS *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="email"
                        placeholder="e.g. contact@forgegym.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Owner Personal Credentials */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/10 flex gap-3.5">
                  <User className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-500 uppercase font-mono tracking-wider">Owner Profile</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Establish your superuser identity keys. You will sign in with these credentials to unlock your exclusive multi-tenant administrative portal.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">FULL LEGAL NAME *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="e.g. Alexander Strong"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">MOBILE NUMBER *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="tel"
                        placeholder="e.g. +1 (555) 0122"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">PERSONAL EMAIL ADDRESS *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="email"
                        placeholder="e.g. owner@gmail.com"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-zinc-900/60 pt-3 md:col-span-2">
                    <span className="text-[10px] font-bold font-mono text-zinc-500 block">PASSWORD POLICY STATUS</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className={`p-2 rounded-lg border ${isPasswordLong ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-zinc-900/60 border-zinc-800/80 text-zinc-500"} transition-all`}>
                        {isPasswordLong ? "✓" : "✗"} Min 6 Characters
                      </div>
                      <div className={`p-2 rounded-lg border ${passwordsMatch ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-zinc-900/60 border-zinc-800/80 text-zinc-500"} transition-all`}>
                        {passwordsMatch ? "✓" : "✗"} Keys Match
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">CREATE SAFE PASSWORD *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">CONFIRM SECURITY PASSWORD *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Business Setup & Legal Acceptance */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-orange-600/10 rounded-2xl p-4 border border-orange-600/10 flex gap-3.5">
                  <CreditCard className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-orange-500 uppercase font-mono tracking-wider">Business & Tax settings</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Select your operational parameters. Your currency determines billing decimals. We automatically compile 4 default membership plans (Monthly, Quarterly, Half-Yearly, Annual) to get you functional instantly!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">SYSTEM CURRENCY *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AED">AED (Dh)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">TIME ZONE *</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">GST / CORPORATE TAX NUMBER (OPTIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. GST-29AAAAA0000A1Z5"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-3 pt-2 md:col-span-2 border-t border-zinc-900">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 accent-orange-500 rounded border-zinc-800 bg-zinc-900"
                      />
                      <span className="text-zinc-400 text-xs leading-snug group-hover:text-zinc-300 transition-colors">
                        I hereby acknowledge and agree to the <span className="text-orange-500 hover:underline">Terms & Conditions</span>. I understand this establishes an isolated multi-tenant environment.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="mt-1 accent-orange-500 rounded border-zinc-800 bg-zinc-900"
                      />
                      <span className="text-zinc-400 text-xs leading-snug group-hover:text-zinc-300 transition-colors">
                        I hereby consent to my data being handled in alignment with the <span className="text-orange-500 hover:underline">Privacy Policy</span>. No global data blending or unauthorized personnel sharing.
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Beautiful Onboarding Launch Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-16 h-16 bg-slate-900 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center font-black text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
                  ✓
                </div>
                <div className="space-y-1.5 pt-2">
                  <h2 className="text-2xl font-black text-white font-mono tracking-tight uppercase">Workspace Approved!</h2>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    We are completing the automatic tenant setup for <span className="text-orange-500 font-bold">{gymName}</span>. Instantiating isolated rosters, core settings structures and default subscription values...
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-mono tracking-widest pt-4">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-orange-500 font-bold" /> Routing dashboard keys override...
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Controls Footer */}
          {step <= 3 && (
            <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-5 h-11 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white font-medium rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 1 ? "Back to Login" : "Go Back"}
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 h-11 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-[0_4px_15px_rgba(249,115,22,0.2)]"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 h-11 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl text-xs flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      Create Gym Account
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
