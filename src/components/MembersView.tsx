import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, Edit, Delete, Eye, X, ArrowLeft, Dumbbell, Activity, ShieldAlert, BadgeCheck, FileText, Calendar, PlusCircle, Check, Trash2, Heart
} from "lucide-react";
import api from "../services/api";
import { Member, MembershipPlan } from "../types";

interface MembersViewProps {
  user: any;
}

export default function MembersView({ user }: MembersViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  
  // Searching & Filtering parameters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Layout Toggle controls
  const [activeForm, setActiveForm] = useState<"LIST" | "ADD" | "EDIT" | "PROFILE">("LIST");
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Form parameters
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [activePlanId, setActivePlanId] = useState("");
  const [photo, setPhoto] = useState("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop");
  const [status, setStatus] = useState<"Active" | "Inactive" | "Expired" | "Pending">("Active");

  // Load datasets on focus
  async function loadData() {
    try {
      const q = `?search=${search}&status=${statusFilter}&gender=${genderFilter}&page=${page}&limit=10`;
      const response = await api.get(`/members${q}`);
      setMembers(response.data.data);
      setTotalPages(response.data.pagination.totalPages || 1);

      // Support drop-down components
      const plansRes = await api.get("/membership-plans");
      setPlans(plansRes.data);

      const staffRes = await api.get("/staff");
      setTrainers(staffRes.data.filter((u: any) => u.role === "TRAINER"));
    } catch (err) {
      console.error("Failed to load members directory.", err);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, statusFilter, genderFilter, page, activeForm]);

  // Dynamic reactive BMI estimation
  const heightInMeters = height > 0 ? height / 100 : 1.75;
  const estimatedBMI = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));

  // BMI Label Helper
  const getBmiStatus = (bmi: number) => {
    if (bmi < 18.5) return { text: "Underweight", color: "text-blue-400" };
    if (bmi < 25) return { text: "Normal Range", color: "text-emerald-400" };
    if (bmi < 30) return { text: "Overweight", color: "text-amber-500" };
    return { text: "Obese Category", color: "text-red-500" };
  };

  const handleOpenAdd = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setGender("Male");
    setDob("1995-01-01");
    setHeight(175);
    setWeight(75);
    setBloodGroup("O+");
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setTrainerId("");
    setActivePlanId("");
    setPhoto("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop");
    setActiveForm("ADD");
  };

  const handleOpenEdit = (m: Member) => {
    setSelectedMember(m);
    setFullName(m.fullName);
    setEmail(m.email);
    setPhone(m.phone);
    setGender(m.gender);
    setDob(m.dob);
    setHeight(m.height);
    setWeight(m.weight);
    setBloodGroup(m.bloodGroup);
    setAddress(m.address);
    setEmergencyContactName(m.emergencyContactName);
    setEmergencyContactPhone(m.emergencyContactPhone);
    setTrainerId(m.trainerId || "");
    setActivePlanId(m.activePlanId || "");
    setPhoto(m.photo);
    setStatus(m.status);
    setActiveForm("EDIT");
  };

  const handleViewProfile = async (mId: string) => {
    try {
      const response = await api.get(`/members/${mId}`);
      setSelectedMember(response.data);
      setActiveForm("PROFILE");
    } catch (err) {
      alert("Error retrieving detailed profile schema.");
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/members", {
        fullName,
        email,
        phone,
        gender,
        dob,
        height,
        weight,
        bloodGroup,
        address,
        emergencyContactName,
        emergencyContactPhone,
        trainerId: trainerId || null,
        activePlanId: activePlanId || null,
        photo
      });
      setActiveForm("LIST");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error storing member registry.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/members/${selectedMember.id}`, {
        fullName,
        phone,
        gender,
        dob,
        height,
        weight,
        bloodGroup,
        address,
        emergencyContactName,
        emergencyContactPhone,
        trainerId: trainerId || null,
        activePlanId: activePlanId || null,
        status,
        photo
      });
      setActiveForm("LIST");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error compiling profile values.");
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to delete ${name}? This action is irreversible.`)) {
      try {
        await api.delete(`/members/${id}`);
        loadData();
      } catch (err) {
        alert("Err removing this member record.");
      }
    }
  };

  const [activeProfileTab, setActiveProfileTab] = useState<"BIO" | "WORKOUT" | "DIET" | "PAYMENTS">("BIO");

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* 1. LIST VIEW OF ALL MEMBERS */}
      {activeForm === "LIST" && (
        <>
          {/* Header */}
          <div className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
                Member Directory CRM
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Database lookup of full system users, physical stats, trainer assigners, and active plans.
              </p>
            </div>
            {user.role !== "TRAINER" && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.25)]"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" /> Register Member
              </button>
            )}
          </div>

          {/* Search/Filters Hub */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search member ID, name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs focus:border-amber-500 focus:outline-none transition-all placeholder:text-zinc-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400 uppercase">Status</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* CRM Roster Grid Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                    <th className="py-4 px-5">ID & Member</th>
                    <th className="py-4 px-5">Email & Phone</th>
                    <th className="py-4 px-5">Metric Score (BMI)</th>
                    <th className="py-4 px-5">Active Plan</th>
                    <th className="py-4 px-5">Assigned Coach</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-zinc-500 font-mono">
                        No member records match the active criteria.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const bmiVal = getBmiStatus(m.bmi);
                      return (
                        <tr key={m.id} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <img
                                referrerPolicy="no-referrer"
                                src={m.photo}
                                alt={m.fullName}
                                className="w-10 h-10 rounded-xl object-cover border border-zinc-800 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-white text-sm" id={`member-name-${m.id}`}>{m.fullName}</div>
                                <div className="text-[10px] font-bold font-mono text-amber-500 mt-0.5">{m.memberId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="text-white">{m.email}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{m.phone}</div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white">{m.bmi}</span>
                              <span className={`text-[10px] font-semibold ${bmiVal.color}`}>({bmiVal.text})</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{m.height}cm • {m.weight}kg</div>
                          </td>
                          <td className="py-3 px-5 text-white font-medium">
                            {m.planName}
                          </td>
                          <td className="py-3 px-5 text-zinc-300">
                            {m.trainerName}
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className={`inline-block px-2 py-0.5. rounded-full text-[10px] font-bold uppercase font-mono ${
                              m.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              m.status === "Expired" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              m.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                              "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right shrink-0">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                title="View Member Detail Profile Layout"
                                onClick={() => handleViewProfile(m.id)}
                                className="p-2 bg-zinc-950 hover:bg-zinc-850 text-amber-500 border border-zinc-800 rounded-xl"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {user.role !== "TRAINER" && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(m)}
                                  className="p-2 bg-zinc-950 hover:bg-zinc-850 text-white border border-zinc-800 rounded-xl"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user.role === "GYM_OWNER" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(m.id, m.fullName)}
                                  className="p-2 bg-zinc-950 hover:bg-red-500/20 text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-xl"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-zinc-950/60 border-t border-zinc-800 px-5 py-3.5 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-500">Page {page} of {totalPages} pages</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 bg-zinc-90 w-20 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:border-zinc-800 text-white"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 bg-zinc-90 w-20 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:border-zinc-800 text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 2. ADD MEMBER FORM */}
      {activeForm === "ADD" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="text-amber-500 w-5 h-5 animate-pulse" /> Register New Gymnasium Member
            </h2>
            <button
              type="button"
              onClick={() => setActiveForm("LIST")}
              className="p-2 hover:bg-zinc-800 rounded-xl"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleCreateMember} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">FULL NAME *</label>
                <input
                  type="text"
                  placeholder="Chris Hemsworth"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">EMAIL ADDRESS *</label>
                <input
                  type="email"
                  placeholder="chris@hollywood.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">PHONE DIRECTORY *</label>
                <input
                  type="text"
                  placeholder="+1-555-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">GENDER</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">DATE OF BIRTH</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">BLOOD GROUP</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* Physical BMI Metrics Panel */}
              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">HEIGHT (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">WEIGHT (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-xs font-bold font-mono text-zinc-500">DYNAMIC BODY MASS INDEX SCORE (BMI):</span>
                <span className="text-xl font-black text-white ml-2">{estimatedBMI}</span>
              </div>
              <span className={`text-xs font-bold uppercase font-mono ${getBmiStatus(estimatedBMI).color}`}>
                ({getBmiStatus(estimatedBMI).text})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">EMERGENCY CONTACT NAME</label>
                <input
                  type="text"
                  placeholder="Homer Simpson"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">EMERGENCY CONTACT PHONE</label>
                <input
                  type="text"
                  placeholder="+1-555-5555"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">MEMBERSHIP PLAN</label>
                <select
                  value={activePlanId}
                  onChange={(e) => setActivePlanId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="">Select plan (purchased)</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">ASSIGN PROFESSIONAL COACH</label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="">Unassigned (Self Training)</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">RESIDENTIAL STREET ADDRESS</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Residential road details"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none"
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">PHOTO WEB URL</label>
              <input
                type="text"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveForm("LIST")}
                className="flex-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm py-3 cursor-pointer select-none transition-all active:scale-95"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-sm py-3 cursor-pointer select-none transition-all active:scale-95 shadow-lg shadow-amber-500/10"
              >
                Record Profile Setup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. EDIT MEMBER FORM */}
      {activeForm === "EDIT" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="text-amber-500 w-5 h-5" /> Adjust Member Registry Values
            </h2>
            <button
              type="button"
              onClick={() => setActiveForm("LIST")}
              className="p-2 hover:bg-zinc-800 rounded-xl"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">FULL NAME</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">PHONE DIRECTORY</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">GENDER</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">DATE OF BIRTH</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">BLOOD GROUP</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">SYSTEM STATUS</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">HEIGHT (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">WEIGHT (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">EMERGENCY CONTACT NAME</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">EMERGENCY CONTACT PHONE</label>
                <input
                  type="text"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">MEMBERSHIP PLAN</label>
                <select
                  value={activePlanId}
                  onChange={(e) => setActivePlanId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="">No Active Plan</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">ASSIGN PROFESSIONAL COACH</label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300"
                >
                  <option value="">Unassigned (Self Training)</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">RESIDENTIAL STREET ADDRESS</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none"
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-mono tracking-wider text-zinc-400">AVATAR PICTURE LINK</label>
              <input
                type="text"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white font-mono"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveForm("LIST")}
                className="flex-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm py-3 transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-sm py-3 transition-all shadow-lg shadow-amber-500/10"
              >
                Update Member Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. DETAILED PROFILE VIEW (Multi-Tab Overlay) */}
      {activeForm === "PROFILE" && selectedMember && (
        <div className="space-y-6">
          
          {/* Top Quick Actions bar */}
          <div className="flex justify-between items-center">
            <button
               type="button"
               onClick={() => setActiveForm("LIST")}
               className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Go back to listings
            </button>
            <div className="flex gap-2">
              {user.role !== "TRAINER" && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedMember)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs hover:border-amber-500/50 text-amber-500 cursor-pointer"
                >
                  Edit Profile Card
                </button>
              )}
            </div>
          </div>

          {/* Profile Header Visual Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <img
              referrerPolicy="no-referrer"
              src={selectedMember.photo}
              alt={selectedMember.fullName}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-2 border-zinc-800 shrink-0 mx-auto md:mx-0"
            />

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex justify-center md:justify-start items-center gap-3">
                <h2 className="text-2xl font-black text-white">{selectedMember.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                  selectedMember.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  selectedMember.status === "Expired" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {selectedMember.status}
                </span>
              </div>

              <div className="text-xs text-zinc-400 font-medium font-mono">
                MEMBER ID: <span className="text-amber-500 font-bold">{selectedMember.memberId}</span> • 
                JOINED: <span className="text-zinc-300">{selectedMember.joiningDate}</span>
              </div>

              {/* Biological fast details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left pt-3 border-t border-zinc-800/60 mt-3 font-mono">
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">HEIGHT</span>
                  <span className="text-sm font-bold text-white block mt-0.5">{selectedMember.height} cm</span>
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">WEIGHT</span>
                  <span className="text-sm font-bold text-white block mt-0.5">{selectedMember.weight} kg</span>
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">BMI STATUS</span>
                  <span className="text-sm font-black text-amber-500 block mt-0.5">{selectedMember.bmi}</span>
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">BLOOD GROUP</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5">{selectedMember.bloodGroup || "O+"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Tabs Navigation */}
          <div className="flex border-b border-zinc-800 font-mono text-xs">
            <button
               type="button"
               onClick={() => setActiveProfileTab("BIO")}
               className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
                 activeProfileTab === "BIO" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
               }`}
            >
              Contact & Emergency Info
            </button>

            <button
               type="button"
               onClick={() => setActiveProfileTab("WORKOUT")}
               className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                 activeProfileTab === "WORKOUT" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
               }`}
            >
              <Dumbbell className="w-3.5 h-3.5" /> Workout Matrix
            </button>

            <button
               type="button"
               onClick={() => setActiveProfileTab("DIET")}
               className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                 activeProfileTab === "DIET" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
               }`}
            >
              <Heart className="w-3.5 h-3.5" /> Nutrition Diet
            </button>

            <button
               type="button"
               onClick={() => setActiveProfileTab("PAYMENTS")}
               className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all ${
                 activeProfileTab === "PAYMENTS" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
               }`}
            >
              Invoice Log ({selectedMember.payments?.length || 0})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            
            {/* T1: Contact and Emergency */}
            {activeProfileTab === "BIO" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-wider font-mono text-zinc-400 uppercase">Primary Demographics</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-500">Email Address</span>
                      <span className="text-white font-medium">{selectedMember.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-500">Contact Number</span>
                      <span className="text-white font-medium">{selectedMember.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-500">Birthday (D.O.B)</span>
                      <span className="text-white font-mono">{selectedMember.dob || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-500">Residence address</span>
                      <span className="text-white font-medium">{selectedMember.address || "Street Not Provided"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-wider font-mono text-red-400 uppercase flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Emergency contacts guard
                  </h3>
                  <div className="space-y-2 text-xs bg-red-950/20 p-4 border border-red-950 rounded-2xl">
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Contact Name</span>
                      <span className="text-white font-bold">{selectedMember.emergencyContactName || "Not Recorded"}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Guardian relationship</span>
                      <span className="text-zinc-300">Spouse (Family Primary)</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Emergency Phone</span>
                      <span className="text-red-400 font-bold font-mono">{selectedMember.emergencyContactPhone || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* T2: WORKOUT PLAN CHECKLIST */}
            {activeProfileTab === "WORKOUT" && (
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Daily Workout Exercises</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">Assigned by Zara Thorne Coach</span>
                </div>
                
                {!selectedMember.workoutPlan ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-zinc-500 text-xs font-mono">No physical workout exercises recorded yet.</p>
                    {user.role !== "MEMBER" && (
                      <p className="text-[11px] text-zinc-400">Instruct this member's representative to define routines under the Workout & Diet manager.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMember.workoutPlan.exercises?.map((ex: any, idx: number) => (
                      <div key={idx} className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-amber-500/10 text-amber-500 rounded text-center text-xs font-mono inline-flex items-center justify-center">{idx + 1}</span>
                            {ex.name}
                          </h4>
                          <span className="inline-block text-xs text-amber-500/80 font-mono">
                            Sets: {ex.sets} • Reps: <span className="text-white">{ex.reps}</span> • Duration: {ex.durationMin} mins
                          </span>
                          <span className="block text-xs text-zinc-400 italic font-sans mt-1">Goal notes: {ex.notes}</span>
                        </div>
                        <span className="text-[10px] font-mono py-1 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Active Standard
                        </span>
                      </div>
                    ))}
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-400 leading-relaxed max-w-xl">
                      <strong>Overall notes:</strong> {selectedMember.workoutPlan.notes || "Standard lifting routine."}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* T3: NUTRITION DIET */}
            {activeProfileTab === "DIET" && (
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Daily Meal targets</h3>
                  <span className="text-xs text-zinc-400 font-mono">Approved targets</span>
                </div>

                {!selectedMember.dietPlan ? (
                  <div className="text-center py-10">
                    <p className="text-zinc-500 text-xs font-mono">Physical nutrition chart not published for this profile.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-xs">
                        <strong className="text-amber-500 block mb-1">BREAKFAST</strong>
                        <p className="text-zinc-300">{selectedMember.dietPlan.meals?.breakfast || "N/A"}</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-xs">
                        <strong className="text-emerald-400 block mb-1">LUNCH</strong>
                        <p className="text-zinc-300">{selectedMember.dietPlan.meals?.lunch || "N/A"}</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-xs">
                        <strong className="text-amber-500 block mb-1">DINNER LATE SUPPER</strong>
                        <p className="text-zinc-300">{selectedMember.dietPlan.meals?.dinner || "N/A"}</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-xs">
                        <strong className="text-zinc-400 block mb-1">SNACKS & SHAKES</strong>
                        <p className="text-zinc-300">{selectedMember.dietPlan.meals?.snacks || "N/A"}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-3 font-mono">
                        <h4 className="text-xs text-white font-bold uppercase tracking-wider">Macros target</h4>
                        <div className="flex justify-between py-1 border-b border-zinc-900 text-xs">
                          <span className="text-zinc-500">CALORIES</span>
                          <span className="text-white font-bold">{selectedMember.dietPlan.targets?.calories || 0} kcal</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900 text-xs">
                          <span className="text-zinc-500">PROTEIN</span>
                          <span className="text-emerald-400 font-bold">{selectedMember.dietPlan.targets?.proteinGrams || 0}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900 text-xs">
                          <span className="text-zinc-500">WATER</span>
                          <span className="text-blue-400 font-bold">{selectedMember.dietPlan.targets?.waterIntakeLiters || 0} Liters</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* T4: PAYMENTS HISTORY AND INVOICING CARD */}
            {activeProfileTab === "PAYMENTS" && (
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Full Invoiced Ledger</h3>
                  <span className="text-xs text-zinc-400 font-mono">All transaction records</span>
                </div>
                
                {!selectedMember.payments || selectedMember.payments.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-mono">No invoice records found.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedMember.payments.map((p: any) => (
                      <div key={p.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            {p.type} 
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400" :
                              p.status === "Pending" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            REF ID: {p.id} • Mode: {p.paymentMode} • Due: {p.dueDate || "Immediate"}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 font-mono">
                          <div className="text-right">
                            <span className="text-xs text-zinc-500 block">AMOUNT Billed</span>
                            <span className="text-sm font-bold text-white">${p.amount}</span>
                          </div>
                          {p.status === "Paid" && (
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-zinc-90  text-[11px] bg-zinc-900 border border-zinc-800 hover:border-amber-500 rounded text-amber-500 font-bold active:scale-95 transition-all cursor-pointer"
                              onClick={() => {
                                // Trigger printable receipt modal in parent or alert receipt simply
                                alert(`INVOICE RECEIPT\n-----------------------\nInvoice No: INV-2026-${p.id.replace('pay-','')}\nAccount: ${selectedMember.fullName}\nItem: ${p.type}\nPaid via: ${p.paymentMode}\nAmount: $${p.amount}\nStatus: PAID STAMPED\n\nTransaction cleared on: ${p.paymentDate || "2026-06-21"}`);
                              }}
                            >
                              Print receipt
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
