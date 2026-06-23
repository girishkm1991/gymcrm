import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Search, Filter, Edit, Eye, X, ArrowLeft, Dumbbell, Activity, ShieldAlert, 
  Check, Trash2, Heart, Calendar, Clock, DollarSign, Camera, CreditCard, 
  RefreshCw, Printer, AlertTriangle, Shield, Archive, ListTodo, PlusCircle, UserCheck,
  Layers, MessageSquare, Send, ExternalLink, Award, Sparkles, CheckSquare
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line 
} from "recharts";
import api from "../services/api";
import { Member, MembershipPlan } from "../types";
import PremiumMemberProfile from "./PremiumMemberProfile";

interface MembersViewProps {
  user: any;
  setTab?: (tab: string, form?: "LIST" | "ADD" | "EDIT" | "PROFILE", backTo?: "DASHBOARD" | "LIST") => void;
  initialForm?: "LIST" | "ADD" | "EDIT" | "PROFILE";
  backTarget?: "DASHBOARD" | "LIST";
  onBack?: () => void;
}

type ProfileTab = 
  | "OVERVIEW" 
  | "PERSONAL" 
  | "MEMBERSHIP" 
  | "ATTENDANCE" 
  | "PAYMENTS" 
  | "WORKOUT" 
  | "DIET" 
  | "PROGRESS" 
  | "PHOTOS" 
  | "MEDICAL" 
  | "TRAINER_NOTES" 
  | "TIMELINE"
  | "COMMUNICATION";

