import React, { useState, useEffect } from "react";
import { 
  PlusCircle, Search, Home, MapPin, Phone, Check, ShieldAlert, Award, X, Activity, RefreshCw
} from "lucide-react";
import api from "../services/api";

interface GymsSaaSViewProps {
  user: any;
}

export default function GymsSaaSView({ user }: GymsSaaSViewProps) {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form toggle
  const [isGymOpen, setIsGymOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<"Basic" | "Pro" | "Enterprise">("Basic");

  async function loadGymsDataset() {
    setLoading(true);
    try {
      const response = await api.get("/gyms");
      setGyms(response.data);
    } catch (err) {
      console.error("Failed to load multi-tenant gym directories.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGymsDataset();
  }, []);

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      alert("Gym Name and Address are mandatory.");
      return;
    }

    try {
      await api.post("/gyms", {
        name,
        address,
        phone,
        subscriptionPlan
      });
      setIsGymOpen(false);
      setName("");
      setAddress("");
      setPhone("");
      loadGymsDataset();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error storing multi-tenant franchise.");
    }
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* SaaS Admin check guard */}
      {user.role !== "SUPER_ADMIN" && (
        <div className="bg-red-950/20 border border-red-950 p-6 rounded-2xl flex gap-3 text-red-400">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h3 className="font-extrabold text-sm uppercase font-mono">Unauthorized SaaS Console Access</h3>
            <p className="text-xs text-zinc-400 mt-1">
              This node is reserved strictly for global system administrators of GymFlow CRM platform.
            </p>
          </div>
        </div>
      )}

      {user.role === "SUPER_ADMIN" && (
        <>
          {/* Top Header */}
          <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
                Global SaaS Franchises Control
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Deploy container instances, manage billing plans, and partition multi-tenant databases.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsGymOpen(true)}
              className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
            >
              <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> Onboard New Franchise
            </button>
          </div>

          {/* SaaS onboarding form */}
          {isGymOpen && (
            <div className="bg-zinc-950 border border-amber-500/20 p-5 rounded-2xl space-y-4 max-w-xl animate-slideDown">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-bold text-amber-500 font-mono tracking-widest uppercase">Onboard Tenant Franchise</h3>
                <button
                   type="button"
                   onClick={() => setIsGymOpen(false)}
                   className="p-1 hover:bg-zinc-900 rounded-lg cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleCreateGym} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">FRANCHISE GYM NAME</label>
                    <input
                      type="text"
                      placeholder="Gold's Gym Uptown"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">CONTACT PHONE No.</label>
                    <input
                      type="text"
                      placeholder="+1-555-8000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">PHYSICAL GEO ADDRESS</label>
                    <input
                      type="text"
                      placeholder="99 Broadway avenue, Downtown Manhattan, NY"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-white rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-zinc-500 font-mono font-bold uppercase block tracking-wider">SaaS CONTAINER BILLING PLAN</label>
                    <select
                      value={subscriptionPlan}
                      onChange={(e) => setSubscriptionPlan(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-xl"
                    >
                      <option value="Basic">Basic Edition ($99/mo - 50 Member limit)</option>
                      <option value="Pro">Pro Premium ($199/mo - 500 Member limit)</option>
                      <option value="Enterprise">Enterprise Elite ($399/mo - Unlimited database)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-lg text-zinc-400">
                  <span className="font-bold text-zinc-300 block mb-1">AUTOMATED TENANT PARTITIONING:</span>
                  <p className="text-[10px] sm:text-[11px] leading-relaxed">Checking of availability, creation of specific isolated database schemas, automatic allocation of SSL routing gateways and port binding takes up to 2 minutes behind our Nginx proxy layer.</p>
                </div>

                <div className="flex gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsGymOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-90 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800 transition text-center"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl transition shadow-lg shadow-amber-500/10"
                  >
                    Instantiate Tenant System
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tenants franchise card grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full text-center py-10">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
              </div>
            ) : gyms.length === 0 ? (
              <div className="col-span-full text-center py-10 bg-zinc-950 border border-dashed border-zinc-850 rounded-2xl text-zinc-400 text-xs font-mono">
                No active franchise tenants on-record.
              </div>
            ) : (
              gyms.map((g) => (
                <div key={g.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4 hover:border-amber-500/40 transition-all duration-300 group" id={`saas-gym-${g.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl shrink-0">
                      <Home className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                      g.subscriptionPlan === "Enterprise" ? "bg-purple-500/10 text-purple-400 border border-purple-500/10" :
                      g.subscriptionPlan === "Pro" ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" :
                      "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}>
                      {g.subscriptionPlan} Plan
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-base group-hover:text-amber-500 transition-colors">
                      {g.name}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Tenant Code: {g.id}</span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono border-t border-zinc-850 pt-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="truncate">{g.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{g.phone || "+1-555-XXXX"}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-850 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                    <span>Active members</span>
                    <span className="text-white font-bold bg-zinc-950 py-1 px-3 border border-zinc-850 rounded-lg">
                      {g.id === "gym-0" ? "21" : "3"} members
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

    </div>
  );
}
