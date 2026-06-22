import React, { useState, useEffect } from "react";
import { 
  Calendar, Search, Clock, PlusCircle, Check, X, ArrowUpRight, CheckSquare, RefreshCw, ArrowLeft
} from "lucide-react";
import api from "../services/api";
import { Member, Attendance } from "../types";

interface AttendanceViewProps {
  user: any;
  setTab?: (tab: string) => void;
}

export default function AttendanceView({ user, setTab }: AttendanceViewProps) {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form toggles
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Form values
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeIn, setTimeIn] = useState(new Date().toTimeString().split(" ")[0]);
  const [remarks, setRemarks] = useState("");

  // QR Simulation States
  const [qrInput, setQrInput] = useState("");
  const [scanMessage, setScanMessage] = useState<any>(null);
  const [scanError, setScanError] = useState("");

  async function loadAttendanceData() {
    setLoading(true);
    try {
      const response = await api.get("/attendance");
      setAttendances(response.data);

      const memRes = await api.get("/members?limit=1000");
      setMembers(memRes.data.data);
    } catch (err) {
      console.error("Failed to load attendance rosters.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const handleQrScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    setScanError("");
    setScanMessage(null);
    try {
      const res = await api.post("/attendance/scan-qr", { qrToken: qrInput.trim() });
      setScanMessage(res.data);
      setQrInput("");
      loadAttendanceData();
    } catch (err: any) {
      setScanError(err.response?.data?.error || "Invalid QR Security Token.");
    }
  };

  const handleQuickMemberQrScan = async (selectedId: string) => {
    if (!selectedId) return;
    setScanError("");
    setScanMessage(null);
    try {
      const tokenRes = await api.get(`/members/${selectedId}/qr`);
      const token = tokenRes.data.token;

      const scanRes = await api.post("/attendance/scan-qr", { qrToken: token });
      setScanMessage(scanRes.data);
      loadAttendanceData();
    } catch (err: any) {
      setScanError(err.response?.data?.error || "Quick Scan failed.");
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      alert("Selected Member is required.");
      return;
    }

    try {
      await api.post("/attendance", {
        memberId,
        date,
        timeIn,
        remarks: remarks || "Manual Check-in Tracker"
      });
      setIsLogOpen(false);
      setMemberId("");
      setRemarks("");
      loadAttendanceData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error checking in athlete.");
    }
  };

  const handleCheckOut = async (attId: string) => {
    try {
      await api.put(`/attendance/${attId}`, {
        timeOut: new Date().toTimeString().split(" ")[0]
      });
      loadAttendanceData();
    } catch (err) {
      alert("Error logging checkout departures.");
    }
  };

  // Safe search
  let filtered = attendances;
  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.memberName.toLowerCase().includes(search.toLowerCase()) ||
        a.memberEmail.toLowerCase().includes(search.toLowerCase()) ||
        a.remarks.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Active checked in athletes (Time out is Null / blank)
  const activeGymList = filtered.filter(a => !a.timeOut);
  const standardArchivedList = filtered.filter(a => a.timeOut);

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Dynamic Header */}
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
              Manual Attendance Registry
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Mark athlete check-ins, record departures, and log notes manually inside this on-premise screen.
            </p>
          </div>
        </div>

        {user.role !== "MEMBER" && (
          <button
            type="button"
            onClick={() => {
              setTimeIn(new Date().toTimeString().split(" ")[0]);
              setIsLogOpen(true);
            }}
            className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Mark Check-in
          </button>
        )}
      </div>

      {/* Manual Check-in drawer */}
      {isLogOpen && (
        <div className="bg-zinc-950 border border-amber-500/20 p-5 rounded-2xl space-y-4 max-w-xl animate-slideDown">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-bold text-amber-500 font-mono tracking-widest uppercase">Mark Onsite check-in</h3>
            <button
               type="button"
               onClick={() => setIsLogOpen(false)}
               className="p-1 hover:bg-zinc-900 rounded-lg cursor-pointer"
            >
              <X className="w-4.5 h-4.5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleManualCheckIn} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">MEMBER</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                required
              >
                <option value="">Select active member...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberId})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">DATE</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">CHECK-IN TIME</label>
                <input
                  type="text"
                  placeholder="HH:MM:SS"
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">REMARKS / EXERCISE FOCUS</label>
              <input
                type="text"
                placeholder="Squat focus, Zone 2 running, etc."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogOpen(false)}
                className="flex-1 py-2.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl transition"
              >
                Check In Athlete
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Code Attendance Scanner Terminal */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
          <h3 className="text-sm font-black text-white tracking-widest uppercase font-mono">Simulated Front Desk QR Scanner</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300">
          <div className="space-y-4">
            <p className="text-zinc-400 leading-relaxed">
              Simulate presenting a secure, encrypted dynamic QR membership card at the front desk. 
              The terminal automatically logs check-ins or check-outs, preventing duplicate logins.
            </p>

            {/* Quick simulation picker */}
            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-2.5">
              <label className="text-[10px] font-mono tracking-wider text-zinc-500 font-bold uppercase block">
                Quick Scan Simulation (Select any member)
              </label>
              <div className="flex gap-2">
                <select
                  onChange={(e) => handleQuickMemberQrScan(e.target.value)}
                  className="flex-grow bg-zinc-900 border border-zinc-800 p-2 text-[11px] focus:outline-none focus:border-amber-500 rounded-xl text-zinc-300"
                  defaultValue=""
                >
                  <option value="" disabled>Select member to instant tap...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberId})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] bg-zinc-900 px-3 py-2 border border-zinc-800 rounded-xl font-bold flex items-center text-zinc-400 shrink-0">
                  Instant Tap
                </div>
              </div>
            </div>

            {/* Manual QR string entry */}
            <form onSubmit={handleQrScanSubmit} className="space-y-2">
              <label className="text-[10px] font-mono tracking-wider text-zinc-500 font-bold uppercase block">
                Or Scan QR Token Signature (USB Reader Feed)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste secure member QR token string..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-grow bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-amber-500 text-[11.5px]"
                />
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 rounded-xl active:scale-95 transition-all text-xs cursor-pointer"
                >
                  Submit Scan
                </button>
              </div>
            </form>
          </div>

          {/* Scanner Feedback Display */}
          <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-center min-h-[160px]">
            {scanError && (
              <div className="text-center space-y-1.5 p-3 bg-red-950/20 border border-red-500/10 text-red-400 rounded-xl">
                <div className="font-extrabold uppercase font-mono tracking-widest text-[9px]">Scan Rejected</div>
                <div className="text-xs font-semibold">{scanError}</div>
              </div>
            )}

            {scanMessage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className={`text-[9px] font-black font-mono tracking-widest uppercase px-2 py-0.5 rounded-full ${
                    scanMessage.status === "checked_in" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
                  }`}>
                    {scanMessage.status === "checked_in" ? "CHECKED IN SUCCESS" : "CHECKED OUT SUCCESS"}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {scanMessage.attendance?.date} • {scanMessage.status === "checked_in" ? scanMessage.attendance?.timeIn : scanMessage.attendance?.timeOut}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <img 
                    src={scanMessage.member?.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"} 
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-805"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="text-sm font-black text-white">{scanMessage.member?.fullName || scanMessage.member?.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{scanMessage.member?.memberId || scanMessage.member?.code}</div>
                  </div>
                </div>

                <div className="text-[10px] italic text-zinc-400">
                  {scanMessage.status === "checked_in" 
                    ? "✓ Entry approved. Dynamic attendance dashboard indices updated." 
                    : "✓ Exit captured. Active training session concluded safely."
                  }
                </div>
              </div>
            )}

            {!scanError && !scanMessage && (
              <div className="text-center py-6 text-zinc-600 font-mono text-[10px] uppercase tracking-wider space-y-1">
                <div className="animate-pulse">Awaiting dynamic validation swipe...</div>
                <div className="text-[9px] text-zinc-700">Terminal Standby Mode</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active checked in roster (Awaiting checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Checked In Right Now Section */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 leading-none">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0inline-block"></span>
              On-Floor Right Now ({activeGymList.length})
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Unsolved checkout slots</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {activeGymList.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                No active athletes on-floor right now.
              </div>
            ) : (
              activeGymList.map((a) => (
                <div key={a.id} className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs">{a.memberName}</h4>
                    <span className="text-[10px] font-mono text-zinc-500 block">Entered at: <span className="text-amber-500">{a.timeIn}</span></span>
                    <span className="text-[10px] italic text-zinc-400 block truncate max-w-[200px]">Remarks: {a.remarks}</span>
                  </div>
                  {user.role !== "MEMBER" && (
                    <button
                      type="button"
                      onClick={() => handleCheckOut(a.id)}
                      className="px-2.5 py-1.5 bg-emerald-500 text-black font-black text-[10px] rounded hover:bg-emerald-400 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 stroke-[3]" /> Checkout
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Tabular Registers logs */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase">Today's Complete Registries log</h3>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search athlete names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-white text-[11px] focus:-border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="text-[10px] font-mono tracking-wider text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2.5">Date & Name</th>
                  <th className="pb-2.5">Duration Time In/Out</th>
                  <th className="pb-2.5">Biological remarks</th>
                  <th className="pb-2.5">Registrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6">
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-500 mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-zinc-500 font-mono">No presence logs stored for this filter.</td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-850/30">
                      <td className="py-2">
                        <span className="font-bold text-white block">{a.memberName}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">{a.date}</span>
                      </td>
                      <td className="py-2">
                        <span className="text-zinc-300 font-mono font-medium block">In: {a.timeIn}</span>
                        <span className="text-[10px] text-zinc-500 block">Out: {a.timeOut || "Active"}</span>
                      </td>
                      <td className="py-2 text-zinc-400 italic font-sans max-w-[150px] truncate">
                        {a.remarks}
                      </td>
                      <td className="py-2 font-mono text-zinc-500">
                        {a.markedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