export default function MembersView({ user, setTab, initialForm, backTarget, onBack }: MembersViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [filterDuesOnly, setFilterDuesOnly] = useState<boolean>(false);

  // Helper function to calculate membership status
  const getMembershipStatus = (endDateStr?: string) => {
    if (!endDateStr || endDateStr === "Unlimited" || endDateStr.includes("Unlimited") || endDateStr === "N/A" || endDateStr === "Unlimited Period" || endDateStr === "Unlimited Session") {
      return "ACTIVE";
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(endDateStr);
    if (isNaN(expiry.getTime())) {
      return "ACTIVE";
    }
    expiry.setHours(0, 0, 0, 0);

    const sevenDaysFromToday = new Date(today);
    sevenDaysFromToday.setDate(today.getDate() + 7);

    if (expiry < today) {
      return "EXPIRED";
    } else if (expiry <= sevenDaysFromToday) {
      return "EXPIRING SOON";
    } else {
      return "ACTIVE";
    }
  };

  // Helper function to calculate Fee Status and billing properties
  const getFeeStatusDetails = (memberId: string, endDateStr?: string) => {
    const m = members.find(x => x.id === memberId);
    const mIdStr = m ? m.memberId : "";
    const memberPayments = payments.filter(p => p.memberId === memberId || (mIdStr && p.memberId === mIdStr));

    if (memberPayments.length === 0) {
      return {
        status: "NOT CONFIGURED",
        pendingAmount: 0,
        dueDate: null,
        badgeColor: "bg-zinc-800 text-zinc-400 border border-zinc-700"
      };
    }

    const unpaidPayments = memberPayments.filter(p => p.status === "Pending" || p.status === "Overdue");
    const pendingAmount = unpaidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const memStatus = getMembershipStatus(endDateStr);

    if (pendingAmount === 0) {
      return {
        status: "FEE PAID",
        pendingAmount: 0,
        dueDate: null,
        badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      };
    }

    let soonestDueDate: Date | null = null;
    let hasPassed = false;
    let isDueSoon = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromToday = new Date(today);
    sevenDaysFromToday.setDate(today.getDate() + 7);

    unpaidPayments.forEach(p => {
      if (!p.dueDate) return;
      const d = new Date(p.dueDate);
      if (isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);

      if (!soonestDueDate || d < soonestDueDate) {
        soonestDueDate = d;
      }

      if (d < today) {
        hasPassed = true;
      } else if (d <= sevenDaysFromToday) {
        isDueSoon = true;
      }
    });

    const nextDueDateStr = soonestDueDate ? (soonestDueDate as Date).toISOString().split("T")[0] : null;

    if (hasPassed) {
      return {
        status: "OVERDUE",
        pendingAmount,
        dueDate: nextDueDateStr,
        badgeColor: "bg-red-500/10 text-red-500 border border-red-500/20"
      };
    } else if (isDueSoon || soonestDueDate) {
      return {
        status: "DUE SOON",
        pendingAmount,
        dueDate: nextDueDateStr,
        badgeColor: "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      };
    } else {
      return {
        status: "DUE SOON",
        pendingAmount,
        dueDate: nextDueDateStr,
        badgeColor: "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      };
    }
  };

  // Searching & Filtering parameters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Layout Toggle controls
  const [activeForm, setActiveForm] = useState<"LIST" | "ADD" | "EDIT" | "PROFILE">("LIST");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>("OVERVIEW");

  // Profile-specific Sub datasets loaded concurrently
  const [memberQrCode, setMemberQrCode] = useState<string>("");
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [photosList, setPhotosList] = useState<any[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<any[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<any[]>([]);

  // WhatsApp & Communication state parameters
  const [comTemplates, setComTemplates] = useState<any[]>([]);
  const [selectedComTemplate, setSelectedComTemplate] = useState("Fee Due Reminder");
  const [comVariables, setComVariables] = useState<Record<string, string>>({
    Amount: "1500",
    DueDate: new Date().toISOString().split("T")[0],
    MembershipPlan: "Premium Deluxe Plan"
  });
  const [comMessageLogs, setComMessageLogs] = useState<any[]>([]);
  const [comLoading, setComLoading] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<string>("");

  // Advanced registration/update inputs
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [dob, setDob] = useState("1995-01-01");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [activePlanId, setActivePlanId] = useState("");
  const [photo, setPhoto] = useState("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop");
  const [status, setStatus] = useState<any>("Active");
  
  // Premium Onboarding Wizard States
  const [occupation, setOccupation] = useState("");

  // Advanced Physical Details
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(75);
  const [bodyFat, setBodyFat] = useState<number>(15);
  const [chest, setChest] = useState<number>(95);
  const [waist, setWaist] = useState<number>(80);
  const [hip, setHip] = useState<number>(90);
  const [biceps, setBiceps] = useState<number>(35);
  const [thigh, setThigh] = useState<number>(55);
  const [fitnessGoal, setFitnessGoal] = useState("Lean Muscle Gain");

  // Advanced Medical Details
  const [medicalConditions, setMedicalConditions] = useState("");
  const [injuries, setInjuries] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [medicalWarnings, setMedicalWarnings] = useState("");

  // System Assigners
  const [locker, setLocker] = useState("");
  const [ptPackage, setPtPackage] = useState("");
  const [trainerNotes, setTrainerNotes] = useState("");
  const [registrationStep, setRegistrationStep] = useState<number>(1);
  const [registering, setRegistering] = useState(false);
  const [successMember, setSuccessMember] = useState<any>(null);
  const [stepDirection, setStepDirection] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [draftExists, setDraftExists] = useState<boolean>(false);

  // Mock Payment & Camera states
  const [mockCardNumber, setMockCardNumber] = useState("");
  const [mockCardExpiry, setMockCardExpiry] = useState("");
  const [mockCardCVV, setMockCardCVV] = useState("");
  const [mockCardName, setMockCardName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Failed to start camera:", err);
      // Suppress blocking native prompts in sandboxed iframes
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhotoSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -400, 0, 400, 300);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPhoto(dataUrl);
      }
      stopCamera();
    }
  };

  // Load draft check on mount & whenever draft might change
  useEffect(() => {
    const saved = localStorage.getItem("imvelogym_onboarding_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fullName) {
          setDraftExists(true);
        } else {
          setDraftExists(false);
        }
      } catch (e) {
        setDraftExists(false);
      }
    } else {
      setDraftExists(false);
    }
  }, [activeForm]);

  // Clean form draft from local storage
  const clearDraft = () => {
    localStorage.removeItem("imvelogym_onboarding_draft");
    setDraftExists(false);
  };

  // Perform load from localStorage
  const handleLoadDraft = () => {
    try {
      const saved = localStorage.getItem("imvelogym_onboarding_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.fullName) setFullName(draft.fullName);
        if (draft.email) setEmail(draft.email);
        if (draft.phone) setPhone(draft.phone);
        if (draft.gender) setGender(draft.gender);
        if (draft.dob) setDob(draft.dob);
        if (draft.bloodGroup) setBloodGroup(draft.bloodGroup);
        if (draft.occupation) setOccupation(draft.occupation);
        if (draft.address) setAddress(draft.address);
        if (draft.emergencyContactName) setEmergencyContactName(draft.emergencyContactName);
        if (draft.emergencyContactPhone) setEmergencyContactPhone(draft.emergencyContactPhone);
        if (draft.height) setHeight(draft.height);
        if (draft.weight) setWeight(draft.weight);
        if (draft.bodyFat) setBodyFat(draft.bodyFat);
        if (draft.chest) setChest(draft.chest);
        if (draft.waist) setWaist(draft.waist);
        if (draft.hip) setHip(draft.hip);
        if (draft.biceps) setBiceps(draft.biceps);
        if (draft.thigh) setThigh(draft.thigh);
        if (draft.activePlanId) setActivePlanId(draft.activePlanId);
        if (draft.trainerId) setTrainerId(draft.trainerId);
        if (draft.locker) setLocker(draft.locker);
        if (draft.ptPackage) setPtPackage(draft.ptPackage);
        if (draft.photo) setPhoto(draft.photo);
        if (draft.fitnessGoal) setFitnessGoal(draft.fitnessGoal);
        if (draft.medicalConditions) setMedicalConditions(draft.medicalConditions);
        if (draft.injuries) setInjuries(draft.injuries);
        if (draft.allergies) setAllergies(draft.allergies);
        if (draft.medications) setMedications(draft.medications);
        if (draft.medicalWarnings) setMedicalWarnings(draft.medicalWarnings);
        if (draft.registrationStep) setRegistrationStep(draft.registrationStep);
        if (draft.trainerNotes) setTrainerNotes(draft.trainerNotes);
        setStepError(null);
      }
    } catch (e) {
      console.error("Failed to restore onboarding draft:", e);
    }
  };

  // Auto-Save effect when activeForm is "ADD"
  useEffect(() => {
    if (activeForm === "ADD") {
      const draftObj = {
        fullName,
        email,
        phone,
        gender,
        dob,
        bloodGroup,
        occupation,
        address,
        emergencyContactName,
        emergencyContactPhone,
        height,
        weight,
        bodyFat,
        chest,
        waist,
        hip,
        biceps,
        thigh,
        activePlanId,
        trainerId,
        locker,
        ptPackage,
        photo,
        fitnessGoal,
        medicalConditions,
        injuries,
        allergies,
        medications,
        medicalWarnings,
        registrationStep,
        trainerNotes,
      };
      localStorage.setItem("imvelogym_onboarding_draft", JSON.stringify(draftObj));
    }
  }, [
    activeForm,
    fullName,
    email,
    phone,
    gender,
    dob,
    bloodGroup,
    occupation,
    address,
    emergencyContactName,
    emergencyContactPhone,
    height,
    weight,
    bodyFat,
    chest,
    waist,
    hip,
    biceps,
    thigh,
    activePlanId,
    trainerId,
    locker,
    ptPackage,
    photo,
    fitnessGoal,
    medicalConditions,
    injuries,
    allergies,
    medications,
    medicalWarnings,
    registrationStep,
    trainerNotes,
  ]);



  // Sub-dialog states for Membership life transitions
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState("");
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [renewPrice, setRenewPrice] = useState("");

  // Progress Logging Drawer inputs
  const [isLogProgressOpen, setIsLogProgressOpen] = useState(false);
  const [logWeight, setLogWeight] = useState(75);
  const [logBodyFat, setLogBodyFat] = useState(15);
  const [logChest, setLogChest] = useState(95);
  const [logWaist, setLogWaist] = useState(80);
  const [logHip, setLogHip] = useState(90);
  const [logBiceps, setLogBiceps] = useState(35);
  const [logThigh, setLogThigh] = useState(55);
  const [logProgressNotes, setLogProgressNotes] = useState("");

  // Photo uploading inputs
  const [photoCategory, setPhotoCategory] = useState<"Front" | "Side" | "Back">("Front");
  const [photoBase64, setPhotoBase64] = useState("");

  // Utility to auto calculate age from dob
  const calculateAge = (dateString: string) => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Safe height in meters calculation for BMI
  const heightInM = height > 0 ? height / 100 : 1.75;
  const autoBMI = parseFloat((weight / (heightInM * heightInM)).toFixed(1));

  // BMI status color helpers
  const getBmiDesc = (bmi: number) => {
    if (bmi < 18.5) return { text: "Underweight", color: "text-blue-400", bg: "bg-blue-500/10" };
    if (bmi < 25) return { text: "Normal Fit", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (bmi < 30) return { text: "Overweight", color: "text-amber-500", bg: "bg-amber-500/10" };
    return { text: "Obese Group", color: "text-red-500", bg: "bg-red-500/10" };
  };

  async function loadData() {
    try {
      const limitVal = filterDuesOnly ? 1000 : 10;
      const q = `?search=${search}&status=${statusFilter}&gender=${genderFilter}&page=${page}&limit=${limitVal}`;
      const response = await api.get(`/members${q}`);
      setMembers(response.data.data);
      setTotalPages(response.data.pagination.totalPages || 1);

      const plansRes = await api.get("/membership-plans");
      setPlans(plansRes.data);

      const staffRes = await api.get("/staff");
      setTrainers(staffRes.data.filter((u: any) => u.role === "TRAINER"));

      const paymentsRes = await api.get("/payments/list");
      setPayments(paymentsRes.data);
    } catch (err) {
      console.error("Failed to load members directory.", err);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, statusFilter, genderFilter, page, activeForm, filterDuesOnly]);

  useEffect(() => {
    if (initialForm) {
      if (initialForm === "ADD") {
        handleOpenAdd();
      } else {
        setActiveForm(initialForm);
      }
    }
  }, [initialForm]);

  const handleBackFromAdd = () => {
    const isDirty = fullName || email || phone || address || activePlanId || trainerId || medicalConditions || injuries || allergies || medications || medicalWarnings;
    if (isDirty) {
      if (!confirm("You have unsaved changes. Discard unsaved member registration details?")) {
        return;
      }
    }
    if (backTarget === "DASHBOARD" && onBack) {
      onBack();
    } else {
      setActiveForm("LIST");
    }
  };

  const handleOpenAdd = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setGender("Male");
    setDob("1995-01-01");
    setBloodGroup("O+");
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setTrainerId("");
    setActivePlanId("");
    setPhoto("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop");
    setHeight(175);
    setWeight(75);
    setBodyFat(15);
    setChest(95);
    setWaist(80);
    setHip(90);
    setBiceps(35);
    setThigh(55);
    setFitnessGoal("Lean Muscle Gain");
    setMedicalConditions("");
    setInjuries("");
    setAllergies("");
    setMedications("");
    setMedicalWarnings("");
    setLocker("");
    setPtPackage("");
    setTrainerNotes("");
    setOccupation("");
    setRegistrationStep(1);
    setSuccessMember(null);
    setActiveForm("ADD");
  };

  const handleOpenEdit = (m: any) => {
    setSelectedMember(m);
    setFullName(m.fullName);
    setEmail(m.email);
    setPhone(m.phone);
    setGender(m.gender);
    setDob(m.dob);
    setBloodGroup(m.bloodGroup);
    setAddress(m.address);
    setEmergencyContactName(m.emergencyContactName);
    setEmergencyContactPhone(m.emergencyContactPhone);
    setTrainerId(m.trainerId || "");
    setActivePlanId(m.activePlanId || "");
    setPhoto(m.photo);
    setStatus(m.status);

    setHeight(m.height || 175);
    setWeight(m.weight || 75);
    setBodyFat(m.bodyFat || 15);
    setChest(m.chest || 95);
    setWaist(m.waist || 80);
    setHip(m.hip || 90);
    setBiceps(m.biceps || 35);
    setThigh(m.thigh || 55);
    setFitnessGoal(m.fitnessGoal || "");
    setMedicalConditions(m.medicalConditions || "");
    setInjuries(m.injuries || "");
    setAllergies(m.allergies || "");
    setMedications(m.medications || "");
    setMedicalWarnings(m.medicalWarnings || "");
    setLocker(m.locker || "");
    setPtPackage(m.ptPackage || "");
    setTrainerNotes(m.trainerNotes || "");
    setActiveForm("EDIT");
  };

  const handleViewProfile = async (mId: string) => {
    try {
      const response = await api.get(`/members/${mId}`);
      const m = response.data;
      setSelectedMember(m);
      
      // Load concurrent datasets
      try {
        const qrRes = await api.get(`/members/${mId}/qr`);
        setMemberQrCode(qrRes.data.token || "");
      } catch (e) { console.error(e); }

      try {
        const prRes = await api.get(`/members/${mId}/progress`);
        setProgressHistory(prRes.data || []);
      } catch (e) { console.error(e); }

      try {
        const phRes = await api.get(`/members/${mId}/photos`);
        setPhotosList(phRes.data || []);
      } catch (e) { console.error(e); }

      try {
        const tlRes = await api.get(`/members/${mId}/timeline`);
        setTimelineEntries(tlRes.data || []);
      } catch (e) { console.error(e); }

      try {
        const tplRes = await api.get("/whatsapp/templates");
        setComTemplates(tplRes.data || []);
      } catch (e) { console.error(e); }

      try {
        const logRes = await api.get("/communication/logs");
        setComMessageLogs((logRes.data || []).filter((l: any) => l.memberId === mId));
      } catch (e) { console.error(e); }

      try {
        const histRes = await api.get(`/memberships/history/${mId}`);
        setMembershipHistory(histRes.data || []);
      } catch (e) { console.error(e); }

      setActiveProfileTab("OVERVIEW");
      setActiveForm("PROFILE");
    } catch (err) {
      alert("Error retrieving detailed multi-tenant profile metrics.");
    }
  };

  const reloadProfileSubsets = async (mId: string) => {
    try {
      const prRes = await api.get(`/members/${mId}/progress`);
      setProgressHistory(prRes.data || []);
      const phRes = await api.get(`/members/${mId}/photos`);
      setPhotosList(phRes.data || []);
      const tlRes = await api.get(`/members/${mId}/timeline`);
      setTimelineEntries(tlRes.data || []);
      
      try {
        const tplRes = await api.get("/whatsapp/templates");
        setComTemplates(tplRes.data || []);
      } catch (e) { console.error(e); }

      try {
        const logRes = await api.get("/communication/logs");
        setComMessageLogs((logRes.data || []).filter((l: any) => l.memberId === mId));
      } catch (e) { console.error(e); }

      const histRes = await api.get(`/memberships/history/${mId}`);
      setMembershipHistory(histRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Base64 file reader helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Progress picture Base64 reader helper
  const handleProgressPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Photo exceeds 2MB limits.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const calculateEndDate = (duration: string, startDateStr: string): string => {
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return "";
    if (duration === "Monthly") {
      date.setMonth(date.getMonth() + 1);
    } else if (duration === "Quarterly") {
      date.setMonth(date.getMonth() + 3);
    } else if (duration === "Half Yearly") {
      date.setMonth(date.getMonth() + 6);
    } else if (duration === "Annual" || duration === "Annually") {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1); // fallback to monthly
    }
    return date.toISOString().split("T")[0];
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setRegistering(true);
      setStepError(null);

      const todayStr = new Date().toISOString().split("T")[0];
      const selectedPlanObj = plans.find(p => p.id === activePlanId);
      const calculatedEnd = selectedPlanObj 
        ? calculateEndDate(selectedPlanObj.duration, todayStr) 
        : "";

      const response = await api.post("/members", {
        fullName,
        email,
        phone,
        gender,
        dob,
        bloodGroup,
        address,
        emergencyContactName,
        emergencyContactPhone,
        trainerId: trainerId || null,
        activePlanId: activePlanId || null,
        photo,
        height,
        weight,
        bodyFat,
        chest,
        waist,
        hip,
        biceps,
        thigh,
        fitnessGoal,
        medicalConditions,
        injuries,
        allergies,
        medications,
        medicalWarnings,
        locker,
        ptPackage,
        trainerNotes,
        startDate: todayStr,
        endDate: calculatedEnd,
        occupation
      });

      // Fetch the details of the newly created member to show on success screen
      const userId = response.data.userId;
      const memberDetailRes = await api.get(`/members/${userId}`);
      
      setSuccessMember(memberDetailRes.data);
      clearDraft();
    } catch (err: any) {
      setStepError(err.response?.data?.error || "Error storing member registry. Check fields.");
    } finally {
      setRegistering(false);
    }
  };

  const validateStepAt = (stepNum: number): string | null => {
    switch (stepNum) {
      case 2: // Personal Information
        if (!fullName.trim() || fullName.trim().length < 2) {
          return "Please enter a valid full name.";
        }
        if (!email.trim() || !/.+@.+\..+/.test(email)) {
          return "Please enter a valid email address.";
        }
        if (!phone.trim() || phone.trim().length < 5) {
          return "Please enter a valid phone number (at least 5 digits).";
        }
        break;
      case 4: // Physicals
        if (!height || height <= 0 || height > 300) {
          return "Please enter a valid stature/height between 50cm and 300cm.";
        }
        if (!weight || weight <= 0 || weight > 500) {
          return "Please enter a valid weight between 10kg and 500kg.";
        }
        break;
      default:
        break;
    }
    return null;
  };

  const handlePrintNewOnboardedCard = (m: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the membership card.");
      return;
    }
    const cardHtml = `
      <html>
      <head>
        <title>ImveloGYM - Membership Card</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; background-color: #0c0a09; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { width: 350px; height: 210px; background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border: 1px solid #27272a; border-radius: 16px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
          .card::after { content: ''; position: absolute; bottom: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%); border-radius: 50%; }
          .header { display: flex; justify-content: space-between; align-items: center; border-b: 1px solid #27272a; padding-bottom: 10px; margin-bottom: 15px; }
          .brand { font-weight: 800; font-size: 16px; color: #f59e0b; letter-spacing: 1px; }
          .logo-text { font-size: 8px; color: #71717a; font-family: monospace; letter-spacing: 0.5px; }
          .body { display: flex; gap: 15px; }
          .photo { width: 75px; height: 75px; border-radius: 10px; object-fit: cover; border: 1.5px solid #f59e0b; }
          .info { display: flex; flex-direction: column; justify-content: space-between; height: 75px; }
          .name { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 1px; }
          .id { font-family: monospace; color: #f59e0b; font-size: 11px; margin-bottom: 4px; font-weight: bold;}
          .detail-row { font-size: 10px; color: #a1a1aa; line-height: 1.3; }
          .detail-val { font-weight: 600; color: #e4e4e7; }
          .footer { position: absolute; bottom: 12px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #52525b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">ImveloGYM</div>
            <div class="logo-text">OFFICIAL ACCESS BADGE</div>
          </div>
          <div class="body">
            <img class="photo" src="${m.photo || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop'}" referrerPolicy="no-referrer" />
            <div class="info">
              <div>
                <div class="name">${m.fullName}</div>
                <div class="id">${m.memberId || 'N/A'}</div>
              </div>
              <div>
                <div class="detail-row">PLAN: <span class="detail-val">${m.planName || "Active Plan"}</span></div>
                <div class="detail-row" style="margin-top: 2px;">VALID THRU: <span class="detail-val">${m.endDate || "Unlimited"}</span></div>
              </div>
            </div>
          </div>
          <div class="footer">
            <div>STATUS: ACTIVE</div>
            <div>VERIFIED CRM CLOUD API</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(cardHtml);
    printWindow.document.close();
  };

  const handlePrintNewOnboardedReceipt = (m: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }
    const planPrice = plans.find(p => p.id === activePlanId)?.price || "0.00";
    const receiptHtml = `
      <html>
      <head>
        <title>Receipt - ImveloGYM</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; background-color: #fff; color: #1c1917; padding: 40px; margin: 0; line-height: 1.5; }
          .invoice-box { max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e7e5e4; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e7e5e4; padding-bottom: 15px; margin-bottom: 20px; }
          .brand { font-size: 24px; font-weight: 800; color: #d97706; letter-spacing: -0.5px; }
          .invoice-details { text-align: right; font-size: 11px; color: #57534e; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #78716c; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #f5f5f4; padding-bottom: 4px; }
          .grid { display: grid; grid-template-cols: 150px 1fr; gap: 8px 15px; margin-bottom: 20px; font-size: 13px; }
          .label { color: #78716c; }
          .val { font-weight: 600; color: #1c1917; }
          .item-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
          .item-table th { background-color: #f5f5f4; text-align: left; padding: 10px; font-size: 11px; color: #57534e; font-weight: bold; text-transform: uppercase; }
          .item-table td { padding: 12px 10px; border-bottom: 1px solid #f5f5f4; font-size: 13px; }
          .totals { font-size: 15px; border-top: 2px solid #e7e5e4; padding-top: 15px; text-align: right; color: #1c1917; font-weight: 800; }
          .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #a8a29e; border-top: 1px dashed #e7e5e4; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="brand">ImveloGYM</div>
              <div style="font-size: 11px; color: #78716c; margin-top: 2px;">Premium Fitness CRM & Onboarding Suite</div>
            </div>
            <div class="invoice-details">
              <strong>TAX RECEIPT</strong><br/>
              Receipt #: REC-${Math.floor(100000 + Math.random() * 900000)}<br/>
              Date: ${new Date().toISOString().split("T")[0]}<br/>
              Status: PAID
            </div>
          </div>
          
          <div class="section-title">Customer Registration Details</div>
          <div class="grid">
            <div class="label">Member Name</div><div class="val">${m.fullName}</div>
            <div class="label">Member Registry ID</div><div class="val">${m.memberId || 'N/A'}</div>
            <div class="label">Email Address</div><div class="val">${m.email}</div>
            <div class="label">Contact Number</div><div class="val">${m.phone}</div>
          </div>

          <div class="section-title">Purchased Membership Plan</div>
          <table class="item-table">
            <thead>
              <tr>
                <th>Registration Item & Description</th>
                <th style="text-align: right;">Cost Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${m.planName || "Selected Active Plan"} Plan Subscription</strong><br/>
                  <span style="font-size: 10px; color: #78716c;">Membership range interval: ${m.startDate || new Date().toISOString().split("T")[0]} to ${m.endDate || "N/A"}</span>
                </td>
                <td style="text-align: right; font-weight: 600;">$${planPrice}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            Total Charged Dues: $${planPrice} &nbsp;(PAID)
          </div>

          <div class="footer">
            Thank you for registering at ImveloGYM. Your fitness journey starts now.<br/>
            For cloud support, contact billing@imvelogym.com.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/members/${selectedMember.id}`, {
        fullName,
        email,
        phone,
        gender,
        dob,
        bloodGroup,
        address,
        emergencyContactName,
        emergencyContactPhone,
        trainerId: trainerId || null,
        activePlanId: activePlanId || null,
        status,
        photo,
        height,
        weight,
        bodyFat,
        chest,
        waist,
        hip,
        biceps,
        thigh,
        fitnessGoal,
        medicalConditions,
        injuries,
        allergies,
        medications,
        medicalWarnings,
        locker,
        ptPackage,
        trainerNotes
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

  // Freeze action handler
  const handleFreeze = async () => {
    if (!confirm("Are you sure you want to freeze this membership?")) return;
    try {
      await api.post("/memberships/freeze", { memberId: selectedMember.id });
      alert("Membership successfully frozen.");
      handleViewProfile(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to freeze.");
    }
  };

  // Cancel action handler
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this membership? This is permanent.")) return;
    try {
      await api.post("/memberships/cancel", { memberId: selectedMember.id });
      alert("Membership successfully canceled.");
      handleViewProfile(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel.");
    }
  };

  // Renew action handler
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewPlanId || !renewPrice) {
      alert("Plan and Price are required.");
      return;
    }
    try {
      await api.post("/memberships/renew", {
        memberId: selectedMember.id,
        planId: renewPlanId,
        startDateStr: renewStartDate,
        pricePaid: renewPrice
      });
      alert("Membership successfully renewed!");
      setIsRenewOpen(false);
      handleViewProfile(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to renew.");
    }
  };

  // Upgrade action handler
  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewPlanId || !renewPrice) {
      alert("New plan and Price details are required.");
      return;
    }
    try {
      await api.post("/memberships/upgrade", {
        memberId: selectedMember.id,
        newPlanId: renewPlanId,
        pricePaid: renewPrice
      });
      alert("Membership successfully upgraded!");
      setIsUpgradeOpen(false);
      handleViewProfile(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to upgrade.");
    }
  };

  // Log measurements trends progress handler
  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/members/${selectedMember.id}/progress`, {
        weight: logWeight,
        bodyFat: logBodyFat,
        chest: logChest,
        waist: logWaist,
        hip: logHip,
        biceps: logBiceps,
        thigh: logThigh,
        notes: logProgressNotes
      });
      alert("Physical metrics successfully recorded!");
      setIsLogProgressOpen(false);
      setLogProgressNotes("");
      reloadProfileSubsets(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to log metrics.");
    }
  };

  // Progress comparison picture upload
  const handleUploadProgressPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBase64) {
      alert("Please choose a photograph first.");
      return;
    }
    try {
      await api.post(`/members/${selectedMember.id}/photos`, {
        category: photoCategory,
        photo: photoBase64
      });
      alert("Comparison progress photo uploaded!");
      setPhotoBase64("");
      reloadProfileSubsets(selectedMember.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Photo upload failed.");
    }
  };

  // Printable membership card overlay
  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Membership Card - ${selectedMember.fullName}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f7fafc; }
            .card { width: 420px; height: 240px; background: #0f172a; color: white; border-radius: 16px; padding: 20px; box-sizing: border-box; display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; border: 2px solid #e11d48; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
            .avatar { width: 80px; height: 80px; border-radius: 8px; object-cover: cover; border: 2px solid #f59e0b; }
            .left-col { display: flex; flex-direction: column; justify-content: space-between; width: 62%; }
            .right-col { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; width: 34%; }
            .title { color: #f59e0b; font-weight: 900; font-size: 14px; margin-bottom: 3px; }
            .badge { background-color: #e11d48; color: white; border-radius: 4px; padding: 2px 6px; font-size: 9px; uppercase: true; display: inline-block; font-weight: bold; }
            .qr { width: 75px; height: 75px; background: white; padding: 4px; border-radius: 8px; }
            .qr-token { color: #64748b; font-size: 8px; font-family: monospace; margin-top: 3px; max-width: 90px; text-overflow: truncate; overflow: hidden; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="left-col">
              <div>
                <div class="title">IMVELOGYM SYSTEM</div>
                <div style="font-size: 12px; font-weight: bold; margin-top: 5px; color: #fff;">${selectedMember.fullName}</div>
                <div style="color: #cbd5e1; margin-top: 2px;">CODE ID: ${selectedMember.memberId}</div>
              </div>
              <div>
                <div style="color: #94a3b8;">Membership: <strong style="color: #fff;">${selectedMember.planName || "Active Access"}</strong></div>
                <div style="color: #94a3b8; margin-top: 2.5px;">Valid Thru: <strong style="color: #e11d48;">${selectedMember.endDate || "Unlimited"}</strong></div>
              </div>
            </div>
            <div class="right-col">
              <img src="${selectedMember.photo}" class="avatar" />
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <!-- Simulated Secure QR displaying encrypted signature -->
                <div class="qr" style="display: flex; align-items: center; justify-content: center; font-size: 8px; color: black; font-weight: bold; text-align: center;">
                   [QR CODE]<br/>
                   ${selectedMember.memberId}
                </div>
                <span class="qr-token">Token Standby</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* 1. LIST VIEW OF ALL MEMBERS */}
      {activeForm === "LIST" && (() => {
        const allUnpaidPayments = payments.filter((p: any) => p.status === "Pending" || p.status === "Overdue");
        const totalPendingAmount = allUnpaidPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const membersWithPendingFees = new Set(allUnpaidPayments.map((p: any) => p.memberId)).size;

        const filteredMembers = members.filter((m) => {
          if (!filterDuesOnly) return true;
          const feeStatus = getFeeStatusDetails(m.id, m.endDate);
          return feeStatus.pendingAmount > 0;
        });

        return (
          <>
            {/* Header */}
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
                    Member Directory CRM
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Database lookup of full system users, physical stats, trainer assigners, and active plans.
                  </p>
                </div>
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
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-white"
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
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-white"
                >
                  <option value="ALL">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Summary Banner */}
            <div 
              onClick={() => setFilterDuesOnly(!filterDuesOnly)}
              className={`cursor-pointer border rounded-2xl p-4 transition-all duration-300 ${
                filterDuesOnly 
                  ? "bg-amber-500/10 border-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-850/30 hover:border-zinc-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex flex-wrap items-center gap-8">
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Total Pending Amount</div>
                    <div className="text-2xl font-black text-red-500 font-sans">
                      ₹{totalPendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-zinc-800" />
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Members With Pending Fees</div>
                    <div className="text-2xl font-black text-amber-500 font-sans">
                      {membersWithPendingFees}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {filterDuesOnly ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-black text-[10px] font-bold font-mono rounded-xl uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      DUES ONLY FILTER ACTIVE (CLICK TO RESET)
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono font-bold text-zinc-500 hover:text-zinc-300 bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-850">
                      CLICK TO FILTER DUES
                    </span>
                  )}
                </div>
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
                      <th className="py-4 px-5">Active Plan & Coach</th>
                      <th className="py-4 px-5 text-center">Membership Expiry</th>
                      <th className="py-4 px-5 text-center">Membership Status</th>
                      <th className="py-4 px-5 text-center">Fee Status</th>
                      <th className="py-4 px-5 text-center">Pending Amount</th>
                      <th className="py-4 px-5 text-center">Next Due Date</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-zinc-500 font-mono">
                          No member records match the active criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => {
                        const bmiVal = getBmiDesc(m.bmi || 24);
                        const memStatus = getMembershipStatus(m.endDate);
                        const feeStatus = getFeeStatusDetails(m.id, m.endDate);

                        return (
                          <tr key={m.id} className="hover:bg-zinc-850/50 transition-colors">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={m.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"}
                                  alt={m.fullName}
                                  className="w-10 h-10 rounded-xl object-cover border border-zinc-850 shrink-0"
                                />
                                <div>
                                  <div className="font-bold text-white text-sm">{m.fullName}</div>
                                  <div className="text-[10px] font-bold font-mono text-amber-500 mt-0.5">{m.memberId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="text-white">{m.email}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{m.phone}</div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="font-medium text-white">{m.planName || "No active plan"}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">Coach: {m.trainerName || "—"}</div>
                            </td>
                            <td className="py-3 px-5 text-center text-zinc-300 font-semibold font-mono">
                              {m.endDate || "Unlimited"}
                            </td>
                            <td className="py-3 px-5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                memStatus === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                memStatus === "EXPIRING SOON" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                "bg-red-500/10 text-red-500 border border-red-500/10"
                              }`}>
                                {memStatus}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${feeStatus.badgeColor}`}>
                                {feeStatus.status}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-center font-semibold text-sm">
                              <span className={feeStatus.pendingAmount === 0 ? "text-emerald-400 font-mono" : "text-red-500 font-mono"}>
                                ₹{feeStatus.pendingAmount.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-center font-mono text-zinc-400">
                              {feeStatus.dueDate || "—"}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  title="View Member Profile"
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
                      className="px-3 py-1.5 bg-zinc-90 w-20 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:border-zinc-800 text-white cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1.5 bg-zinc-90 w-20 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg disabled:opacity-30 disabled:hover:border-zinc-800 text-white cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* 2. REGISTER MEMBER (ADD - PREMIUM ONBOARDING WIZARD) */}
      {activeForm === "ADD" && (
        <div className="max-w-4xl mx-auto">
          {successMember ? (
            /* PROFESSIONAL SUCCESS SCREEN */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-zinc-900 border border-zinc-805 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-600" />
              
              {/* Confetti & Success Greeting */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500 animate-bounce">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Onboarding Registered Successfully!</h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  A new secure profile has been compiled and added to ImveloGYM systems. All active permissions are live.
                </p>
              </div>

              {/* ID Card Display Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                {/* Visual ID Badging Side */}
                <div className="md:col-span-5 flex flex-col items-center justify-center border-r border-zinc-850 pr-0 md:pr-6 pb-6 md:pb-0 space-y-4">
                  <div className="relative">
                    <img
                      src={successMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"}
                      alt={successMember.fullName}
                      referrerPolicy="no-referrer"
                      className="w-32 h-32 rounded-2xl object-cover border-2 border-amber-500 shadow-md shadow-amber-500/10"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full border border-zinc-950">
                      SYS LIVE
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-zinc-500 text-[10px] font-bold font-mono tracking-widest">MEMBER IDENTIFICATION</div>
                    <div className="text-white text-xl font-black tracking-widest font-mono">
                      {successMember.memberId || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Account Details Side */}
                <div className="md:col-span-7 space-y-4 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Full Name</span>
                      <span className="text-white text-sm font-semibold">{successMember.fullName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Email Address</span>
                      <span className="text-zinc-300 text-sm font-semibold truncate block">{successMember.email}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Membership Plan</span>
                      <span className="text-amber-400 text-sm font-bold">{successMember.planName || "No Selected Plan"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Assigned Coach</span>
                      <span className="text-zinc-300 text-sm font-semibold">{successMember.trainerName || "Self Coaching"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Valid Until</span>
                      <span className="text-zinc-300 font-mono text-sm font-semibold">{successMember.endDate || "Unlimited Period"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Payment Status</span>
                      <span className="inline-flex items-center gap-1.5 mt-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <Check className="w-3 h-3 stroke-[3]" /> PAID (ONBOARDING DUES)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handlePrintNewOnboardedCard(successMember)}
                  className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl text-xs py-3.5 transition cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-500" /> Card Badge
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintNewOnboardedReceipt(successMember)}
                  className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl text-xs py-3.5 transition cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // reset all params
                    setFullName("");
                    setEmail("");
                    setPhone("");
                    setGender("Male");
                    setDob("1995-01-01");
                    setBloodGroup("O+");
                    setAddress("");
                    setEmergencyContactName("");
                    setEmergencyContactPhone("");
                    setHeight(175);
                    setWeight(75);
                    setBodyFat(15);
                    setChest(95);
                    setWaist(80);
                    setHip(90);
                    setBiceps(35);
                    setThigh(55);
                    setFitnessGoal("Lean Muscle Gain");
                    setMedicalConditions("");
                    setInjuries("");
                    setAllergies("");
                    setMedications("");
                    setMedicalWarnings("");
                    setLocker("");
                    setPtPackage("");
                    setTrainerNotes("");
                    setOccupation("");
                    setMockCardNumber("");
                    setMockCardExpiry("");
                    setMockCardCVV("");
                    setMockCardName("");
                    setPaymentMethod("CASH");
                    setSuccessMember(null);
                    setRegistrationStep(1);
                  }}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs py-3.5 transition cursor-pointer col-span-1 shadow-lg shadow-amber-500/10"
                >
                  <PlusCircle className="w-4 h-4" /> Register Another
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMember(null);
                    if (backTarget === "DASHBOARD" && onBack) {
                      onBack();
                    } else {
                      setActiveForm("LIST");
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold rounded-xl text-xs py-3.5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" /> Return Home
                </button>
              </div>
            </motion.div>
          ) : (
            /* PREMIUM ONBOARDING WIZARD COMPONENT */
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
              {/* Wizard Brand Header */}
              <div className="flex justify-between items-center border-b border-zinc-850 pb-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest font-mono text-amber-500 uppercase">
                    IMVELOGYM COMMERCIAL SAAS
                  </span>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Activity className="text-amber-500 w-5 h-5 animate-pulse" /> Onboarding & Member Registration
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleBackFromAdd}
                  className="p-2.5 bg-zinc-950 hover:bg-zinc-850 rounded-xl transition border border-zinc-850 cursor-pointer"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Progress Indicator Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-bold">
                    Step {registrationStep} of 9: <span className="text-amber-400 font-black">{
                      registrationStep === 1 ? "Welcome Guest" :
                      registrationStep === 2 ? "Personal Info" :
                      registrationStep === 3 ? "Address & Emergency" :
                      registrationStep === 4 ? "Physical measurements" :
                      registrationStep === 5 ? "Membership & Coaching" :
                      registrationStep === 6 ? "Merchant Checkout" :
                      registrationStep === 7 ? "Photography Snapshot" :
                      registrationStep === 8 ? "Medical & Health profile" : "Review Summary"
                    }</span>
                  </span>
                  <span className="text-zinc-500 font-mono font-bold">
                    {Math.round(((registrationStep - 1) / 8) * 100)}% Completed
                  </span>
                </div>
                {/* Horizontal progress bar */}
                <div className="w-full bg-zinc-955 h-[6px] rounded-full overflow-hidden border border-zinc-850/50">
                  <motion.div
                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-full"
                    initial={{ width: "5%" }}
                    animate={{ width: `${Math.max(5, ((registrationStep - 1) / 8) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>

                {/* Vertical Step Circles indicator for Large Devices */}
                <div className="hidden sm:flex justify-between items-center pt-2 gap-1 text-[10px] font-bold font-mono tracking-wider">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                    <div
                      key={s}
                      onClick={() => {
                        // Check validation before letting them skip around if they click directly (only allowed for previously completed steps)
                        if (s < registrationStep) {
                          setStepDirection(s - registrationStep > 0 ? 1 : -1);
                          setRegistrationStep(s);
                          setStepError(null);
                        } else if (s === registrationStep) {
                          // Already active
                        } else {
                          // Try to step forward consecutively up to target s
                          let valid = true;
                          for (let w = registrationStep; w < s; w++) {
                            const err = validateStepAt(w);
                            if (err) {
                              setStepError(`Validation barrier at Step ${w}: ${err}`);
                              valid = false;
                              break;
                            }
                          }
                          if (valid) {
                            setStepDirection(1);
                            setRegistrationStep(s);
                            setStepError(null);
                          }
                        }
                      }}
                      className={`flex-1 text-center py-2 border-b-2 transition duration-300 cursor-pointer ${
                        s === registrationStep
                          ? "border-amber-500 text-amber-500"
                          : s < registrationStep
                          ? "border-emerald-500 text-emerald-400"
                          : "border-zinc-800 text-zinc-600"
                      }`}
                    >
                      {s === 1 ? "WELCOME" :
                       s === 2 ? "PERSONAL" :
                       s === 3 ? "CONTACTS" :
                       s === 4 ? "PHY" :
                       s === 5 ? "PLAN" :
                       s === 6 ? "PAY" :
                       s === 7 ? "PHOTO" :
                       s === 8 ? "MEDICAL" : "REVIEW"}
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Notification Banners */}
              {stepError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>{stepError}</div>
                </motion.div>
              )}

              {/* Animated Step Frame */}
              <AnimatePresence mode="wait" custom={stepDirection}>
                <motion.div
                  key={registrationStep}
                  custom={stepDirection}
                  variants={{
                    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0, scale: 0.99 }),
                    center: { x: 0, opacity: 1, scale: 1 },
                    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0, scale: 0.99 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="min-h-[280px]"
                >
                  
                  {/* STEP 1: WELCOME SCREEN */}
                  {registrationStep === 1 && (
                    <div className="space-y-6 flex flex-col justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="space-y-4">
                          <h3 className="text-2xl font-black text-white tracking-tight">
                            Elevate Gym Registrations into a Premium Commercial Experience
                          </h3>
                          <p className="text-zinc-400 text-sm leading-relaxed">
                            Welcome to the ImveloGYM registrar. We have redesigned our single-form subscription workflow into a state-saving multi-step wizard. Live BMI calculating, mock secure checkouts, and integrated camera snapping are supported.
                          </p>
                          <div className="flex gap-2.5 text-xs text-zinc-500 font-bold font-mono">
                            <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-850">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> ONLINE DATABASE
                            </span>
                            <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-850">
                              <span className="w-2 h-2 rounded-full bg-amber-500" /> AUTO-SAVE LIVE
                            </span>
                          </div>
                        </div>

                        {/* Interactive local draft prompt card */}
                        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-850 space-y-4">
                          {draftExists ? (
                            <div className="space-y-3 animate-fade-in text-xs">
                              <div className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg font-bold font-mono text-[9px]">
                                ACTIVE DRAFT DETECTED
                              </div>
                              <h4 className="text-sm font-black text-white">Resume Unfinished Registration?</h4>
                              <p className="text-zinc-500">
                                An onboarding progress was saved in your local storage. Pick up where you left off.
                              </p>
                              
                              <div className="flex gap-2 pt-1 border-t border-zinc-900 mt-2">
                                <button
                                  type="button"
                                  onClick={handleLoadDraft}
                                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2 px-3 rounded-xl transition text-[11px]"
                                >
                                  Resume Progress
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Discard draft and clear cached values?")) {
                                      clearDraft();
                                    }
                                  }}
                                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 font-bold py-2 px-3 rounded-xl transition text-[11px]"
                                >
                                  Start Fresh
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 text-xs">
                              <div className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold font-mono text-[9px]">
                                READY FOR SETUP
                              </div>
                              <h4 className="text-sm font-black text-white">Starting Normal Onboarding</h4>
                              <p className="text-zinc-500leading-relaxed">
                                Form data caches immediately on change. You can secure or close the tab safely without losing registered metric scores.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setStepDirection(1);
                                  setRegistrationStep(2);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white font-extrabold py-2.5 rounded-xl transition text-[11px] flex justify-center items-center gap-2"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Start Registration Wizard
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: PERSONAL SECURITY PROFILE */}
                  {registrationStep === 2 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Personal Security Profile</h3>
                        <p className="text-xs text-zinc-500">Enter essential system identifier credentials for the member profile registry.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">FULL NAME *</label>
                          <input
                            type="text"
                            placeholder="Chris Hemsworth"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              setStepError(null);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">EMAIL ADDRESS *</label>
                          <input
                            type="email"
                            placeholder="chris@hollywood.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setStepError(null);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">PHONE DIRECTORY *</label>
                          <input
                            type="text"
                            placeholder="+1-555-123-4567"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setStepError(null);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">GENDER</label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as any)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none text-zinc-300 focus:border-amber-500"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">DATE OF BIRTH</label>
                          <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white font-mono focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">BLOOD GROUP</label>
                          <select
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-300 focus:border-amber-500"
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

                        <div className="space-y-1.5 col-span-1 md:col-span-3">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">PROFESSION / OCCUPATION</label>
                          <input
                            type="text"
                            placeholder="Software Engineer, Athlete, Doctor"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: ADDRESS & EMERGENCY */}
                  {registrationStep === 3 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Street Registry & Safety Contacts</h3>
                        <p className="text-xs text-zinc-500">Provide physical location boundaries and safety contact directory options.</p>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">STREET RESIDENTIAL ADDRESS</label>
                          <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Street No, Area, City, State..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-white h-20 resize-none focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">EMERGENCY CONTACT NAME</label>
                            <input
                              type="text"
                              placeholder="Relationship Contact Name (e.g., Jane Doe)"
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">EMERGENCY PHONE DIRECTORY</label>
                            <input
                              type="text"
                              placeholder="Relationship Contact Telephone"
                              value={emergencyContactPhone}
                              onChange={(e) => setEmergencyContactPhone(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: PHYSICAL MEASUREMENTS (LIVE BMI) */}
                  {registrationStep === 4 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Physical Assessment & Biometrics</h3>
                        <p className="text-xs text-zinc-500">Log body composition and physical metrics score.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                        {/* Biometric inputs */}
                        <div className="grid grid-cols-2 gap-4 md:col-span-8">
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">HEIGHT (cm)</label>
                            <input
                              type="number"
                              value={height}
                              onChange={(e) => {
                                setHeight(Number(e.target.value) || 0);
                                setStepError(null);
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">WEIGHT (kg)</label>
                            <input
                              type="number"
                              value={weight}
                              onChange={(e) => {
                                setWeight(Number(e.target.value) || 0);
                                setStepError(null);
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">BODY FAT %</label>
                            <input
                              type="number"
                              value={bodyFat}
                              onChange={(e) => setBodyFat(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>

                          {/* Extra dimensions */}
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">CHEST WIDTH (cm)</label>
                            <input
                              type="number"
                              value={chest}
                              onChange={(e) => setChest(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">WAIST SIZE (cm)</label>
                            <input
                              type="number"
                              value={waist}
                              onChange={(e) => setWaist(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">HIP DIAMETER (cm)</label>
                            <input
                              type="number"
                              value={hip}
                              onChange={(e) => setHip(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">BICEPS (cm)</label>
                            <input
                              type="number"
                              value={biceps}
                              onChange={(e) => setBiceps(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">THIGH (cm)</label>
                            <input
                              type="number"
                              value={thigh}
                              onChange={(e) => setThigh(Number(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* LIVE calculated BMI display panel */}
                        <div className="md:col-span-4 flex flex-col justify-center items-center p-6 bg-zinc-950 border border-zinc-850 rounded-2xl text-center space-y-4">
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 font-black tracking-widest font-mono block">DYNAMIC ASSESSMENT</span>
                            <span className="text-zinc-400 font-bold text-xs uppercase block">Body Mass Index</span>
                          </div>
                          
                          {/* Main metric */}
                          <div className="space-y-1">
                            <div className="text-4xl font-black text-white tracking-tighter">
                              {isNaN(autoBMI) || autoBMI <= 0 || autoBMI === Infinity ? "0.0" : autoBMI}
                            </div>
                            <span className={`inline-block px-3 py-1 font-mono text-[9px] font-black uppercase rounded-full border ${getBmiDesc(autoBMI).color}`}>
                              {getBmiDesc(autoBMI).text}
                            </span>
                          </div>

                          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[180px]">
                            BMI classification metrics are based on World Health Organization (WHO) safety guidelines.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: PLAN SELECTION */}
                  {registrationStep === 5 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Membership Plan Selection</h3>
                        <p className="text-xs text-zinc-500">Configure access level parameters and assign professional facility guides.</p>
                      </div>

                      {/* Tactile pricing grids */}
                      <div className="space-y-4 text-xs">
                        <label className="text-zinc-400 font-bold text-[10px] tracking-wide uppercase">AVAILABLE ACCESS PLANS</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div
                            onClick={() => setActivePlanId("")}
                            className={`p-4 bg-zinc-950 border rounded-2xl transition duration-300 flex flex-col justify-between h-36 cursor-pointer ${
                              !activePlanId ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5" : "border-zinc-850 hover:border-zinc-800"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <span className="text-sm font-black text-white block">No Program Plan / Custom Entry</span>
                              <span className="text-zinc-500 text-[10px]">Access on single daily checkout fees.</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-900">
                              <span className="text-xs font-black text-zinc-400">$0.00</span>
                              <span className="text-[10px] font-mono uppercase text-zinc-500">Unassigned</span>
                            </div>
                          </div>

                          {plans.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setActivePlanId(p.id)}
                              className={`p-4 bg-zinc-950 border rounded-2xl transition duration-300 flex flex-col justify-between h-36 cursor-pointer ${
                                activePlanId === p.id ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5" : "border-zinc-850 hover:border-zinc-800"
                              }`}
                            >
                              <div className="space-y-1.5">
                                <span className="text-sm font-black text-white block">{p.name}</span>
                                <span className="text-zinc-500 text-[10px] line-clamp-2 leading-relaxed">{p.description}</span>
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-900">
                                <span className="text-xs font-black text-amber-500">${p.price}</span>
                                <span className="text-[10px] font-mono uppercase text-zinc-400">{p.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Trainer Selection Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-850">
                          <div className="space-y-1.5">
                            <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">ASSIGN PROFESSIONAL COACH</label>
                            <select
                              value={trainerId}
                              onChange={(e) => setTrainerId(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-300 text-xs focus:border-amber-500"
                            >
                              <option value="">Self Coaching / Self Training Program</option>
                              {trainers.map((t) => (
                                <option key={t.id} value={t.id}>{t.fullName}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">LOCKER ASSIGNMENT</label>
                              <input
                                type="text"
                                placeholder="Locker B-405"
                                value={locker}
                                onChange={(e) => setLocker(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">RECRUITMENT PT PACKAGE</label>
                              <input
                                type="text"
                                placeholder="e.g. 12-week Weight Cut"
                                value={ptPackage}
                                onChange={(e) => setPtPackage(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: PAYMENT CHECKOUT */}
                  {registrationStep === 6 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Payment & Merchant Checkout</h3>
                        <p className="text-xs text-zinc-500">Record billing details to generate system invoices on account validation.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                        {/* Simulation Column Left */}
                        <div className="md:col-span-4 space-y-4">
                          <label className="text-zinc-450 font-bold font-mono text-[9px] uppercase tracking-wider block">BILLING SUMMARY</label>
                          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-450">Item Selected</span>
                              <span className="text-white font-bold max-w-[120px] truncate block">
                                {plans.find(p => p.id === activePlanId)?.name || "No Access Plan"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-450">Base Price</span>
                              <span className="text-zinc-300 font-semibold font-mono">
                                ${plans.find(p => p.id === activePlanId)?.price || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-450">Tax / GST (0%)</span>
                              <span className="text-zinc-500 font-mono">$0.00</span>
                            </div>
                            <div className="h-px bg-zinc-900 mt-2" />
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-white font-black text-xs">Total Dues</span>
                              <span className="text-amber-500 font-black text-sm font-mono">
                                ${plans.find(p => p.id === activePlanId)?.price || "0.00"}
                              </span>
                            </div>
                          </div>

                          {/* Payment Types Selector */}
                          <div className="space-y-2">
                            <label className="text-zinc-500 font-bold text-[9px] tracking-wider uppercase block">PAYMENT MODE DIRECTORY</label>
                            <div className="flex gap-2">
                              {["CASH", "CARD", "TRANSFER"].map((mType) => (
                                <button
                                  key={mType}
                                  type="button"
                                  onClick={() => setPaymentMethod(mType as any)}
                                  className={`flex-1 py-2 text-[10px] font-extrabold tracking-wider rounded-xl transition border text-center cursor-pointer ${
                                    paymentMethod === mType
                                      ? "border-amber-500 bg-amber-500/10 text-amber-500"
                                      : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {mType}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Simulated payment card panel */}
                        <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                          {paymentMethod === "CARD" ? (
                            <div className="space-y-4">
                              {/* Glowing mockup credit card */}
                              <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 border border-zinc-750 rounded-2xl shadow-xl h-44 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                                
                                <div className="flex justify-between items-start">
                                  <div className="inline-block p-1 bg-zinc-900/50 border border-zinc-800 rounded">
                                    <div className="w-8 h-6 bg-amber-500/20 rounded-sm border border-amber-500/10" />
                                  </div>
                                  <span className="text-[10px] font-black text-zinc-500 font-mono tracking-widest uppercase">Imvelo CARD</span>
                                </div>

                                <div className="text-lg font-mono text-zinc-100 font-semibold tracking-widest py-2">
                                  {mockCardNumber || "••••  ••••  ••••  ••••"}
                                </div>

                                <div className="flex justify-between items-end text-[10px] font-mono text-zinc-400">
                                  <div>
                                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block">Card Holder</span>
                                    <span className="font-semibold text-zinc-200">{mockCardName || fullName || "Chris Hemsworth"}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block">Expires</span>
                                    <span className="font-semibold text-zinc-200">{mockCardExpiry || "MM/YY"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Form inputs */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-zinc-500 font-bold text-[9px] uppercase">Cardholder Name</label>
                                  <input
                                    type="text"
                                    placeholder={fullName || "Chris Hemsworth"}
                                    value={mockCardName}
                                    onChange={(e) => setMockCardName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-zinc-500 font-bold text-[9px] uppercase">Card Number</label>
                                  <input
                                    type="text"
                                    maxLength={19}
                                    placeholder="4111  2222  3333  4444"
                                    value={mockCardNumber}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                                      let matches = v.match(/\d{4,16}/g);
                                      let match = (matches && matches[0]) || "";
                                      let parts = [];
                                      for (let i = 0, len = match.length; i < len; i += 4) {
                                        parts.push(match.substring(i, i + 4));
                                      }
                                      if (parts.length > 0) {
                                        setMockCardNumber(parts.join(" "));
                                      } else {
                                        setMockCardNumber(v);
                                      }
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-zinc-500 font-bold text-[9px] uppercase">Expiration Date</label>
                                  <input
                                    type="text"
                                    maxLength={5}
                                    placeholder="MM/YY"
                                    value={mockCardExpiry}
                                    onChange={(e) => setMockCardExpiry(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-zinc-500 font-bold text-[9px] uppercase">Security CVV Code</label>
                                  <input
                                    type="password"
                                    maxLength={3}
                                    placeholder="•••"
                                    value={mockCardCVV}
                                    onChange={(e) => setMockCardCVV(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-zinc-950 border border-zinc-850 rounded-2xl text-center space-y-4">
                              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-450">
                                <CreditCard className="w-8 h-8 text-amber-500 animate-pulse" />
                              </div>
                              <h4 className="text-sm font-black text-white">
                                {paymentMethod === "CASH" ? "Standard Cash Transaction Routing" : "Interbank Transfer Checkout Logs"}
                              </h4>
                              <p className="text-zinc-500 max-w-[320px] leading-relaxed">
                                {paymentMethod === "CASH" 
                                  ? "Payment collected instantly at receptionist registers. The subscription invoice will start as pending and auto-mark paid on cash collection."
                                  : "Electronic transfers require entering official transaction referential logs upon receipt audit validation."
                                }
                              </p>
                              <span className="px-3 py-1 font-mono text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full font-bold">
                                BILLING SECURED
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: SECURE PHOTO CAPTURING AND AVATAR */}
                  {registrationStep === 7 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Photography & Badge Photo Upload</h3>
                        <p className="text-xs text-zinc-500">Record verification photo for secure facility scanning credentials.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                        {/* Selector Controls column */}
                        <div className="md:col-span-7 space-y-4">
                          <label className="text-zinc-500 font-bold text-[10px] tracking-wider uppercase">VERIFICATION CONTROLS</label>
                          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3.5">
                            
                            {/* Manual link input */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase block">PROFILE IMAGE DIRECT URL</span>
                              <input
                                type="text"
                                value={photo}
                                onChange={(e) => setPhoto(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-mono"
                              />
                            </div>

                            {/* Dynamically uploaded local file selector */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase block">UPLOAD JPG / PNG PICTURE</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-[11px] text-zinc-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border border-zinc-800 file:border-0 file:text-[11px] file:font-bold file:bg-zinc-900 file:text-zinc-300 file:cursor-pointer"
                              />
                            </div>

                            {/* Interactive webcam activates toggles */}
                            <div className="pt-2 border-t border-zinc-900 mt-2">
                              {cameraActive ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={capturePhotoSnapshot}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-2 px-4 rounded-xl transition text-[11px]"
                                  >
                                    Snap Image
                                  </button>
                                  <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 font-bold py-2 px-4 rounded-xl transition text-[11px]"
                                  >
                                    Deactivate Cam
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-855 text-white font-extrabold py-2.5 rounded-xl transition text-[11px] flex justify-center items-center gap-2"
                                >
                                  <Camera className="w-4 h-4 text-amber-500" /> Open Live WebCamera Feed
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Webcam Video Output & Snapshot preview column */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-850 rounded-2xl relative">
                          <div className="space-y-1.5 w-full text-center">
                            <span className="text-[10px] text-zinc-500 font-black tracking-widest block uppercase font-mono">LIVE PREVIEW</span>
                            
                            <div className="aspect-square w-full max-w-[200px] bg-zinc-90 w-full bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden mx-auto relative relative">
                              {cameraActive ? (
                                <video
                                  ref={videoRef}
                                  className="w-full h-full object-cover scale-x-[-1]"
                                  autoplay
                                  playsinline
                                />
                              ) : (
                                <img
                                  src={photo}
                                  alt="Live Avatar Snapshot"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover border border-zinc-800"
                                />
                              )}
                            </div>
                            
                            <p className="text-[9px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto pt-1">
                              {cameraActive 
                                ? "Fit face clearly within the centering box bounds before snapping."
                                : "Securely aligned with GDPR standards."
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 8: HEALTH RECORDS AND DETAILS */}
                  {registrationStep === 8 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Health records & Compliance Indices</h3>
                        <p className="text-xs text-zinc-500">Provide medical warnings and targets required under liability protection acts.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">FITNESS GOAL / PROGRAM TARGET</label>
                          <input
                            type="text"
                            placeholder="Weight loss, hypertrophy, cardiovascular building..."
                            value={fitnessGoal}
                            onChange={(e) => setFitnessGoal(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">MEDICAL CONDITIONS</label>
                          <input
                            type="text"
                            placeholder="Asthma, Diabetes, Blood pressure metrics..."
                            value={medicalConditions}
                            onChange={(e) => setMedicalConditions(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">PHYSICAL RESTRICTIONS / INJURIES</label>
                          <input
                            type="text"
                            placeholder="Lumbar spine herniation restrictions, Knee injuries..."
                            value={injuries}
                            onChange={(e) => setInjuries(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">ALLERGIES</label>
                          <input
                            type="text"
                            placeholder="Peanut, pollen, latex allergic reactions..."
                            value={allergies}
                            onChange={(e) => setAllergies(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-zinc-400 font-bold tracking-wide uppercase text-[10px]">MEDICATIONS ACTIVE</label>
                          <input
                            type="text"
                            placeholder="Insulin, Beta-blockers, prescribed meds..."
                            value={medications}
                            onChange={(e) => setMedications(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                          <label className="text-red-400 font-bold tracking-wider text-[10px] uppercase">
                            CRITICAL EMERGENCY WARNINGS (CARDIOVASCULAR DICTUMS, ETC)
                          </label>
                          <textarea
                            value={medicalWarnings}
                            onChange={(e) => setMedicalWarnings(e.target.value)}
                            placeholder="EXTREMELY SYSTEM IMPORTANT WARNINGS stored in high visibility warning borders..."
                            className="w-full bg-zinc-950 border border-red-500/20 text-red-200 placeholder:text-zinc-700 rounded-2xl p-3 h-20 resize-none focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 9: FINAL COMPREHENSIVE REVIEW & BENTO GENERAL */}
                  {registrationStep === 9 && (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">Registry Consolidation & Summary</h3>
                        <p className="text-xs text-zinc-500">Provide final confirmation before storing legal member logs on main database nodes.</p>
                      </div>

                      {/* Bento grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
                          <h4 className="font-extrabold text-amber-500 text-[10px] tracking-wider uppercase">A. Identifier Credentials</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500">Name: <span className="text-white font-bold block">{fullName || "N/A"}</span></div>
                            <div className="text-zinc-500">Email: <span className="text-zinc-300 font-medium truncate block">{email || "N/A"}</span></div>
                            <div className="text-zinc-500">Phone: <span className="text-white font-medium block">{phone || "N/A"}</span></div>
                            <div className="text-zinc-500 font-mono">Dob: <span className="text-white block">{dob || "N/A"}</span></div>
                          </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
                          <h4 className="font-extrabold text-amber-500 text-[10px] tracking-wider uppercase">B. Body Metrics Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500">Stature: <span className="text-white font-bold">{height} cm</span></div>
                            <div className="text-zinc-500">Weight: <span className="text-white font-bold">{weight} kg</span></div>
                            <div className="text-zinc-550 col-span-2">
                              BMI Index Calcs: <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ml-1 ${getBmiDesc(autoBMI).color}`}>{autoBMI} ({getBmiDesc(autoBMI).text})</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
                          <h4 className="font-extrabold text-amber-500 text-[10px] tracking-wider uppercase">C. Membership access setup</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-550">Active Plan: <span className="text-white font-extrabold block">{plans.find(p => p.id === activePlanId)?.name || "No Access Plan ($0.00)"}</span></div>
                            <div className="text-zinc-550">Trainer: <span className="text-zinc-300 font-bold block">{trainers.find(t => t.id === trainerId)?.fullName || "No Coach Assigned"}</span></div>
                          </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
                          <h4 className="font-extrabold text-amber-500 text-[10px] tracking-wider uppercase">D. Compliance alerts</h4>
                          <div className="text-xs space-y-1">
                            {medicalWarnings ? (
                              <div className="text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/15 max-h-[48px] overflow-hidden truncate">
                                WARNING: {medicalWarnings}
                              </div>
                            ) : (
                              <div className="text-zinc-500 font-medium">No system critical alerts specified.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Onboarding security compliance signoff check */}
                      <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-2xl text-xs flex gap-3 text-zinc-300">
                        <CheckSquare className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>GDPR & Liability protection consensus validated.</strong>
                          <p className="text-[10px] text-zinc-500 leading-relaxed pt-0.5">
                            Submitting records logs physical indices permanently. Password credentials default back to <code className="text-white font-mono bg-zinc-950 px-1 py-0.5 rounded">password123</code>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              {/* Form Buttons navigation footer */}
              <div className="flex gap-4 pt-4 border-t border-zinc-850">
                {registrationStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStepDirection(-1);
                      setRegistrationStep(registrationStep - 1);
                      setStepError(null);
                    }}
                    className="flex-1 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs py-3.5 transition cursor-pointer"
                  >
                    Go Back
                  </button>
                )}

                {registrationStep < 9 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const err = validateStepAt(registrationStep);
                      if (err) {
                        setStepError(err);
                      } else {
                        setStepDirection(1);
                        setRegistrationStep(registrationStep + 1);
                        setStepError(null);
                      }
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs py-3.5 transition cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    Continue Onboarding
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={registering}
                    onClick={handleCreateMember}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black rounded-xl text-xs py-3.5 transition cursor-pointer shadow-lg shadow-amber-500/10 flex justify-center items-center gap-2"
                  >
                    {registering ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" /> Verifying Credentials...
                      </>
                    ) : (
                      "Record Profile Setup"
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EDIT MEMBER (EDIT SYSTEM VALUES) */}
      {activeForm === "EDIT" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="text-amber-500 w-5 h-5" /> Adjust Registered Member CRM Values
            </h2>
            <button
              type="button"
              onClick={() => setActiveForm("LIST")}
              className="p-2 hover:bg-zinc-800 rounded-xl"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">FULL NAME</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">PHONE NUMBER</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">GENDER</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-300"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">DATE OF BIRTH</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">SYSTEM STATUS</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-300"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">HEIGHT (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">WEIGHT (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">BODY FAT %</label>
                <input
                  type="number"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">CHEST (cm)</label>
                <input
                  type="number"
                  value={chest}
                  onChange={(e) => setChest(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">WAIST (cm)</label>
                <input
                  type="number"
                  value={waist}
                  onChange={(e) => setWaist(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">HIP (cm)</label>
                <input
                  type="number"
                  value={hip}
                  onChange={(e) => setHip(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">BICEPS (cm)</label>
                <input
                  type="number"
                  value={biceps}
                  onChange={(e) => setBiceps(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">THIGH (cm)</label>
                <input
                  type="number"
                  value={thigh}
                  onChange={(e) => setThigh(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">LOCKER NUMBER ALLOCATION</label>
                <input
                  type="text"
                  value={locker}
                  onChange={(e) => setLocker(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">PT TRAINING PACKAGE</label>
                <input
                  type="text"
                  value={ptPackage}
                  onChange={(e) => setPtPackage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-zinc-400">TRAINER INSTRUCTION NOTES / FEEDBACK</label>
              <textarea
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-20 resize-none focus:outline-none"
              ></textarea>
            </div>

            <div className="flex gap-4 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveForm("LIST")}
                className="flex-1 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs py-3.5 transition"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs py-3.5 transition"
              >
                Save Member Edits
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. DETAILED PROFILE VIEW (12-Tab System Context) */}
      {activeForm === "PROFILE" && selectedMember && (
        <PremiumMemberProfile
          user={user}
          selectedMember={selectedMember}
          memberQrCode={memberQrCode}
          progressHistory={progressHistory}
          photosList={photosList}
          timelineEntries={timelineEntries}
          membershipHistory={membershipHistory}
          trainers={trainers}
          plans={plans}
          onBack={() => setActiveForm("LIST")}
          onRefresh={() => {
            reloadProfileSubsets(selectedMember.id);
            handleViewProfile(selectedMember.id);
          }}
          onOpenEdit={(member) => handleOpenEdit(member)}
          api={api}
        />
      )}

      {/* DISABLED OLD PROFILE FORM TO AVOID INTERFERENCE */}
      {false && activeForm === "PROFILE" && selectedMember && (
        <div className="space-y-6">
          
          {/* Top Return bar */}
          <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
            <button
               type="button"
               onClick={() => setActiveForm("LIST")}
               className="px-4.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> CRM Directory
            </button>
            <div className="flex gap-2">
              <button 
                onClick={handlePrintCard}
                className="px-4.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500 rounded-xl text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-500" /> Print Cards ID
              </button>
              {user.role !== "TRAINER" && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedMember)}
                  className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs cursor-pointer transition active:scale-95 shadow-md shadow-amber-500/15"
                >
                  Adjust Profile Values
                </button>
              )}
            </div>
          </div>

          {/* CRITICAL MEDICAL WARNING BOX */}
          {selectedMember.medicalWarnings && (
            <div className="bg-red-950/20 border border-red-500/30 p-4.5 rounded-2xl flex items-start gap-3.5 text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <strong className="text-red-400 font-mono tracking-wider uppercase text-xs block">
                  CRITICAL HEALTH / MEDICAL WARNING LOGGED
                </strong>
                <p className="text-xs mt-1 leading-relaxed">{selectedMember.medicalWarnings}</p>
              </div>
            </div>
          )}

          {/* Profile Card Header */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <img
              referrerPolicy="no-referrer"
              src={selectedMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"}
              alt={selectedMember.fullName}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-2 border-zinc-800 shrink-0 mx-auto md:mx-0 shadow-xl"
            />

            <div className="flex-grow space-y-2 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h2 className="text-2xl font-black text-white">{selectedMember.fullName}</h2>
                <div className="flex justify-center md:justify-start gap-1.5 mt-1 md:mt-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                    selectedMember.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    selectedMember.status === "Expired" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {selectedMember.status}
                  </span>
                  {selectedMember.activePlanId ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-amber-500/5 border border-amber-500/20 text-amber-500">
                      Paid Access
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-zinc-800 text-zinc-400">
                      Un-billed Account
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-400 font-mono font-medium flex flex-wrap justify-center md:justify-start gap-3">
                <span>ID: <strong className="text-amber-500 font-bold">{selectedMember.memberId}</strong></span>
                <span>•</span>
                <span>AGE: <strong className="text-zinc-300">{calculateAge(selectedMember.dob)} Yrs</strong></span>
                <span>•</span>
                <span>JOINED: <strong className="text-zinc-300">{selectedMember.joiningDate}</strong></span>
              </div>

              {/* Biomarkers details fastbar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-zinc-800/80 mt-3 font-mono text-left">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] block uppercase">HEIGHT/WEIGHT</span>
                  <span className="text-[11.5px] font-bold text-white block mt-0.5">{selectedMember.height || 175}cm / {selectedMember.weight || 75}kg</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] block uppercase">BMI TARGET</span>
                  <span className="text-[11.5px] font-bold text-amber-500 block mt-0.5">{selectedMember.bmi || "N/A"}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] block uppercase">BODY FAT %</span>
                  <span className="text-[11.5px] font-bold text-white block mt-0.5">{selectedMember.bodyFat || "—"}%</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 text-[9px] block uppercase">LOCKER REF</span>
                  <span className="text-[11.5px] font-bold text-emerald-400 block mt-0.5 truncate">{selectedMember.locker || "No locker"}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 text-[9px] block uppercase">PT TRACK PACKAGE</span>
                  <span className="text-[11.5px] font-bold text-zinc-300 block mt-0.5 truncate">{selectedMember.ptPackage || "Self Managed"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Profile Tabs list layout */}
          <div className="flex border-b border-zinc-800 font-mono text-[11px] overflow-x-auto shrink-0 pb-1 gap-1">
            {([
              { key: "OVERVIEW", label: "Overview Detail" },
              { key: "PERSONAL", label: "Personal Information" },
              { key: "MEMBERSHIP", label: "Membership Lifecycle" },
              { key: "ATTENDANCE", label: "Attendance Logs" },
              { key: "PAYMENTS", label: "Payments Ledger" },
              { key: "WORKOUT", label: "Workout Plans" },
              { key: "DIET", label: "Diet Plans" },
              { key: "PROGRESS", label: "Physical Measurements & BMI" },
              { key: "PHOTOS", label: "Comparison Progress Photos" },
              { key: "MEDICAL", label: "Medical Diagnostics" },
              { key: "TRAINER_NOTES", label: "Coach Notes" },
              { key: "TIMELINE", label: "Event Timeline" },
              { key: "COMMUNICATION", label: "WhatsApp & Billing Hub" }
            ] as { key: ProfileTab, label: string }[]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveProfileTab(tab.key)}
                className={`py-2 px-3 border-b-2 font-bold whitespace-nowrap transition cursor-pointer ${
                  activeProfileTab === tab.key ? "border-amber-500 text-amber-500 bg-amber-500/5 rounded-t-lg" : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Screen Content */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            
            {/* TAB A: OVERVIEW */}
            {activeProfileTab === "OVERVIEW" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-300">
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-2">
                    Athletic Status & Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <span className="text-zinc-500 block text-[9px]">ACTIVE MEMBERSHIP ACCESS</span>
                      <strong className="text-white text-sm block mt-1">{selectedMember.planName || "No Associated Plan"}</strong>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <span className="text-zinc-500 block text-[9px]">ASSIGNED PROFESSIONAL COACH</span>
                      <strong className="text-amber-500 text-sm block mt-1">{selectedMember.trainerName || "Self Training Core"}</strong>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <span className="text-zinc-500 block text-[9px]">EXPIRATION MATRIX ENDS</span>
                      <strong className="text-red-400 text-sm block mt-1">{selectedMember.endDate || "Unlimited Session"}</strong>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <span className="text-zinc-500 block text-[9px]">LATEST TRAINER STATS COHORTS</span>
                      <strong className="text-white text-sm block mt-1 italic">"{selectedMember.fitnessGoal || "Under development"}"</strong>
                    </div>
                  </div>

                  {/* Dynamic security QR code validation info card */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl space-y-2">
                    <div className="font-bold text-white uppercase text-[10px] tracking-wider font-mono flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-500" /> Dynamic Secure Scanning Cryptographic Token
                    </div>
                    <p className="text-[11px] text-zinc-400 pb-2">
                      Dynamic check-in tokens are salted securely on databases to prevent unauthorized profile copies. 
                      Scanned records update attendance metrics automatically.
                    </p>
                    <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-[11px] font-mono break-all text-zinc-400">
                      SECURE QR SIGNATURE: <span className="text-yellow-500">{memberQrCode || "STANDBY_HASH_GENERATION"}</span>
                    </div>
                  </div>
                </div>

                {/* Membership card Preview column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-2 text-center">
                    Printable Card
                  </h3>
                  
                  {/* Visual card itself */}
                  <div className="bg-zinc-950 border border-amber-500/20 p-5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden text-zinc-300 font-mono">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                    
                    <div className="flex justify-between items-start border-b border-zinc-850 pb-2.5">
                      <div>
                        <div className="text-[10px] font-bold text-[#FF7A00] uppercase">IMVELOGYM PREMIUM</div>
                        <div className="font-bold text-xs text-white uppercase mt-1 truncate max-w-[150px]">{selectedMember.fullName}</div>
                        <div className="text-[9px] text-zinc-500 mt-1">ID: {selectedMember.memberId}</div>
                      </div>
                      <img 
                        src={selectedMember.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"} 
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1 text-[9.5px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Access Tier:</span>
                        <span className="text-white font-bold">{selectedMember.planName || "Active Access"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-505">Card Expiry:</span>
                        <span className="text-red-400 font-bold">{selectedMember.endDate || "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-505">Emergency:</span>
                        <span className="text-zinc-300">{selectedMember.emergencyContactPhone || "N/A"}</span>
                      </div>
                    </div>

                    <div className="flex justify-center pt-2.5 border-t border-zinc-900">
                      <div className="bg-white p-2 rounded-lg text-black font-black text-[10px] uppercase text-center w-full block">
                        [ SECURE AUTH QR CODE ]
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handlePrintCard}
                    className="w-full py-2.5 bg-amber-500 font-black text-black hover:bg-amber-400 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 stroke-[2.5]" /> Launch Print window
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: PERSONAL INFORMATION */}
            {activeProfileTab === "PERSONAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase border-b border-zinc-800 pb-1">
                    Athlete Identity Setup
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-500">Biological full name</span>
                      <strong className="text-white text-xs">{selectedMember.fullName}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-500">Primary contact email</span>
                      <span className="text-white">{selectedMember.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-500">Telephone address</span>
                      <span className="text-white font-mono">{selectedMember.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-500">Gender code</span>
                      <span className="text-white">{selectedMember.gender}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-500">Birthday date of birth</span>
                      <span className="text-white font-mono">{selectedMember.dob} ({calculateAge(selectedMember.dob)} Yrs Age)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-505">Occupation status</span>
                      <span className="text-white">{selectedMember.occupation || "Commercial Athlete / Unspecified"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-850">
                      <span className="text-zinc-505">Blood Group Biomarker</span>
                      <span className="text-emerald-400 font-bold font-mono">{selectedMember.bloodGroup || "O+"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wider font-mono text-red-400 uppercase border-b border-zinc-800 pb-1">
                    Emergency Guardian Contacts
                  </h3>
                  <div className="p-4 bg-red-950/20 border border-red-950 rounded-2xl space-y-2.5">
                    <div className="flex justify-between py-1 border-b border-red-950/25">
                      <span className="text-zinc-500 text-[10px] font-mono">CONTACT GUARDIAN NAME</span>
                      <strong className="text-white text-xs">{selectedMember.emergencyContactName || "Not Provided"}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-550 text-[10px] font-mono">GUARDIAN PHONE</span>
                      <strong className="text-red-400 font-mono text-xs">{selectedMember.emergencyContactPhone || "N/A"}</strong>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-zinc-500 block">Home street address:</span>
                    <p className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-white italic">
                      {selectedMember.address || "No primary street details stored."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: MEMBERSHIP TRANSITIONS */}
            {activeProfileTab === "MEMBERSHIP" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-zinc-950 p-5 border border-zinc-850 rounded-3xl">
                  <div>
                    <span className="text-zinc-500 text-[9px] font-bold font-mono tracking-wider block uppercase">CURRENT PLAN ACTIVE MEMBERSHIP STATUS</span>
                    <strong className="text-white text-base block mt-1">{selectedMember.planName || "No Plan assigned / Inactive"}</strong>
                    <div className="text-zinc-400 text-[10px] mt-1 font-mono">
                      Validity Date: {selectedMember.startDate || "N/A"} to {selectedMember.endDate || "N/A"}
                    </div>
                  </div>

                  {user.role !== "TRAINER" && (
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => {
                          setRenewPlanId(selectedMember.activePlanId || "");
                          setRenewPrice("");
                          setIsRenewOpen(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl"
                      >
                        Renew Plan
                      </button>
                      <button 
                        onClick={() => {
                          setRenewPlanId("");
                          setRenewPrice("");
                          setIsUpgradeOpen(true);
                        }}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl"
                      >
                        Upgrade / Change Plan
                      </button>
                      <button 
                        onClick={handleFreeze}
                        className="px-3.5 py-2 bg-zinc-90 w-24 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-yellow-500 font-bold"
                      >
                        Freeze Card
                      </button>
                      <button 
                        onClick={handleCancel}
                        className="px-3.5 py-2 bg-zinc-90 w-24 bg-zinc-900 hover:bg-red-950/20 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-xl text-zinc-400 font-bold"
                      >
                        Cancel Plan
                      </button>
                    </div>
                  )}
                </div>

                {/* Popups forms */}
                {isRenewOpen && (
                  <form onSubmit={handleRenewSubmit} className="p-4 bg-zinc-950 border border-emerald-500/20 rounded-2xl space-y-4 max-w-md">
                    <h4 className="font-mono text-emerald-400 font-bold uppercase text-[10px]">Renew Membership Plan Access</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-500 block mb-1">SELECT PLAN</label>
                        <select 
                          value={renewPlanId} 
                          onChange={(e) => setRenewPlanId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl"
                        >
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">PRICE PAID ($)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 199" 
                          value={renewPrice}
                          onChange={(e) => setRenewPrice(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsRenewOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg">Cancel</button>
                      <button type="submit" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg">Process Renewal</button>
                    </div>
                  </form>
                )}

                {isUpgradeOpen && (
                  <form onSubmit={handleUpgradeSubmit} className="p-4 bg-zinc-950 border border-amber-500/20 rounded-2xl space-y-4 max-w-md">
                    <h4 className="font-mono text-amber-500 font-bold uppercase text-[10px]">Upgrade / Change Membership</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-500 block mb-1">CHOOSE NEW PLAN</label>
                        <select 
                          value={renewPlanId} 
                          onChange={(e) => setRenewPlanId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl"
                        >
                          <option value="">Select target plan...</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">PRICE Billed ($)</label>
                        <input 
                          type="number" 
                          value={renewPrice}
                          placeholder="e.g. 299"
                          onChange={(e) => setRenewPrice(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsUpgradeOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg font-bold">Cancel</button>
                      <button type="submit" className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg">Process Upgrade</button>
                    </div>
                  </form>
                )}

                {/* Membership historical ledger logs */}
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-xs font-black text-white font-mono uppercase tracking-widest">Membership Standing Status Logs Hierarchy</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-zinc-950 border border-zinc-850 rounded-2xl text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500">
                          <th className="p-3">Plan Name</th>
                          <th className="p-3">Valid Range</th>
                          <th className="p-3">Price Paid</th>
                          <th className="p-3">Standing status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300">
                        {membershipHistory.length === 0 ? (
                          <tr><td colSpan={4} className="p-3 text-center text-zinc-650">No membership changes on record.</td></tr>
                        ) : (
                          membershipHistory.map((h, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/60">
                              <td className="p-3 font-bold text-white">{h.planName || "Core Access"}</td>
                              <td className="p-3 text-zinc-400">{h.startDate} to {h.endDate}</td>
                              <td className="p-3 font-bold text-emerald-400">${h.pricePaid}</td>
                              <td className="p-3"><span className="text-[10px] font-black uppercase text-amber-500">{h.status || "Completed"}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB D: ATTENDANCE */}
            {activeProfileTab === "ATTENDANCE" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-2">
                  Daily Clock-In & Check-Out Presence Logs
                </h3>
                {selectedMember.attendance?.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-mono">No presence logs logged yet for this member.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-zinc-950 border border-zinc-850 rounded-2xl font-mono text-[11.5px]">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500">
                          <th className="p-3">Active Date</th>
                          <th className="p-3">Check-In Duration</th>
                          <th className="p-3">Departure Check-Out</th>
                          <th className="p-3">Activity Notes / Focus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300">
                        {selectedMember.attendance?.map((a: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 font-bold">{a.date}</td>
                            <td className="p-3 text-emerald-400 font-bold">{a.timeIn}</td>
                            <td className="p-3 text-zinc-500">{a.timeOut || "Active Room Now"}</td>
                            <td className="p-3 text-zinc-400 italic font-sans">{a.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB E: PAYMENTS */}
            {activeProfileTab === "PAYMENTS" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-2">
                  Acquired Invoices & Cleared Financial Receipts
                </h3>
                {selectedMember.payments?.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-mono">No invoice bills generated.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedMember.payments?.map((pay: any) => (
                      <div key={pay.id} className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex justify-between items-center font-mono">
                        <div>
                          <div className="text-xs font-black text-white">{pay.type}</div>
                          <span className="text-[10px] text-zinc-500">REF: {pay.id} • Due: {pay.dueDate || "Paid"}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-black">${pay.amount}</div>
                          <button 
                            onClick={() => alert(`Cleard Payment Invoice receipt:\nItem: ${pay.type}\nCleared Sum: $${pay.amount}\nMode: Bank Wire Trans`)}
                            className="text-[9px] text-amber-500 hover:underline mt-1 cursor-pointer block"
                          >
                            Download Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB F: WORKOUT PLANS */}
            {activeProfileTab === "WORKOUT" && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Coach Assigned Workout Plan Sheets</h3>
                </div>
                {!selectedMember.workoutPlan ? (
                  <div className="text-center py-10 text-zinc-500 font-mono">No customized exercise sheets active.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedMember.workoutPlan.exercises?.map((ex: any, idx: number) => (
                      <div key={idx} className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{ex.name}</h4>
                          <span className="text-xs text-amber-500 font-mono block mt-1">Sets: {ex.sets} | Reps: {ex.reps} | Session Time: {ex.durationMin} Min</span>
                          <p className="text-zinc-450 text-[11px] font-sans mt-1.5 italic">Target: {ex.notes}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[9px] font-black text-emerald-400 uppercase">✓ ACTIVE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB G: DIET PLANS */}
            {activeProfileTab === "DIET" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white border-b border-zinc-8s0 pb-1.5">Diet Plan Checklist</h3>
                {!selectedMember.dietPlan ? (
                  <div className="text-center py-10 text-zinc-500 font-mono">No published physical diet sheets.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-3.5">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                        <span className="text-amber-500 block font-bold text-[10px]">BREAKFAST MENU</span>
                        <p className="text-zinc-300 mt-1">{selectedMember.dietPlan.meals?.breakfast || "Standard Oatmeal"}</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                        <span className="text-emerald-400 block font-bold text-[10px]">LUNCH MENU</span>
                        <p className="text-zinc-300 mt-1">{selectedMember.dietPlan.meals?.lunch || "Chicken Breast with Broccoli"}</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                        <span className="text-amber-500 block font-bold text-[10px]">DINNER MENU</span>
                        <p className="text-zinc-300 mt-1">{selectedMember.dietPlan.meals?.dinner || "Salmon Roast and Salad"}</p>
                      </div>
                    </div>
                    <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl font-mono text-zinc-400 space-y-3 block">
                      <strong>Target Macros split:</strong>
                      <div className="flex justify-between text-xs py-1 border-b border-zinc-900">
                        <span>CALORIES</span>
                        <span>{selectedMember.dietPlan.targets?.calories || 2800} kcal</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-zinc-900">
                        <span>PROTEIN</span>
                        <span>{selectedMember.dietPlan.targets?.proteinGrams || 180} g</span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span>WATER</span>
                        <span>{selectedMember.dietPlan.targets?.waterIntakeLiters || 4} L</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB H: PHYSICAL MEASUREMENTS & BMI */}
            {activeProfileTab === "PROGRESS" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase">Measurements History Logs</h3>
                    <span className="text-[10px] text-zinc-500">Record weight, chest, fat ratios and view visual trends over date times.</span>
                  </div>
                  <button 
                    onClick={() => {
                      setLogWeight(selectedMember.weight || 75);
                      setLogBodyFat(selectedMember.bodyFat || 15);
                      setLogChest(selectedMember.chest || 0);
                      setLogWaist(selectedMember.waist || 0);
                      setLogHip(selectedMember.hip || 0);
                      setLogBiceps(selectedMember.biceps || 0);
                      setLogThigh(selectedMember.thigh || 0);
                      setIsLogProgressOpen(true);
                    }}
                    className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition cursor-pointer active:scale-95"
                  >
                    Record Measure Log
                  </button>
                </div>

                {isLogProgressOpen && (
                  <form onSubmit={handleLogProgress} className="p-5 bg-zinc-950 border border-amber-500/15 rounded-3xl space-y-4 max-w-xl">
                    <h4 className="font-bold text-amber-500 font-mono tracking-widest uppercase text-[10px]">Record Measurements Log Entry</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-zinc-500 block mb-1">WEIGHT (kg)</label>
                        <input type="number" value={logWeight} onChange={(e) => setLogWeight(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">BODY FAT %</label>
                        <input type="number" value={logBodyFat} onChange={(e) => setLogBodyFat(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">CHEST (cm)</label>
                        <input type="number" value={logChest} onChange={(e) => setLogChest(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">WAIST (cm)</label>
                        <input type="number" value={logWaist} onChange={(e) => setLogWaist(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">HIP (cm)</label>
                        <input type="number" value={logHip} onChange={(e) => setLogHip(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">BICEPS (cm)</label>
                        <input type="number" value={logBiceps} onChange={(e) => setLogBiceps(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                      <div>
                        <label className="text-zinc-500 block mb-1">THIGH (cm)</label>
                        <input type="number" value={logThigh} onChange={(e) => setLogThigh(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1">LOG REMARKS</label>
                      <input type="text" placeholder="Physical progress details..." value={logProgressNotes} onChange={(e) => setLogProgressNotes(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsLogProgressOpen(false)} className="flex-1 py-2 bg-zinc-900 text-zinc-300 rounded-lg">Cancel</button>
                      <button type="submit" className="flex-1 py-2 bg-amber-500 font-extrabold text-black rounded-lg">Log Record</button>
                    </div>
                  </form>
                )}

                {/* VISUAL RECHARTS GRAPH FOR WEIGHT & BMI SLOPES */}
                {progressHistory.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-2">
                      <strong className="text-xs text-white uppercase block font-mono">Weight Slope Trend (kg)</strong>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={progressHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} />
                            <YAxis stroke="#52525b" fontSize={10} width={25} domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", color: "#fff" }} />
                            <Area type="monotone" dataKey="weight" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-2">
                      <strong className="text-xs text-white uppercase block font-mono">Weight Body Fat Density Ratio %</strong>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={progressHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} />
                            <YAxis stroke="#52525b" fontSize={10} width={25} />
                            <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#27272a", color: "#fff" }} />
                            <Area type="monotone" dataKey="bodyFat" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Measurements logs list table details */}
                <div className="space-y-3">
                  <span className="font-bold text-white font-mono block text-[10px] uppercase">Measurements Audit Rows</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-zinc-950 border border-zinc-850 rounded-2xl text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500">
                          <th className="p-3">Logged Date</th>
                          <th className="p-3">Weight (kg)</th>
                          <th className="p-3">BMI Index</th>
                          <th className="p-3">Fat Ratio %</th>
                          <th className="p-3">Chest (cm)</th>
                          <th className="p-3">Waist/Hip</th>
                          <th className="p-3">Biceps / Thigh</th>
                          <th className="p-3 max-w-[120px]">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300">
                        {progressHistory.length === 0 ? (
                          <tr><td colSpan={8} className="p-3 text-center text-zinc-650">No measurements logged for this member.</td></tr>
                        ) : (
                          progressHistory.map((row: any) => (
                            <tr key={row.id}>
                              <td className="p-3 font-bold text-white">{row.date}</td>
                              <td className="p-3">{row.weight} kg</td>
                              <td className="p-3 text-amber-500 font-bold">{row.bmi}</td>
                              <td className="p-3 text-emerald-400">{row.bodyFat}%</td>
                              <td className="p-3">{row.chest} cm</td>
                              <td className="p-3">{row.waist} / {row.hip}</td>
                              <td className="p-3">{row.biceps}cm / {row.thigh}cm</td>
                              <td className="p-3 italic text-zinc-400 font-sans max-w-[140px] truncate">{row.notes || "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB I: COMPARISON PROGRESS PHOTOS */}
            {activeProfileTab === "PHOTOS" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950 p-4.5 border border-zinc-850 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-black text-white font-mono uppercase">Athlete Comparison Visuals</h3>
                    <p className="text-zinc-500 text-[11px] mt-0.5">Upload categorized photos (Front, Side, Back) and display comparisons.</p>
                  </div>
                  
                  {/* Upload Form inline block */}
                  <form onSubmit={handleUploadProgressPhoto} className="flex flex-wrap gap-2 text-xs">
                    <select 
                      value={photoCategory} 
                      onChange={(e: any) => setPhotoCategory(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-white outline-none font-mono text-[11px]"
                    >
                      <option value="Front">Front Position</option>
                      <option value="Side">Side Position</option>
                      <option value="Back">Back Position</option>
                    </select>
                    
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleProgressPhotoChange}
                      className="block w-40 text-[11px] text-zinc-500 file:mr-4 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:bg-zinc-800 file:text-zinc-300 file:cursor-pointer"
                    />

                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 stroke-[2.5]" /> Upload Comparison photo
                    </button>
                  </form>
                </div>

                {/* Stored Comparison Grid visualizer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  {["Front", "Side", "Back"].map((category) => {
                    const photos = photosList.filter(p => p.category === category);
                    const beforePhoto = photos[0]; // Oldest uploaded
                    const afterPhoto = photos[photos.length - 1]; // Newest uploaded

                    return (
                      <div key={category} className="bg-zinc-950/50 border border-zinc-850 p-4.5 rounded-3xl space-y-3.5">
                        <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
                          {category} Comparison Position
                        </span>

                        {photos.length === 0 ? (
                          <div className="text-center py-10 text-zinc-650 font-mono text-[10px] uppercase">
                            No uploads inside this category
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                              <div className="space-y-1">
                                <span className="bg-zinc-900 py-0.5 px-2 text-zinc-400 rounded-md block border border-zinc-800">BEFORE</span>
                                <img src={beforePhoto.photoPath} className="w-full h-32 object-cover rounded-xl border border-zinc-800" referrerPolicy="no-referrer" />
                                <span className="text-zinc-500 block">{beforePhoto.date}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="bg-emerald-500/10 py-0.5 px-2 text-emerald-400 rounded-md block border border-emerald-500/10">AFTER</span>
                                <img src={afterPhoto.photoPath} className="w-full h-32 object-cover rounded-xl border border-zinc-800" referrerPolicy="no-referrer" />
                                <span className="text-zinc-500 block">{afterPhoto.date}</span>
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

            {/* TAB J: MEDICAL DIAGNOSTICS */}
            {activeProfileTab === "MEDICAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-800 pb-1.5 flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-amber-500" /> Active Medical Diagnostics
                  </h3>
                  <div className="space-y-3 text-xs font-sans">
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                      <span className="text-zinc-500 block font-mono font-bold uppercase text-[9px] tracking-wider">DIAGNOSED MEDICAL CONDITIONS</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedMember.medicalConditions || "No chronic diagnosed conditions reported."}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                      <span className="text-zinc-500 block font-mono font-bold uppercase text-[9px] tracking-wider">PREVIOUS INJURIES / PHYSICAL LIMITS</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedMember.injuries || "None declared or active."}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-red-500 font-mono tracking-wider uppercase border-b border-zinc-800 pb-1.5 flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500" /> Critical Warning Diagnostics
                  </h3>
                  <div className="space-y-3 text-xs font-sans">
                    <div className="p-3 bg-red-950/10 border border-red-500/10 text-red-200 rounded-xl">
                      <span className="text-red-400 block font-mono font-bold uppercase text-[9px] tracking-wider">ALLERGIES</span>
                      <p className="mt-1 font-medium">{selectedMember.allergies || "No active environmental or food allergen records."}</p>
                    </div>
                    <div className="p-3 bg-red-950/10 border border-red-500/10 text-red-200 rounded-xl">
                      <span className="text-red-400 block font-mono font-bold uppercase text-[9px] tracking-wider">RESTRICTION MEDICATIONS</span>
                      <p className="mt-1 font-medium">{selectedMember.medications || "No active beta-blockers or cardiac prescriptions stored."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB K: COACH NOTES */}
            {activeProfileTab === "TRAINER_NOTES" && (
              <div className="space-y-4 text-zinc-300 text-xs">
                <h3 className="text-sm font-black text-white font-mono tracking-wider uppercase border-b border-zinc-8s0 pb-1.5">
                  Assigned Coach Notes & Instructions
                </h3>
                <div className="p-4 bg-zinc-955 border border-zinc-800 rounded-2xl bg-zinc-950/80 leading-relaxed space-y-3 text-xs italic">
                  <strong className="text-amber-500 block font-mono font-bold uppercase text-[9px] tracking-widest not-italic">
                    LATEST TRAINER REMARKS RECORDED
                  </strong>
                  <p className="text-zinc-200 font-sans">"{selectedMember.trainerNotes || "No notes logged by standard coach yet."}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono font-bold">
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">LOCKER LOCATION ASSIGNER</span>
                    <span className="text-white text-xs block mt-1">{selectedMember.locker || "No locker assigned."}</span>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">PERSONAL TRAINING PACKAGE (PT)</span>
                    <span className="text-white text-xs block mt-1">{selectedMember.ptPackage || "Standard General Access"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB L: EVENT TIMELINE ACCUMULATION */}
            {activeProfileTab === "TIMELINE" && (
              <div className="space-y-5 text-xs text-zinc-300">
                <h3 className="text-sm font-black text-white font-mono tracking-widest uppercase border-b border-zinc-800 pb-2">
                  Chronological Life History Audit Trails
                </h3>
                {timelineEntries.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-mono">No historical timeline operations recorded yet.</div>
                ) : (
                  <div className="space-y-4 relative pl-6 border-l border-zinc-800">
                    {timelineEntries.map((entry, idx) => (
                      <div key={idx} className="relative space-y-1">
                        {/* Dot marker */}
                        <div className="absolute -left-[29.5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-zinc-900"></div>
                        
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>{entry.createdAt?.replace("T", " ")?.split(".")[0] || entry.date}</span>
                          <span className="uppercase text-amber-500 font-bold px-1.5 py-0.5 bg-amber-500/5 rounded border border-amber-500/10">{entry.eventType}</span>
                        </div>
                        <h4 className="font-extrabold text-white text-xs">{entry.title}</h4>
                        <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">{entry.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB M: WHATSAPP & BILLING HUD CONTROL */}
            {activeProfileTab === "COMMUNICATION" && (
              <div className="space-y-6 text-xs text-zinc-300">
                <div>
                  <h3 className="text-sm font-black text-white font-mono tracking-widest uppercase border-b border-zinc-800 pb-2">
                    Commercial Messages & WhatsApp Communication Hub
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Configure CRM variables, download high-fidelity PDF documents, issue automated receipts and alert subscribers of renewal deadlines directly on WhatsApp.
                  </p>
                </div>

                {/* Grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1 & 2: Quick actions & Preview */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Panel 1: Document Quick Actions */}
                    <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-500" /> Member Quick Dispatch Actions
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const url = `/api/billing/pdf/Invoice/${selectedMember.memberId}?token=${localStorage.getItem("accessToken")}`;
                            window.open(url, "_blank");
                          }}
                          className="p-3 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-zinc-300 hover:text-white rounded-xl text-left space-y-1.5 transition font-mono cursor-pointer"
                        >
                          <span className="text-[9px] text-zinc-500 uppercase block">Invoice File</span>
                          <span className="font-extrabold text-[11px] block text-amber-500">📄 Send/View Invoice PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const url = `/api/billing/pdf/Receipt/${selectedMember.memberId}?token=${localStorage.getItem("accessToken")}`;
                            window.open(url, "_blank");
                          }}
                          className="p-3 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-zinc-300 hover:text-white rounded-xl text-left space-y-1.5 transition font-mono cursor-pointer"
                        >
                          <span className="text-[9px] text-zinc-500 uppercase block">Receipt File</span>
                          <span className="font-extrabold text-[11px] block text-amber-500">💵 Send/View Receipt PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const url = `/api/billing/pdf/MembershipCard/${selectedMember.memberId}?token=${localStorage.getItem("accessToken")}`;
                            window.open(url, "_blank");
                          }}
                          className="p-3 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-zinc-300 hover:text-white rounded-xl text-left space-y-1.5 transition font-mono col-span-2 sm:col-span-1 cursor-pointer"
                        >
                          <span className="text-[9px] text-zinc-500 uppercase block">Access Passport</span>
                          <span className="font-extrabold text-[11px] block text-green-500">🎫 Send/View Passport Card</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const resp = await api.post("/communication/send", {
                                memberId: selectedMember.id,
                                category: "Fee Due Reminder",
                                variables: {
                                  Amount: "1500",
                                  DueDate: selectedMember.endDate || new Date().toISOString().split("T")[0],
                                  MembershipPlan: selectedMember.planName || "Active Access Plan"
                                }
                              });
                              if (resp.data.whatsappUrl) {
                                window.open(resp.data.whatsappUrl, "_blank");
                                reloadProfileSubsets(selectedMember.id);
                              }
                            } catch (e) {
                              alert("Failed to send fee reminder.");
                            }
                          }}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold rounded-xl text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Reminder Now
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const phone = selectedMember.phone || "";
                            const clean = phone.replace(/[^0-9]/g, "");
                            window.open(`https://wa.me/${clean}`, "_blank");
                          }}
                          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono font-bold rounded-xl text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open WhatsApp Chat
                        </button>
                      </div>
                    </div>

                    {/* Panel 2: Interactive Sandbox Preview */}
                    <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-500" /> Interactive SMS/WhatsApp Template Sandbox
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3 font-mono text-[11px]">
                          <div className="space-y-1">
                            <label className="text-zinc-500 uppercase block">Selected Template Type</label>
                            <select
                              value={selectedComTemplate}
                              onChange={(e) => setSelectedComTemplate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-305 focus:outline-none focus:border-amber-500"
                            >
                              <option value="Welcome Member">Welcome Member</option>
                              <option value="Payment Received">Payment Received</option>
                              <option value="Invoice Generated">Invoice Generated</option>
                              <option value="Membership Renewal">Membership Renewal</option>
                              <option value="Fee Due Reminder">Fee Due Reminder</option>
                            </select>
                          </div>

                          <div className="space-y-2 pt-2">
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Substitute Dynamic Variables</span>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-zinc-400">Amount USD:</span>
                                <input
                                  type="text"
                                  value={comVariables.Amount || "1500"}
                                  onChange={(e) => setComVariables(p => ({ ...p, Amount: e.target.value }))}
                                  className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded w-28 text-white focus:outline-none text-right font-mono"
                                />
                              </div>

                              <div className="flex justify-between items-center gap-2">
                                <span className="text-zinc-400">Deadline Due:</span>
                                <input
                                  type="text"
                                  value={comVariables.DueDate || ""}
                                  onChange={(e) => setComVariables(p => ({ ...p, DueDate: e.target.value }))}
                                  className="bg-zinc-900 border border-zinc-805 px-2 py-1 rounded w-28 text-white focus:outline-none text-right font-mono"
                                />
                              </div>

                              <div className="flex justify-between items-center gap-2">
                                <span className="text-zinc-400">Access Plan:</span>
                                <input
                                  type="text"
                                  value={comVariables.MembershipPlan || ""}
                                  onChange={(e) => setComVariables(p => ({ ...p, MembershipPlan: e.target.value }))}
                                  className="bg-zinc-900 border border-zinc-810 px-2 py-1 rounded w-28 text-white focus:outline-none text-right font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const resp = await api.post("/communication/send", {
                                  memberId: selectedMember.id,
                                  category: selectedComTemplate,
                                  variables: comVariables
                                });
                                if (resp.data.whatsappUrl) {
                                  window.open(resp.data.whatsappUrl, "_blank");
                                  reloadProfileSubsets(selectedMember.id);
                                }
                              } catch (e) {
                                alert("Error dispatching sandbox message.");
                              }
                            }}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" /> Dispatch Simulated Template
                          </button>
                        </div>

                        {/* Visual Smartphone Preview Bubble */}
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex flex-col justify-between h-56 relative overflow-hidden font-sans">
                          {/* Top mini Status Bar */}
                          <div className="flex justify-between text-[8px] text-zinc-500 tracking-wider font-mono shrink-0">
                            <span>WhatsApp Platform</span>
                            <span>• Secure Connection</span>
                          </div>

                          {/* Chat bubble body container */}
                          <div className="flex-1 overflow-y-auto py-2 flex items-end">
                            <div className="bg-emerald-500/10 border border-emerald-500/10 text-[11px] text-zinc-300 rounded-2xl rounded-bl-none p-3 max-w-[90%] leading-relaxed">
                              <span className="text-[9px] text-emerald-400 font-mono uppercase block font-bold mb-1">Incoming Message Preview</span>
                              {comTemplates.find(t => t.type === selectedComTemplate) ? (
                                comTemplates.find(t => t.type === selectedComTemplate).bodyText
                                  .replace(/\{\{MemberName\}\}/g, selectedMember.fullName)
                                  .replace(/\{\{GymName\}\}/g, "Elite Fitness Gym")
                                  .replace(/\{\{Amount\}\}/g, comVariables.Amount || "1500")
                                  .replace(/\{\{DueDate\}\}/g, comVariables.DueDate || "Today")
                                  .replace(/\{\{MembershipPlan\}\}/g, comVariables.MembershipPlan || "Assigned Access Pack")
                              ) : (
                                `Hello ${selectedMember.fullName || "User"},\n\nUpdate regarding your account at Elite Fitness Gym.\n\nBest Regards.`
                              )}
                            </div>
                          </div>

                          {/* Mobile visual drawer anchor */}
                          <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mt-1 shrink-0"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Historical communication logs lists */}
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-4 lg:col-span-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" /> Historic message logs
                    </h4>

                    {comMessageLogs.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 font-mono text-[10px]">
                        No dispatch operations logged.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {comMessageLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-900 border border-zinc-855 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-zinc-500">{log.sentAt?.replace("T", " ")?.split(".")[0]}</span>
                              <span className="bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-black uppercase">Sent</span>
                            </div>
                            <div className="text-[10px] font-bold text-amber-500 font-mono">{log.category}</div>
                            <p className="text-zinc-400 text-[10.5px] leading-relaxed font-sans">{log.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
