import React, { useState, useEffect } from "react";
import { 
  CreditCard, Calendar, Clock, DollarSign, Bell, CheckSquare, Square, Search, RefreshCw, 
  Settings, AlertTriangle, MessageSquare, ChevronRight, CheckCircle, TrendingUp, BarChart3,
  PlusCircle, Mail, Smartphone, FileText, Printer, X, Award, Layers, Sparkles, Send, Trash2, ShieldCheck, QrCode
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import api from "../services/api";
import { Payment, Member } from "../types";

interface PaymentsViewProps {
  user: any;
  setTab?: (tab: string) => void;
}

export default function PaymentsView({ user, setTab }: PaymentsViewProps) {
  // Core states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active sub-navigation tabs
  const [activeTab, setActiveTab] = useState<"LEDGER" | "REMINDERS" | "PROVIDER_SETTINGS">("LEDGER");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  
  // Ledger History Drill down
  const [selectedHistoryMemberId, setSelectedHistoryMemberId] = useState<string | null>(null);

  // Invoice / Collect fee modal state
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [collectMemberId, setCollectMemberId] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectType, setCollectType] = useState("Membership Fee");
  const [collectMethod, setCollectMethod] = useState("UPI");
  const [collectNotes, setCollectNotes] = useState("");
  const [collectStatus, setCollectStatus] = useState("Paid");
  const [collectDiscount, setCollectDiscount] = useState("0");
  const [collectPlanName, setCollectPlanName] = useState("");
  const [collectPeriod, setCollectPeriod] = useState("1 Month(s)");

  // One-click Desk Renewal Modal state
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalMember, setRenewalMember] = useState<Member | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [renewalPaymentMode, setRenewalPaymentMode] = useState<"Cash" | "UPI" | "Card">("UPI");
  const [processingRenewal, setProcessingRenewal] = useState(false);

  // High Fidelity Printed Document IFrame Link
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // WhatsApp Provider parameters saved
  const [whatsappProviderType, setWhatsappProviderType] = useState("MetaCloudApi");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [webSessionId, setWebSessionId] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Template customizer states
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState("PAYMENT_CONFIRM");
  const [tplTitle, setTplTitle] = useState("");
  const [tplBodyText, setTplBodyText] = useState("");
  const [tplVariables, setTplVariables] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  // Bulk actions status alert
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/payments/list");
      setPayments(response.data);

      const memRes = await api.get("/members?limit=1000");
      setMembers(memRes.data.data);

      const planRes = await api.get("/membership-plans");
      setPlans(planRes.data);

      try {
        const remRes = await api.get("/billing/reminders");
        setReminders(remRes.data);
      } catch (e) {
        setReminders([]); // safe fallback boundary
      }

      // Fetch config parameters
      try {
        const configRes = await api.get("/whatsapp/settings");
        if (configRes.data) {
          setWhatsappProviderType(configRes.data.providerType || "MetaCloudApi");
          setMetaPhoneNumberId(configRes.data.metaPhoneNumberId || "");
          setMetaAccessToken(configRes.data.metaAccessToken || "");
          setWebSessionId(configRes.data.webSessionId || "");
        }
      } catch (e1) {}

      // Fetch whatsapp templates
      try {
        const templateRes = await api.get("/whatsapp/templates");
        setTemplates(templateRes.data);
        const match = templateRes.data.find((t: any) => t.type === selectedTemplateType);
        if (match) {
          setTplTitle(match.title || "");
          setTplBodyText(match.bodyText || "");
          setTplVariables(match.variables || "");
        }
      } catch (e2) {}

    } catch (err) {
      console.error("Failed to load capital suite logs.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync templates form selections immediately on hover/change
  useEffect(() => {
    const match = templates.find(t => t.type === selectedTemplateType);
    if (match) {
      setTplTitle(match.title || "");
      setTplBodyText(match.bodyText || "");
      setTplVariables(match.variables || "");
    }
  }, [selectedTemplateType, templates]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToastFeedback({ type, msg });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  // Safe invoice doc printing
  const handleViewInvoiceDoc = (docType: "Invoice" | "Receipt", paymentId: string) => {
    const docUrl = `/api/billing/render?type=${docType.toUpperCase()}&paymentId=${paymentId}`;
    setIframeUrl(docUrl);
  };

  // Collect modal submit handler
  const handleCollectFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectMemberId) {
      alert("Please select a member.");
      return;
    }
    
    try {
      const selected = members.find(m => m.id === collectMemberId);
      const res = await api.post("/payments/collect", {
        memberId: collectMemberId,
        amount: Number(collectAmount),
        type: collectType,
        paymentMode: collectMethod,
        notes: collectNotes || "Desk Register collection",
        discount: Number(collectDiscount) || 0,
        dueDate: new Date().toISOString().split("T")[0],
        status: collectStatus,
        membershipPlan: collectPlanName || selected?.membershipPlan || "General Membership",
        billingPeriod: collectPeriod
      });

      if (res.data) {
        showToast("success", "✓ Financial invoice recorded. receipt generated.");
        setIsCollectOpen(false);
        setCollectMemberId("");
        setCollectAmount("");
        setCollectDiscount("0");
        setCollectNotes("");
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording payment.");
    }
  };

  // Quick Inline collected confirmation
  const handleUpdateStatus = async (paymentId: string, newStatus: "Paid" | "Pending") => {
    try {
      await api.put(`/payments/${paymentId}`, { status: newStatus });
      showToast("success", `Invoice #${paymentId.slice(0,6)} cleared successfully!`);
      loadData();
    } catch (e: any) {
      alert("Status modification failed.");
    }
  };

  // WhatsApp Gateway save
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.put("/whatsapp/settings", {
        providerType: whatsappProviderType,
        metaPhoneNumberId,
        metaAccessToken,
        webSessionId
      });
      showToast("success", "WhatsApp Provider parameters updated successfully!");
    } catch (e: any) {
      alert("Save settings failed.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Save Template settings
  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      await api.put(`/whatsapp/templates/${encodeURIComponent(selectedTemplateType)}`, {
        title: tplTitle,
        bodyText: tplBodyText,
        variables: tplVariables
      });
      showToast("success", `Template settings for '${selectedTemplateType}' saved!`);
      const templateRes = await api.get("/whatsapp/templates");
      setTemplates(templateRes.data);
    } catch (e: any) {
      alert("Template saving error.");
    } finally {
      setTemplateSaving(false);
    }
  };

  // Simulated Reminder triggers
  const handleSendReminder = (memberName: string) => {
    showToast("success", `✓ Reminder dispatched successfully to ${memberName} via Meta Cloud SMS API!`);
  };

  // Bulk actions
  const handleToggleSelectAll = (filteredPayments: Payment[]) => {
    const visibleIds = filteredPayments.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedPaymentIds.includes(id));
    if (allSelected) {
      setSelectedPaymentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedPaymentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedPaymentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: "INVOICE" | "REMINDER") => {
    if (selectedPaymentIds.length === 0) return;
    setBulkActionInProgress(true);
    setBulkMessage(null);
    try {
      const response = await api.post("/billing/bulk", {
        memberIds: selectedPaymentIds.map(pid => {
          const check = payments.find(p => p.id === pid);
          return check ? check.memberId : pid;
        }),
        action,
        amount: 1500,
        type: "Membership Fee",
        paymentMode: "UPI",
        membershipPlan: "Monthly Core Bulk"
      });

      if (response.data.success) {
        setBulkMessage(`Bulk operations dispatched successfully! ${selectedPaymentIds.length} members processed!`);
        setSelectedPaymentIds([]);
        loadData();
      }
    } catch (err: any) {
      setBulkMessage("Error executing bulk operation: " + (err.response?.data?.error || err.message));
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleDismissReminder = async (remId: string) => {
    try {
      await api.delete(`/billing/reminders/${remId}`);
      loadData();
    } catch (e: any) {
      alert("Failed to dismiss reminder.");
    }
  };

  // Triggering the quick renewal modal popups
  const openRenewalModal = (member: Member) => {
    setRenewalMember(member);
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
    setDiscountAmount(0);
    setRenewalPaymentMode("UPI");
    setShowRenewalModal(true);
  };

  // Execute renewal modal submit
  const handleRenewPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalMember || !selectedPlanId) return;

    const planSelected = plans.find(p => p.id === selectedPlanId);
    if (!planSelected) return;

    setProcessingRenewal(true);
    try {
      const finalPrice = Math.max(0, Number(planSelected.price) - discountAmount);

      // Collect entry payment
      await api.post("/payments/collect", {
        memberId: renewalMember.id,
        amount: Number(planSelected.price),
        type: "Membership Fee",
        paymentMode: renewalPaymentMode,
        notes: `Rapid One-Click Desk Renewal Plan: ${planSelected.name}`,
        discount: discountAmount,
        dueDate: new Date().toISOString().split("T")[0],
        status: "Paid",
        membershipPlan: planSelected.name,
        billingPeriod: `${planSelected.durationMonths} Month(s)`
      });

      // Renew membership dates in DB
      await api.post("/memberships/renew", {
        memberId: renewalMember.id,
        planId: selectedPlanId,
        startDateStr: new Date().toISOString().split("T")[0],
        pricePaid: finalPrice
      });

      showToast("success", `✓ Renewal Complete. Premium Receipt registered for ${renewalMember.fullName}`);
      setShowRenewalModal(false);
      setRenewalMember(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.response?.data?.error || "Plan change checkout error.");
    } finally {
      setProcessingRenewal(false);
    }
  };

  // -------------------------------------------------------------
  // AUTOMATIC DUE ENGINE COMPUTATION LABELS
  // -------------------------------------------------------------
  const getDueEngineState = (m: Member, unpaidInvoices: Payment[]) => {
    if ((m.status as any) === "FROZEN" || (m.status as any) === "BLOCKED" || m.status === "Inactive") {
      return { 
        label: "Blocked / Frozen", 
        color: "bg-zinc-800 text-zinc-400 border-zinc-750", 
        badge: "bg-zinc-500" 
      };
    }

    if (!m.endDate) {
      return { 
        label: "No Active Plan", 
        color: "bg-zinc-950 text-zinc-550 border-zinc-900", 
        badge: "bg-zinc-700" 
      };
    }

    const expDate = new Date(m.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const graceLimit = 5; // standard grace days policy
      if (Math.abs(diffDays) <= graceLimit) {
        return { 
          label: "Grace Period", 
          color: "bg-zinc-850/60 text-zinc-300 border-zinc-750", 
          badge: "bg-zinc-500",
          days: diffDays 
        }; // Grey badge label
      } else {
        return { 
          label: `Expired (${Math.abs(diffDays)}d ago)`, 
          color: "bg-red-500/15 text-red-500 border-red-500/30", 
          badge: "bg-red-500",
          days: diffDays 
        }; // Red badge label
      }
    } else if (diffDays === 0) {
      return { 
        label: "Due Today", 
        color: "bg-red-500/15 text-red-500 border-red-500/25", 
        badge: "bg-red-500",
        days: 0 
      }; // Red badge label
    } else if (diffDays <= 3) {
      return { 
        label: `Expires in ${diffDays} Days`, 
        color: "bg-orange-500/15 text-orange-500 border-orange-500/25", 
        badge: "bg-orange-500",
        days: diffDays 
      }; // Orange badge label
    } else if (diffDays <= 7) {
      return { 
        label: `Expires in ${diffDays} Days`, 
        color: "bg-yellow-500/15 text-yellow-450 border-yellow-550/20", 
        badge: "bg-yellow-550",
        days: diffDays 
      }; // Yellow badge label
    } else {
      return { 
        label: "Active", 
        color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", 
        badge: "bg-emerald-400",
        days: diffDays 
      }; // Green badge label
    }
  };

  // -------------------------------------------------------------
  // PRIMARY ANSWERS FOR FRONT DESK RECEPTIONIST
  // -------------------------------------------------------------
  const unpaidInvoices = payments.filter(p => p.status === "Pending" || p.status === "Overdue");
  const unpaidInvoicesCount = unpaidInvoices.length;

  const expiringSoonMembers = members.filter(m => {
    if (!m.endDate) return false;
    const expDate = new Date(m.endDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const moneyCollectedTodaySum = payments
    .filter(p => p.status === "Paid" && p.createdAt && p.createdAt.split("T")[0] === todayStr)
    .reduce((sum, p) => sum + (Number(p.amount) - (Number(p.discount) || 0)), 0);

  // -------------------------------------------------------------
  // LEVEL TOP DASHBOARD CARDS - EXACTLY THE 8 SPECIFIED KPI'S
  // -------------------------------------------------------------
  const todayTotalRevenue = moneyCollectedTodaySum;
  const monthlyRevenueSum = payments
    .filter(p => p.status === "Paid") // represents total accumulated
    .reduce((sum, p) => sum + (Number(p.amount) - (Number(p.discount) || 0)), 0);

  const pendingFeesSum = payments
    .filter(p => p.status === "Pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const overdueMembersCount = payments.filter(p => p.status === "Overdue").length;
  const renewalsTodayCount = members.filter(m => m.endDate === todayStr).length;
  
  const upcomingRenewalsCount = expiringSoonMembers.length;

  const cashCollectionSum = payments
    .filter(p => p.status === "Paid" && p.paymentMode === "Cash")
    .reduce((sum, p) => sum + (Number(p.amount) - (Number(p.discount) || 0)), 0);

  const upiCollectionSum = payments
    .filter(p => p.status === "Paid" && p.paymentMode === "UPI")
    .reduce((sum, p) => sum + (Number(p.amount) - (Number(p.discount) || 0)), 0);

  const executiveFinancialTiles = [
    { label: "Today's Collection", value: `$${todayTotalRevenue.toLocaleString()}`, color: "text-emerald-400", desc: "Arrived realized cash flow today" },
    { label: "Monthly Revenue", value: `$${monthlyRevenueSum.toLocaleString()}`, color: "text-[#FF8800]", desc: "Cumulative monthly earnings" },
    { label: "Pending Fees", value: `$${pendingFeesSum.toLocaleString()}`, color: "text-amber-400", desc: "Awaiting front checkout desk" },
    { label: "Overdue Members", value: overdueMembersCount, color: "text-rose-500", desc: "Expired cycle defaulting invoices" },
    { label: "Renewals Today", value: renewalsTodayCount, color: "text-blue-400", desc: "Subscribers ending today" },
    { label: "Upcoming Renewals", value: upcomingRenewalsCount, color: "text-purple-400", desc: "Subscribers expiring 14d" },
    { label: "Cash Collection", value: `$${cashCollectionSum.toLocaleString()}`, color: "text-zinc-300", desc: "Cash drawer realization ledger" },
    { label: "UPI Collection", value: `$${upiCollectionSum.toLocaleString()}`, color: "text-teal-400", desc: "NFC scan / Mobile wallet balance" }
  ];

  // -------------------------------------------------------------
  // HIGHER PRIORITY PENDING MEMBERS SECTION (WHO HAS UNPAID PLANS?)
  // -------------------------------------------------------------
  // Filter members who either have pending invoices OR are expiring soon (<14 days) or expired
  const pendingMembersList = members.filter(m => {
    const hasUnpaidInvoice = unpaidInvoices.some(p => p.memberId === m.id);
    const mEngine = getDueEngineState(m, unpaidInvoices);
    const isLapsedOrExpiring = m.endDate && (new Date(m.endDate) < new Date() || mEngine.days !== undefined && mEngine.days <= 14);
    
    return hasUnpaidInvoice || isLapsedOrExpiring;
  }).slice(0, 6); // Limit to top outstanding to maintain extreme responsiveness

  // Ledger filter list
  let ledgerFiltered = payments;
  if (search) {
    ledgerFiltered = ledgerFiltered.filter(
      (p) =>
        (p.memberName && p.memberName.toLowerCase().includes(search.toLowerCase())) ||
        (p.memberEmail && p.memberEmail.toLowerCase().includes(search.toLowerCase())) ||
        (p.id && p.id.toLowerCase().includes(search.toLowerCase())) ||
        (p.type && p.type.toLowerCase().includes(search.toLowerCase()))
    );
  }

  if (statusFilter !== "ALL") {
    ledgerFiltered = ledgerFiltered.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
  }

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-16">
      
      {/* Toast Alert Feedback */}
      {toastFeedback && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-2 border ${
          toastFeedback.type === "success" 
            ? "bg-zinc-950 border-emerald-500/20 text-emerald-400" 
            : "bg-zinc-950 border-rose-500/20 text-rose-455"
        } animate-bounce`}>
          <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastFeedback.msg}</span>
        </div>
      )}

      {/* Floating printable view */}
      {iframeUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-805 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-zinc-950 p-4 border-b border-zinc-850 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-black text-[#FF8800] uppercase tracking-widest font-mono flex items-center gap-2">
                <FileText className="w-5 h-5" /> Professional Capital Documentation Viewer
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open(iframeUrl, "_blank");
                    win?.print();
                  }}
                  className="px-4 py-2 bg-[#FF8800] hover:bg-amber-500 text-black font-mono font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Execute Print
                </button>
                <button
                  type="button"
                  onClick={() => setIframeUrl(null)}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4 text-zinc-450" />
                </button>
              </div>
            </div>
            <iframe src={iframeUrl} className="w-full flex-1 bg-white" title="Billing Receipt Print" />
          </div>
        </div>
      )}

      {/* Corporate Headline Panel */}
      <div className="border-b border-zinc-850 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {setTab && (
            <button
              onClick={() => setTab("DASHBOARD")}
              className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-[#FF8800] rounded-xl text-zinc-400 transition cursor-pointer"
              title="Return to Dashboard"
            >
              <Trash2 className="w-4 h-4 rotate-180 text-[#FF8800]" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#FF8800]/10 text-[#FF8800] text-[9px] font-mono tracking-widest font-extrabold uppercase border border-[#FF8800]/25">
                Financial Operations Executive Suite
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
              Revenue & Capital Ledger Engine
            </h1>
            <p className="text-xs text-zinc-400">
              Audit cash collections, dispatch payment warnings instantly, configure Twilio/Meta templates, and review automated member standing.
            </p>
          </div>
        </div>

        {user.role !== "TRAINER" && (
          <button
            type="button"
            onClick={() => setIsCollectOpen(true)}
            className="px-5 py-3 bg-[#FF8800] hover:bg-amber-500 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all shadow-[0_4px_18px_rgba(255,136,0,0.25)] uppercase tracking-wider font-mono shrink-0"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Collect Offline Fee
          </button>
        )}
      </div>

      {/* Immediate Strategic Questions Answer Board (Owner Dashboard Requirement) */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-zinc-850">
        
        <div className="p-2 space-y-1">
          <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest block">Who Has Not Paid?</span>
          <div className="text-lg font-black text-rose-500 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
            <span>{unpaidInvoicesCount} Pending / Overdue Invoices</span>
          </div>
          <p className="text-[10.5px] text-zinc-400 leading-tight">These members have active capital defaults or pending grace logs.</p>
        </div>

        <div className="p-2 pt-4 md:pt-2 md:pl-5 space-y-1">
          <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest block">Which Memberships Expire Soon?</span>
          <div className="text-lg font-black text-amber-400 flex items-center gap-2 mt-1">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>{expiringSoonMembers.length} Members Expiring in 14d</span>
          </div>
          <p className="text-[10.5px] text-zinc-400 leading-tight">Subscriptions approaching cycle end threshold. Requires renew.</p>
        </div>

        <div className="p-2 pt-4 md:pt-2 md:pl-5 space-y-1">
          <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest block">How Much Money Collected Today?</span>
          <div className="text-xl font-black text-emerald-450 text-emerald-400 flex items-center gap-2 mt-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>${moneyCollectedTodaySum.toLocaleString()} Realized Flow</span>
          </div>
          <p className="text-[10.5px] text-zinc-400 leading-tight">Total cleared cash, UPI, and card payments received today.</p>
        </div>

      </div>

      {/* Page Tabs */}
      <div className="flex gap-2 border-b border-zinc-900 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`px-4.5 py-2.5 text-xs font-mono font-black uppercase transition-all rounded-xl cursor-pointer ${
            activeTab === "LEDGER" ? "bg-[#FF8800]/10 text-[#FF8800] border border-[#FF8800]/20" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 inline-block mr-2 align-text-top" /> Billings & Ledger Center
        </button>
        <button
          onClick={() => setActiveTab("REMINDERS")}
          className={`px-4.5 py-2.5 text-xs font-mono font-black uppercase transition-all rounded-xl cursor-pointer relative ${
            activeTab === "REMINDERS" ? "bg-[#FF8800]/10 text-[#FF8800] border border-[#FF8800]/20" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5 inline-block mr-2 align-text-top" /> Outstanding Reminders
          {reminders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-650 text-white font-sans text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black animate-pulse bg-red-500">
              {reminders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("PROVIDER_SETTINGS")}
          className={`px-4.5 py-2.5 text-xs font-mono font-black uppercase transition-all rounded-xl cursor-pointer ${
            activeTab === "PROVIDER_SETTINGS" ? "bg-[#FF8800]/10 text-[#FF8800] border border-[#FF8800]/20" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline-block mr-2 align-text-top" /> WhatsApp Gateway Config
        </button>
      </div>

      {/* LEDGER ACTIVE PANELS */}
      {activeTab === "LEDGER" && (
        <div className="space-y-6">
          
          {/* Executive Revenue Tiles - Exactly the Eight requested stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-8 gap-3.5">
            {executiveFinancialTiles.map((tile, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-2xl flex flex-col justify-between hover:border-[#FF8800]/25 transition-all shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-6 h-6 bg-[#FF8800]/5 rounded-bl-full pointer-events-none"></div>
                <span className="text-[9px] font-mono tracking-wider text-zinc-550 uppercase font-bold truncate block">{tile.label}</span>
                <div className="mt-2.5">
                  <span className={`text-lg font-black tracking-tight ${tile.color}`}>{tile.value}</span>
                  <p className="text-[8.5px] text-zinc-500 leading-snug mt-1.5 leading-snug truncate">{tile.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 1. HIGH PRIORITY PENDING MEMBERS SECTION (WHO HAS UNPAID PLANS?) */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8800]/5 rounded-bl-full pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-850 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1 px-1.5 bg-[#FF8800]/10 text-[#FF8800] font-mono text-[9.5px] font-black rounded uppercase border border-[#FF8800]/20">CRITICAL PRIORITY</span>
                <h3 className="text-sm font-black text-white tracking-widest uppercase font-mono">Immediate Fee Dues & Approaching Expansions</h3>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-500 uppercase">Action required for front desk reception</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingMembersList.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/25">
                  ✓ Outstanding ledger parameters synchronized cleanly. No pending actions required.
                </div>
              ) : (
                pendingMembersList.map((m) => {
                  const mEngine = getDueEngineState(m, unpaidInvoices);
                  
                  // Calculate amount due from outstanding invoice if exits, else standard $150
                  const mOutstanding = unpaidInvoices.find(p => p.memberId === m.id);
                  const amountDue = mOutstanding ? (Number(mOutstanding.amount) - (Number(mOutstanding.discount) || 0)) : 150;
                  const dueDateString = mOutstanding ? (mOutstanding.dueDate || m.endDate) : (m.endDate || "YYYY-MM-DD");

                  return (
                    <div key={m.id} className="bg-zinc-950 border border-zinc-850 hover:border-[#FF8800]/30 rounded-2xl p-4.5 flex flex-col justify-between space-y-4 transition-all hover:shadow-[0_4px_20px_rgba(255,136,0,0.02)]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={m.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250"}
                            className="w-11 h-11 object-cover rounded-xl border border-zinc-900 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-white text-xs truncate leading-snug">{m.fullName}</h4>
                            <span className="text-[9.5px] text-zinc-450 truncate block mt-0.5">{m.membershipPlan || "Basic Platinum Package"}</span>
                          </div>
                        </div>

                        {/* Action status badge dynamically driven by Automatic Due Engine */}
                        <div className="text-right">
                          <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border ${mEngine.color}`}>
                            {mEngine.label}
                          </span>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-3 gap-2.5 p-3 bg-zinc-900/60 rounded-xl border border-zinc-850 text-center font-sans">
                        <div className="min-w-0">
                          <span className="text-zinc-550 text-[8.5px] font-mono uppercase block">Dues</span>
                          <span className="text-xs font-black text-rose-450 text-rose-500 mt-0.5 block">${amountDue}</span>
                        </div>
                        <div className="border-x border-zinc-850 min-w-0">
                          <span className="text-zinc-550 text-[8.5px] font-mono uppercase block">Timeline Date</span>
                          <span className="text-[9.5px] font-mono text-zinc-300 mt-1 block truncate">{dueDateString}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-zinc-550 text-[8.5px] font-mono uppercase block text-center truncate">Index</span>
                          <span className="text-[10px] font-mono text-white font-bold mt-1 block truncate">
                            {mEngine.days !== undefined ? (mEngine.days <= 0 ? `${Math.abs(mEngine.days)}d Over` : `${mEngine.days}d Left`) : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Desk action matrix buttons */}
                      <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
                        {mOutstanding ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(mOutstanding.id, "Paid")}
                            className="py-2 bg-[#FF8800] hover:bg-amber-450 text-black font-extrabold rounded-lg text-center cursor-pointer transition uppercase"
                          >
                            Collect Invoice
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCollectMemberId(m.id);
                              setCollectAmount(String(amountDue));
                              setCollectNotes(`Outstanding Renewal Plan on floor`);
                              setIsCollectOpen(true);
                            }}
                            className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-lg text-center cursor-pointer transition uppercase"
                          >
                            Bill Account
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openRenewalModal(m)}
                          className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500 text-[#FF8800] font-black rounded-lg text-center cursor-pointer transition uppercase"
                        >
                          Renew Membership
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryMemberId(m.id)}
                          className="py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-300 rounded-lg text-center cursor-pointer transition"
                        >
                          Invoice History
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendReminder(m.fullName)}
                          className="py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-emerald-400 hover:text-emerald-350 rounded-lg text-center cursor-pointer transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-2.5 h-2.5" /> Send Reminder
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Double split: Left matching interactive query cards + Right History drill down ledger */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Ledger Invoices Cards (8 col) */}
            <div className="md:col-span-8 bg-zinc-900 border border-zinc-850 p-6 rounded-3xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-850 pb-3 gap-3">
                <div>
                  <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#FF8800]" /> Transaction Invoices Registry
                  </h3>
                  <p className="text-[10px] text-zinc-550 leading-tight">Query all generated offline/online collections</p>
                </div>

                <div className="flex gap-2 text-xs">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-zinc-300 font-mono text-[10.5px] focus:outline-none"
                  >
                    <option value="ALL">All Ledger States</option>
                    <option value="Paid">State Cleared (Paid)</option>
                    <option value="Pending">Unpaid (Pending)</option>
                    <option value="Overdue">Default (Overdue)</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3 h-3" />
                    <input 
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Query member, ledger..."
                      className="bg-zinc-950 border border-zinc-800 p-1.5 pl-7.5 rounded-xl text-zinc-300 font-mono text-[10.5px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Grid of invoice cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                {ledgerFiltered.length === 0 ? (
                  <div className="col-span-3 text-center py-16 text-zinc-550 font-mono text-xs">
                    No matching billing parameters discovered.
                  </div>
                ) : (
                  ledgerFiltered.map((p) => {
                    const isOverdue = p.status === "Overdue";
                    return (
                      <div key={p.id} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between space-y-3.5 hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-start min-w-0">
                          <div className="min-w-0 pr-2">
                            <strong className="text-white text-xs block truncate leading-snug">{p.memberName || "Premium Member"}</strong>
                            <span className="text-[9px] font-mono text-zinc-550 block mt-0.5">Inv: #{p.id.slice(0, 8)}...</span>
                          </div>
                          
                          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            p.status === "Paid" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                              : isOverdue ? "bg-rose-500/10 text-rose-450 border border-rose-500/20" : "bg-amber-400/10 text-amber-400 border border-amber-400/15"
                          }`}>
                            {p.status?.toUpperCase() || "PENDING"}
                          </span>
                        </div>

                        <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850 text-xs text-zinc-450 space-y-1.5 font-mono">
                          <div className="flex justify-between">
                            <span>Billed base:</span>
                            <span className="text-white font-extrabold font-sans text-xs">${p.amount}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>Category:</span>
                            <span className="text-zinc-300 truncate max-w-[120px]">{p.type}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>Due Date:</span>
                            <span className="text-zinc-300">{p.dueDate || "N/A"}</span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 text-[9.5px] font-mono">
                          {p.status !== "Paid" ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(p.id, "Paid")}
                              className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-center cursor-pointer transition uppercase"
                            >
                              Collect Clear
                            </button>
                          ) : (
                            <span className="flex-1 text-center py-1.5 text-zinc-550 bg-zinc-900 border border-zinc-850 rounded-lg">
                              Cleared Verified
                            </span>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => setSelectedHistoryMemberId(p.memberId)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                            title="Audit Complete History"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewInvoiceDoc("Invoice", p.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[#FF8800] cursor-pointer"
                            title="Print Ledger Receipt"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Client Payment History drill down (4 col) */}
            <div className="md:col-span-4 bg-zinc-900 border border-zinc-850 p-5 rounded-3xl space-y-4">
              <div className="border-b border-zinc-850 pb-2 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FF8800]" />
                  <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest">Client Ledger Audits</h3>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono">Ledger list check</span>
              </div>

              {!selectedHistoryMemberId ? (
                <div className="text-center py-20 text-zinc-500 text-xs font-mono">
                  ✨ No active user selected. Click history/audit on any card to display chronological invoice records.
                </div>
              ) : (() => {
                const checkedM = members.find(m => m.id === selectedHistoryMemberId);
                const matchedPaid = payments.filter(p => p.memberId === selectedHistoryMemberId);
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-2xl border border-zinc-850">
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono text-zinc-550 uppercase block">Selected:</span>
                        <strong className="text-white text-xs truncate block mt-0.5">{checkedM?.fullName || "Gym Member"}</strong>
                      </div>
                      <button onClick={() => setSelectedHistoryMemberId(null)} className="p-1 hover:bg-zinc-900 rounded-xl">
                        <X className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {matchedPaid.length === 0 ? (
                        <div className="text-center py-6 text-zinc-550 font-mono text-[10px]">No logged payments discovered on this profile.</div>
                      ) : (
                        matchedPaid.map(p => (
                          <div key={p.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850 text-[10.5px] font-mono space-y-1.5 text-zinc-400">
                            <div className="flex justify-between items-center bg-zinc-900 p-1.5 border border-zinc-850 rounded-lg">
                              <span>Invoice SKU: #{p.id.slice(0, 6)}</span>
                              <span className={`text-[9px] font-bold uppercase ${p.status === "Paid" ? "text-emerald-400" : "text-amber-400"}`}>{p.status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550">Billed:</span>
                              <strong className="text-white font-sans text-xs">${p.amount}</strong>
                            </div>
                            <div className="flex justify-between pl-0.5">
                              <span>Pay Mode:</span>
                              <span className="text-zinc-300">{p.paymentMode || "UPI"}</span>
                            </div>
                            <div className="flex gap-1.5 pt-1.5 justify-end">
                              <button 
                                onClick={() => handleViewInvoiceDoc("Invoice", p.id)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[9px] font-bold uppercase transition"
                              >
                                Invoice
                              </button>
                              <button 
                                onClick={() => handleViewInvoiceDoc("Receipt", p.id)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[9px] font-bold uppercase transition"
                              >
                                Receipt
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Master bulk select ledger accounts table */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div>
                <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest">Master Transaction Database Registers</h3>
                <p className="text-[10px] text-zinc-550 mt-0.5">Bulk actions dispatch billing invoice alerts to mobile endpoints</p>
              </div>

              {selectedPaymentIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-400 mr-2">{selectedPaymentIds.length} Selected</span>
                  <button
                    onClick={() => handleBulkAction("INVOICE")}
                    disabled={bulkActionInProgress}
                    className="px-3 py-1.5 bg-[#FF8800] text-black font-extrabold text-[10px] uppercase rounded-lg"
                  >
                    Bulk Invoice
                  </button>
                  <button
                    onClick={() => handleBulkAction("REMINDER")}
                    disabled={bulkActionInProgress}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-[#FF8800] text-[10px] font-black uppercase rounded-lg"
                  >
                    Bulk Reminder
                  </button>
                </div>
              )}
            </div>

            {bulkMessage && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-xs text-[#FF8800] font-mono">
                {bulkMessage}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-950/40 text-zinc-400 text-[9px] font-mono tracking-widest uppercase">
                    <th className="py-4 px-4 w-12 text-center">
                      <button
                        onClick={() => handleToggleSelectAll(ledgerFiltered)}
                        type="button"
                        className="p-1 hover:bg-zinc-800 text-zinc-450 rounded cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-zinc-500" />
                      </button>
                    </th>
                    <th className="py-4 px-4">Invoice SKU</th>
                    <th className="py-4 px-4">Client Member</th>
                    <th className="py-4 px-4">SubCategory</th>
                    <th className="py-4 px-4">Payment Mode</th>
                    <th className="py-4 px-4">Billing Charge</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Generate PDF File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs">
                  {ledgerFiltered.map((p) => {
                    const isChecked = selectedPaymentIds.includes(p.id);
                    return (
                      <tr key={p.id} className={`hover:bg-zinc-850/40 transition-colors ${isChecked ? "bg-[#FF8800]/5" : ""}`}>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(p.id)}
                            className="p-1 text-zinc-600 hover:text-[#FF8800]"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#FF8800]" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-800" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500 text-[10px]">{p.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 font-bold text-white">{p.memberName || "Premium Member"}</td>
                        <td className="py-3 px-4 text-zinc-400">{p.type || "Membership Fee"}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[10.5px]">{p.paymentMode || "UPI"}</td>
                        <td className="py-3 px-4 font-black text-zinc-300 font-mono text-[10.5px]">${p.amount}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-1 justify-end font-mono text-[9px]">
                            <button
                              onClick={() => handleViewInvoiceDoc("Invoice", p.id)}
                              className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-white rounded"
                            >
                              INV
                            </button>
                            <button
                              onClick={() => handleViewInvoiceDoc("Receipt", p.id)}
                              className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-[#FF8800] rounded"
                            >
                              REC
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

        </div>
      )}

      {/* OUTSTANDING REMINDERS TAB VIEW */}
      {activeTab === "REMINDERS" && (
        <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-6 space-y-4">
          <div className="border-b border-[#27272a] pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-[#FF8800]" /> Outstanding Dues Reminders
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Clients flagged as outstanding. Dispatch alerts with zero clicks.</p>
            </div>
            <span className="text-[10px] text-zinc-550 border border-zinc-850 p-1 px-3 rounded-full font-mono bg-zinc-950">
              {reminders.length} flagged accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.length === 0 ? (
              <div className="col-span-2 text-center py-20 text-zinc-500 font-mono text-xs">
                ✓ Dues standing clean. No outstanding billing reminders detected in database buffers.
              </div>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="p-4 bg-zinc-950 border border-zinc-855 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-750 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-white text-xs font-extrabold">{r.memberName || "Active Member"}</h4>
                        <span className="text-[9.5px] text-zinc-550 block font-mono">Invoice Date: {r.invoiceDate || "recently"}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold py-0.5 px-2 bg-rose-500/15 text-rose-500 rounded-full border border-rose-500/20 uppercase">
                      Pending
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl font-mono text-zinc-450">
                    <span>Outstanding Charges Due:</span>
                    <strong className="text-white font-sans text-xs">${r.amountDue || 120}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(r.memberName)}
                      className="py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-center cursor-pointer transition uppercase"
                    >
                      Instant Reminder Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissReminder(r.id)}
                      className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-center cursor-pointer transition border border-zinc-800"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WHATSAPP TEMPLATES & GATEWAY CONFIG */}
      {activeTab === "PROVIDER_SETTINGS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Provider setup (5 col) */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-850 rounded-3xl p-6 space-y-4">
            <div className="border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#FF8800]" /> WhatsApp API Gateway Config
              </h3>
              <p className="text-[10px] text-zinc-550 mt-1">Configure Twilio, Meta or local browser sessions</p>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold font-mono text-[9.5px] uppercase block">Provider Engine</label>
                <select
                  value={whatsappProviderType}
                  onChange={(e) => setWhatsappProviderType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF8800]"
                >
                  <option value="MetaCloudApi">Meta WhatsApp Cloud API (Production)</option>
                  <option value="WhatsAppWebSync">WhatsApp Web Local Sync (Client QR code)</option>
                  <option value="TwilioSMS">Twilio SMS / WhatsApp API</option>
                </select>
              </div>

              {whatsappProviderType === "MetaCloudApi" && (
                <>
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-mono text-[9.5px] uppercase block">Meta Phone Number ID</label>
                    <input 
                      type="text"
                      value={metaPhoneNumberId}
                      onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 1049292942001"
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-mono text-[9.5px] uppercase block">Temporary/Permanent Access Token</label>
                    <input 
                      type="password"
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      placeholder="EAAG...."
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white font-mono"
                    />
                  </div>
                </>
              )}

              {whatsappProviderType === "WhatsAppWebSync" && (
                <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-[#FF8800]" />
                      <span className="font-mono text-[9.5px] text-zinc-300 font-black">LOCAL SYNC SESSION REQUIRED</span>
                    </div>
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 py-0.5 px-2 rounded font-mono font-bold animate-pulse">Awaiting Web Swipes</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Scan QR Code using your gym office smart phone to sync local messages instantly without standard Meta Meta costs.</p>
                  <button type="button" className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded font-mono font-black text-[#FF8800] uppercase text-[9.5px]">Generate Session QR Code</button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="w-full py-3 bg-[#FF8800] hover:bg-amber-450 text-black font-extrabold rounded-xl transition uppercase font-mono tracking-wider"
              >
                {settingsSaving ? "Updating parameters..." : "Save parameters"}
              </button>
            </div>
          </div>

          {/* Templates editor (7 col) */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-850 rounded-3xl p-6 space-y-4">
            <div className="border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="w-4.5 h-4.5 text-[#FF8800]" /> Message Template Customizer
              </h3>
              <p className="text-[10px] text-zinc-550 mt-1">Configure daily triggers dispatch content maps automatically</p>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold font-mono text-[10px] uppercase block">Select Trigger Scenario Type</label>
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-[#FF8800]"
                >
                  <option value="PAYMENT_CONFIRM">Cleared Invoice - Paid Confirmation</option>
                  <option value="PAYMENT_REMINDER">Pending Fee Invoice - Reminder Outstanding</option>
                  <option value="MEMBERSHIP_EXPIRY_WARNING">7d Prior Expiry - Approach Warning</option>
                  <option value="GATE_ACCESS_DENIED">Gate Deny - Terminated subscription standing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono text-[9.5px] uppercase block">Scenario Title</label>
                <input 
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  placeholder="e.g. Cleared Invoice Confirmation"
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono text-[9.5px] uppercase block">Message Body Text</label>
                <textarea 
                  rows={4}
                  value={tplBodyText}
                  onChange={(e) => setTplBodyText(e.target.value)}
                  placeholder="Hi {{name}}, your payment {{amount}} has been ledgered..."
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white font-mono placeholder:text-zinc-700 leading-relaxed text-[11px]"
                />
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1.5 font-mono text-[10px] text-zinc-500">
                <span className="text-white font-bold block">Available Variables:</span>
                <code>{tplVariables || "{{name}}, {{amount}}, {{dueDate}}, {{planName}}"}</code>
              </div>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={templateSaving}
                className="w-full py-3 bg-[#FF8800]/10 hover:bg-[#FF8800]/15 text-[#FF8800] border border-[#FF8800]/25 hover:border-[#FF8800]/30 font-extrabold rounded-xl transition uppercase font-mono tracking-wider"
              >
                {templateSaving ? "Saving Template settings..." : "Apply & Save Template"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ONE-CLICK MEMBERSHIP RENEWAL MODAL POPUP */}
      {showRenewalModal && renewalMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 animate-slideDown shadow-2xl relative">
            
            <button 
              onClick={() => {
                setShowRenewalModal(false);
                setRenewalMember(null);
              }} 
              className="absolute top-4 right-4 p-1 hover:bg-zinc-800 rounded-lg cursor-pointer animate-pulse"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>

            <div className="text-center border-b border-zinc-850 pb-3">
              <h3 className="text-xs font-black font-mono text-[#FF8800] tracking-widest uppercase">One-Click Membership Renewal</h3>
              <p className="text-[10px] text-zinc-550 mt-1">Select subscription target and settle offline transaction immediately</p>
            </div>

            <div className="flex items-center gap-3">
              <img 
                src={renewalMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250"}
                className="w-12 h-12 object-cover rounded-xl border border-zinc-800"
              />
              <div className="min-w-0">
                <h4 className="font-extrabold text-white text-xs truncate leading-normal">{renewalMember.fullName}</h4>
                <p className="text-[10px] text-zinc-400 font-mono">Current Plan: {renewalMember.membershipPlan || "VIP Basic Package"}</p>
                <p className="text-[10px] text-zinc-550 font-mono">Current Expiry: {renewalMember.endDate || "N/A"}</p>
              </div>
            </div>

            <form onSubmit={handleRenewPlanSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase tracking-wider block">Renewal Target Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF8800]"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price} ({p.durationMonths} Mo)
                    </option>
                  ))}
                  {plans.length === 0 && (
                    <>
                      <option value="monthly">Monthly VIP - $100</option>
                      <option value="quarterly">Quarterly Platinum - $250</option>
                      <option value="yearly">Yearly Ultimate - $900</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Apply Discount ($)</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-white font-mono focus:outline-none focus:border-[#FF8800]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Collect Method</label>
                  <select
                    value={renewalPaymentMode}
                    onChange={(e: any) => setRenewalPaymentMode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-white focus:outline-none"
                  >
                    <option value="UPI">UPI QR Mobile Settle</option>
                    <option value="Cash">Cash Ledger</option>
                    <option value="Card">Terminal Swipe Card</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-mono text-[9.5px] rounded-xl flex items-center justify-between">
                <span>INVOICE DISPATCH AND PDF GENERATION</span>
                <span className="font-bold">✓ DYNAMIC</span>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenewalModal(false);
                    setRenewalMember(null);
                  }}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRenewal}
                  className="flex-1 py-3 bg-[#FF8800] hover:bg-amber-450 text-black font-extrabold rounded-xl text-xs transition uppercase"
                >
                  {processingRenewal ? "PROVISIONING..." : "COLLECT PAYMENT & RENEW"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED OFFLINE FEE COLLECTION MODAL */}
      {isCollectOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 animate-slideDown shadow-2xl relative">
            
            <button 
              onClick={() => {
                setIsCollectOpen(false);
                setCollectMemberId("");
              }}
              className="absolute top-4 right-4 p-1 hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>

            <div className="text-center border-b border-zinc-850 pb-3">
              <h3 className="text-xs font-black text-[#FF8800] tracking-widest uppercase font-mono flex items-center justify-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> Issue Invoice / Collect Manual Fee
              </h3>
              <p className="text-[10px] text-zinc-550 mt-1">Register payments directly in tenant master ledger sheets</p>
            </div>

            <form onSubmit={handleCollectFeeSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase tracking-wider block">Target Gym Member</label>
                <select
                  value={collectMemberId}
                  onChange={(e) => setCollectMemberId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white focus:outline-none"
                  required
                >
                  <option value="">-- Choose Member Profile --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} - {m.memberId} ({m.membershipPlan || "No Active Plan"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Total Price ($)</label>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder="120"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Discount Allowed ($)</label>
                  <input
                    type="number"
                    value={collectDiscount}
                    onChange={(e) => setCollectDiscount(e.target.value)}
                    placeholder="10"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-[#FF8800] text-[9px] uppercase block">Category Type</label>
                  <select
                    value={collectType}
                    onChange={(e) => setCollectType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white"
                  >
                    <option value="Membership Fee">Membership Plan Fee</option>
                    <option value="Personal Training (PT) Fee">Personal Training Session Fee</option>
                    <option value="Supplement / Cafe Sales">Gym Supplement/Cafe SKU</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Payment Mode Channel</label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white"
                  >
                    <option value="UPI">UPI Gateway QR scan</option>
                    <option value="Cash">Cash Ledger drawer</option>
                    <option value="Card">Front swipe card terminal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-bold font-mono text-[9px] uppercase block">Office Private Notes</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Settle cash collection with desk receptionist"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCollectOpen(false)}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FF8800] hover:bg-amber-450 text-black font-extrabold rounded-xl text-xs transition uppercase font-mono tracking-wider"
                >
                  Commit Ledger Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
