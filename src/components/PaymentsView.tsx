import React, { useState, useEffect } from "react";
import { 
  CreditCard, Search, DollarSign, PlusCircle, Check, Clock, AlertCircle, FileText, X, ArrowLeft, Printer, ShieldCheck
} from "lucide-react";
import api from "../services/api";
import { Payment, Member } from "../types";

interface PaymentsViewProps {
  user: any;
}

export default function PaymentsView({ user }: PaymentsViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Modal / Form toggle states
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form states
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Registration Fee" | "Membership Fee" | "Personal Training Fee">("Membership Fee");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank" | "Card">("Cash");
  const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Paid");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);

  // Load datasets on start & reload
  async function loadPaymentsData() {
    setLoading(true);
    try {
      const response = await api.get("/payments");
      setPayments(response.data);

      const memRes = await api.get("/members?limit=1000"); // Get all active directory members for the drop-down
      setMembers(memRes.data.data);
    } catch (err) {
      console.error("Failed to load invoice registry ledger.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const handleUpdateStatus = async (payId: string, status: "Paid" | "Pending" | "Overdue") => {
    try {
      await api.put(`/payments/${payId}`, { status });
      loadPaymentsData();
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
      await api.post("/payments", {
        memberId,
        amount,
        type,
        paymentMode,
        status,
        dueDate
      });
      setIsCollectOpen(false);
      setMemberId("");
      setAmount("");
      loadPaymentsData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording fee collection.");
    }
  };

  const handleOpenReceipt = async (p: Payment) => {
    try {
      const response = await api.get(`/invoices/${p.id}`);
      setSelectedInvoice({
        ...response.data,
        paymentMode: p.paymentMode,
        type: p.type,
        status: p.status,
        dueDate: p.dueDate
      });
    } catch (err) {
      // In case invoice schema not yet indexed in database, build fallback mock metadata
      setSelectedInvoice({
        id: "inv-" + Math.floor(10000 + Math.random() * 90000),
        invoiceNo: "INV-" + new Date().getFullYear() + "-" + p.id.replace("pay-", ""),
        paymentId: p.id,
        memberId: p.memberId,
        memberName: p.memberName,
        memberEmail: p.memberEmail,
        amount: p.amount,
        taxAmount: 0.00,
        totalAmount: p.amount,
        issuedAt: p.paymentDate || p.createdAt,
        paymentMode: p.paymentMode,
        type: p.type,
        status: p.status,
        dueDate: p.dueDate
      });
    }
  };

  // Filter payments list
  let filtered = payments;
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.memberName.toLowerCase().includes(search.toLowerCase()) ||
        p.memberEmail.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (statusFilter !== "ALL") {
    filtered = filtered.filter((p) => p.status.toLowerCase() === statusFilter.toLowerCase());
  }

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Receipts detailed pop up board */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <button
               type="button"
               onClick={() => setSelectedInvoice(null)}
               className="absolute top-4 right-4 p-2 bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 rounded-full cursor-pointer"
            >
              <X className="w-4.5 h-4.5 text-zinc-400" />
            </button>

            {/* Official Print Receipt styling */}
            <div className="space-y-4 border border-zinc-800 p-5 rounded-2xl bg-zinc-950" id="receipt-print-section">
              <div className="flex justify-between items-start border-b border-zinc-900 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Elite Fitness Club</h3>
                  <span className="text-[9px] text-zinc-400 font-mono">404 Powerhouse Boulevard, Metro City</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-amber-500 uppercase tracking-wider">{selectedInvoice.status}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedInvoice.invoiceNo}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-zinc-500 uppercase font-mono text-[9px] block">Billed To</span>
                  <span className="font-bold text-white block mt-0.5">{selectedInvoice.memberName}</span>
                  <span className="text-zinc-400 font-mono block text-[10px]">{selectedInvoice.memberEmail}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 uppercase font-mono text-[9px] block">Issued At</span>
                  <span className="font-bold text-white block mt-0.5 font-mono">{selectedInvoice.issuedAt.split("T")[0]}</span>
                </div>
              </div>

              <div className="border-t border-b border-zinc-900 py-3 mt-4">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-zinc-300 font-medium">{selectedInvoice.type}</span>
                  <span className="font-mono text-white font-bold">${selectedInvoice.amount}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-right pt-2">
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.amount}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Tax (0% Standard):</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white border-t border-dashed border-zinc-850 pt-2">
                  <span className="text-amber-500 font-sans tracking-tight">TOTAL AMOUNT PAID:</span>
                  <span>${selectedInvoice.totalAmount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-900 pt-4 text-[10px] text-zinc-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Officially processed via {selectedInvoice.paymentMode || "Cash"}. Stamp authenticated.</span>
              </div>
            </div>

            {/* Quick printable action button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-3 text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all font-semibold"
              >
                Close Receipt
              </button>
              <button
                type="button"
                className="flex-1 py-3 text-xs bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-all font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="w-4 h-4" /> Print PDF Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main ledger titles */}
      <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            Payments & Billing Ledger
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Revenues flow audit, invoice registrations, and manual collection logs.
          </p>
        </div>

        {user.role !== "TRAINER" && (
          <button
            type="button"
            onClick={() => setIsCollectOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Log Fee Collection
          </button>
        )}
      </div>

      {/* Search Filter Grid */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search payments by member name, ID, or fee types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs focus:border-amber-500 focus:outline-none transition-all placeholder:text-zinc-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Payments</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Manual Add Invoice Draw */}
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
                <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider">Billed Amount ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="49.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 p-3 pl-7 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                    required
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
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-400 rounded-xl"
                >
                  <option value="Paid">Paid (Stamp Clear)</option>
                  <option value="Pending">Pending Invoice</option>
                  <option value="Overdue">Overdue Reminder</option>
                </select>
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
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition"
              >
                Record Active Fee
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
                <th className="py-4 px-5">ID Ref</th>
                <th className="py-4 px-5">Gym Member</th>
                <th className="py-4 px-5">Fee Category</th>
                <th className="py-4 px-5">Mode</th>
                <th className="py-4 px-5">Amount</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-zinc-500 font-mono">
                    No matching payment receipts indexed.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-zinc-500 text-[11px]">
                      {p.id}
                    </td>
                    <td className="py-3.5 px-5 select-all">
                      <div className="font-bold text-white text-sm">{p.memberName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.memberEmail}</div>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-300">
                      {p.type}
                    </td>
                    <td className="py-3.5 px-5 font-mono">
                      {p.paymentMode}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-black text-white text-sm">
                      ${p.amount}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 leading-none">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                          p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" :
                          p.status === "Pending" ? "bg-amber-500/10 text-amber-500 border border-amber-500/10" :
                          "bg-red-500/10 text-red-500 border border-red-500/10"
                        }`}>
                          {p.status}
                        </span>

                        {p.status !== "Paid" && user.role !== "TRAINER" && (
                          <button
                            type="button"
                            title="Mark transaction Paid"
                            className="p-1 hover:bg-zinc-800 text-emerald-500"
                            onClick={() => handleUpdateStatus(p.id, "Paid")}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {p.status === "Paid" ? (
                        <button
                          type="button"
                          className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded hover:border-amber-500/50 text-amber-500 hover:text-amber-400 text-[11px] font-mono transition-all font-bold active:scale-95 cursor-pointer flex items-center gap-1 float-right"
                          onClick={() => handleOpenReceipt(p)}
                        >
                          <FileText className="w-3.5 h-3.5" /> Receipt
                        </button>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px] block pr-3">Awaiting Pay</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
