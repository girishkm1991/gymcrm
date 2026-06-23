import React, { useState, useEffect } from "react";
import { 
  CreditCard, Shield, Users, DollarSign, TrendingUp, UserMinus, PlusCircle, 
  Settings, CheckCircle2, ChevronRight, Ban, Zap, Sparkles, RefreshCw, 
  Layers, Printer, Download, Eye, Terminal, Clock, AlertTriangle, Play,
  Search, Sliders, ExternalLink, Mail, MessageSquare, Info, Star, Save, Check
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";

interface SaasBillingViewProps {
  user: any;
}

// Color scheme for charts
const SAAS_COLORS = ["#FF7A00", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#EAB308"];

export interface SaasPlan {
  id: "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM";
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxMembers: number; // -1 for unlimited
  maxTrainers: number;
  maxStaff: number;
  maxBranches: number;
  storageLimitGb: number;
  supportLevel: "Basic" | "Priority Email" | "24/7 Dedicated" | "VIP Concierge";
  features: string[];
}

export interface SaaSInvoice {
  id: string;
  gymName: string;
  planName: string;
  billingCycle: "Monthly" | "Yearly";
  amount: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: "Paid" | "Pending" | "Failed";
  paidDate?: string;
  dueDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: "PLAN_CHANGE" | "RENEWAL" | "SUSPENSION" | "ACTIVATION" | "PAYMENT_FAILED" | "IMPERSONATION" | "LIMIT_EXCEEDED" | "TRIAL_EXTENSION";
  gymId: string;
  gymName: string;
  user: string;
  details: string;
}

export interface SaaSMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
  mrr: number;
  arr: number;
  growthRate: number;
  churnRate: number;
  arpu: number;
  signupsThisMonth: number;
  upcomingRenewals: number;
  failedPaymentsAmount: number;
}

/**
 * Premium Subscription & Billing Engine View
 */
export default function SaasBillingView({ user }: SaasBillingViewProps) {
  // Navigation role check
  const isGlobalAdmin = user.role === "SUPER_ADMIN";
  const isGymOwner = user.role === "GYM_OWNER";

  // Views switcher
  const [adminTab, setAdminTab] = useState<"METRICS" | "TENANTS" | "PLANS" | "INVOICES" | "AUDIT">("METRICS");
  const [ownerTab, setOwnerTab] = useState<"SUBSCRIPTION" | "PLANS_UPGRADE" | "INVOICES" | "GATEWAYS">("SUBSCRIPTION");

  // Multi-tenant simulated state for high-fidelity interactive flow
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState<any>(null);
  
  // Custom plans state to support interactive admin changes
  const [plans, setPlans] = useState<SaasPlan[]>([
    {
      id: "STARTER",
      name: "Starter Plan",
      monthlyPrice: 999,
      yearlyPrice: 9990,
      maxMembers: 300,
      maxTrainers: 3,
      maxStaff: 2,
      maxBranches: 1,
      storageLimitGb: 2,
      supportLevel: "Basic",
      features: ["300 Active Athletes", "Digital Register Logbook", "Regular Financial Reports"]
    },
    {
      id: "PROFESSIONAL",
      name: "Professional Plan",
      monthlyPrice: 2499,
      yearlyPrice: 24990,
      maxMembers: 1500, // Elevated members limit or Unlimited description
      maxTrainers: 10,
      maxStaff: 5,
      maxBranches: 3,
      storageLimitGb: 10,
      supportLevel: "Priority Email",
      features: ["1500 Active Athletes", "3 Franchise Branches", "Interactive Workout & Diet Syncing", "WhatsApp Alerts Integration"]
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Plan",
      monthlyPrice: 4999,
      yearlyPrice: 49990,
      maxMembers: 10000, // Massive
      maxTrainers: 100,
      maxStaff: 50,
      maxBranches: 10,
      storageLimitGb: 100,
      supportLevel: "24/7 Dedicated",
      features: ["10000 Active Athletes", "Multi-Branch Matrix Mapping", "White-Label Domain Portal", "Raw CSV Syncing", "Open Webhook API Keys"]
    },
    {
      id: "CUSTOM",
      name: "Custom Enterprise Concierge",
      monthlyPrice: 9999,
      yearlyPrice: 99990,
      maxMembers: 99999,
      maxTrainers: 999,
      maxStaff: 999,
      maxBranches: 99,
      storageLimitGb: 500,
      supportLevel: "VIP Concierge",
      features: ["Custom Database Architecture", "Assigned Account Success Partner", "SLA 99.99% Availability Guarantee"]
    }
  ]);

  // Global Multi-Tenant Metrics
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    totalTenants: 14,
    activeTenants: 9,
    trialTenants: 3,
    expiredTenants: 2,
    mrr: 188400,
    arr: 2260800,
    growthRate: 18.5,
    churnRate: 1.8,
    arpu: 15700,
    signupsThisMonth: 3,
    upcomingRenewals: 4,
    failedPaymentsAmount: 2499
  });

  // Comprehensive Invoices DB
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([
    { id: "INV-2026-001", gymName: "Gold's Gym Uptown", planName: "Professional Plan", billingCycle: "Monthly", amount: 2499, tax: 450, discount: 0, total: 2949, paymentStatus: "Paid", paidDate: "2026-06-15", dueDate: "2026-06-15" },
    { id: "INV-2026-002", gymName: "Powerhouse Gym Central", planName: "Starter Plan", billingCycle: "Yearly", amount: 9990, tax: 1798, discount: 999, total: 10789, paymentStatus: "Paid", paidDate: "2026-06-01", dueDate: "2026-06-01" },
    { id: "INV-2026-003", gymName: "Titanium Club & Spa", planName: "Enterprise Plan", billingCycle: "Monthly", amount: 4999, tax: 900, discount: 0, total: 5899, paymentStatus: "Paid", paidDate: "2026-06-20", dueDate: "2026-06-20" },
    { id: "INV-2026-004", gymName: "Flex Gym Studio", planName: "Starter Plan", billingCycle: "Monthly", amount: 999, tax: 180, discount: 0, total: 1179, paymentStatus: "Pending", dueDate: "2026-06-30" },
    { id: "INV-2026-005", gymName: "Matrix High Performance", planName: "Professional Plan", billingCycle: "Monthly", amount: 2499, tax: 450, discount: 0, total: 2949, paymentStatus: "Failed", dueDate: "2026-06-12" }
  ]);

  // Live Audit Logs database
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: "LOG-1001", timestamp: "2026-06-21 14:22:15", type: "PLAN_CHANGE", gymId: "gym-mock-1", gymName: "Gold's Gym Uptown", user: "Girish K. (SaaS Admin)", details: "Starter Plan upgraded to Professional Plan. Adjusted member ceiling from 300 to 1500." },
    { id: "LOG-1002", timestamp: "2026-06-22 09:12:05", type: "TRIAL_EXTENSION", gymId: "gym-mock-2", gymName: "Iron Temple Dojo", user: "Girish K. (SaaS Admin)", details: "Extended 7 additional free-trial days for testing metrics compatibility." },
    { id: "LOG-1003", timestamp: "2026-06-22 17:45:30", type: "IMPERSONATION", gymId: "gym-mock-1", gymName: "Gold's Gym Uptown", user: "Girish K. (SaaS Admin)", details: "Secure remote-assist session logged. Viewed athlete CRM database state parameters." },
    { id: "LOG-1004", timestamp: "2026-06-23 01:20:00", type: "PAYMENT_FAILED", gymId: "gym-mock-3", gymName: "Matrix High Performance", user: "Stripe Billing Engine", details: "Failed recurring credit card charge of ₹2499. Grace period notice sent." }
  ]);

  // Active impersontion state parameters
  const [impersonatedGym, setImpersonatedGym] = useState<any | null>(null);

  // Notifications banner
  const [flashZone, setFlashZone] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Interactive view invoice modal parameter
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSInvoice | null>(null);

  // Form states for adding or updating plans (Global Admin)
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);

  // Active Gym's (Tenant's) Subscription parameters
  const [tenantBillingCycle, setTenantBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [tenantPlanDetails, setTenantPlanDetails] = useState<SaasPlan>(plans[0]); // Default Starter Plan
  const [trialDaysMax, setTrialDaysMax] = useState(14);
  const [trialDaysCreatedDaysAgo, setTrialDaysCreatedDaysAgo] = useState(6); // used for countdown

  // Multi-tenant current Usage metric counters
  const [memberRecordsCount, setMemberRecordsCount] = useState(141);
  const [trainerRecordsCount, setTrainerRecordsCount] = useState(2);
  const [staffRecordsCount, setStaffRecordsCount] = useState(1);
  const [branchRecordsCount, setBranchRecordsCount] = useState(1);
  const [storageUsageMb, setStorageUsageMb] = useState(48);

  const fetchGymsAndBuildStatus = async () => {
    setLoading(true);
    try {
      // Load real tenant gyms directories
      const response = await api.get("/gyms").catch(() => null);
      if (response && response.data) {
        // Enforce a couple of values if empty
        const records = Array.isArray(response.data) ? response.data : [];
        
        // Enrich dataset with subscription parameters to match premium SaaS billing schema
        const enriched = records.map((g: any, index: number) => {
          const mappedPlan = 
            g.subscriptionPlan === "ENTERPRISE" ? "ENTERPRISE" : 
            g.subscriptionPlan === "PREMIUM" ? "PROFESSIONAL" : "STARTER";
            
          return {
            ...g,
            subscriptionPlan: mappedPlan,
            status: g.status || "ACTIVE",
            trialDaysRemaining: index === 1 ? 5 : 0,
            isTrial: index === 1,
            membersUsed: index === 0 ? 141 : 22,
            trainersUsed: index === 0 ? 2 : 1,
            branchesUsed: 1,
            storageUsedMb: index === 0 ? 48 : 8
          };
        });

        setGyms(enriched);

        // Pre-select current tenant's active gym if owner
        if (isGymOwner) {
          const myGymId = user.gymId || "gym-0";
          const myGym = enriched.find((g: any) => g.id === myGymId) || enriched[0];
          if (myGym) {
            setSelectedGym(myGym);
            // Sync current subscription details
            const matchedPlan = plans.find(p => p.id === myGym.subscriptionPlan) || plans[0];
            setTenantPlanDetails(matchedPlan);
          }
        } else {
          // Admin defaults
          if (enriched.length > 0) {
            setSelectedGym(enriched[0]);
          }
        }
      }
    } catch (e) {
      console.error("Failed loading ImveloGYM tenancy models", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGymsAndBuildStatus();
  }, [user]);

  const triggerFlashNotice = (message: string, type: "success" | "error" | "info" = "success") => {
    setFlashZone({ message, type });
    setTimeout(() => setFlashZone(null), 4500);
  };

  // Automated auto limit checker
  const isMemberLimitExceeded = memberRecordsCount > tenantPlanDetails.maxMembers && tenantPlanDetails.maxMembers !== -1;
  const isTrainerLimitExceeded = trainerRecordsCount > tenantPlanDetails.maxTrainers;
  const isStaffLimitExceeded = staffRecordsCount > tenantPlanDetails.maxStaff;
  const isBranchLimitExceeded = branchRecordsCount > tenantPlanDetails.maxBranches;
  const isStorageLimitExceeded = (storageUsageMb / 1024) > tenantPlanDetails.storageLimitGb;

  const anyLimitExceeded = isMemberLimitExceeded || isTrainerLimitExceeded || isStaffLimitExceeded || isBranchLimitExceeded || isStorageLimitExceeded;

  // Global Admin Operations
  const handleSuspendTenant = (gymId: string) => {
    setGyms(prev => prev.map(g => {
      if (g.id === gymId) {
        const nextStatus = g.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
        const nextType = nextStatus === "ACTIVE" ? "ACTIVATION" : "SUSPENSION";
        
        // Write Audit Logs
        const newAudit: AuditLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          type: nextType,
          gymId: g.id,
          gymName: g.name,
          user: `${user.fullName} (SaaS Admin)`,
          details: `Modified status of ${g.name} to ${nextStatus}. System boundaries affected.`
        };
        setAuditLogs(prevLogs => [newAudit, ...prevLogs]);
        
        triggerFlashNotice(`Tenant ${g.name} has been ${nextStatus === "ACTIVE" ? "Activated" : "Suspended"}!`);
        return { ...g, status: nextStatus };
      }
      return g;
    }));
  };

  const handleExtendTrial = (gymId: string) => {
    setGyms(prev => prev.map(g => {
      if (g.id === gymId) {
        const extendedExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        
        const newAudit: AuditLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          type: "TRIAL_EXTENSION",
          gymId: g.id,
          gymName: g.name,
          user: `${user.fullName} (SaaS Admin)`,
          details: `Extended free trial parameters. Expiry shifted to ${extendedExpiry}.`
        };
        setAuditLogs(prevLogs => [newAudit, ...prevLogs]);

        triggerFlashNotice(`Extended trial for ${g.name} by +10 days!`);
        return { ...g, isTrial: true, trialDaysRemaining: (g.trialDaysRemaining || 0) + 10, subscriptionExpiry: extendedExpiry };
      }
      return g;
    }));
  };

  const handleResetSubscription = (gymId: string) => {
    setGyms(prev => prev.map(g => {
      if (g.id === gymId) {
        const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        
        const newAudit: AuditLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          type: "RENEWAL",
          gymId: g.id,
          gymName: g.name,
          user: `${user.fullName} (SaaS Admin)`,
          details: `Manual subscription reset triggered by system administrator.`
        };
        setAuditLogs(prevLogs => [newAudit, ...prevLogs]);

        triggerFlashNotice(`Subscription cycle reset for ${g.name}! Next renewal: ${nextExpiry}`);
        return { ...g, subscriptionExpiry: nextExpiry };
      }
      return g;
    }));
  };

  const handleChangeGymPlan = (gymId: string, planId: SaasPlan["id"]) => {
    setGyms(prev => prev.map(g => {
      if (g.id === gymId) {
        const selectedPlan = plans.find(p => p.id === planId) || plans[0];
        
        const newAudit: AuditLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          type: "PLAN_CHANGE",
          gymId: g.id,
          gymName: g.name,
          user: `${user.fullName} (SaaS Admin)`,
          details: `Administrative override. Switched billing tier to ${selectedPlan.name}.`
        };
        setAuditLogs(prevLogs => [newAudit, ...prevLogs]);

        triggerFlashNotice(`Switched plan for ${g.name} to ${selectedPlan.name}!`);
        return { ...g, subscriptionPlan: planId };
      }
      return g;
    }));
  };

  // Secure Audit Logged Impersonation
  const handleImpersonateTenant = (gym: any) => {
    const newAudit: AuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      type: "IMPERSONATION",
      gymId: gym.id,
      gymName: gym.name,
      user: `${user.fullName} (SaaS Admin)`,
      details: `Initialized secure admin-override impersonation session. Session recorded in compliance ledger.`
    };
    setAuditLogs(prevLogs => [newAudit, ...prevLogs]);

    setImpersonatedGym(gym);
    triggerFlashNotice(`Now impersonating ${gym.name} in secure debug mode!`, "info");
  };

  const handleStopImpersonating = () => {
    if (impersonatedGym) {
      triggerFlashNotice(`Impersonation session for ${impersonatedGym.name} closed securely.`, "success");
      setImpersonatedGym(null);
    }
  };

  // Client Upgrade Operations
  const handleUpgradeSelfPlan = (planId: SaasPlan["id"]) => {
    const matched = plans.find(p => p.id === planId);
    if (!matched) return;

    const basePrice = tenantBillingCycle === "Monthly" ? matched.monthlyPrice : matched.yearlyPrice;
    const taxAmt = Math.round(basePrice * 0.18); // 18% GST
    const disc = tenantBillingCycle === "Yearly" ? Math.round(basePrice * 0.1) : 0; // 10% coupon discount promo code
    const totalAmt = basePrice + taxAmt - disc;

    // Create custom new invoice
    const newInvoice: SaaSInvoice = {
      id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      gymName: selectedGym?.name || "My Fitness Club",
      planName: matched.name,
      billingCycle: tenantBillingCycle,
      amount: basePrice,
      tax: taxAmt,
      discount: disc,
      total: totalAmt,
      paymentStatus: "Paid", // Immediately successful mock payment
      paidDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0]
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setTenantPlanDetails(matched);

    // Write Audit Log
    const newAudit: AuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      type: "PLAN_CHANGE",
      gymId: selectedGym?.id || "gym-0",
      gymName: selectedGym?.name || "My Fitness Club",
      user: `${user.fullName} (Gym Owner)`,
      details: `Self upgrade requested. Upgraded to ${matched.name} (${tenantBillingCycle}) successfully via integrated sandbox flow.`
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    triggerFlashNotice(`Successfully subscribed to ${matched.name}! Invoice ${newInvoice.id} paid.`, "success");
    setOwnerTab("SUBSCRIPTION");
  };

  // Edit custom plans configurations parameters (Global Admin)
  const handleSaveEditedPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
    triggerFlashNotice(`Successfully updated database configuration parameters for ${editingPlan.name}!`);
    setEditingPlan(null);
  };

  // Print simulator
  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh state after reprint
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans relative">
      
      {/* Visual Floating Banner Flash alerts */}
      <AnimatePresence>
        {flashZone && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={`fixed top-8 right-8 z-[90] px-5 py-4 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-sm ${
              flashZone.type === "error" ? "bg-red-950/90 border-red-500/40 text-red-150" :
              flashZone.type === "info" ? "bg-blue-950/90 border-blue-500/40 text-blue-200" :
              "bg-zinc-950/95 border-[#FF7A00]/40 text-[#FF7A00]"
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-current animate-ping"></div>
            <div className="text-xs font-mono flex-1">
              <strong className="block uppercase tracking-wider text-[10px] text-white">System Broadcast</strong>
              <p className="mt-0.5 leading-relaxed">{flashZone.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECURE IMPERSONATION SANDBOX OVERLAY ALERT BAR */}
      <AnimatePresence>
        {impersonatedGym && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500 text-black px-6 py-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 border border-yellow-600 font-mono shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-black animate-bounce" />
              <div className="text-xs">
                <strong>SECURE IMMERSIVE IMPERSONATION:</strong> Active session for <strong>{impersonatedGym.name}</strong> (Tenant ID: {impersonatedGym.id}). Actions executed here will affect trial configurations logs.
              </div>
            </div>
            <button 
              onClick={handleStopImpersonating}
              className="px-3.5 py-1.5 bg-black text-white hover:bg-zinc-900 border border-black font-extrabold text-[10px] rounded-lg tracking-wider transition uppercase"
            >
              Terminate Sandbox Session
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER BRAND BOARDS */}
      <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#FF7A00]/10 to-orange-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#FF7A00] text-black text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">ImveloGYM Subscription Hub</span>
            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-700/60 flex items-center gap-1"><Shield className="w-3 h-3 text-[#FF7A00]" /> Stripe Billing Secure Partner</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#FF7A00]" />
            Corporate Billing & Subscription Desk
          </h1>
          <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
            Configure enterprise container pricing tiers, manage subscription lifecycles, and monitor financial SaaS run-times under multi-tenant database isolation.
          </p>
        </div>

        {/* Impersonated context or actual context */}
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-[#FF7A00]/10 rounded-xl flex items-center justify-center border border-[#FF7A00]/20 text-white font-black text-xs">
            {isGlobalAdmin ? "ADMIN" : "TENANT"}
          </div>
          <div className="font-mono text-left">
            <span className="text-[9px] text-[#A0A0A0] block uppercase tracking-wide">Logged Account</span>
            <span className="text-xs font-extrabold text-white block truncate max-w-[150px]">
              {isGlobalAdmin ? "Global SaaS Controller" : selectedGym?.name || "Franchise Owner"}
            </span>
          </div>
        </div>
      </div>

      {/* EXCEEDED LIMIT ALERTS BOX - Displays beautifully for Tenant Gym Owner if limit is crossed! */}
      {isGymOwner && anyLimitExceeded && (
        <motion.div 
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-red-950/40 border-2 border-red-500/50 p-6 rounded-2xl space-y-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left relative overflow-hidden"
        >
          <div className="space-y-2 relative z-10 flex-1">
            <span className="bg-red-500 text-white text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">Plan Limits Exceeded</span>
            <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 leading-snug">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              CRM Operations Restricted: Boundary Breach Detected
            </h3>
            <p className="text-xs text-red-200 leading-relaxed max-w-4xl">
              Your active gym database exceeds limits configured for the <strong className="text-white underline">{tenantPlanDetails.name}</strong> standard tier:
              <span className="block mt-1 font-mono text-[11px] text-red-350">
                {isMemberLimitExceeded && `• Member accounts limit reached (${memberRecordsCount} created / Max ${tenantPlanDetails.maxMembers}). `}
                {isTrainerLimitExceeded && `• Trainers limit reached (${trainerRecordsCount} created / Max ${tenantPlanDetails.maxTrainers}). `}
                {isStaffLimitExceeded && `• Staff credentials limit reached (${staffRecordsCount} created / Max ${tenantPlanDetails.maxStaff}). `}
                {isBranchLimitExceeded && `• Branches limit reached (${branchRecordsCount} created / Max ${tenantPlanDetails.maxBranches}). `}
                {isStorageLimitExceeded && `• Physical file storage limit reached (${(storageUsageMb/1024).toFixed(2)}GB of ${tenantPlanDetails.storageLimitGb}GB limit).`}
              </span>
            </p>
          </div>
          <button
            onClick={() => setOwnerTab("PLANS_UPGRADE")}
            className="px-5 py-3 bg-[#FF7A00] hover:bg-orange-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all w-full md:w-auto shrink-0 cursor-pointer shadow-lg shadow-orange-500/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Upgrade Instantly
          </button>
        </motion.div>
      )}

      {/* =========================================================================
                                2. GLOBAL ADMIN CONTROL SECTION 
         ========================================================================= */}
      {isGlobalAdmin && (
        <div className="space-y-6">
          
          {/* Sub-Tabs Selector for admin */}
          <div className="flex bg-[#171717] border border-[#2A2A2A] p-1.5 rounded-xl text-xs font-mono overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setAdminTab("METRICS")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                adminTab === "METRICS" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Commercial Overview
            </button>
            <button
              onClick={() => setAdminTab("TENANTS")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                adminTab === "TENANTS" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Tenants Directory ({gyms.length})
            </button>
            <button
              onClick={() => setAdminTab("PLANS")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                adminTab === "PLANS" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Plan Configurations
            </button>
            <button
              onClick={() => setAdminTab("INVOICES")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                adminTab === "INVOICES" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Invoices Ledger ({invoices.length})
            </button>
            <button
              onClick={() => setAdminTab("AUDIT")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                adminTab === "AUDIT" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Audits Compliance
            </button>
          </div>

          {/* Tab 2.1: OVERVIEW METRICS AND REVENUE CHARTS */}
          {adminTab === "METRICS" && (
            <div className="space-y-6">
              
              {/* Financial Dashboard Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2 relative overflow-hidden group hover:border-[#FF7A00]/20 transition-all duration-300">
                  <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Total / Active Tenants</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{metrics.totalTenants} <span className="text-zinc-500 text-xs font-normal">/ {metrics.activeTenants} Active</span></span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">+18% MoM</span>
                  </div>
                </div>

                <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2 relative overflow-hidden group hover:border-[#FF7A00]/20 transition-all duration-300">
                  <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Trial vs Expired Tenants</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-[#FF7A00]">{metrics.trialTenants} <span className="text-zinc-500 text-xs font-normal">/ {metrics.expiredTenants} Expired</span></span>
                    <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
                  </div>
                </div>

                <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2 relative overflow-hidden group hover:border-[#FF7A00]/20 transition-all duration-300">
                  <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Monthly Recurring (MRR)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-400">₹{(metrics.mrr / 1000).toFixed(1)}k</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">+24.5% MoM</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono block">Annualized Run-Rate (ARR): ₹{(metrics.arr / 100000).toFixed(1)}L</span>
                </div>

                <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2 relative overflow-hidden group hover:border-[#FF7A00]/20 transition-all duration-300">
                  <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Average Revenue Per Tenant (ARPU)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-blue-400">₹{(metrics.arpu / 1000).toFixed(1)}k</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Churn: 1.8%</span>
                  </div>
                </div>

              </div>

              {/* Graphical Performance Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart A: MRR Cumulative Trend */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#FF7A00]" />
                    MRR Growth Cumulative Timeline (6 Months)
                  </h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { month: "Jan", MRR: 98000, SignupCount: 1 },
                        { month: "Feb", MRR: 112000, SignupCount: 2 },
                        { month: "Mar", MRR: 135000, SignupCount: 4 },
                        { month: "Apr", MRR: 148000, SignupCount: 3 },
                        { month: "May", MRR: 168000, SignupCount: 5 },
                        { month: "Jun", MRR: 188400, SignupCount: 3 }
                      ]}>
                        <defs>
                          <linearGradient id="mrr_grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#FF7A00" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#666" fontSize={11} />
                        <YAxis stroke="#666" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                        <Area type="monotone" dataKey="MRR" stroke="#FF7A00" strokeWidth={2} fillOpacity={1} fill="url(#mrr_grad)" name="MRR (₹)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart B: Distribution of Active subscriptions */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    SaaS Subscription Tiers Distribution
                  </h3>
                  <div className="h-60 flex flex-col sm:flex-row items-center justify-around gap-4">
                    <div className="w-48 h-48 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Starter Plan", value: 6, percentage: 42 },
                              { name: "Professional Plan", value: 5, percentage: 36 },
                              { name: "Enterprise Plan", value: 2, percentage: 14 },
                              { name: "Custom Concierge", value: 1, percentage: 8 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="percentage"
                          >
                            {[0,1,2,3].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SAAS_COLORS[index % SAAS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#FF7A00] rounded-sm inline-block"></span>
                        <span className="text-zinc-400">Starter Plan (42%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#10B981] rounded-sm inline-block"></span>
                        <span className="text-zinc-400">Professional (36%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#3B82F6] rounded-sm inline-block"></span>
                        <span className="text-zinc-400">Enterprise Elite (14%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-[#8B5CF6] rounded-sm inline-block"></span>
                        <span className="text-zinc-400">Custom Concierge (8%)</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Bottom analytics: Churn Matrix vs Failed accounts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    Quarterly Acquisition vs Annual Churn Analysis
                  </h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { quarter: "2025-Q3", Acquired: 4, Churned: 0 },
                        { quarter: "2025-Q4", Acquired: 6, Churned: 1 },
                        { quarter: "2026-Q1", Acquired: 8, Churned: 1 },
                        { quarter: "2026-Q2", Acquired: 11, Churned: 2 }
                      ]}>
                        <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" stroke="#666" fontSize={11} />
                        <YAxis stroke="#666" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="Acquired" fill="#10B981" radius={[4, 4, 0, 0]} name="Onboarded Clients" />
                        <Bar dataKey="Churned" fill="#EF4444" radius={[4, 4, 0, 0]} name="Churned Clients" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    Payment Gateway Operational Status
                  </h3>
                  <div className="space-y-3 font-mono">
                    
                    <div className="p-2.5 bg-zinc-950 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-zinc-300">Stripe Webhook API</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black">Online / Live</span>
                    </div>

                    <div className="p-2.5 bg-zinc-950 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-zinc-300">Razorpay AutoDeduct</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black">Connected</span>
                    </div>

                    <div className="p-2.5 bg-zinc-950 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-zinc-300">UPI Gateway Fallback</span>
                      </div>
                      <span className="text-[10px] text-amber-500 uppercase font-black">Maintenance</span>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Tab 2.2: TENANTS DIRECTORY AND DRILL-DOWN CONTROL */}
          {adminTab === "TENANTS" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                  Multi-Tenant Partitioned Directories
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">Total Isolated Nodes: {gyms.length}</span>
              </div>

              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-zinc-500 text-[10px] uppercase tracking-wider">
                      <th className="p-4">GYM/TENANT</th>
                      <th className="p-4">BILLING PLAN</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4 col-span-2">EXPIRY/RENEWAL</th>
                      <th className="p-4">USAGE SUMMARY (MEMBERS/TRAINERS)</th>
                      <th className="p-4 text-right">OPERATIONS CONTROL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]/50 text-zinc-300">
                    {gyms.map((gym) => {
                      const isActive = gym.status === "ACTIVE";
                      const isTrial = gym.isTrial;
                      
                      return (
                        <tr key={gym.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4 font-sans font-bold text-white">
                            <div className="text-sm font-black">{gym.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono font-normal uppercase mt-1">Tenant ID: {gym.id}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              gym.subscriptionPlan === "ENTERPRISE" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                              gym.subscriptionPlan === "PROFESSIONAL" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}>
                              {gym.subscriptionPlan} Plan
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10" : "bg-red-500/10 text-red-400 border border-red-500/10"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-500"}`}></span>
                              {gym.status}
                            </span>
                          </td>
                          <td className="p-4 col-span-2">
                            <div className="text-white font-bold">{gym.subscriptionExpiry || "2027-06-30"}</div>
                            {isTrial ? (
                              <div className="text-[10px] text-amber-500 uppercase mt-0.5 font-bold">Expires: {gym.trialDaysRemaining} days remaining</div>
                            ) : (
                              <div className="text-[9px] text-zinc-500 uppercase mt-0.5 font-normal">Standard Recurring Autocharge</div>
                            )}
                          </td>
                          <td className="p-4 text-xs">
                            <div className="text-zinc-200">Members: <strong>{gym.membersUsed || 22}</strong></div>
                            <div className="text-zinc-500 text-[10px]">Trainers: <strong>{gym.trainersUsed || 1}</strong> • Storage: <strong>{gym.storageUsedMb || 8}MB</strong></div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex flex-wrap gap-1.5 justify-end">
                              
                              {/* Impersonation action */}
                              <button
                                onClick={() => handleImpersonateTenant(gym)}
                                className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[#FF7A00] font-black tracking-wider hover:text-white rounded-lg transition text-[9px] uppercase cursor-pointer"
                                title="Secure Impersonate login block"
                              >
                                Impersonate
                              </button>

                              {/* Trial extension */}
                              {isTrial && (
                                <button
                                  onClick={() => handleExtendTrial(gym.id)}
                                  className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-500 rounded-lg text-[9px] font-black uppercase transition cursor-pointer"
                                >
                                  +10 Days
                                </button>
                              )}

                              {/* Change plan */}
                              <select
                                value={gym.subscriptionPlan}
                                onChange={(e) => handleChangeGymPlan(gym.id, e.target.value as any)}
                                className="p-1 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-bold text-white focus:outline-none"
                              >
                                <option value="STARTER">Starter</option>
                                <option value="PROFESSIONAL">Pro</option>
                                <option value="ENTERPRISE">Enterprise</option>
                              </select>

                              {/* Manual subscription reset */}
                              <button
                                onClick={() => handleResetSubscription(gym.id)}
                                className="p-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg transition"
                                title="Reset billing Cycle"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggles status Suspend vs Activate */}
                              <button
                                onClick={() => handleSuspendTenant(gym.id)}
                                className={`p-1.5 border rounded-lg transition ${
                                  isActive ? "border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-500 hover:text-black" : "border-emerald-500/20 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                                }`}
                                title={isActive ? "Suspend Node" : "Activate Node"}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2.3 PLAN CONFIGS MATRIX EDITOR - Global configs */}
          {adminTab === "PLANS" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2A]">
                <div>
                  <h3 className="text-sm font-bold font-mono text-[#FF7A00] uppercase tracking-wider">
                    SaaS Pricing & Quota Configurations Engine
                  </h3>
                  <p className="text-zinc-400 text-xs">Tune SaaS boundary quotas, prices, and available feature matrices.</p>
                </div>
              </div>

              {/* Dynamic list of current configured plans */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p) => (
                  <div key={p.id} className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 space-y-4 hover:border-[#FF7A00]/20 transition-all duration-300 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <strong className="text-xs uppercase font-mono tracking-wider text-[#FF7A00]">{p.name}</strong>
                        <span className="text-[10px] text-zinc-500 font-mono">T-Code: {p.id}</span>
                      </div>
                      
                      <div className="font-mono text-white pt-1">
                        <div className="text-xl font-extrabold text-[#10B981]">₹{p.monthlyPrice} <span className="text-[10px] text-zinc-500">/ mo</span></div>
                        <div className="text-xs text-zinc-400">₹{p.yearlyPrice} / yr <span className="text-[10px] text-zinc-550">(Save 20%)</span></div>
                      </div>

                      <div className="space-y-1.5 text-[11px] font-mono border-t border-zinc-850 pt-3 text-zinc-300">
                        <div>Max Members: <strong>{p.maxMembers === -1 ? "Limitless" : p.maxMembers}</strong></div>
                        <div>Max Trainers: <strong>{p.maxTrainers}</strong></div>
                        <div>Max Staff: <strong>{p.maxStaff}</strong></div>
                        <div>Max Branches: <strong>{p.maxBranches}</strong></div>
                        <div>Storage ceiling: <strong>{p.storageLimitGb} GB</strong></div>
                        <div>Support Escalation: <strong>{p.supportLevel}</strong></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-850">
                      <button
                        onClick={() => setEditingPlan({ ...p })}
                        className="w-full py-2 bg-zinc-950 hover:bg-zinc-850 text-xs font-extrabold font-mono tracking-wider text-white border border-zinc-800 rounded-xl transition cursor-pointer active:scale-95"
                      >
                        Adjust Quotas
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Editing Form Modal Trigger */}
              {editingPlan && (
                <div className="bg-zinc-950 border border-[#FF7A00]/40 p-6 rounded-2xl max-w-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <h3 className="text-sm font-bold text-[#FF7A00] font-mono uppercase tracking-wider">Configure Quotas for {editingPlan.name}</h3>
                    <button onClick={() => setEditingPlan(null)} className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white">&times;</button>
                  </div>

                  <form onSubmit={handleSaveEditedPlan} className="space-y-4 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">MONTHLY SUBSCRIPTION (₹)</label>
                        <input
                          type="number"
                          value={editingPlan.monthlyPrice}
                          onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">YEARLY SUBSCRIPTION (₹)</label>
                        <input
                          type="number"
                          value={editingPlan.yearlyPrice}
                          onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPrice: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">MAX MEMBER ACCOUNTS</label>
                        <input
                          type="number"
                          value={editingPlan.maxMembers}
                          onChange={(e) => setEditingPlan({ ...editingPlan, maxMembers: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">MAX TRAINERS LIMIT</label>
                        <input
                          type="number"
                          value={editingPlan.maxTrainers}
                          onChange={(e) => setEditingPlan({ ...editingPlan, maxTrainers: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">MAX BRANCHES LIMIT</label>
                        <input
                          type="number"
                          value={editingPlan.maxBranches}
                          onChange={(e) => setEditingPlan({ ...editingPlan, maxBranches: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 font-bold block">MAX STAFF LIMIT</label>
                        <input
                          type="number"
                          value={editingPlan.maxStaff}
                          onChange={(e) => setEditingPlan({ ...editingPlan, maxStaff: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#171717] border border-zinc-800 p-2 rounded text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingPlan(null)}
                        className="py-2.5 px-4 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-800"
                      >
                        Cancel Changes
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg shadow-lg"
                      >
                        Save Pricing Ledger
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* Tab 2.4: INVOICES LEDGER / STRIPE INVOICE VIEW */}
          {adminTab === "INVOICES" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                  Consolidated SaaS Corporate Invoices
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">Ledger Node Status: Connected</span>
              </div>

              {/* Invoices Grid Directory */}
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-zinc-500 text-[10px] tracking-wider uppercase">
                      <th className="p-4">INVOICE No.</th>
                      <th className="p-4">CLIENT/GYM</th>
                      <th className="p-4">LICENSE PLAN</th>
                      <th className="p-4">RECURRING FEES</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4 text-right">INVOICE PREVIEW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]/50 text-zinc-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-900/30 transition-all">
                        <td className="p-4 text-white font-bold">{inv.id}</td>
                        <td className="p-4 font-sans font-bold">{inv.gymName}</td>
                        <td className="p-4">{inv.planName} ({inv.billingCycle})</td>
                        <td className="p-4 font-extrabold text-[#10B981]">₹{inv.total}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            inv.paymentStatus === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" :
                            inv.paymentStatus === "Pending" ? "bg-amber-500/10 text-amber-500 border border-amber-500/10" :
                            "bg-red-500/10 text-red-500 border border-red-500/10"
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg border border-zinc-850 flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF7A00]" /> Review Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2.5 Audit Trails Logging (Secured Auditing) */}
          {adminTab === "AUDIT" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#FF7A00]" />
                    SaaS Compliance Security Audit Trail Logs
                  </h3>
                  <p className="text-xs text-zinc-400">Chronological, tamper-evident security tracking of plan upgrades, impersonations, and suspensions.</p>
                </div>
              </div>

              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 space-y-4 font-mono text-xs">
                <div className="bg-black/40 border border-zinc-850 p-3 rounded-lg text-emerald-500 text-[11px] leading-relaxed">
                  ✓ SECURE CRYPTO MAPPING: Audit logs are cryptographic, read-only and backed up onto cloud backup nodes instantly to prevent data manipulation.
                </div>

                <div className="space-y-2.5 divide-y divide-zinc-850">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="pt-2.5 space-y-1.5 text-[11px] first:pt-0 border-zinc-850">
                      <div className="flex flex-col sm:flex-row sm:justify-between text-zinc-500 text-[10px]">
                        <span>Timestamp: {log.timestamp} • Reference: <strong>{log.id}</strong></span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider self-start sm:self-center ${
                          log.type === "SUSPENSION" || log.type === "PAYMENT_FAILED" ? "bg-red-500/10 text-red-400" :
                          log.type === "IMPERSONATION" ? "bg-amber-500/10 text-amber-500" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {log.type}
                        </span>
                      </div>
                      <div className="text-zinc-200">
                        Gym/Branch Context: <strong className="text-[#FF7A00]">{log.gymName}</strong> ({log.gymId})
                      </div>
                      <p className="text-zinc-400 font-sans italic">
                        "{log.details}"
                      </p>
                      <div className="text-[10px] text-zinc-500">
                        Requested by security token: <strong>{log.user}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}


      {/* =========================================================================
                                3. TENANT OWNER SUBSCRIPTION SECTION 
         ========================================================================= */}
      {isGymOwner && (
        <div className="space-y-6">
          
          {/* Sub-Tabs View switcher for Tenant Gym Owner */}
          <div className="flex bg-[#171717] border border-[#2A2A2A] p-1.5 rounded-xl text-xs font-mono overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setOwnerTab("SUBSCRIPTION")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                ownerTab === "SUBSCRIPTION" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> My Active license
            </button>
            <button
              onClick={() => setOwnerTab("PLANS_UPGRADE")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                ownerTab === "PLANS_UPGRADE" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Plan Matrix Comparison
            </button>
            <button
              onClick={() => setOwnerTab("INVOICES")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                ownerTab === "INVOICES" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Receipts History
            </button>
            <button
              onClick={() => setOwnerTab("GATEWAYS")}
              className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                ownerTab === "GATEWAYS" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Gateway Integration
            </button>
          </div>

          {/* Tab 3.1 Owner active subscription views */}
          {ownerTab === "SUBSCRIPTION" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Spans (2-Columns Wide): Subscription summary and limits */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Active License Details card */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                  <div className="space-y-2 relative z-10">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest inline-block">Renewable Subscription</span>
                    <h2 className="text-xl font-extrabold text-white leading-tight">
                      {tenantPlanDetails.name} Tier <span className="text-zinc-500 font-mono text-xs">(Active)</span>
                    </h2>
                    <p className="text-zinc-400 text-xs">
                      Next renewal date: <strong className="text-emerald-400">July 23, 2026</strong>. Auto-billing recurring cycle active.
                    </p>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Pricing: ₹{tenantBillingCycle === "Monthly" ? tenantPlanDetails.monthlyPrice : tenantPlanDetails.yearlyPrice} billed {tenantBillingCycle.toLowerCase()}ly
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setOwnerTab("PLANS_UPGRADE")}
                      className="px-4 py-2.5 bg-[#FF7A00] hover:bg-orange-500 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <Zap className="w-4 h-4 fill-current" /> Upgrades / Change Cycle
                    </button>
                  </div>
                </div>

                {/* Quotas / Usage statistics progress bars */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-5">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    Corporate Database Quotas & Boundaries Usage
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Progress A: Members count */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Athletes / Members limit</span>
                        <span className="text-white font-mono font-bold">
                          {memberRecordsCount} <span className="text-zinc-500">/ {tenantPlanDetails.maxMembers === -1 ? "∞" : tenantPlanDetails.maxMembers}</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-900">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isMemberLimitExceeded ? "bg-red-500 animate-pulse" : "bg-[#FF7A00]"}`}
                          style={{ width: `${tenantPlanDetails.maxMembers === -1 ? 15 : Math.min((memberRecordsCount / tenantPlanDetails.maxMembers) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono italic block">Used to provision athlete workout programs.</span>
                    </div>

                    {/* Progress B: Trainers limit */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Personal Trainers Limit</span>
                        <span className="text-white font-mono font-bold">
                          {trainerRecordsCount} <span className="text-zinc-500">/ {tenantPlanDetails.maxTrainers}</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-900">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isTrainerLimitExceeded ? "bg-red-500" : "bg-[#FF7A00]"}`}
                          style={{ width: `${Math.min((trainerRecordsCount / tenantPlanDetails.maxTrainers) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono italic block">Coaches creating custom workouts & routine guidelines.</span>
                    </div>

                    {/* Progress C: Staff Limit */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Receptionists / System Staff Limit</span>
                        <span className="text-white font-mono font-bold">
                          {staffRecordsCount} <span className="text-zinc-500">/ {tenantPlanDetails.maxStaff}</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-900">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isStaffLimitExceeded ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min((staffRecordsCount / tenantPlanDetails.maxStaff) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono italic block">Frontdesk assistants managing scheduling entries.</span>
                    </div>

                    {/* Progress D: Storage limit */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Cloud Storage Size quota</span>
                        <span className="text-white font-mono font-bold">
                          {(storageUsageMb / 1024).toFixed(2)} GB <span className="text-zinc-500">/ {tenantPlanDetails.storageLimitGb} GB</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-900">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isStorageLimitExceeded ? "bg-red-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(((storageUsageMb / 1024) / tenantPlanDetails.storageLimitGb) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono italic block">Photos, audit ledgers, and workout documents storage bounds.</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Column details panel: Billing summary and automated notifications */}
              <div className="space-y-6">
                
                {/* Visual Free Trial statistics if current is basic */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    Free Sandbox Trial Evaluation
                  </h3>

                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block font-mono">Sandbox evaluation days used</span>
                    <div className="text-3xl font-black text-[#FF7A00]">
                      {trialDaysCreatedDaysAgo} <span className="text-xs text-zinc-500 font-normal">of {trialDaysMax} days</span>
                    </div>
                  </div>

                  <div className="text-zinc-400 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span>Days remaining</span>
                      <strong className="text-white">{trialDaysMax - trialDaysCreatedDaysAgo} days</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Automatic Expiration</span>
                      <strong className="text-[#FF7A00]">Configured / Armed</strong>
                    </div>
                  </div>
                </div>

                {/* Notifications Engine Automated Alert Webhooks Status */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                    Notification Automation alerts status
                  </h3>

                  <div className="space-y-3 font-mono text-xs text-zinc-400 leading-snug">
                    
                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex justify-between items-center">
                      <span>Trial Expiring Alert (78 hrs headstart)</span>
                      <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex justify-between items-center">
                      <span>Subscription Expiry Alert (SMS Hook)</span>
                      <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex justify-between items-center">
                      <span>Invoice Generated (Email PDF)</span>
                      <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex justify-between items-center">
                      <span>Subscription Renewal Succeeded alert</span>
                      <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">Coming Soon</span>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 3.2 Owner plans upgrade side comparison matrix selector */}
          {ownerTab === "PLANS_UPGRADE" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
                <div>
                  <h3 className="text-base font-bold text-[#FF7A00] font-mono uppercase tracking-wider">
                    Interactive Pricing Plans comparison matrix
                  </h3>
                  <p className="text-zinc-400 text-xs">Unlock unlimited branch mapping, larger storage vaults, and advanced reports metrics.</p>
                </div>

                {/* Billing cycle toggles Monthly vs Yearly */}
                <div className="bg-zinc-950 border border-zinc-850 p-1 rounded-xl flex items-center font-mono text-xs font-bold gap-1 self-end sm:self-center">
                  <button
                    onClick={() => setTenantBillingCycle("Monthly")}
                    className={`px-4 py-1.5 rounded-lg cursor-pointer transition ${tenantBillingCycle === "Monthly" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-white"}`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setTenantBillingCycle("Yearly")}
                    className={`px-4 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 ${tenantBillingCycle === "Yearly" ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-white"}`}
                  >
                    Yearly Billing <span className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1 py-0.5 rounded font-black">-20%</span>
                  </button>
                </div>
              </div>

              {/* Plans side by side comparable container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.slice(0, 3).map((plan) => {
                  const isCurrent = tenantPlanDetails.id === plan.id;
                  const price = tenantBillingCycle === "Monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                  
                  return (
                    <div 
                      key={plan.id}
                      className={`bg-[#171717] rounded-3xl p-6 flex flex-col justify-between space-y-6 relative border transition-all ${
                        isCurrent ? "border-emerald-500/60 shadow-xl shadow-emerald-500/5" : "border-[#2A2A2A] hover:border-[#FF7A00]/40"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-black tracking-widest uppercase px-3.5 py-1 rounded-full border border-emerald-600">
                          Your Active Tier
                        </span>
                      )}

                      <div className="space-y-4">
                        <strong className="text-xs uppercase font-mono tracking-widest block text-zinc-400">{plan.name}</strong>
                        
                        <div className="font-mono">
                          <span className="text-3xl font-black text-white">₹{price}</span>
                          <span className="text-xs text-zinc-500 block mt-1">Billed {tenantBillingCycle.toLowerCase()}ly</span>
                        </div>

                        {/* Quotas specifications compared */}
                        <div className="space-y-2.5 font-mono text-xs border-t border-zinc-850 pt-4 text-zinc-300">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Total Athletes:</span>
                            <strong>{plan.maxMembers === -1 ? "Limitless" : `${plan.maxMembers} Members`}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Trainers quota:</span>
                            <strong>{plan.maxTrainers} coaches</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Branches ceiling:</span>
                            <strong>{plan.maxBranches} branches</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Cloud Storage:</span>
                            <strong>{plan.storageLimitGb} GB Vault</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Assigned Support:</span>
                            <strong className="text-amber-500">{plan.supportLevel}</strong>
                          </div>
                        </div>

                        {/* Features specific matrix checklist */}
                        <div className="border-t border-zinc-850 pt-4 space-y-2 flex-grow">
                          {plan.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upgrade action triggers */}
                      <button
                        onClick={() => handleUpgradeSelfPlan(plan.id)}
                        disabled={isCurrent}
                        className={`w-full py-3 rounded-2xl text-xs font-black tracking-widest uppercase cursor-pointer transition ${
                          isCurrent 
                            ? "bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-900" 
                            : "bg-[#FF7A00] hover:bg-orange-500 text-black shadow-lg hover:scale-[1.01] active:scale-95 duration-200"
                        }`}
                      >
                        {isCurrent ? "Current Plan Active" : `Deploy ${plan.name}`}
                      </button>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3.3: Owner Billing invoices history */}
          {ownerTab === "INVOICES" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                  My Paid Receipts & Financial History ledger
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Invoice Records Status: Verified</span>
              </div>

              {/* Gym owner invoices directory */}
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-zinc-500 text-[10px] tracking-wider uppercase">
                      <th className="p-4">INVOICE ID.</th>
                      <th className="p-4">LICENSE TIER</th>
                      <th className="p-4">BILLING CYCLE</th>
                      <th className="p-4">TOTAL FEES</th>
                      <th className="p-4">PAYMENT STATUS</th>
                      <th className="p-4">DUE DATE</th>
                      <th className="p-4 text-right">PREVIEW RECORD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]/50 text-zinc-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-900/30 transition-all">
                        <td className="p-4 text-white font-bold">{inv.id}</td>
                        <td className="p-4 font-sans font-bold">{inv.planName}</td>
                        <td className="p-4">{inv.billingCycle}</td>
                        <td className="p-4 font-extrabold text-[#10B981]">₹{inv.total}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            inv.paymentStatus === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" :
                            "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400">{inv.dueDate}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg border border-zinc-850 flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#FF7A00]" /> Review Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3.4 Gateway Integration coming soon placebo display */}
          {ownerTab === "GATEWAYS" && (
            <div className="space-y-6">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-white">
                  Payment Gateway Integration center
                </h3>
                <p className="text-zinc-400 text-xs">Authorize localized payment gateways for autonomous customer self-checkout subscription models.</p>
              </div>

              {/* Grid map display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Razorpay card */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <strong className="text-sm font-extrabold text-blue-400 font-mono block">Razorpay Gateway</strong>
                    <p className="text-zinc-400 text-xs">Direct UPI mandate subscription mapping, credit cards, debit cards and NetBanking channels.</p>
                  </div>
                  <span className="inline-block self-start px-2 py-0.5 rounded text-[8px] bg-zinc-950 text-zinc-500 tracking-wider font-extrabold uppercase">Coming Soon</span>
                </div>

                {/* Stripe Card */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <strong className="text-sm font-extrabold text-indigo-400 font-mono block">Stripe Billing API</strong>
                    <p className="text-zinc-400 text-xs">Global cards handling, direct localized currency checkout routes and auto dunning hooks.</p>
                  </div>
                  <span className="inline-block self-start px-2 py-0.5 rounded text-[8px] bg-zinc-950 text-zinc-500 tracking-wider font-extrabold uppercase">Coming Soon</span>
                </div>

                {/* PayPal card */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <strong className="text-sm font-extrabold text-amber-400 font-mono block">PayPal Express Checkout</strong>
                    <p className="text-zinc-400 text-xs">Secure international athlete registrations checkout, express debit integrations.</p>
                  </div>
                  <span className="inline-block self-start px-2 py-0.5 rounded text-[8px] bg-zinc-950 text-zinc-500 tracking-wider font-extrabold uppercase">Coming Soon</span>
                </div>

                {/* Direct Bank transfer instructions */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <strong className="text-sm font-extrabold text-emerald-400 font-mono block">Direct Bank / UPI Transfer</strong>
                    <p className="text-zinc-400 text-xs">Manual invoice validation based on bank ledger transfers. Best for enterprise corporate groups.</p>
                  </div>
                  <span className="inline-block self-start px-2 py-0.5 rounded text-[8px] bg-zinc-950 text-zinc-500 tracking-wider font-extrabold uppercase">Coming Soon</span>
                </div>

              </div>
            </div>
          )}

        </div>
      )}


      {/* =========================================================================
                          4. HIGH-FIDELITY INVOICE PREVIEW MODAL Overlay 
         ========================================================================= */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[105] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6.5 max-w-2xl w-full space-y-6 text-xs text-zinc-300 font-mono"
            >
              
              {/* Actual Printable Invoice Node Wrapper */}
              <div id="saas-invoice-printable-container" className="p-4 bg-zinc-950 text-zinc-300 font-mono border border-zinc-900 rounded-2xl">
                
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-4 gap-4">
                  <div>
                    <h2 className="text-base font-black text-[#FF7A00] tracking-tight uppercase">ImveloGYM SaaS Pro Ledger</h2>
                    <span className="text-[10px] text-zinc-500 block">System node: Billing Ledger v3</span>
                  </div>
                  
                  <div className="text-left sm:text-right font-bold">
                    <div className="text-white">INVOICE PREVIEW</div>
                    <div className="text-[10px] text-zinc-400 font-normal">No: {selectedInvoice.id}</div>
                  </div>
                </div>

                {/* Dates & addresses details */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-900 text-[10px]">
                  <div>
                    <span className="text-zinc-500 uppercase block font-bold">RECIPIENT GYM/TENANT:</span>
                    <strong className="text-zinc-200 text-xs block font-sans mt-0.5">{selectedInvoice.gymName}</strong>
                    <span className="text-zinc-500 font-normal">Active franchise sandbox system node</span>
                  </div>

                  <div className="text-right">
                    <span className="text-zinc-500 uppercase block font-bold">BILLING DETAILS:</span>
                    <div className="text-zinc-200 mt-0.5">Paid Date: <strong>{selectedInvoice.paidDate || "None / Pending"}</strong></div>
                    <div className="text-zinc-200">Due Date: <strong>{selectedInvoice.dueDate}</strong></div>
                    <span className="text-zinc-500 block">Receipt: stripe_transaction_mock</span>
                  </div>
                </div>

                {/* Fees Calculation Breakdowns */}
                <div className="py-4 space-y-3">
                  <div className="flex justify-between text-[11px] border-b border-zinc-900 pb-1 font-bold text-zinc-400 uppercase">
                    <span>PARTITION LICENSE OPTION</span>
                    <span className="text-right">SUBTOTAL AMOUNT</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <strong className="text-white font-sans">{selectedInvoice.planName}</strong>
                      <span className="text-[10px] text-zinc-500 block">Isolated Multi-Tenant Node Subscription Allocation ({selectedInvoice.billingCycle})</span>
                    </div>
                    <strong className="text-white">₹{selectedInvoice.amount}</strong>
                  </div>

                  <div className="pt-3 border-t border-zinc-900 space-y-1 text-right text-[11px]">
                    <div className="flex justify-between max-w-xs ml-auto">
                      <span className="text-zinc-500">Subtotal fees:</span>
                      <strong className="text-white">₹{selectedInvoice.amount}</strong>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between max-w-xs ml-auto text-amber-500 font-bold">
                        <span>Corporate saving coupon:</span>
                        <strong>-₹{selectedInvoice.discount}</strong>
                      </div>
                    )}
                    <div className="flex justify-between max-w-xs ml-auto">
                      <span className="text-zinc-500">Service Taxes (GST 18%):</span>
                      <strong className="text-white">₹{selectedInvoice.tax}</strong>
                    </div>
                    <div className="flex justify-between max-w-xs ml-auto text-sm border-t border-zinc-900 pt-1.5 font-bold">
                      <span className="text-[#FF7A00]">Total invoice paid:</span>
                      <strong className="text-[#10B981]">₹{selectedInvoice.total}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div className="text-[9px] text-zinc-650 leading-relaxed border-t border-zinc-900 pt-3 text-center">
                  This transaction receipt is verified under SHA-256 ledger checksum tokens. Billed by stripe secure system gateway processors partners safely.
                </div>

              </div>

              {/* Action operations printable / PDF simulated downloads */}
              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Close Receipt Screen
                </button>

                <button
                  onClick={() => triggerFlashNotice("Receipt PDF compiled and downloaded successfully!", "success")}
                  className="px-4 py-2 bg-zinc-90 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>

                <button
                  onClick={() => handlePrint("saas-invoice-printable-container")}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Printer className="w-4 h-4" /> Print Ledger Invoice
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
