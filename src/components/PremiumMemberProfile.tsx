import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Calendar, CreditCard, DollarSign, Activity, AlertTriangle, ShieldAlert, 
  Heart, Clock, Printer, QrCode, ClipboardList, Award, Scale, Image, FileText, 
  RefreshCw, Send, Sparkles, BookOpen, ExternalLink, Plus, Edit, Trash2, Check,
  X, Shield, Briefcase, HeartHandshake, Phone, Home, HeartCrack, ChevronRight, UserCheck
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, BarChart, Bar, LineChart, Line 
} from "recharts";

interface Note {
  id: string;
  category: "Receptionist" | "Trainer" | "Owner";
  author: string;
  content: string;
  date: string;
  time: string;
}

interface PremiumMemberProfileProps {
  user: any;
  selectedMember: any;
  memberQrCode: string;
  progressHistory: any[];
  photosList: any[];
  timelineEntries: any[];
  membershipHistory: any[];
  trainers: any[];
  plans: any[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenEdit: (member: any) => void;
  api: any;
}

export default function PremiumMemberProfile({
  user,
  selectedMember,
  memberQrCode,
  progressHistory,
  photosList,
  timelineEntries,
  membershipHistory,
  trainers,
  plans,
  onBack,
  onRefresh,
  onOpenEdit,
  api
}: PremiumMemberProfileProps) {
  const [activeTab, setActiveTab] = useState<string>("OVERVIEW");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Modal active states
  const [modalType, setModalType] = useState<"PAYMENT" | "RENEW" | "TRAINER" | "WORKOUT" | "DIET" | "QR" | "PROGRESS_LOG" | "PHOTO_UPLOAD" | null>(null);

  // Form states
  // Payment Form States
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("Membership Fee");
  const [payMode, setPayMode] = useState("Cash");
  const [payStatus, setPayStatus] = useState("Paid");
  const [payDueDate, setPayDueDate] = useState("");

  // Plan Renewal Form States
  const [renewPlanId, setRenewPlanId] = useState(selectedMember?.activePlanId || "");
  const [renewPrice, setRenewPrice] = useState("");

  // Trainer Assign Form
  const [assignTrainerId, setAssignTrainerId] = useState(selectedMember?.trainerId || "");

  // Workout Assignment States
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState([
    { name: "Barbell Squats", sets: 4, reps: 10, durationMin: 15, notes: "Warm up with bodyweight first" },
    { name: "Incline Bench Press", sets: 3, reps: 12, durationMin: 12, notes: "Focus on peak contraction" }
  ]);

  // Diet Assignment States
  const [dietBreakfast, setDietBreakfast] = useState("Protein Shake & Oatmeal with Blueberries");
  const [dietLunch, setDietLunch] = useState("Grilled Chicken Breast, Brown Rice & Broccoli");
  const [dietDinner, setDietDinner] = useState("Pan-Seared Salmon, Asparagus & Sweet Potatoes");
  const [dietCalories, setDietCalories] = useState(2500);
  const [dietProtein, setDietProtein] = useState(160);
  const [dietWater, setDietWater] = useState(3.5);
  const [dietNotes, setDietNotes] = useState("Keep sodium intake under 2000mg.");

  // Body Progress States inside Overview/Progress
  const [measureWeight, setMeasureWeight] = useState(selectedMember?.weight || 75);
  const [measureHeight, setMeasureHeight] = useState(selectedMember?.height || 175);
  const [measureBodyFat, setMeasureBodyFat] = useState(selectedMember?.bodyFat || 15);
  const [measureChest, setMeasureChest] = useState(selectedMember?.chest || 95);
  const [measureWaist, setMeasureWaist] = useState(selectedMember?.waist || 80);
  const [measureHip, setMeasureHip] = useState(selectedMember?.hip || 90);
  const [measureBiceps, setMeasureBiceps] = useState(selectedMember?.biceps || 35);
  const [measureThigh, setMeasureThigh] = useState(selectedMember?.thigh || 55);
  const [measureShoulders, setMeasureShoulders] = useState(98);
  const [measureNotes, setMeasureNotes] = useState("");

  // Photo Upload States
  const [photoCategory, setPhotoCategory] = useState<"Front" | "Side" | "Back" | "Custom">("Front");
  const [photoBase64, setPhotoBase64] = useState("");

  // CRM style Notes
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<"Receptionist" | "Trainer" | "Owner">("Receptionist");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Load CRM notes on mount
  useEffect(() => {
    if (selectedMember?.id) {
      const stored = localStorage.getItem(`imvelogym_crm_notes_${selectedMember.id}`);
      if (stored) {
        try {
          setNotesList(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored notes", e);
        }
      } else {
        // Seed default template notes
        const defaultNotes: Note[] = [
          {
            id: "note-1",
            category: "Receptionist",
            author: "System Auto Setup",
            content: "Welcome onboarded verified account check completed successfully.",
            date: new Date().toLocaleDateString(),
            time: "10:15 AM"
          }
        ];
        setNotesList(defaultNotes);
        localStorage.setItem(`imvelogym_crm_notes_${selectedMember.id}`, JSON.stringify(defaultNotes));
      }
    }
  }, [selectedMember?.id]);

  // Utility to handle local notes persistence
  const saveNotes = (updatedNotes: Note[]) => {
    setNotesList(updatedNotes);
    if (selectedMember?.id) {
      localStorage.setItem(`imvelogym_crm_notes_${selectedMember.id}`, JSON.stringify(updatedNotes));
    }
  };

  // Date diff countdown utility
  const calculateDaysLeft = (endDateStr: string) => {
    if (!endDateStr) return { days: 0, text: "Lifetime Access", expired: false };
    const end = new Date(endDateStr);
    const today = new Date();
    end.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return {
      days,
      text: days < 0 ? "Expired" : `${days} Days`,
      expired: days < 0
    };
  };

  const calculateAge = (dobStr: string) => {
    if (!dobStr) return 25;
    const birth = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getAttendanceStats = () => {
    const logs = selectedMember?.attendance || [];
    const totalVisits = logs.length;
    const visitsThisMonth = logs.filter((l: any) => {
      const logDate = new Date(l.date);
      const now = new Date();
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Average duration in minutes
    let totalMinutes = 0;
    let countsWithDuration = 0;
    logs.forEach((l: any) => {
      if (l.timeIn && l.timeOut) {
        const [h1, m1] = l.timeIn.split(":").map(Number);
        const [h2, m2] = l.timeOut.split(":").map(Number);
        const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMin > 0) {
          totalMinutes += diffMin;
          countsWithDuration++;
        }
      }
    });
    const avgDuration = countsWithDuration > 0 ? Math.round(totalMinutes / countsWithDuration) : 0;
    return {
      totalVisits,
      visitsThisMonth,
      avgDurationText: avgDuration > 0 ? `${Math.floor(avgDuration / 60)}h ${avgDuration % 60}m` : "1h 15m",
      attendanceRate: Math.min(100, Math.round((totalVisits / 24) * 100))
    };
  };

  const attendanceStats = getAttendanceStats();

  const getActiveAttendanceRecord = () => {
    const logs = selectedMember?.attendance || [];
    const todayStr = new Date().toISOString().split("T")[0];
    return logs.find((l: any) => l.date === todayStr && !l.timeOut);
  };

  const activeCheckInRecord = getActiveAttendanceRecord();

  // Action: Log Attendance Check-In / Check-Out
  const handleCheckInOut = async () => {
    setLoadingAction("attendance");
    try {
      if (activeCheckInRecord) {
        // Already checked in, lets check out!
        await api.put(`/attendance/${activeCheckInRecord.id}`, {
          timeOut: new Date().toTimeString().split(" ")[0],
          remarks: "Customer checked out via Premium SaaS panel."
        });
        alert("Completed Check-Out successfully!");
      } else {
        // Let's check in
        await api.post("/attendance", {
          memberId: selectedMember.id,
          date: new Date().toISOString().split("T")[0],
          timeIn: new Date().toTimeString().split(" ")[0],
          remarks: "Receptionist verified Check-In via Elite CLI Profile Console."
        });
        alert("Checked in successfully!");
      }
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error modifying attendance state.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Add Payment
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setLoadingAction("payment");
    try {
      await api.post("/payments", {
        memberId: selectedMember.id,
        amount: Number(payAmount),
        type: payType,
        paymentMode: payMode,
        status: payStatus,
        dueDate: payDueDate || null
      });
      alert(`Financial transaction recorded for ${selectedMember.fullName}!`);
      setModalType(null);
      setPayAmount("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to log payment.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Renew/Upgrade access plan
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewPlanId) {
      alert("Please choose a membership tier.");
      return;
    }
    setLoadingAction("plan");
    try {
      const selectedPlan = plans.find(p => p.id === renewPlanId);
      const pr = renewPrice || (selectedPlan ? selectedPlan.price : "150");
      await api.post("/memberships/renew", {
        memberId: selectedMember.id,
        planId: renewPlanId,
        pricePaid: Number(pr)
      });
      alert(`Access Plan updated successfully!`);
      setModalType(null);
      setRenewPrice("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to process Membership Change.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Assign Professional Coach
  const handleAssignTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("trainer");
    try {
      await api.put(`/members/${selectedMember.id}`, {
        trainerId: assignTrainerId
      });
      alert("Personal coach updated successfully!");
      setModalType(null);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to map coach assignments.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Customize Workout plan
  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("workout");
    try {
      await api.post("/workouts", {
        memberId: selectedMember.id,
        exercises: workoutExercises,
        notes: workoutNotes
      });
      alert("Assigned Workout Sheet published successfully!");
      setModalType(null);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to commit workout sheets.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Customize Diet plan
  const handleDietSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("diet");
    try {
      await api.post("/diet", {
        memberId: selectedMember.id,
        meals: {
          breakfast: dietBreakfast,
          lunch: dietLunch,
          dinner: dietDinner
        },
        targets: {
          calories: Number(dietCalories),
          proteinGrams: Number(dietProtein),
          waterIntakeLiters: Number(dietWater)
        },
        notes: dietNotes
      });
      alert("Therapeutic diet target macros updated!");
      setModalType(null);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to commit nutritional targets.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Log Measurement Point
  const handleMeasureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("measure");
    try {
      await api.post(`/members/${selectedMember.id}/progress`, {
        weight: Number(measureWeight),
        bodyFat: Number(measureBodyFat),
        chest: Number(measureChest),
        waist: Number(measureWaist),
        hip: Number(measureHip),
        biceps: Number(measureBiceps),
        thigh: Number(measureThigh),
        notes: measureNotes || `Routine biometric audit log. Height at ${measureHeight}cm.`
      });
      alert("Biometric logs created!");
      setModalType(null);
      setMeasureNotes("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to log metrics.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Upload comparison photo
  const handlePhotoCategoryUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBase64) {
      alert("Please upload or drag a JPEG/PNG photo first.");
      return;
    }
    setLoadingAction("photo");
    try {
      await api.post(`/members/${selectedMember.id}/progress-photos`, {
        category: photoCategory,
        photo: photoBase64
      });
      alert(`Success! Photo registered under ${photoCategory} portfolio.`);
      setPhotoBase64("");
      setModalType(null);
      onRefresh();
    } catch (err: any) {
      alert("Error logging progress image. Support for image base64 processing completed draft.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBase64File = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Notes actions
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    if (editingNoteId) {
      const updated = notesList.map(n => n.id === editingNoteId ? {
        ...n,
        content: noteContent,
        category: noteCategory,
        author: `${user.fullName || "Staff"} (Updated)`
      } : n);
      saveNotes(updated);
      setEditingNoteId(null);
    } else {
      const newNote: Note = {
        id: "note-" + Date.now(),
        category: noteCategory,
        author: user.fullName || "Staff Assistant",
        content: noteContent,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveNotes([newNote, ...notesList]);
    }
    setNoteContent("");
  };

  const handleEditNoteLaunch = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteContent(note.content);
    setNoteCategory(note.category);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this CRM note?")) {
      const filtered = notesList.filter(n => n.id !== id);
      saveNotes(filtered);
    }
  };

  // Print high-fidelity membership card
  const handlePrintTrigger = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const expiryStr = selectedMember.endDate || "N/A";
    const statusText = selectedMember.status || "Active";
    const planText = selectedMember.planName || "Commercial Pro Access";
    const qrUrl = memberQrCode || "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + selectedMember.memberId;

    const printHtml = `
      <html>
        <head>
          <title>ImveloGYM Membership Guard System Badge</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=JetBrains+Mono&display=swap');
            body { background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 2px solid #f59e0b; width: 380px; height: 220px; border-radius: 20px; padding: 20px; background: linear-gradient(135deg, #18181b 0%, #09090b 100%); position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .glow { position: absolute; width: 100px; height: 100px; background: rgba(245, 158, 11, 0.1); border-radius: 50%; filter: blur(50px); top: -20px; right: -20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 10px; margin-bottom: 10px; }
            .title { color: #f59e0b; font-size: 14px; font-weight: bold; letter-spacing: 2px; }
            .avatar { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; border: 1.5px solid #27272a; }
            .details { font-size: 11px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; color: #a1a1aa; }
            .name { font-size: 15px; font-weight: bold; color: #fff; margin-bottom: 4px; }
            .qr-area { position: absolute; bottom: 15px; right: 15px; background: #fff; padding: 4px; border-radius: 6px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;}
            .qr-area img { width: 100%; height: 100%; object-fit: contain; }
            .status { font-size: 8px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 10px; display: inline-block; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="card">
            <div class="glow"></div>
            <div class="header">
              <div>
                <div class="title">IMVELOGYM PREMIUM</div>
                <div class="name">${selectedMember.fullName}</div>
                <div class="status">${statusText}</div>
              </div>
              <img class="avatar" src="${selectedMember.photo || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop'}" />
            </div>
            <div class="details">ID: ${selectedMember.memberId}</div>
            <div class="details">PLAN: ${planText}</div>
            <div class="details">VALID UNTIL: ${expiryStr}</div>
            <div class="qr-area">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedMember.memberId}" />
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Expiry check values for countdown card
  const daysLeft = calculateDaysLeft(selectedMember?.endDate);

  // Role permissions gate logic
  const isTrainer = user.role === "TRAINER";
  const isReceptionist = user.role === "RECEPTIONIST";
  const isOwner = user.role === "GYM_OWNER";

  // Filter tabs list matching role definitions
  const allTabs = [
    { id: "OVERVIEW", label: "Overview", icon: ClipboardList, visible: true },
    { id: "ATTENDANCE", label: "Attendance History", icon: Calendar, visible: true },
    { id: "PAYMENTS", label: "Payment History", icon: CreditCard, visible: !isTrainer },
    { id: "PROGRESS", label: "Body Measurements", icon: Scale, visible: !isReceptionist || isOwner },
    { id: "PHOTOS", label: "Progress Photos", icon: Image, visible: !isReceptionist || isOwner },
    { id: "WORKOUT", label: "Workout Plans", icon: Activity, visible: !isReceptionist || isOwner },
    { id: "MEDICAL", label: "Medical Information", icon: ShieldAlert, visible: !isReceptionist || isOwner },
    { id: "NOTES", label: "CRM Notes", icon: FileText, visible: true },
    { id: "TIMELINE", label: "Activity Timeline", icon: Clock, visible: true }
  ];

  const visibleTabs = allTabs.filter(t => t.visible);

  return (
    <div className="space-y-6">
      
      {/* RETURNING BREADCRUMB */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-850 pb-5">
        <button
          onClick={onBack}
          className="w-fit px-4.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-2 cursor-pointer transition-all hover:bg-zinc-90 w-fit active:scale-95 text-xs font-mono font-bold"
        >
          <X className="w-3.5 h-3.5 text-zinc-500" /> Close Profile View
        </button>

        <div className="flex flex-wrap gap-2">
          {selectedMember.medicalWarnings && (
            <div className="bg-red-500/10 border border-red-500/25 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-red-400 font-mono text-[10px] font-black uppercase animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Caution: Critical Medical Condition
            </div>
          )}
          <span className="bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl text-zinc-400 font-mono text-[10px] uppercase">
            Gym Segment: <strong className="text-amber-500 font-bold">ImveloGYM Main</strong>
          </span>
        </div>
      </div>

      {/* ==================== PREMIUM PROFILE HEADER ==================== */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6.5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 relative z-10">
          
          {/* Member Photo Frame with status badge overlay */}
          <div className="relative shrink-0 mx-auto lg:mx-0 group">
            <img 
              referrerPolicy="no-referrer"
              src={selectedMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"} 
              alt={selectedMember.fullName}
              className="w-28 h-28 md:w-34 md:h-34 rounded-2xl object-cover border-2 border-zinc-800 shadow-xl transition-all group-hover:border-amber-500/50"
            />
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 justify-center w-full">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-widest font-black uppercase border shadow-md ${
                selectedMember.status === "Active" ? "bg-emerald-950/90 text-emerald-400 border-emerald-500/30" :
                selectedMember.status === "Expired" ? "bg-red-950/90 text-red-400 border-red-500/30" :
                selectedMember.status === "Suspended" ? "bg-amber-950/90 text-amber-500 border-amber-500/30" :
                "bg-zinc-900 text-zinc-400 border-zinc-700"
              }`}>
                {selectedMember.status || "Active"}
              </span>
            </div>
          </div>

          {/* Member Identity Details column */}
          <div className="flex-grow space-y-2.5 text-center lg:text-left">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-col sm:flex-row items-center gap-3">
                {selectedMember.fullName}
                <span className="text-xs font-mono font-medium text-zinc-500 px-2 rounded-lg bg-zinc-900 border border-zinc-800 py-0.5">
                  ID: <span className="text-amber-500 font-bold">{selectedMember.memberId || "M-889"}</span>
                </span>
              </h1>
              
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-3 gap-y-1.5 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Award className="w-3.5 h-3.5" /> {selectedMember.planName || "Core Premium Plan"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Expiry: <strong className="text-zinc-200">{selectedMember.endDate || "N/A"}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-500" /> Coach: <strong className="text-zinc-200">{selectedMember.trainerName || "Self-Coached"}</strong>
                </span>
              </div>
            </div>

            <p className="text-zinc-400 text-xs max-w-xl max-h-12 overflow-y-auto leading-relaxed italic">
              "{selectedMember.trainerNotes || "No active general onboarding bios logged yet."}"
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
              <div>Member Since: <strong className="text-zinc-300 font-bold">{selectedMember.joiningDate}</strong></div>
              <div className="hidden sm:block">•</div>
              <div>Primary Phone: <strong className="text-zinc-300 font-bold">{selectedMember.phone || "No phone"}</strong></div>
              <div className="hidden sm:block">•</div>
              <div>Age Segment: <strong className="text-zinc-300 font-bold">{calculateAge(selectedMember.dob)} Yrs</strong></div>
            </div>
          </div>
        </div>

        {/* --- QUICK STATISTICS FAST GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-5 mt-6 border-t border-zinc-850/80">
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl font-mono relative">
            <span className="text-zinc-500 text-[9px] block uppercase font-medium">Total Attendance</span>
            <div className="text-xl font-black text-white mt-1 flex items-baseline gap-1">
              {attendanceStats.totalVisits}
              <span className="text-xs text-zinc-500 font-normal">Check-ins</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl font-mono">
            <span className="text-zinc-500 text-[9px] block uppercase font-medium">Current Weight</span>
            <div className="text-xl font-black text-amber-500 mt-1 flex items-baseline gap-1">
              {selectedMember.weight || 75}
              <span className="text-xs text-zinc-400 font-normal">kg</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl font-mono">
            <span className="text-zinc-500 text-[9px] block uppercase font-medium">Body mass BMI</span>
            <div className="text-xl font-black text-white mt-1 flex items-baseline gap-1">
              {selectedMember.bmi || "24.5"}
              <span className="text-[9px] border border-emerald-500/20 px-1 text-emerald-400 font-bold uppercase rounded bg-emerald-500/5">Norm</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl font-mono">
            <span className="text-zinc-500 text-[9px] block uppercase font-medium">Pending Dues</span>
            <div className="text-xl font-black text-red-400 mt-1">
              ${selectedMember.pendingAmount || "0"}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl font-mono col-span-2 md:col-span-1">
            <span className="text-zinc-500 text-[9px] block uppercase font-medium">Last Visit Checked</span>
            <div className="text-xs font-bold text-emerald-400 mt-1.5 truncate">
              {selectedMember.attendance && selectedMember.attendance.length > 0 
                ? `${selectedMember.attendance[0].date} @ ${selectedMember.attendance[0].timeIn}` 
                : "No visits recorded"}
            </div>
          </div>
        </div>

        {/* --- STICKY / INSTANT QUICK ACTION QUICKBAR --- */}
        <div className="flex flex-wrap items-center gap-2 mt-5 bg-zinc-900/60 p-2.5 border border-zinc-850 rounded-2xl">
          <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest font-bold px-2">Action Desk:</span>
          
          <button 
            onClick={() => onOpenEdit(selectedMember)}
            className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <Edit className="w-3.5 h-3.5 text-amber-500" /> Edit Profile
          </button>

          {!isTrainer && (
            <button 
              onClick={() => {
                setPayAmount("");
                setPayDueDate(new Date().toISOString().split("T")[0]);
                setModalType("PAYMENT");
              }}
              className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-90 hover:border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Record Fee
            </button>
          )}

          {!isTrainer && (
            <button 
              onClick={() => {
                setRenewPlanId(selectedMember.activePlanId || "");
                setRenewPrice("");
                setModalType("RENEW");
              }}
              className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-90 hover:border-zinc-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Upgrade / Renew Plan
            </button>
          )}

          <button 
            onClick={handleCheckInOut}
            disabled={loadingAction === "attendance"}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
              activeCheckInRecord 
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" 
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> 
            {loadingAction === "attendance" ? "Working..." : activeCheckInRecord ? "Check Out Member" : "Mark Presence Check In"}
          </button>

          <button 
            onClick={handlePrintTrigger}
            className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-amber-500" /> Print ID
          </button>

          <button 
            onClick={() => setModalType("QR")}
            className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-500" /> QR Card
          </button>

          {!isReceptionist && (
            <button 
              onClick={() => {
                setAssignTrainerId(selectedMember.trainerId || "");
                setModalType("TRAINER");
              }}
              className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-500" /> Map Coach
            </button>
          )}

          {!isReceptionist && (
            <button 
              onClick={() => {
                setWorkoutNotes(selectedMember.workoutPlan?.notes || "");
                setModalType("WORKOUT");
              }}
              className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" /> Set Workout
            </button>
          )}

          {!isReceptionist && (
            <button 
              onClick={() => {
                setModalType("DIET");
              }}
              className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-red-500" /> Set Diet
            </button>
          )}
        </div>
      </div>

      {/* ==================== TABS NAVIGATION CONTAINER ==================== */}
      <div className="flex border-b border-zinc-800 font-mono text-xs overflow-x-auto shrink-0 pb-1.5 gap-1.5">
        {visibleTabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 border-b-2 font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id 
                  ? "border-amber-500 text-amber-500 bg-amber-500/5 rounded-t-2xl" 
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================== SCREEN SWITCHBOARD ==================== */}
      <div className="bg-zinc-950 border border-zinc-850 p-6.5 rounded-3xl min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            
            {/* 1. OVERVIEW DETAIL */}
            {activeTab === "OVERVIEW" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-zinc-300">
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Personal identity Details card */}
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                    <h3 className="text-zinc-200 font-mono font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-zinc-800 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" /> Bio Information Setup
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 font-mono">
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-500">Full Legal Name</span>
                        <strong className="text-white">{selectedMember.fullName}</strong>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-500">Primary Contact email</span>
                        <span className="text-white hover:underline cursor-pointer">{selectedMember.email}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-500">Phone Address</span>
                        <span className="text-white font-bold">{selectedMember.phone || "No phone record"}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-500">Professional occupation</span>
                        <span className="text-white">{selectedMember.occupation || "Independent Athlete"}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-500">Gender code</span>
                        <span className="text-white">{selectedMember.gender || "Unspecified"}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-zinc-505">Blood Group Biomarker</span>
                        <span className="text-emerald-400 font-bold">{selectedMember.bloodGroup || "O+"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address and Emergency contact row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl space-y-2">
                      <h4 className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-zinc-500" /> Resident Address
                      </h4>
                      <p className="text-zinc-300 italic py-1">
                        {selectedMember.address || "No primary residential street coordinates declared."}
                      </p>
                    </div>

                    <div className="bg-zinc-900/50 border border-red-950/40 p-4.5 rounded-2xl space-y-2.5">
                      <h4 className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <HeartCrack className="w-3.5 h-3.5" /> Emergency Guardian Contact
                      </h4>
                      <div className="font-mono">
                        <div className="flex justify-between text-zinc-400 mb-1">
                          <span>Guardian Full Name:</span>
                          <strong className="text-white">{selectedMember.emergencyContactName || "Not Recorded"}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Direct Emergency Phone:</span>
                          <strong className="text-red-400">{selectedMember.emergencyContactPhone || "No telephone"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coach assign notes & Fitness Goals */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl space-y-2">
                      <span className="text-[10px] text-amber-500 font-mono font-bold uppercase block tracking-wider">Coach Assigned Goal Target</span>
                      <strong className="text-white block text-sm">"{selectedMember.fitnessGoal || "Lean body reconfiguration"}"</strong>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl space-y-2">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase block tracking-wider">Assigned Locker ID</span>
                      <strong className="text-emerald-400 block text-xs">{selectedMember.locker || "No permanent locker map setup. Standard open day-lockers use."}</strong>
                    </div>
                  </div>
                </div>

                {/* Right col: Expiry Countdown Card & printable visual widget preview */}
                <div className="space-y-6">
                  
                  {/* COUNTDOWN EXPIRY EXQUISITE CARD */}
                  <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden ${
                    daysLeft.expired 
                      ? "bg-red-950/20 border-red-950 text-red-100" 
                      : daysLeft.days <= 10 
                        ? "bg-amber-950/20 border-amber-950 text-amber-100 animate-pulse"
                        : "bg-emerald-950/15 border-emerald-950 text-emerald-100"
                  }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-1 font-bold">Membership Active Coverage</span>
                    <Clock className={`w-8 h-8 mb-2 ${daysLeft.expired ? "text-red-500" : daysLeft.days <= 10 ? "text-amber-500" : "text-emerald-400"}`} />
                    <div className="text-3xl font-black font-mono tracking-tighter">
                      {daysLeft.text}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 font-mono">
                      {daysLeft.expired ? "Coverage ended. Needs immediate action." : `Expiry Date locked: ${selectedMember.endDate || "Unlimited"}`}
                    </p>
                  </div>

                  {/* DIGITAL QR PASS BADGE */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-center space-y-4">
                    <h4 className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">Secure digital access Pass</h4>
                    
                    <div className="bg-white p-3.5 rounded-2xl inline-block shadow-2xl">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=M-889" 
                        alt="Secure ID Bar" 
                        className="w-28 h-28 mx-auto"
                      />
                    </div>
                    <div className="font-mono text-[10px] text-zinc-400 select-all">
                      SCAN CODE: <span className="text-amber-500 font-bold">{selectedMember.memberId}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ATTENDANCE HISTORY */}
            {activeTab === "ATTENDANCE" && (
              <div className="space-y-6 text-xs text-zinc-300">
                
                {/* Statistics panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl font-mono text-center">
                    <span className="text-zinc-500 text-[9px] uppercase block">Visits this Month</span>
                    <strong className="text-white text-xl block mt-1">{attendanceStats.visitsThisMonth}</strong>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl font-mono text-center">
                    <span className="text-zinc-500 text-[9px] uppercase block">Assigned rate</span>
                    <strong className="text-amber-500 text-xl block mt-1">{attendanceStats.attendanceRate}%</strong>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl font-mono text-center">
                    <span className="text-zinc-500 text-[9px] uppercase block">Avg Workout Time</span>
                    <strong className="text-emerald-400 text-xl block mt-1">{attendanceStats.avgDurationText}</strong>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl font-mono text-center">
                    <span className="text-zinc-500 text-[9px] uppercase block">Today status</span>
                    <strong className={`text-xl block mt-1 ${activeCheckInRecord ? "text-emerald-400" : "text-zinc-500"}`}>
                      {activeCheckInRecord ? "IN BUILDING" : "OUTSIDE"}
                    </strong>
                  </div>
                </div>

                {/* VISUAL CHARTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <h4 className="text-[10px] text-zinc-400 font-mono font-bold uppercase block mb-3">Attendance Visits Slope Trend</h4>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { name: "Week 1", checkins: 3 },
                          { name: "Week 2", checkins: 4 },
                          { name: "Week 3", checkins: 5 },
                          { name: "Week 4", checkins: attendanceStats.visitsThisMonth || 4 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                          <YAxis stroke="#52525b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a" }} />
                          <Line type="monotone" dataKey="checkins" stroke="#f59e0b" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* GitHub contribution style attendance calendar heat map */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl">
                    <h4 className="text-[10px] text-zinc-400 font-mono font-bold uppercase block mb-2">Check-in frequency heat grid</h4>
                    <p className="text-[10px] text-zinc-500 mb-3">Logs marked during active month tracking block.</p>
                    
                    <div className="grid grid-cols-7 gap-1 max-w-sm">
                      {Array.from({ length: 31 }).map((_, i) => {
                        const dayNum = i + 1;
                        const hasVisited = dayNum % 5 === 0 || dayNum === 22 || dayNum === 18 || dayNum === 23;
                        return (
                          <div 
                            key={i} 
                            title={`June ${dayNum}: ${hasVisited ? "Attended" : "No record"}`}
                            className={`aspect-square w-full rounded flex items-center justify-center font-mono text-[9px] select-none border border-transparent ${
                              hasVisited 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20 font-bold" 
                                : "bg-zinc-950 text-zinc-600 hover:border-zinc-800"
                            }`}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Audit checklist */}
                <div className="space-y-3">
                  <h4 className="text-[11px] text-white font-mono font-bold uppercase">Presence ledger rows</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="p-3">Visit Date</th>
                          <th className="p-3">Check-In Time</th>
                          <th className="p-3">Check-Out time</th>
                          <th className="p-3">Daily Marks / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300">
                        {(!selectedMember.attendance || selectedMember.attendance.length === 0) ? (
                          <tr><td colSpan={4} className="p-3 text-center text-zinc-650">No presence records logged.</td></tr>
                        ) : (
                          selectedMember.attendance.map((att: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-850/60 transition-all">
                              <td className="p-3 font-bold text-white">{att.date}</td>
                              <td className="p-3 text-emerald-400 font-semibold">{att.timeIn}</td>
                              <td className="p-3 text-zinc-450">{att.timeOut || <span className="text-yellow-500 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> IN GYM NOW</span>}</td>
                              <td className="p-3 italic text-zinc-400">{att.remarks || "Regular session access."}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PAYMENT HISTORY */}
            {activeTab === "PAYMENTS" && (
              <div className="space-y-6 text-xs text-zinc-300">
                
                {/* Metric blocks */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-850 p-4.5 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] uppercase font-mono block">Current Active Tier</span>
                    <strong className="text-white text-base block mt-1.5">{selectedMember.planName || "Assigned access"}</strong>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-850 p-4.5 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] uppercase font-mono block">Paid Limit Until</span>
                    <strong className="text-white text-sm block mt-1.5 font-mono">{selectedMember.endDate || "N/A"}</strong>
                  </div>

                  <div className="bg-zinc-900/40 border border-emerald-900/30 p-4.5 rounded-2xl relative">
                    <span className="text-emerald-400 text-[9px] uppercase font-mono block font-bold">Revenue Contributions</span>
                    <strong className="text-white text-base block mt-1">
                      ${selectedMember.payments?.reduce((acc: number, val: any) => acc + (val.amount || 0), 0) || "150"} Total
                    </strong>
                    <div className="text-[9px] text-zinc-500 font-mono mt-1">LTD Payment Lifetime Spend</div>
                  </div>

                  {/* Payment status badge card */}
                  <div className="bg-zinc-900 border border-zinc-850 p-4.5 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] uppercase font-mono block">Status Standing</span>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-xl font-mono text-[10px] uppercase font-extrabold ${
                        selectedMember.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-red-500/10 text-red-500 border border-red-500/25"
                      }`}>
                        {selectedMember.status === "Active" ? "Paid Active" : "Invoice Overdue"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receipts list table */}
                <div className="space-y-3">
                  <h4 className="text-[11px] text-white font-mono font-bold uppercase">Billing & Ledgers history list</h4>
                  <div className="space-y-2.5">
                    {(!selectedMember.payments || selectedMember.payments.length === 0) ? (
                      <div className="text-center py-10 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-550 font-mono">No invoice transactions compiled.</div>
                    ) : (
                      selectedMember.payments.map((val: any) => (
                        <div key={val.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center hover:border-zinc-700 transition">
                          <div>
                            <div className="text-xs font-mono font-black text-white">{val.type || "Membership Fee Subscription"}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-1">
                              REF: {val.id} • Method: <span className="text-zinc-300 font-bold">{val.paymentMode || "Credit Card"}</span> • Status: <span className="text-emerald-400 font-extrabold">{val.status || "Completed"}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-emerald-400 font-mono font-extrabold text-sm">${val.amount}</span>
                            <span className="text-zinc-500 block text-[9.5px] font-mono">Cleared Date</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. BODY MEASUREMENTS */}
            {activeTab === "PROGRESS" && (
              <div className="space-y-6 text-xs text-zinc-300">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-mono tracking-wider font-extrabold text-[12px] uppercase">Anthropometrics Progress audit log</h3>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Track and record physical measures chest, waist, fat % periodically</p>
                  </div>
                  
                  <button 
                    onClick={() => setModalType("PROGRESS_LOG")}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    Log New Metric Entry
                  </button>
                </div>

                {/* Biometric progress card blocks: Initial vs Current */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Weight", initial: 95, current: selectedMember.weight || 75, unit: "kg" },
                    { label: "Body Fat", initial: 24, current: selectedMember.bodyFat || 15, unit: "%" },
                    { label: "Chest", initial: 104, current: selectedMember.chest || 95, unit: "cm" },
                    { label: "Waist", initial: 92, current: selectedMember.waist || 80, unit: "cm" },
                    { label: "Biceps", initial: 32, current: selectedMember.biceps || 35, unit: "cm" }
                  ].map((it, idx) => {
                    const diff = Number(it.current) - Number(it.initial);
                    return (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl font-mono text-center">
                        <span className="text-zinc-500 text-[9px] block uppercase font-bold">{it.label}</span>
                        <div className="text-base font-black text-white mt-2">
                          {it.current} <span className="text-[10px] text-zinc-400 font-normal">{it.unit}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500 mt-2.5 pt-2 border-t border-zinc-800/60">
                          <span>Init: {it.initial}{it.unit}</span>
                          <span className={diff < 0 ? "text-emerald-400" : diff > 0 ? "text-amber-500" : "text-zinc-500"}>
                            {diff > 0 ? `+${diff}` : diff} {it.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GRAPH REPRESENTATIONS */}
                {progressHistory && progressHistory.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl font-mono">
                    <span className="text-[10px] text-zinc-400 font-bold block mb-3 uppercase">Weight Slopes history progress curves</span>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={progressHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="date" stroke="#52525b" fontSize={9} />
                          <YAxis stroke="#52525b" fontSize={9} domain={['dataMin - 3', 'dataMax + 3']} />
                          <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a" }} />
                          <Area type="monotone" dataKey="weight" name="Weight Profile (kg)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.06} strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Logs tables */}
                <div className="space-y-3">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Anthropometrics table metrics row logs</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="p-3">Track Date</th>
                          <th className="p-3">Weight (kg)</th>
                          <th className="p-3">BMI Index</th>
                          <th className="p-3">Body Fat Ratio %</th>
                          <th className="p-3">Chest / Waist</th>
                          <th className="p-3">Biceps / Thigh</th>
                          <th className="p-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300">
                        {(!progressHistory || progressHistory.length === 0) ? (
                          <tr><td colSpan={7} className="p-3 text-center text-zinc-650">No progress history recorded.</td></tr>
                        ) : (
                          progressHistory.map((pt: any) => (
                            <tr key={pt.id}>
                              <td className="p-3 font-bold text-white">{pt.date}</td>
                              <td className="p-3 text-amber-500">{pt.weight} kg</td>
                              <td className="p-3">{pt.bmi || "23.4"}</td>
                              <td className="p-3 text-emerald-450">{pt.bodyFat}%</td>
                              <td className="p-3">{pt.chest}cm / {pt.waist}cm</td>
                              <td className="p-3">{pt.biceps}cm / {pt.thigh}cm</td>
                              <td className="p-3 italic text-zinc-400 font-sans max-w-[150px] truncate">{pt.notes || "Periodic check"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PROGRESS PHOTOS */}
            {activeTab === "PHOTOS" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-mono font-bold uppercase text-[12px] tracking-wider">Visual comparison portfolio</h3>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Upload and compare FRONT, SIDE, or BACK pictures to track alignment results</p>
                  </div>

                  <button 
                    onClick={() => setModalType("PHOTO_UPLOAD")}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-8 w-32 border-zinc-800 hover:border-zinc-700 font-bold rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    Upload Photo
                  </button>
                </div>

                {/* Beautiful Before vs After Comparison visual slider panel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {["Front", "Side", "Back"].map((category) => {
                    const matched = photosList.filter((ph: any) => ph.category === category);
                    const before = matched[0];
                    const after = matched[matched.length - 1];

                    return (
                      <div key={category} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-3">
                        <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest block border-b border-zinc-800 pb-2">
                          {category} Comparison Position
                        </span>

                        {matched.length === 0 ? (
                          <div className="text-center py-12 text-zinc-600 font-mono text-[9px] uppercase">
                            No uploads inside this category
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-mono">
                              <div className="space-y-1">
                                <span className="bg-zinc-950 px-2 py-0.5 text-zinc-400 block border border-zinc-800">BEFORE</span>
                                <img src={before.photoPath} className="w-full h-28 object-cover rounded-xl border border-zinc-800 shadow" alt="Before" referrerPolicy="no-referrer" />
                                <span className="text-zinc-500">{before.date}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="bg-emerald-500/10 px-2 py-0.5 text-emerald-400 block border border-emerald-500/10">AFTER</span>
                                <img src={after.photoPath} className="w-full h-28 object-cover rounded-xl border border-zinc-800 shadow" alt="After" referrerPolicy="no-referrer" />
                                <span className="text-zinc-500">{after.date}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. WORKOUT PLANS */}
            {activeTab === "WORKOUT" && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
                  <div>
                    <h3 className="text-zinc-200 font-mono font-extrabold uppercase text-[11px] tracking-wider">Coach Assigned Active Workout Plan</h3>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Exercises sheets scheduled and synced on personal app accesses.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setModalType("WORKOUT")}
                      className="px-3.5 py-1.5 bg-zinc-90 w-32 bg-zinc-900 border border-zinc-800 text-zinc-350 hover:border-zinc-700 text-[10px] font-bold rounded-xl"
                    >
                      Assign Plan Sheet
                    </button>
                    <button 
                      onClick={handlePrintTrigger}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-extrabold rounded-xl"
                    >
                      Print Plan
                    </button>
                  </div>
                </div>

                {!selectedMember.workoutPlan ? (
                  <div className="text-center py-10 text-zinc-500 font-mono italic">No workout plan loaded by coach for this member yet. Click "Assign Plan Sheet" above to design.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 col-span-1 md:col-span-2">
                      <div className="p-4.5 bg-zinc-900 border border-zinc-850 rounded-2xl">
                        <span className="text-zinc-500 uppercase font-mono text-[9px] block">Trainer's strategic execution note</span>
                        <p className="text-white font-mono text-xs mt-1.5 italic font-medium">"{selectedMember.workoutPlan.notes || "Routine split workout."}"</p>
                      </div>
                    </div>

                    {selectedMember.workoutPlan.exercises?.map((ex: any, idx: number) => (
                      <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{ex.name}</h4>
                          <span className="text-[10px] text-amber-500 font-mono block mt-1">Sets: {ex.sets} | Reps: {ex.reps} | Duration: {ex.durationMin} Min</span>
                          <p className="text-zinc-400 text-[10.5px] mt-2 leading-relaxed italic">Coach instruction: {ex.notes || "Correct form execution."}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] font-black text-emerald-400">✓ LIVE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. MEDICAL INFORMATION */}
            {activeTab === "MEDICAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-2 flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-amber-500" /> Declared Clinical Variables
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-zinc-500 font-mono font-bold block text-[9px]">DIAGNOSED MEDICAL CONDITIONS</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedMember.medicalConditions || "No declared medical conditions reported."}</p>
                    </div>
                    <div className="p-3.5 bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-zinc-505 font-mono font-bold block text-[9px]">PREVIOUS INJURIES / PHYSICAL RESTRICTIONS</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedMember.injuries || "None declared or active."}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-red-500 font-mono tracking-wider uppercase border-b border-zinc-800 pb-2 flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500" /> Prominent Safety Warnings
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-200 rounded-2xl relative overflow-hidden">
                      <span className="text-red-400 font-mono font-black block text-[9px]">CRITICAL ALLERGIC PATHWAYS</span>
                      <p className="mt-1 font-medium">{selectedMember.allergies || "No allergen limits recorded."}</p>
                    </div>
                    <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-200 rounded-2xl relative overflow-hidden">
                      <span className="text-red-400 font-mono font-black block text-[9px]">RESTRICTION PRESCRIPTIONS / ALERT WARNINGS</span>
                      <p className="mt-1 font-medium">{selectedMember.medicalWarnings || "No critical medical alarms stored on profile database."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. CRM NOTES (RECEPTIONIST, TRAINER, OWNER COHORTS) */}
            {activeTab === "NOTES" && (
              <div className="space-y-6 text-xs text-zinc-300">
                
                {/* Notes Input form */}
                <form onSubmit={handleAddNote} className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl space-y-3.5">
                  <span className="text-white font-mono font-bold uppercase text-[10px] tracking-wider block">
                    {editingNoteId ? "Modify CRM audit Log Note" : "Write new CRM transaction Note / Journal"}
                  </span>
                  
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {([
                      { id: "Receptionist", label: "Frontdesk Receptionist Note", select: "Receptionist" },
                      { id: "Trainer", label: "Trainer Physical Note", select: "Trainer" },
                      { id: "Owner", label: "Owner Financial Note", select: "Owner" }
                    ]).map(item => (
                      <button 
                        key={item.id}
                        type="button"
                        onClick={() => setNoteCategory(item.select as any)}
                        className={`px-3 py-1.5 rounded-lg border font-bold ${
                          noteCategory === item.select 
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                            : "bg-zinc-950 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      required
                      placeholder="Write notes contents regarding physical results, fees collected, or member complaints..." 
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="flex-grow bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200 placeholder-zinc-600 rounded-xl outline-none text-xs focus:border-zinc-700 font-sans"
                    />

                    <button 
                      type="submit" 
                      className="px-5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shrink-0 cursor-pointer active:scale-95"
                    >
                      {editingNoteId ? "Update Note" : "Save Note"}
                    </button>
                  </div>
                </form>

                {/* CRM Notes display list */}
                <div className="space-y-3 pt-1">
                  <span className="text-zinc-500 font-mono tracking-widest block uppercase text-[9px]">Timeline CRM Notes Board</span>
                  
                  {notesList.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-650 font-mono italic">No logged notes.</div>
                  ) : (
                    <div className="space-y-3">
                      {notesList.map((note) => (
                        <div key={note.id} className="bg-zinc-900/60 border border-zinc-850/80 p-4 rounded-2xl flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[8px] font-black uppercase ${
                                note.category === "Owner" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                note.category === "Trainer" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}>
                                {note.category}
                              </span>
                              <span className="text-zinc-400 font-mono text-[10px] font-bold">{note.author}</span>
                              <span className="text-zinc-500 text-[9px] font-mono">• {note.date} @ {note.time}</span>
                            </div>
                            <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                              {note.content}
                            </p>
                          </div>

                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEditNoteLaunch(note)}
                              title="Edit CRM note"
                              className="p-1 px-1.5 hover:bg-zinc-800 rounded font-mono text-[9px] text-[#f59e0b] font-bold"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete CRM note"
                              className="p-1 px-1.5 hover:bg-zinc-800 rounded font-mono text-[9px] text-red-400 font-bold"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 9. ACTIVITY TIMELINE */}
            {activeTab === "TIMELINE" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <span className="text-zinc-500 font-mono tracking-widest block uppercase text-[9px]">Detailed Member History Audit Trails</span>

                {(!timelineEntries || timelineEntries.length === 0) ? (
                  <div className="text-center py-10 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-650 font-mono">No chronological timeline entries loaded yet. Registered checkmarks will appear automatically.</div>
                ) : (
                  <div className="space-y-4 relative pl-5.5 border-l border-zinc-800">
                    {timelineEntries.map((e: any, idx: number) => (
                      <div key={idx} className="relative space-y-1">
                        <div className="absolute -left-[27.5px] top-1.5 w-2 h-2 rounded-full bg-amber-500 border-2 border-zinc-950"></div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-550 border-b border-zinc-900 pb-1">
                          <span>{e.createdAt?.replace("T", " ")?.split(".")[0] || e.date}</span>
                          <span className="text-amber-500 font-black tracking-widest uppercase">{e.eventType || "LOG"}</span>
                        </div>
                        <h4 className="font-extrabold text-white text-xs">{e.title}</h4>
                        <p className="text-zinc-400 pb-1.5">{e.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ==================== AUTOMATIONS (COMING SOON) ==================== */}
      <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-3xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <strong className="text-xs text-white uppercase font-mono tracking-widest">Client Engagement WhatsApp Notification System</strong>
            <p className="text-zinc-500 text-[10px] mt-0.5">Automated Birthday wishes, payment alerts, and scheduled workout plan updates.</p>
          </div>
          <span className="bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-[9px] font-black uppercase text-amber-500 rounded-xl tracking-widest">Coming Soon</span>
        </div>
      </div>

      {/* ==================== MODALS SWITCHBOARD ==================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4 text-xs overflow-y-auto max-h-[90vh]"
            >
              
              <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  {modalType === "PAYMENT" && "Record Invoice Payment"}
                  {modalType === "RENEW" && "Renew Access Plan"}
                  {modalType === "TRAINER" && "Map Professional Coach"}
                  {modalType === "WORKOUT" && "Set Workout exercises"}
                  {modalType === "DIET" && "Schedule diet menu targets"}
                  {modalType === "QR" && "Access badge QR card Preview"}
                  {modalType === "PROGRESS_LOG" && "Record Body Metrics Point"}
                  {modalType === "PHOTO_UPLOAD" && "Progress photo portfolio update"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 hover:bg-zinc-900 rounded-lg cursor-pointer">
                  <X className="w-5 h-5 text-zinc-500 hover:text-white" />
                </button>
              </div>

              {/* PAYMENT MODAL */}
              {modalType === "PAYMENT" && (
                <form onSubmit={handleAddPaymentSubmit} className="space-y-4 font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Receipt Amount ($ / ₹)</label>
                      <input 
                        type="number" 
                        required 
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 1500" 
                        className="w-full bg-zinc-90 w-full bg-zinc-905 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Receipt Mode</label>
                      <select 
                        value={payMode} 
                        onChange={(e) => setPayMode(e.target.value)}
                        className="w-full bg-zinc-90 w-full bg-zinc-905 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="Cash">Cash Currency</option>
                        <option value="Card">Visa/Card Payment</option>
                        <option value="UPI">UPI Digital Payment</option>
                        <option value="Bank Wire">Bank Wire Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Transaction Description</label>
                    <select 
                      value={payType} 
                      onChange={(e) => setPayType(e.target.value)}
                      className="w-full bg-zinc-90 w-full bg-zinc-905 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white outline-none"
                    >
                      <option value="Membership Fee">Renew Subscription Access Fee</option>
                      <option value="PT Charge">Personal Trainer Coach Split</option>
                      <option value="Lockers">Day Locker Assigned Rent</option>
                      <option value="Nutrition Supplement">Nutrients Supplies</option>
                    </select>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl font-bold">Close</button>
                    <button type="submit" disabled={loadingAction === "payment"} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl">
                      {loadingAction === "payment" ? "Logging..." : "Confirm Ledger payment"}
                    </button>
                  </div>
                </form>
              )}

              {/* RENEW TIER MODAL */}
              {modalType === "RENEW" && (
                <form onSubmit={handlePlanSubmit} className="space-y-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Select membership Plan Tier</label>
                    <select 
                      value={renewPlanId} 
                      onChange={(e) => setRenewPlanId(e.target.value)}
                      className="w-full bg-zinc-90 w-full bg-zinc-905 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white"
                    >
                      <option value="">Choose plan...</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Renewal Special Price Charge override ($ / ₹)</label>
                    <input 
                      type="number"
                      placeholder="Leave blank to use plan default price"
                      value={renewPrice}
                      onChange={(e) => setRenewPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-emerald-500 text-black font-extrabold rounded-xl">Confirm update</button>
                  </div>
                </form>
              )}

              {/* MAP TRAINER */}
              {modalType === "TRAINER" && (
                <form onSubmit={handleAssignTrainer} className="space-y-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 uppercase text-[9px]">Choose Lead Coach</label>
                    <select 
                      value={assignTrainerId} 
                      onChange={(e) => setAssignTrainerId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white"
                    >
                      <option value="">No Coach mapping (Self-Coached)</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName} ({t.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl">Close</button>
                    <button type="submit" className="flex-1 py-3 bg-amber-500 text-black font-extrabold rounded-xl">Link Coach</button>
                  </div>
                </form>
              )}

              {/* WORKOUT */}
              {modalType === "WORKOUT" && (
                <form onSubmit={handleWorkoutSubmit} className="space-y-4">
                  <div>
                    <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Coach split execution strategy</label>
                    <textarea 
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                      placeholder="Focus on muscle hypertrophy. Heavy load, clean execution form."
                      className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-zinc-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex justify-between items-center font-mono text-[9px] text-zinc-500 uppercase font-bold">
                      <span>Exercises list</span>
                      <button 
                        type="button" 
                        onClick={() => setWorkoutExercises([...workoutExercises, { name: "New Exercise", sets: 3, reps: 10, durationMin: 10, notes: "" }])}
                        className="text-amber-500 text-[10px] hover:underline cursor-pointer"
                      >
                        + Add Exercise
                      </button>
                    </div>

                    {workoutExercises.map((val, k) => (
                      <div key={k} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-2">
                        <input 
                          type="text" 
                          value={val.name}
                          onChange={(e) => {
                            const clone = [...workoutExercises];
                            clone[k].name = e.target.value;
                            setWorkoutExercises(clone);
                          }}
                          className="w-full bg-zinc-950 p-1 text-white text-xs border border-zinc-800 rounded"
                        />
                        <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-400">
                          <div>
                            <span>Sets:</span>
                            <input type="number" value={val.sets} onChange={(e) => {
                              const clone = [...workoutExercises];
                              clone[k].sets = Number(e.target.value);
                              setWorkoutExercises(clone);
                            }} className="w-full bg-zinc-950 p-1 text-white rounded mt-0.5" />
                          </div>
                          <div>
                            <span>Reps:</span>
                            <input type="number" value={val.reps} onChange={(e) => {
                              const clone = [...workoutExercises];
                              clone[k].reps = Number(e.target.value);
                              setWorkoutExercises(clone);
                            }} className="w-full bg-zinc-950 p-1 text-white rounded mt-0.5" />
                          </div>
                          <div>
                            <span>Min:</span>
                            <input type="number" value={val.durationMin} onChange={(e) => {
                              const clone = [...workoutExercises];
                              clone[k].durationMin = Number(e.target.value);
                              setWorkoutExercises(clone);
                            }} className="w-full bg-zinc-950 p-1 text-white rounded mt-0.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-850 text-zinc-400 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-amber-500 text-black font-extrabold rounded-xl">Deploy workout plan</button>
                  </div>
                </form>
              )}

              {/* DIET */}
              {modalType === "DIET" && (
                <form onSubmit={handleDietSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Breakfast menu</label>
                      <input type="text" value={dietBreakfast} onChange={(e) => setDietBreakfast(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Lunch menu</label>
                      <input type="text" value={dietLunch} onChange={(e) => setDietLunch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Dinner menu</label>
                      <input type="text" value={dietDinner} onChange={(e) => setDietDinner(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[9px]">
                    <div>
                      <span className="text-zinc-500 uppercase block mb-1">Calories kcal</span>
                      <input type="number" value={dietCalories} onChange={(e) => setDietCalories(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase block mb-1">Protein grams</span>
                      <input type="number" value={dietProtein} onChange={(e) => setDietProtein(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase block mb-1">Water Liters</span>
                      <input type="number" step="0.1" value={dietWater} onChange={(e) => setDietWater(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-850 text-zinc-400 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-amber-500 text-black font-extrabold rounded-xl">Publish diet Split</button>
                  </div>
                </form>
              )}

              {/* PROGRESS_LOG */}
              {modalType === "PROGRESS_LOG" && (
                <form onSubmit={handleMeasureSubmit} className="space-y-4 font-mono">
                  <div className="grid grid-cols-3 gap-2 text-[9px] uppercase text-zinc-500">
                    <div>
                      <span className="block mb-1">Weight (kg)</span>
                      <input type="number" required value={measureWeight} onChange={(e) => setMeasureWeight(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Body Fat %</span>
                      <input type="number" required value={measureBodyFat} onChange={(e) => setMeasureBodyFat(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Height (cm)</span>
                      <input type="number" required value={measureHeight} onChange={(e) => setMeasureHeight(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[9px] uppercase text-zinc-500">
                    <div>
                      <span className="block mb-1">Chest (cm)</span>
                      <input type="number" value={measureChest} onChange={(e) => setMeasureChest(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Waist (cm)</span>
                      <input type="number" value={measureWaist} onChange={(e) => setMeasureWaist(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Hip (cm)</span>
                      <input type="number" value={measureHip} onChange={(e) => setMeasureHip(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[9px] uppercase text-zinc-500">
                    <div>
                      <span className="block mb-1">Bicep (cm)</span>
                      <input type="number" value={measureBiceps} onChange={(e) => setMeasureBiceps(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Thigh (cm)</span>
                      <input type="number" value={measureThigh} onChange={(e) => setMeasureThigh(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                    <div>
                      <span className="block mb-1">Shoulders (cm)</span>
                      <input type="number" value={measureShoulders} onChange={(e) => setMeasureShoulders(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white rounded-xl text-xs" />
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[9px] uppercase block mb-1">Measurements Audit Memo Notes</span>
                    <input type="text" placeholder="Updates after intense legs split session..." value={measureNotes} onChange={(e) => setMeasureNotes(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-white outline-none" />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-805 text-zinc-400 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-amber-500 text-black font-extrabold rounded-xl">Confirm biometrics</button>
                  </div>
                </form>
              )}

              {/* PHOTO_UPLOAD */}
              {modalType === "PHOTO_UPLOAD" && (
                <form onSubmit={handlePhotoCategoryUpload} className="space-y-4">
                  <div>
                    <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Portfolio category</label>
                    <select 
                      value={photoCategory}
                      onChange={(e: any) => setPhotoCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl outline-none"
                    >
                      <option value="Front">Front Alignment Option</option>
                      <option value="Side">Side Alignment Option</option>
                      <option value="Back">Back Alignment Option</option>
                      <option value="Custom">Custom workout stance profile</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-500 block mb-1 font-mono uppercase text-[9px]">Choose transformation image</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={handleBase64File}
                      className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-zinc-200 file:cursor-pointer hover:file:bg-zinc-700"
                    />
                  </div>

                  {photoBase64 && (
                    <div className="border border-zinc-800 p-2 rounded-xl text-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block mb-15">Image render draft</span>
                      <img src={photoBase64} className="h-32 object-contain mx-auto rounded border border-zinc-850" alt="Draft" />
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl">Close</button>
                    <button type="submit" className="flex-1 py-3 bg-amber-500 text-black font-extrabold rounded-xl">Record photo</button>
                  </div>
                </form>
              )}

              {/* SECURE QR CARD MODAL */}
              {modalType === "QR" && (
                <div className="space-y-4 text-center">
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4 max-w-sm mx-auto font-mono text-zinc-300">
                    <div className="flex justify-between items-start border-b border-zinc-800 pb-2.5">
                      <div className="text-left font-mono">
                        <span className="logo text-amber-500 text-[10px] font-black tracking-widest block">IMVELOGYM PREMIUM</span>
                        <strong className="text-white text-sm block mt-1 uppercase">{selectedMember.fullName}</strong>
                        <span className="text-zinc-550 block text-[9px] mt-0.5">ID: {selectedMember.memberId}</span>
                      </div>
                      <img 
                        src={selectedMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"} 
                        alt="Profile avatar" 
                        className="w-12 h-12 object-cover rounded-xl border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1 text-left text-[9px] text-zinc-450 uppercase leading-relaxed font-mono">
                      <div className="flex justify-between">
                        <span>Access plan:</span>
                        <span className="text-white font-bold">{selectedMember.planName || "Pro Elite Core"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expiry Date:</span>
                        <span className="text-red-400 font-bold">{selectedMember.endDate || "N/A"}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-2xl inline-block mt-3 shadow-2xl">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=M-889" 
                        alt="QR secure authentication access verification" 
                        className="w-32 h-32 mx-auto"
                      />
                    </div>

                    <div className="text-zinc-500 text-[8.5px] uppercase font-bold tracking-widest pt-1 border-t border-zinc-850/60 mt-2">
                      Scan to Check-In Automatically
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setModalType(null)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-855 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-xs cursor-pointer">Close</button>
                    <button onClick={handlePrintTrigger} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs cursor-pointer">Print Real Badge Card</button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
