import React, { useState, useEffect } from "react";
import { 
  CreditCard, Search, DollarSign, PlusCircle, Check, Clock, AlertCircle, FileText, X, ArrowLeft, Printer, ShieldCheck,
  Settings, MessageSquare, Settings2, Share2, Send, Download, Layers, ShieldAlert, CheckSquare, Square, Trash2, Sliders, ExternalLink
} from "lucide-react";
import api from "../services/api";
import { Payment, Member } from "../types";

interface PaymentsViewProps {
  user: any;
  setTab?: (tab: string) => void;
}

export default function PaymentsView({ user, setTab }: PaymentsViewProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<"LEDGER" | "PROVIDER_SETTINGS" | "REMINDERS">("LEDGER");
  
  // Ledger/Payment states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Auto calculated metrics
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // Bulk action selection state
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // Modal / Form trigger states
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Single invoice PDF download link/printable display
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Form states (collect manual fee)
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"Registration Fee" | "Membership Fee" | "Personal Training Fee">("Membership Fee");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank" | "Card">("Cash");
  const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Paid");
  const [membershipPlan, setMembershipPlan] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");

  // WhatsApp configuration settings states
  const [provider, setProvider] = useState<"Meta" | "Twilio" | "360dialog" | "WhatsAppWeb">("WhatsAppWeb");
  const [apiKey, setApiKey] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [waStatus, setWaStatus] = useState<"Active" | "Inactive">("Active");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Templates configuration states
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState("Invoice Generated");
  const [tplTitle, setTplTitle] = useState("");
  const [tplBodyText, setTplBodyText] = useState("");
  const [tplVariables, setTplVariables] = useState<string[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Load datasets
  async function loadData() {
    setLoading(true);
    try {
      const response = await api.get("/payments/list");
      setPayments(response.data);

      const memRes = await api.get("/members?limit=1000");
      setMembers(memRes.data.data);

      // Fetch dynamic reminders
      const reminderRes = await api.get("/billing/reminders");
      setReminders(reminderRes.data);

      // Load active WhatsApp configurations
      const configRes = await api.get("/whatsapp/settings");
      if (configRes.data) {
        setProvider(configRes.data.provider);
        setApiKey(configRes.data.apiKey);
        setPhoneNumberId(configRes.data.phoneNumberId);
        setWabaId(configRes.data.wabaId);
        setWaStatus(configRes.data.status);
      }

      // Load Templates
      const templateRes = await api.get("/whatsapp/templates");
      setTemplates(templateRes.data);
      const activeTpl = templateRes.data.find((t: any) => t.type === selectedTemplateType);
      if (activeTpl) {
        setTplTitle(activeTpl.title);
        setTplBodyText(activeTpl.bodyText);
        setTplVariables(activeTpl.variables || []);
      }
    } catch (err) {
      console.error("Failed to load billing ledger configurations.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handle selected template switch
  useEffect(() => {
    if (templates.length > 0) {
      const activeTpl = templates.find((t: any) => t.type === selectedTemplateType);
      if (activeTpl) {
        setTplTitle(activeTpl.title);
        setTplBodyText(activeTpl.bodyText);
        setTplVariables(activeTpl.variables || []);
      } else {
        setTplTitle("");
        setTplBodyText("");
        setTplVariables([]);
      }
    }
  }, [selectedTemplateType, templates]);

  const handleUpdateStatus = async (payId: string, status: "Paid" | "Pending" | "Overdue") => {
    try {
      // Find pay to update
      const pay = payments.find(p => p.id === payId);
      if (pay) {
        // Amending both payment and simulated status
        await api.post("/payments/collect", {
          memberId: pay.memberId,
          amount: pay.amount,
          type: pay.type,
          paymentMode: pay.paymentMode,
          status,
          dueDate: pay.dueDate || new Date().toISOString().split("T")[0]
        });
        loadData();
      }
    } catch (err) {
      alert("Error amending payment status.");
    }
  };

  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount) {
      alert("Selected Member and Amount are both mandatory.");
      return;
    }

    try {
      const resp = await api.post("/payments/collect", {
        memberId,
        amount: Number(amount),
        type,
        paymentMode,
        notes,
        discount: Number(discount),
        dueDate,
        status,
        membershipPlan,
        billingPeriod
      });

      setIsCollectOpen(false);
      setMemberId("");
      setAmount("");
      setDiscount("0");
      setNotes("");
      setMembershipPlan("");
      setBillingPeriod("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording fee collection.");
    }
  };

  // Safe document generator triggering (Invoice, Receipt, Passport Card)
  const handleViewInvoiceDoc = (type: "Invoice" | "Receipt" | "MembershipCard", id: string) => {
    const url = `/api/billing/pdf/${type}/${id}?token=${localStorage.getItem("accessToken")}`;
    setIframeUrl(url);
  };

  // Save WhatsApp Web Provider Settings
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.put("/whatsapp/settings", {
        provider,
        apiKey,
        phoneNumberId,
        wabaId,
        status: waStatus
      });
      alert("WhatsApp Provider parameters updated successfully!");
    } catch (e: any) {
      alert("Save settings failed.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Save specific Templates settings
  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      await api.put(`/whatsapp/templates/${encodeURIComponent(selectedTemplateType)}`, {
        title: tplTitle,
        bodyText: tplBodyText,
        variables: tplVariables
      });
      alert(`Template settings for '${selectedTemplateType}' saved successfully!`);
      // Reload templates array
      const templateRes = await api.get("/whatsapp/templates");
      setTemplates(templateRes.data);
    } catch (e: any) {
      alert("Template saving error.");
    } finally {
      setTemplateSaving(false);
    }
  };

  // Bulk checklist utilities
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

  // Bulk billing processing actions
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

  // Dismiss single reminder alert
  const handleDismissReminder = async (remId: string) => {
    try {
      await api.delete(`/billing/reminders/${remId}`);
      loadData();
    } catch (e: any) {
      alert("Failed to dismiss reminder.");
    }
  };

  // Filter payments list
  let filtered = payments;
  if (search) {
    filtered = filtered.filter(
      (p) =>
        (p.memberName && p.memberName.toLowerCase().includes(search.toLowerCase())) ||
        (p.memberEmail && p.memberEmail.toLowerCase().includes(search.toLowerCase())) ||
        (p.id && p.id.toLowerCase().includes(search.toLowerCase())) ||
        (p.type && p.type.toLowerCase().includes(search.toLowerCase()))
    );
  }

  if (statusFilter !== "ALL") {
    filtered = filtered.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
  }

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* 1. Modal for High Fidelity Printable iframe Display */}
      {iframeUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-zinc-950 p-4 border-b border-zinc-850 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest font-mono flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Professional Document Viewer
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open(iframeUrl, "_blank");
                    win?.print();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print/PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIframeUrl(null)}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-755 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
            
            <iframe
              src={iframeUrl}
              className="w-full flex-1 bg-white border-none"
              title="Print Receipt Preview"
            />
          </div>
        </div>
      )}

      {/* Main header block */}
      <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {setTab && (
            <button
              type="button"
              onClick={() => setTab("DASHBOARD")}
              className="p-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-xl text-zinc-400 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
              Payments & Commercial Billing Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Automate invoicing, track payment reminders, customized WhatsApp templates, and query billing records under isolated multi-tenant contexts.
            </p>
          </div>
        </div>

        {user.role !== "TRAINER" && (
          <button
            type="button"
            onClick={() => setIsCollectOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Create & Collect Invoice
          </button>
        )}
      </div>

      {/* Page Tabs */}
      <div className="flex gap-2 border-b border-zinc-850 pb-1">
        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition rounded-t-lg ${
            activeTab === "LEDGER" ? "bg-amber-500/10 text-amber-500 border-b-2 border-amber-500 block" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 inline-block mr-1.5 align-text-top" /> Billing List Table
        </button>
        <button
          onClick={() => setActiveTab("REMINDERS")}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition rounded-t-lg relative ${
            activeTab === "REMINDERS" ? "bg-amber-500/10 text-amber-500 border-b-2 border-amber-500 block" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5 inline-block mr-1.5 align-text-top" /> 
           Due Reminders alert
          {reminders.filter(r => r.status === "Pending").length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-sans text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-black animate-pulse">
              {reminders.filter(r => r.status === "Pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("PROVIDER_SETTINGS")}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition rounded-t-lg ${
            activeTab === "PROVIDER_SETTINGS" ? "bg-amber-500/10 text-amber-500 border-b-2 border-amber-500 block" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline-block mr-1.5 align-text-top" /> WhatsApp Config Settings
        </button>
      </div>

      {/* Tab content conditional blocks */}

      {/* 1. LEDGER TAB VIEW */}
      {activeTab === "LEDGER" && (
        <div className="space-y-6">
          {/* Search Filter Grid */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search payments by member name, email ID, or invoice category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs focus:border-amber-500 focus:outline-none transition-all placeholder:text-zinc-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSelectedPaymentIds([]); // Clear selection to prevent overflow
              }}
              className="bg-zinc-950 border border-zinc-800 text-zinc-350 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Overdue">Overdue Only</option>
            </select>
          </div>

          {/* Bulk Action Toolbox Drawer (Displayed conditionally on select) */}
          {selectedPaymentIds.length > 0 && (
            <div className="bg-amber-500 text-black p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-slideDown">
              <div className="font-mono text-xs">
                <span className="font-extrabold pr-2 text-base">[{selectedPaymentIds.length}] Members Checked</span> 
                Select bulk commercial action to clear dues or dispatch reminders:
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("INVOICE")}
                  disabled={bulkActionInProgress}
                  className="px-3.5 py-2 bg-zinc-950 text-white rounded-lg text-xs font-mono font-bold hover:bg-zinc-850 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5" /> Bulk Invoicing
                </button>
                <button
                  onClick={() => handleBulkAction("REMINDER")}
                  disabled={bulkActionInProgress}
                  className="px-3.5 py-2 bg-black text-amber-500 rounded-lg text-xs font-mono font-bold hover:bg-zinc-900 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-500" /> Dispatch WhatsApp Alerts
                </button>
                <button
                  onClick={() => setSelectedPaymentIds([])}
                  className="px-3 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg text-xs font-sans transition"
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}

          {bulkMessage && (
            <div className="bg-zinc-950 border border-zinc-800 p-3 text-xs text-amber-500 font-mono rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
              {bulkMessage}
            </div>
          )}

          {/* Collect invoice form pop-up */}
          {isCollectOpen && (
            <div className="bg-zinc-950 border border-amber-500/20 p-6 rounded-2xl space-y-4 animate-slideDown max-w-2xl">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest font-mono">Collect Active Membership Fee</h3>
                <button
                  type="button"
                  onClick={() => setIsCollectOpen(false)}
                  className="p-1 hover:bg-zinc-900 rounded-lg"
                >
                  <X className="w-4.5 h-4.5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleCollectFee} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Select Gym Member</label>
                    <select
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                      required
                    >
                      <option value="">Choose member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.memberId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Billed Base Amount ($ USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="2500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 p-3 pl-7 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Discount ($ USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 p-3 pl-7 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Billed Ledger Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                    >
                      <option value="Membership Fee">Membership Plan Fee</option>
                      <option value="Registration Fee">One-Time Registration Fee</option>
                      <option value="Personal Training Fee">Personal Coaching Session Fee</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                    >
                      <option value="Cash">Cash Drawer</option>
                      <option value="UPI">UPI Portal Scan</option>
                      <option value="Bank">Direct Wire Bank</option>
                      <option value="Card">Terminal Chip Card</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Initial Entry status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-450 rounded-xl"
                    >
                      <option value="Paid">Paid (Stamp Clear)</option>
                      <option value="Pending">Pending Invoice</option>
                      <option value="Overdue">Overdue Reminder</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Plans Reference Detail</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Deluxe Pack"
                      value={membershipPlan}
                      onChange={(e) => setMembershipPlan(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Due Expiry Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Billing Period Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-06-21 to 2026-12-21"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Transaction Comment Notes</label>
                  <textarea
                    placeholder="Enter secondary comments or audit metrics..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl h-16 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCollectOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl transition"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition animate-pulse"
                  >
                    Record Active Fee Invoice
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payments Logs table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                    <th className="py-4 px-5 w-12 text-center">
                      <button
                        onClick={() => handleToggleSelectAll(filtered)}
                        className="p-1 hover:bg-zinc-805 text-zinc-400 rounded cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-4 px-5">ID Ref</th>
                    <th className="py-4 px-5">Gym Member</th>
                    <th className="py-4 px-5">Fee Category</th>
                    <th className="py-4 px-5">Mode</th>
                    <th className="py-4 px-5">Amount</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Printed/Digital Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10">
                        <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-zinc-500 font-mono">
                        No matching payments or invoices registered.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const isChecked = selectedPaymentIds.includes(p.id);
                      return (
                        <tr key={p.id} className={`hover:bg-zinc-850/40 transition-colors ${isChecked ? "bg-amber-500/5" : ""}`}>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(p.id)}
                              className="p-1 hover:text-amber-500 text-zinc-500 cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-600" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-zinc-500 text-[11px]">
                            {p.id}
                          </td>
                          <td className="py-3.5 px-5 select-all">
                            <div className="font-bold text-white text-sm">{p.memberName}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.memberEmail}</div>
                          </td>
                          <td className="py-3.5 px-5 text-zinc-300 font-mono">
                            {p.type}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-zinc-450">
                            {p.paymentMode || "Cash"}
                          </td>
                          <td className="py-3.5 px-5 font-mono font-black text-white text-sm">
                            ${p.amount}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                                p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" :
                                p.status === "Pending" ? "bg-amber-500/10 text-amber-500 border border-amber-500/15" :
                                "bg-red-500/10 text-red-500 border border-red-500/15"
                              }`}>
                                {p.status || "Paid"}
                              </span>

                              {p.status !== "Paid" && user.role !== "TRAINER" && (
                                <button
                                  type="button"
                                  title="Mark transaction Paid"
                                  className="p-1 hover:bg-zinc-800 text-emerald-500 cursor-pointer"
                                  onClick={() => handleUpdateStatus(p.id, "Paid")}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded hover:border-amber-500/50 text-amber-500 hover:text-amber-400 text-[11px] font-mono transition-all font-bold cursor-pointer"
                                onClick={() => handleViewInvoiceDoc("Invoice", p.id)}
                              >
                                Invoice PDF
                              </button>
                              <button
                                type="button"
                                className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded hover:border-amber-500/50 text-amber-500 hover:text-amber-400 text-[11px] font-mono transition-all font-bold cursor-pointer"
                                onClick={() => handleViewInvoiceDoc("Receipt", p.id)}
                              >
                                Receipt PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. REMINDERS VIEW */}
      {activeTab === "REMINDERS" && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider border-b border-zinc-800 pb-2">
              Auto-Generated Expiry & Pending Payment Dues
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              CRM continuously aggregates membership end periods and outstanding ledger balances to alert front office staff before access is revoked.
            </p>
          </div>

          <div className="space-y-3">
            {reminders.filter(r => r.status === "Pending").length === 0 ? (
              <div className="text-center py-10 font-mono text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-850">
                ⭐ No active overdue notices or expiring subscribers recorded today.
              </div>
            ) : (
              reminders.filter(r => r.status === "Pending").map((rem) => {
                const isUrgent = rem.daysRemaining <= 0 || rem.type === "Payment Overdue";
                return (
                  <div 
                    key={rem.id} 
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                      isUrgent ? "bg-red-500/5 border-red-500/20 text-red-100" : "bg-amber-500/5 border-amber-500/20 text-amber-100"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                          isUrgent ? "bg-red-500/20 text-red-500" : "bg-amber-500/25 text-amber-400"
                        }`}>
                          {rem.type}
                        </span>
                        <strong className="text-sm text-white">{rem.memberName}</strong>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono">
                        Plan: <strong className="text-zinc-300">{rem.planName}</strong> • Dues: <strong className="text-white">${rem.amount}</strong> • Due Date: {rem.dueDate} ({rem.daysRemaining} days remaining)
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            const payload = {
                              memberId: rem.memberId,
                              category: "Fee Due Reminder",
                              variables: {
                                Amount: String(rem.amount),
                                DueDate: rem.dueDate,
                                MembershipPlan: rem.planName
                              }
                            };
                            const resp = await api.post("/communication/send", payload);
                            if (resp.data.whatsappUrl) {
                              window.open(resp.data.whatsappUrl, "_blank");
                            }
                          } catch (e) {
                            alert("Unable to dispatch reminder text.");
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-[10px] uppercase rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Reminder WhatsApp
                      </button>
                      <button
                        onClick={() => handleDismissReminder(rem.id)}
                        className="p-1 px-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-mono cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. PROVIDER SETTINGS VIEW */}
      {activeTab === "PROVIDER_SETTINGS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings form column */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl lg:col-span-1 space-y-4 text-xs font-mono">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-4.5 h-4.5 text-amber-500" /> API Gateway parameters
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Establish primary links with APIs or run Companion modules for free companion messaging.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-zinc-500 uppercase text-[9px] block">Communication Provider</label>
                <select
                  value={provider}
                  onChange={(e: any) => setProvider(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-amber-500 focus:outline-none text-zinc-300 text-xs font-sans"
                >
                  <option value="WhatsAppWeb">WhatsApp Companion Redirect (Direct Web/Free)</option>
                  <option value="Meta">Meta Cloud API (Official Provider)</option>
                  <option value="Twilio">Twilio WhatsApp Sandbox</option>
                  <option value="360dialog">360dialog Gateway</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 uppercase text-[9px] block font-mono">Status Node</label>
                <select
                  value={waStatus}
                  onChange={(e: any) => setWaStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-amber-500 focus:outline-none text-zinc-300 text-xs font-sans"
                >
                  <option value="Active">Active & Serving</option>
                  <option value="Inactive">Under Offline Maintenance</option>
                </select>
              </div>

              {provider !== "WhatsAppWeb" && (
                <>
                  <div className="space-y-1">
                    <label className="text-zinc-500 uppercase text-[9px] block">API Auth Bearer Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk_meta_live_..."
                      className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-500 uppercase text-[9px] block">Phone ID Number</label>
                    <input
                      type="text"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="e.g. 10455588321"
                      className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-500 uppercase text-[9px] block">Meta WABA Account ID</label>
                    <input
                      type="text"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="e.g. waba_881245582"
                      className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-amber-500 focus:outline-none text-white text-xs"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold font-mono text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Provider Configuration
              </button>
            </div>
          </div>

          {/* Templates Editor Column */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-4.5 h-4.5 text-amber-500" /> WhatsApp Text Message Templates
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Customize operational templates stored securely in MySQL containing standard placeholders like <code className="text-amber-500">{"{{MemberName}}"}</code> or <code className="text-amber-500">{"{{Amount}}"}</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-zinc-500 font-mono uppercase text-[9px] block">Template Type</label>
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Welcome Member">Welcome Member</option>
                  <option value="Payment Received">Payment Received</option>
                  <option value="Invoice Generated">Invoice Generated</option>
                  <option value="Membership Renewal">Membership Renewal</option>
                  <option value="Membership Expiry">Membership Expiry</option>
                  <option value="Fee Due Reminder">Fee Due Reminder</option>
                  <option value="Birthday Wishes">Birthday Wishes</option>
                  <option value="Gym Closed Notice">Gym Closed Notice</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-500 font-mono uppercase text-[9px] block">Template Title / Description</label>
                <input
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  placeholder="e.g. Welcome onboard card details"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white text-xs rounded-xl focus:border-amber-500 focus:outline-none font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-mono uppercase text-[9px] block">Message Body Content</label>
              <textarea
                value={tplBodyText}
                onChange={(e) => setTplBodyText(e.target.value)}
                placeholder="Type your WhatsApp message text formatting here..."
                className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none font-mono h-44 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2">
              <span className="text-[10px] font-mono text-zinc-450 uppercase block font-bold">Standard Available Variables (Click to Add)</span>
              <div className="flex flex-wrap gap-2">
                {["MemberName", "GymName", "Amount", "DueDate", "InvoiceNumber", "MembershipPlan"].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setTplBodyText(p => p + ` {{${v}}}`);
                      if (!tplVariables.includes(v)) {
                        setTplVariables(prev => [...prev, v]);
                      }
                    }}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono rounded-lg text-amber-500 hover:text-amber-400 capitalize cursor-pointer"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveTemplate}
              disabled={templateSaving}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold font-mono text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer float-right"
            >
              <Check className="w-4 h-4" /> Save Template Layout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
