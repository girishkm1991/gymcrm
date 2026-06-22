import React, { useState, useEffect } from "react";
import { 
  Users, Mail, Phone, PlusCircle, Check, X, ShieldAlert, BadgeCheck, Sliders, ToggleLeft, ArrowLeft
} from "lucide-react";
import api from "../services/api";

interface StaffViewProps {
  user: any;
  setTab?: (tab: string) => void;
}

export default function StaffView({ user, setTab }: StaffViewProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form toggles
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Form variables
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"TRAINER" | "RECEPTIONIST">("TRAINER");

  async function loadStaffLogs() {
    setLoading(true);
    try {
      const response = await api.get("/staff");
      setStaff(response.data);
    } catch (err) {
      console.error("Failed to load staff roster.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaffLogs();
  }, []);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      alert("Staff Full Name and Email are mandatory.");
      return;
    }

    try {
      const response = await api.post("/staff", {
        fullName,
        email,
        phone,
        role
      });
      alert(response.data.message || "Staff recorded successfully!");
      setIsInviteOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      loadStaffLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording staff profile.");
    }
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Header header */}
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
              Staff & Representatives Directory
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Invite, organize, and grant cryptographic system credentials to trainers or frontdesk receptionists.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
        >
          <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Invite Staff Member
        </button>
      </div>

      {/* Invite Draw Form */}
      {isInviteOpen && (
        <div className="bg-zinc-950 border border-amber-500/20 p-5 rounded-2xl space-y-4 max-w-xl animate-slideDown">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-bold text-amber-500 font-mono tracking-widest uppercase">Invite New Staff</h3>
            <button
               type="button"
               onClick={() => setIsInviteOpen(false)}
               className="p-1 hover:bg-zinc-900 rounded-lg cursor-pointer"
            >
              <X className="w-4.5 h-4.5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleInviteStaff} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">FULL NAME</label>
                <input
                  type="text"
                  placeholder="Zara Thorne (Trainer)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="zara@imvelogym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">PHONE NUMBER</label>
                <input
                  type="text"
                  placeholder="+1-555-0811"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">SYSTEM ROLE</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                >
                  <option value="TRAINER">TRAINER (Can assign plans)</option>
                  <option value="RECEPTIONIST">RECEPTIONIST (Can record fees & check-ins)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg text-[11px] text-zinc-400">
              <strong className="text-zinc-300">Notice:</strong> Invited staff members default password is seeded automatically to <strong className="text-amber-500 font-mono">password123</strong>. They can log in immediately with their emails.
            </div>

            <div className="flex gap-4 pt-1">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="flex-1 py-2.5 bg-zinc-90 w-20 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800 transition"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl transition shadow-lg shadow-amber-500/10"
              >
                Create Staff User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff directory grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-10">
            <div className="inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : staff.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-zinc-950 border border-dashed border-zinc-850 rounded-2xl text-zinc-500 font-mono text-xs">
            No on-premise staff members registered yet.
          </div>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all duration-300 group hover:shadow-[0_4px_15px_rgba(245,158,11,0.05)] relative overflow-hidden" id={`staff-card-${s.id}`}>
              <div className="absolute top-0 right-0 py-1 px-3 bg-amber-500/10 text-amber-500 text-[9px] uppercase font-bold tracking-widest font-mono rounded-bl-xl border-l border-b border-amber-500/10">
                {s.role}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center font-black text-amber-500 text-sm">
                    {s.fullName.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm group-hover:text-amber-500 transition-colors">
                      {s.fullName}
                    </h3>
                    <span className="inline-block text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.5 rounded leading-none">
                      ID: {s.id}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono border-t border-zinc-850 pt-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{s.phone || "+1-555-XXXX"}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase">Status</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> ACTIVE STALL
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
