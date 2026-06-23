import React, { useState, useEffect } from "react";
import { 
  Dumbbell, Heart, Check, X, ShieldAlert, Award, ChevronDown, CheckSquare, 
  RefreshCw, Trash2, Calendar, FileText, Search, Filter, Printer, Download, 
  Sparkles, User, Plus, Eye, Scale, Activity, Smile, TrendingUp, Info, 
  PlusCircle, LayoutList, ChevronRight, Save, Play, Clock, Flame
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";
import { Member } from "../types";
import { 
  MOCK_EXERCISE_LIBRARY, 
  MOCK_FOOD_DATABASE, 
  PRESET_PLANS, 
  PRESET_DIET_PLANS, 
  ExerciseItem, 
  FoodItem 
} from "./WorkoutDietData";

interface WorkoutDietViewProps {
  user: any;
}

// Visual color configuration
const COLORS = ["#FF7A00", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#F59E0B"];

/**
 * WorkoutDietView
 * A premium Workout & Diet Management module comparable to My PT Hub / Trainerize
 */
export default function WorkoutDietView({ user }: WorkoutDietViewProps) {
  // Common states
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "BUILDER" | "DIET" | "ANALYTICS" | "AI_ZONE">("DASHBOARD");
  
  // Role checks
  const isOwner = user.role === "SUPER_ADMIN" || user.role === "GYM_OWNER";
  const isTrainer = user.role === "TRAINER";
  const isReceptionist = user.role === "RECEPTIONIST";
  const isMember = user.role === "MEMBER";
  
  // If view-only mode
  const isViewOnly = isReceptionist;

  // Active Program Forms & Planner Data
  const [programTitle, setProgramTitle] = useState("Athletic Hypertrophy v1");
  const [programType, setProgramType] = useState("Muscle Gain Plan");
  const [workoutNotes, setWorkoutNotes] = useState("Ensure full range of motion. Complete active stretches pre-workout.");
  const [reviewDate, setReviewDate] = useState("2026-08-30");

  // Daily Schedule Exercises
  // Each day has an array of exercising sequences
  const [schedule, setSchedule] = useState<Record<string, any[]>>({
    Monday: [
      { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", durationMin: 12, notes: "Chest focus", category: "Chest" },
      { name: "Standing Bicep Barbell Curl", sets: 3, reps: "12", durationMin: 8, notes: "Arm isolation", category: "Biceps" }
    ],
    Tuesday: [
      { name: "Barbell Back Squats", sets: 4, reps: "8-12", durationMin: 15, notes: "Power speed", category: "Legs" }
    ],
    Wednesday: [], // Rest Day placeholder/empty
    Thursday: [
      { name: "Wide Grip Lat Pulldown", sets: 4, reps: "12", durationMin: 10, notes: "Back width", category: "Back" }
    ],
    Friday: [
      { name: "Seated Dumbbell Shoulder Press", sets: 3, reps: "10", durationMin: 10, notes: "Shoulders dome", category: "Shoulders" }
    ],
    Saturday: [
      { name: "Treadmill Sprint Intervals (HIIT)", sets: 1, reps: "15 rounds", durationMin: 20, notes: "Metcon", category: "HIIT" }
    ],
    Sunday: [] // Empty
  });

  // Food selection structures
  const [dietCategory, setDietCategory] = useState("Muscle Gain");
  const [dietNotes, setDietNotes] = useState("Drink 4.0L of water daily. Skip refined carbs and soft drinks.");
  const [dietMeals, setDietMeals] = useState<Record<string, any[]>>({
    Breakfast: [
      { name: "Liquid Egg Whites", calories: 48, protein: 11, carbs: 1, fat: 0, servingSize: "100g", qty: 2 },
      { name: "Quick Steel Oats", calories: 154, protein: 6, carbs: 27, fat: 3, servingSize: "40g raw", qty: 1 }
    ],
    "Mid-Morning Snack": [
      { name: "Natural Peanut Butter", calories: 188, protein: 8, carbs: 6, fat: 16, servingSize: "32g (2 tbsp)", qty: 1 }
    ],
    Lunch: [
      { name: "Grilled Chicken Breast (Skinless)", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: "100g cooked", qty: 2 },
      { name: "White Basmati Rice (Steamed)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: "100g", qty: 2 }
    ],
    "Evening Snack": [
      { name: "Raw Unsalted Almonds", calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: "28g", qty: 1 }
    ],
    Dinner: [
      { name: "Baked Scottish Salmon Fillet", calories: 206, protein: 22, carbs: 0, fat: 12, servingSize: "100g cooked", qty: 1.5 },
      { name: "Steamed Asparagus spears", calories: 20, protein: 2.2, carbs: 3.8, fat: 0.1, servingSize: "100g", qty: 1.5 }
    ],
    "Pre-Workout": [
      { name: "Baked Sweet Potato", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: "100g", qty: 1 }
    ],
    "Post-Workout": [
      { name: "Whey Protein Isolate (Scoop)", calories: 120, protein: 25, carbs: 2, fat: 1, servingSize: "30g", qty: 1 }
    ]
  });

  // Target Macros Goals
  const [macroWaterGoal, setMacroWaterGoal] = useState(3.8);

  // Search & Filter conditions
  const [exSearch, setExSearch] = useState("");
  const [exFilterCategory, setExFilterCategory] = useState("");
  const [exFilterDifficulty, setExFilterDifficulty] = useState("");

  const [foodSearch, setFoodSearch] = useState("");
  const [foodFilterCategory, setFoodFilterCategory] = useState("");

  // Member physical progress logs
  const [memberProgressHistory, setMemberProgressHistory] = useState<any[]>([
    { date: "2026-06-01", weight: 84.5, bmi: 25.9, bodyFat: 18.5, waist: 92, status: "Active" },
    { date: "2026-06-10", weight: 83.1, bmi: 25.5, bodyFat: 17.9, waist: 90, status: "Active" },
    { date: "2026-06-20", weight: 82.0, bmi: 25.2, bodyFat: 17.1, waist: 88, status: "Active" }
  ]);

  // Member logging input states (New entry)
  const [newLogWeight, setNewLogWeight] = useState("");
  const [newLogBodyFat, setNewLogBodyFat] = useState("");
  const [newLogWaist, setNewLogWaist] = useState("");
  const [newLogPhotos, setNewLogPhotos] = useState<string>("");

  // AI Zones state
  const [aiGoal, setAiGoal] = useState("Muscle Gain Plan");
  const [aiFocalArea, setAiFocalArea] = useState("Chest and Back");
  const [aiFitnessLevel, setAiFitnessLevel] = useState("Intermediate");
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Print Preview state
  const [showPrintPreview, setShowPrintPreview] = useState<"WORKOUT" | "DIET" | null>(null);

  const showNotification = (message: string, type: "success" | "info" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Drag state trackers
  const [draggedExercise, setDraggedExercise] = useState<ExerciseItem | null>(null);

  // Load initial members and prefill lists
  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      if (!isMember) {
        const memRes = await api.get("/members?limit=1000").catch(() => null);
        if (memRes && memRes.data) {
          setMembers(memRes.data.data || []);
          // Auto select first member if available
          if (memRes.data.data && memRes.data.data.length > 0) {
            handleSelectMember(memRes.data.data[0].id);
          }
        }
      } else {
        // Is member
        setSelectedMemberId(user.id);
        const profileRes = await api.get(`/members/${user.id}`).catch(() => null);
        if (profileRes && profileRes.data) {
          setSelectedMember(profileRes.data);
        }
        await loadMemberActivePlans(user.id);
      }
    } catch (e) {
      console.error("Failed loading ImveloGYM workspaces.", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [user]);

  // Load plans for specific chosen member
  const loadMemberActivePlans = async (mId: string) => {
    setLoading(true);
    try {
      // 1. Fetch workout
      const wRes = await api.get(`/workouts/${mId}`).catch(() => null);
      if (wRes && wRes.data) {
        const p = wRes.data;
        if (p.exercises && Array.isArray(p.exercises)) {
          // Flatten standard exercises back into daily schedules if compatible
          // Or just load them directly. For flexibility we preserve custom day sequences
          // Let's check keys. If schedule empty, we populate
          setWorkoutNotes(p.notes || "");
        }
      }

      // 2. Fetch diet
      const dRes = await api.get(`/diet/${mId}`).catch(() => null);
      if (dRes && dRes.data) {
        const d = dRes.data;
        if (d.meals) {
          // If meals exist, pre-populate
          setDietNotes(d.notes || "");
          if (d.targets) {
            setMacroWaterGoal(d.targets.waterIntakeLiters || 3.5);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load chosen member plans.", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = async (mId: string) => {
    if (!mId) return;
    setSelectedMemberId(mId);
    
    // Find member details
    const found = members.find(m => m.id === mId);
    if (found) {
      setSelectedMember(found);
    } else {
      const response = await api.get(`/members/${mId}`).catch(() => null);
      if (response && response.data) {
        setSelectedMember(response.data);
      }
    }

    await loadMemberActivePlans(mId);
  };

  // Workout Drag-and-Drop Handlers
  const handleDragStartExercise = (e: React.DragEvent, ex: ExerciseItem) => {
    setDraggedExercise(ex);
    e.dataTransfer.setData("text/plain", ex.name);
  };

  const handleDropExerciseToDay = (day: string) => {
    if (!draggedExercise) return;
    if (isViewOnly) {
      showNotification("Receptionists have View-Only access to schedules.", "info");
      return;
    }

    const currentDayExs = [...(schedule[day] || [])];
    currentDayExs.push({
      name: draggedExercise.name,
      sets: draggedExercise.sets,
      reps: draggedExercise.reps,
      durationMin: draggedExercise.durationMin,
      notes: draggedExercise.notes,
      category: draggedExercise.category
    });

    setSchedule({
      ...schedule,
      [day]: currentDayExs
    });

    showNotification(`Added ${draggedExercise.name} to ${day}!`);
    setDraggedExercise(null);
  };

  const handleRemoveScheduledItem = (day: string, idx: number) => {
    if (isViewOnly) return;
    const current = [...(schedule[day] || [])];
    current.splice(idx, 1);
    setSchedule({ ...schedule, [day]: current });
  };

  const handleUpdateScheduledField = (day: string, idx: number, field: string, value: any) => {
    if (isViewOnly) return;
    const current = [...(schedule[day] || [])];
    current[idx] = { ...current[idx], [field]: value };
    setSchedule({ ...schedule, [day]: current });
  };

  // Preset Template Loader Workout
  const handleApplyPresetWorkout = (planId: string) => {
    if (isViewOnly) return;
    const found = PRESET_PLANS.find(p => p.id === planId);
    if (!found) return;

    // Distribute exercises sensibly across Monday, Wednesday, Friday
    const mon = [found.exercises[0]].filter(Boolean);
    const wed = [found.exercises[1]].filter(Boolean);
    const fri = [found.exercises[2]].filter(Boolean);

    setSchedule({
      ...schedule,
      Monday: mon,
      Wednesday: wed,
      Friday: fri,
      Tuesday: [],
      Thursday: [],
      Saturday: [],
      Sunday: []
    });

    setProgramType(found.name);
    setWorkoutNotes(found.description);
    showNotification(`Applied pre-filled ${found.name} template!`);
  };

  // Preset Template Loader Diet
  const handleApplyPresetDiet = (planId: string) => {
    if (isViewOnly) return;
    const found = PRESET_DIET_PLANS.find(p => p.id === planId);
    if (!found) return;

    // Convert string meals to structured food inputs
    const bMeals = [{ name: found.meals.breakfast, calories: found.targets.calories * 0.25, protein: found.targets.proteinGrams * 0.25, carbs: 40, fat: 5, servingSize: "1 Meal", qty: 1 }];
    const lMeals = [{ name: found.meals.lunch, calories: found.targets.calories * 0.35, protein: found.targets.proteinGrams * 0.35, carbs: 55, fat: 8, servingSize: "1 Meal", qty: 1 }];
    const dMeals = [{ name: found.meals.dinner, calories: found.targets.calories * 0.25, protein: found.targets.proteinGrams * 0.25, carbs: 20, fat: 12, servingSize: "1 Meal", qty: 1 }];
    const sMeals = [{ name: found.meals.snacks, calories: found.targets.calories * 0.15, protein: found.targets.proteinGrams * 0.15, carbs: 10, fat: 5, servingSize: "1 Meal", qty: 1 }];

    setDietMeals({
      Breakfast: bMeals,
      "Mid-Morning Snack": [],
      Lunch: lMeals,
      "Evening Snack": sMeals,
      Dinner: dMeals,
      "Pre-Workout": [],
      "Post-Workout": []
    });

    setDietCategory(found.name);
    setMacroWaterGoal(found.targets.waterIntakeLiters);
    setDietNotes(found.notes);
    showNotification(`Applied ${found.name} Diet Template!`);
  };

  // Save changes to Server Database
  const handleSaveWorkoutPlanToServer = async () => {
    if (!selectedMemberId) {
      showNotification("Please select an athlete member profile first.", "error");
      return;
    }

    setLoading(true);
    try {
      // Flatten schedule into backend format
      const flattenedExercises: any[] = [];
      Object.entries(schedule).forEach(([day, exList]) => {
        (exList as any[]).forEach((ex) => {
          flattenedExercises.push({
            name: `${ex.name} (${day})`,
            sets: parseInt(ex.sets) || 3,
            reps: ex.reps || "10-12",
            durationMin: parseInt(ex.durationMin) || 10,
            notes: ex.notes || ""
          });
        });
      });

      const response = await api.post("/workouts", {
        memberId: selectedMemberId,
        exercises: flattenedExercises,
        notes: workoutNotes
      });

      showNotification(response.data.message || "Premium Workout schedule saved!");
    } catch (err: any) {
      showNotification(err.response?.data?.error || "Failed. Could not update workout.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDietPlanToServer = async () => {
    if (!selectedMemberId) {
      showNotification("Please select an athlete member profile first.", "error");
      return;
    }

    setLoading(true);
    try {
      // Prepare consolidated meal targets text
      const breakfastTxt = dietMeals.Breakfast.map(f => `${f.qty}x ${f.name}`).join(", ") || "Custom macros shake";
      const lunchTxt = dietMeals.Lunch.map(f => `${f.qty}x ${f.name}`).join(", ") || "Lean meat and rice";
      const dinnerTxt = dietMeals.Dinner.map(f => `${f.qty}x ${f.name}`).join(", ") || "Grilled fish and greens";
      const snacksTxt = [...dietMeals["Mid-Morning Snack"], ...dietMeals["Evening Snack"], ...dietMeals["Pre-Workout"], ...dietMeals["Post-Workout"]]
        .map(f => `${f.qty}x ${f.name}`).join(", ") || "Whey shaker";

      const targets = calculateTotalMacros();

      const response = await api.post("/diet", {
        memberId: selectedMemberId,
        meals: {
          breakfast: breakfastTxt,
          lunch: lunchTxt,
          dinner: dinnerTxt,
          snacks: snacksTxt
        },
        targets: {
          calories: targets.calories,
          proteinGrams: targets.protein,
          waterIntakeLiters: macroWaterGoal
        },
        notes: dietNotes
      });

      showNotification(response.data.message || "Premium Diet plan saved on cloud database!");
    } catch (err: any) {
      showNotification(err.response?.data?.error || "Failed to log diet map.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add individual food item to meals
  const handleAddFoodToMeal = (mealSlot: string, food: FoodItem) => {
    if (isViewOnly) return;
    const current = [...(dietMeals[mealSlot] || [])];
    
    // Check if food already in slots to update quantity
    const existingIdx = current.findIndex(f => f.name === food.name);
    if (existingIdx > -1) {
      current[existingIdx].qty += 1;
    } else {
      current.push({
        ...food,
        qty: 1
      });
    }

    setDietMeals({
      ...dietMeals,
      [mealSlot]: current
    });
    showNotification(`Added ${food.name} to ${mealSlot}`);
  };

  const handleRemoveFoodFromMeal = (mealSlot: string, index: number) => {
    if (isViewOnly) return;
    const current = [...(dietMeals[mealSlot] || [])];
    current.splice(index, 1);
    setDietMeals({
      ...dietMeals,
      [mealSlot]: current
    });
  };

  // Quick Macro Totals
  const calculateTotalMacros = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    Object.values(dietMeals).forEach((mealList) => {
      (mealList as any[]).forEach((item) => {
        calories += (item.calories || 0) * (item.qty || 1);
        protein += (item.protein || 0) * (item.qty || 1);
        carbs += (item.carbs || 0) * (item.qty || 1);
        fat += (item.fat || 0) * (item.qty || 1);
      });
    });

    return { calories, protein, carbs, fat };
  };

  // Log progress indicators
  const handleAddMeasurementLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogWeight) {
      showNotification("Please specify weight metric.", "error");
      return;
    }

    const weightNum = parseFloat(newLogWeight);
    const fatNum = parseFloat(newLogBodyFat) || 15.0;
    const waistNum = parseFloat(newLogWaist) || 80;

    // Estimate BMI automatically if member height exists (default 175cm if not specified)
    const heightCm = selectedMember?.height || 178;
    const computedBmi = parseFloat((weightNum / Math.pow(heightCm / 100, 2)).toFixed(1));

    const newRow = {
      date: new Date().toISOString().split("T")[0],
      weight: weightNum,
      bmi: computedBmi,
      bodyFat: fatNum,
      waist: waistNum,
      status: "Verified Logs"
    };

    setMemberProgressHistory([newRow, ...memberProgressHistory]);
    setNewLogWeight("");
    setNewLogBodyFat("");
    setNewLogWaist("");
    showNotification("New progress log recorded! Physical charts recalculated.");
  };

  // AI Generation simulation (Under AI personal coach tab)
  const handleTriggerAIGenerator = () => {
    setAiIsGenerating(true);
    setAiResult(null);

    setTimeout(() => {
      // Create specific workout structure depending on AI selection
      const routineResult = {
        goal: aiGoal,
        level: aiFitnessLevel,
        caloriesTarget: aiGoal.includes("Weight Loss") ? 1800 : 3100,
        proteinTarget: aiGoal.includes("Gain") ? 185 : 145,
        schedule: {
          Monday: [
            { name: `AI Custom ${aiFocalArea} Pre-load`, sets: 4, reps: "10", durationMin: 12, notes: "Smart focus dynamic activation" },
            { name: "Axial Compression Press", sets: 3, reps: "8-12", durationMin: 15, notes: "Optimize kinetic track" }
          ],
          Wednesday: [
            { name: "Neuromuscular Hypertrophy Complex", sets: 4, reps: "12", durationMin: 15, notes: "Squeeze thoroughly" }
          ],
          Friday: [
            { name: "High-Calorie Metabolic Burnout", sets: 1, reps: "15 rounds", durationMin: 20, notes: "Metabolic stress trigger" }
          ]
        },
        advice: `Generated using ImveloGYM AI engine for target: ${aiGoal}. Highly advise focused macronutrient profiling and immediate muscle loading with heavy dropsets.`
      };

      setAiResult(routineResult);
      setAiIsGenerating(false);
      showNotification("AI Personalized Routine generated! Click Apply to inject.", "success");
    }, 2800);
  };

  const handleApplyAiGeneratedResult = () => {
    if (!aiResult) return;
    setSchedule({
      ...schedule,
      Monday: aiResult.schedule.Monday || [],
      Wednesday: aiResult.schedule.Wednesday || [],
      Friday: aiResult.schedule.Friday || [],
      Tuesday: [],
      Thursday: [],
      Saturday: [],
      Sunday: []
    });
    setWorkoutNotes(aiResult.advice);
    setActiveTab("BUILDER");
    showNotification("AI Blueprint injected on Workout planner screen!");
  };

  // Consolidated macros
  const currentMacros = calculateTotalMacros();

  // Search Filters for Exercise list
  const filteredExercises = MOCK_EXERCISE_LIBRARY.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(exSearch.toLowerCase()) || 
                          ex.targetMuscles.toLowerCase().includes(exSearch.toLowerCase());
    const matchesCat = exFilterCategory ? ex.category === exFilterCategory : true;
    const matchesDiff = exFilterDifficulty ? ex.difficulty === exFilterDifficulty : true;
    return matchesSearch && matchesCat && matchesDiff;
  });

  // Search Filters for Food list
  const filteredFoods = MOCK_FOOD_DATABASE.filter((food) => {
    const matchesSearch = food.name.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesCat = foodFilterCategory ? food.category === foodFilterCategory : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 text-zinc-100 font-sans print:bg-white print:text-black">
      
      {/* Visual Floating Flash Notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-8 z-[100] px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 backdrop-blur-md text-xs font-mono tracking-wide ${
              notification.type === "error" 
                ? "bg-red-950/90 border-red-500/40 text-red-300" 
                : "bg-[#171717]/90 border-[#FF7A00]/40 text-[#FF7A00]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-ping"></div>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:text-white">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP MODULE EXPLAINER BANNER */}
      <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#FF7A00]/10 to-orange-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#FF7A00] text-black text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">ImveloGYM SaaS Pro</span>
            {isViewOnly && <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-700/60 flex items-center gap-1"><Eye className="w-3 h-3" /> View Only</span>}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-[#FF7A00]" />
            Workout & Nutrition Architect
          </h1>
          <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
            Configure dynamic hypertrophic exercises, calculate precision caloric metrics, and trace client fitness charts. Optimized similarly to Mindbody and Trainerize.
          </p>
        </div>

        {/* Action controls / User Selector */}
        {!isMember && (
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-2 rounded-xl flex items-center gap-3 relative z-10 w-full md:w-auto shrink-0">
            <div className="p-2 bg-zinc-900 rounded-lg">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[9px] font-mono text-[#A0A0A0] block uppercase tracking-wider">Active Client Profile</label>
              <select
                value={selectedMemberId}
                onChange={(e) => handleSelectMember(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-bold text-white focus:outline-none focus:ring-0 pr-8 cursor-pointer"
              >
                <option value="" className="bg-zinc-950 text-zinc-300">Choose member...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="bg-zinc-950 text-zinc-200">
                    {m.fullName} ({m.memberId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isMember && selectedMember && (
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[#FF7A00]/10 rounded-xl flex items-center justify-center border border-[#FF7A00]/20 text-white font-black text-xs">
              M
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#A0A0A0] block uppercase tracking-wide">Logged Athlete</span>
              <span className="text-xs font-extrabold text-[#FF7A00] block">{selectedMember.fullName}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUB-TABS NAVIGATION CONTROLS */}
      <div className="flex bg-[#171717] border border-[#2A2A2A] p-1.5 rounded-xl text-xs font-mono overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab("DASHBOARD")}
          className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "DASHBOARD" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Core Dashboards
        </button>
        
        <button
          onClick={() => setActiveTab("BUILDER")}
          className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "BUILDER" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" /> Workout Planner
        </button>

        <button
          onClick={() => setActiveTab("DIET")}
          className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "DIET" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Heart className="w-3.5 h-3.5" /> Nutrition Engine
        </button>

        <button
          onClick={() => setActiveTab("ANALYTICS")}
          className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "ANALYTICS" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Scale className="w-3.5 h-3.5" /> Progress Logs & Charts
        </button>

        <button
          onClick={() => setActiveTab("AI_ZONE")}
          className={`py-2 px-4 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "AI_ZONE" ? "bg-[#FF7A00]/10 text-[#FF7A00]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Custom Lab
        </button>
      </div>

      {/* 3. CONDITIONAL TABS CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
          <div className="bg-[#171717] h-48 rounded-2xl animate-pulse"></div>
          <div className="bg-[#171717] h-48 rounded-2xl animate-pulse"></div>
          <div className="bg-[#171717] h-48 rounded-2xl animate-pulse"></div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            
            {/* =======================================================
                3.1 CORE DASHBOARD OVERVIEW SECTION
                ======================================================= */}
            {activeTab === "DASHBOARD" && (
              <div className="space-y-6">
                
                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Total Active Workout Plans</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white">48 Plans</span>
                      <span className="text-[10px] text-emerald-500 font-mono">+12% MoM</span>
                    </div>
                  </div>

                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Plans Assigned Today</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-[#FF7A00]">6 Allocations</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
                    </div>
                  </div>

                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Pending Workout Reviews</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-orange-400">3 Members</span>
                      <span className="text-[10px] text-red-400 font-mono">Urgent</span>
                    </div>
                  </div>

                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-mono text-[#A0A0A0] uppercase tracking-wider block">Caloric Targets Assigned</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-emerald-400">92% Compliance</span>
                      <span className="text-[10px] text-emerald-500 font-mono">Optimal</span>
                    </div>
                  </div>

                </div>

                {/* Main Double Dashboard Layout Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column (2-Span): Popular Programs and Performance Charts */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Workout Program Analytics Widget */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-extrabold text-white tracking-tight uppercase font-mono">Most Popular Routine Blueprints</h3>
                          <p className="text-[11px] text-zinc-400">Active distribution inside ImveloGYM roster channels</p>
                        </div>
                        <span className="bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20 text-[10px] font-mono py-1 px-2.5 rounded-md">Weekly Metrics</span>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: "Muscle Gain", athletes: 14, fill: "#FF7A00" },
                            { name: "Weight Loss", athletes: 22, fill: "#10B981" },
                            { name: "Keto Plan", athletes: 6, fill: "#3B82F6" },
                            { name: "Beginner Plan", athletes: 18, fill: "#8B5CF6" },
                            { name: "Senior Longevity", athletes: 9, fill: "#EC4899" }
                          ]}>
                            <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} />
                            <YAxis stroke="#666" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                            <Bar dataKey="athletes" radius={[6, 6, 0, 0]}>
                              {
                                [0,1,2,3,4].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))
                              }
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Trainer Performance Tracker */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <h3 className="text-sm font-extrabold text-white tracking-tight uppercase font-mono">Personal Coach Assignment Load</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse font-mono">
                          <thead>
                            <tr className="border-b border-[#2A2A2A] text-zinc-500 text-[10px]">
                              <th className="py-2.5">TRAINER</th>
                              <th className="py-2.5">ACTIVE PLANS</th>
                              <th className="py-2.5">PENDING REVIEWS</th>
                              <th className="py-2.5">OVERALL COMPLIANCE</th>
                              <th className="py-2.5 text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2A2A2A]/50 text-zinc-300">
                            <tr>
                              <td className="py-3 font-sans font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block"></span>
                                Coach Zara Sterling
                              </td>
                              <td className="py-3">18 Members</td>
                              <td className="py-3">
                                <span className="bg-orange-500/10 text-orange-400 font-bold px-1.5 py-0.5 rounded">2 Pending</span>
                              </td>
                              <td className="py-3 text-emerald-400 font-bold">94% Compliant</td>
                              <td className="py-3 text-right">
                                <button className="text-[#FF7A00] font-bold hover:underline">Inspect</button>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 font-sans font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-[#10B981] rounded-full inline-block"></span>
                                Coach Tyrone Davies
                              </td>
                              <td className="py-3">22 Members</td>
                              <td className="py-3">
                                <span className="text-zinc-500">None</span>
                              </td>
                              <td className="py-3 text-emerald-400 font-bold">89% Compliant</td>
                              <td className="py-3 text-right">
                                <button className="text-[#FF7A00] font-bold hover:underline">Inspect</button>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 font-sans font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
                                Coach Emily Chen
                              </td>
                              <td className="py-3">8 Members</td>
                              <td className="py-3">
                                <span className="bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded">1 Overdue</span>
                              </td>
                              <td className="py-3 text-amber-500 font-bold">81% Compliant</td>
                              <td className="py-3 text-right">
                                <button className="text-[#FF7A00] font-bold hover:underline">Inspect</button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Right Column Details Side Panel: Reviews, target allocations */}
                  <div className="space-y-6">
                    
                    {/* Diet Board targets */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <strong className="text-xs uppercase font-mono tracking-wider text-[#A0A0A0]">Nutrition Analytics</strong>
                        <Heart className="w-4 h-4 text-[#FF7A00]" />
                      </div>
                      
                      <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Core Water Goal Mean</span>
                        <div className="font-bold text-sm text-blue-400">3.8 Liters / day</div>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Consolidated Calories target</span>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white">Target Mean</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">2,450 kcal</span>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-[#171717]/40 border border-zinc-850 rounded-xl space-y-1 text-xs text-zinc-400 italic">
                        "Hydration, high dietary fiber and precise protein density are key to metabolic rate performance."
                      </div>
                    </div>

                    {/* Upcoming Review Sessions */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">Upcoming Review Sessions Calendar</h4>
                      <div className="space-y-3 font-mono">
                        
                        <div className="p-3 bg-zinc-950 rounded-xl space-y-1 relative border-l-2 border-orange-500">
                          <div className="text-[10px] text-zinc-400">June 26, 2026</div>
                          <strong className="text-xs text-white block font-sans">Damian Miller (Intermediate Plan)</strong>
                          <span className="text-[10px] text-zinc-500">Scheduled by Coach Zara</span>
                        </div>

                        <div className="p-3 bg-zinc-950 rounded-xl space-y-1 relative border-l-2 border-emerald-500">
                          <div className="text-[10px] text-zinc-400">June 28, 2026</div>
                          <strong className="text-xs text-white block font-sans">Clara Johansson (Keto Nutrition Plan)</strong>
                          <span className="text-[10px] text-zinc-500">Scheduled by Coach Emily</span>
                        </div>

                        <div className="p-3 bg-zinc-950 rounded-xl space-y-1 relative border-l-2 border-blue-500">
                          <div className="text-[10px] text-zinc-400">July 02, 2026</div>
                          <strong className="text-xs text-white block font-sans">Rajesh Patel (Muscle Gain Plan)</strong>
                          <span className="text-[10px] text-zinc-500">Scheduled by Coach Tyrone</span>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =======================================================
                3.2 WORKOUT PLAN BUILDER - DRAG & DROP PIPELINE
                ======================================================= */}
            {activeTab === "BUILDER" && (
              <div className="space-y-6">
                
                {/* Visual Settings Controls bar */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Program Title</label>
                      <input
                        type="text"
                        value={programTitle}
                        onChange={(e) => setProgramTitle(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white uppercase font-bold focus:border-[#FF7A00] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Apply Preset Template</label>
                      <select
                        onChange={(e) => handleApplyPresetWorkout(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="">Choose preset blueprint...</option>
                        {PRESET_PLANS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Review Due Date</label>
                      <input
                        type="date"
                        value={reviewDate}
                        onChange={(e) => setReviewDate(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setShowPrintPreview("WORKOUT")}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-white flex items-center gap-2 active:scale-95 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Routine
                    </button>
                    <button
                      onClick={handleSaveWorkoutPlanToServer}
                      className="px-5 py-2.5 bg-[#FF7A00] hover:bg-orange-500 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 active:scale-95 transition shadow-lg shadow-orange-500/10 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Plan
                    </button>
                  </div>
                </div>

                {/* Grid Splitter: Workout Scheduler Lanes (Left) VS Exercise Library catalog (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left (2-Span Column): Days of the week scheduling list */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2">
                      <h3 className="text-xs font-extrabold font-mono text-[#FF7A00] uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Weekly Routine Schedule Grid
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">Drag exercises from library and drop into days</span>
                    </div>

                    {/* Schedule lanes Mon-Sun */}
                    <div className="space-y-3">
                      {Object.keys(schedule).map((day) => (
                        <div
                          key={day}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropExerciseToDay(day)}
                          className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 transition-all hover:border-[#FF7A00]/20"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                              {day}
                              {schedule[day].length === 0 && <span className="text-[10px] text-zinc-500 lowercase ml-2 font-normal">(rest day)</span>}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-500">{schedule[day].length} exercises loaded</span>
                          </div>

                          {/* Exercise lists */}
                          {schedule[day].length === 0 ? (
                            <div className="border border-dashed border-[#222] rounded-xl py-4 text-center text-[10px] text-zinc-600 font-mono">
                              Drop exercise here to allocate
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {schedule[day].map((item, idx) => (
                                <div key={idx} className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                  <div className="space-y-1">
                                    <h5 className="text-xs font-bold text-white">{item.name}</h5>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                      <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{item.category}</span>
                                      <span>Sets: <span className="text-[#FF7A00] font-bold">{item.sets}</span></span>
                                      <span>Reps: <span className="text-emerald-400 font-bold">{item.reps}</span></span>
                                      <span>Mins: <span className="text-[#FF7A00] font-bold">{item.durationMin}</span></span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 italic block">Hint: {item.notes || "Standard execution"}</span>
                                  </div>

                                  {/* Delete controller */}
                                  <button
                                    onClick={() => handleRemoveScheduledItem(day, idx)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition self-end md:self-center"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>

                    {/* Overall Notes and text instructions */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-2">
                      <label className="text-xs font-bold text-white uppercase font-mono tracking-wider block">Trainer instructions & progressive overhead guidelines</label>
                      <textarea
                        value={workoutNotes}
                        onChange={(e) => setWorkoutNotes(e.target.value)}
                        placeholder="Progressively overload muscular system. Rest intervals absolute 60s max..."
                        className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-[#FF7A00] focus:outline-none text-white font-medium resize-none"
                      ></textarea>
                    </div>

                  </div>

                  {/* Right (1-Span column): Draggable Exercise Library Panel */}
                  <div className="space-y-4">
                    <div className="border-b border-[#2A2A2A] pb-2">
                      <h3 className="text-xs font-black font-mono uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-[#FF7A00]" />
                        Athlete Exercise Library
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Hold and drag any card onto desired day schedule lane.</p>
                    </div>

                    {/* Search & Filter cards controls */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-3 rounded-2xl space-y-2 text-xs">
                      
                      {/* Search box */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                        <input
                          type="text"
                          value={exSearch}
                          onChange={(e) => setExSearch(e.target.value)}
                          placeholder="Search exercises (Squat, Press...)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 pl-8 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                        />
                      </div>

                      {/* Dropdown Filters */}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={exFilterCategory}
                          onChange={(e) => setExFilterCategory(e.target.value)}
                          className="w-full bg-zinc-950 border border-[#2A2A2A] rounded p-2 text-[11px] text-zinc-300 focus:outline-none"
                        >
                          <option value="">All Categories</option>
                          <option value="Chest">Chest</option>
                          <option value="Back">Back</option>
                          <option value="Shoulders">Shoulders</option>
                          <option value="Biceps">Biceps</option>
                          <option value="Triceps">Triceps</option>
                          <option value="Legs">Legs</option>
                          <option value="Cardio">Cardio</option>
                          <option value="Core">Core</option>
                          <option value="HIIT">HIIT</option>
                        </select>

                        <select
                          value={exFilterDifficulty}
                          onChange={(e) => setExFilterDifficulty(e.target.value)}
                          className="w-full bg-zinc-950 border border-[#2A2A2A] rounded p-2 text-[11px] text-zinc-300 focus:outline-none"
                        >
                          <option value="">All Difficulties</option>
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                    </div>

                    {/* Exercises Listing scrolling area */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filteredExercises.map((ex, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStartExercise(e, ex)}
                          className="bg-[#171717] border border-[#2A2A2A] active:border-[#FF7A00] p-3 rounded-xl cursor-grab active:cursor-grabbing hover:bg-zinc-900 transition-all select-none space-y-2 group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-zinc-800/20 to-transparent pointer-events-none"></div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-extrabold text-white group-hover:text-[#FF7A00] transition-colors">{ex.name}</h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              ex.difficulty === "Beginner" 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : ex.difficulty === "Intermediate" 
                                ? "bg-amber-500/10 text-amber-500" 
                                : "bg-red-500/10 text-red-400"
                            }`}>
                              {ex.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                            <span className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-1 py-0.2 rounded">{ex.category}</span>
                            <span>Target: {ex.targetMuscles}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{ex.description}</p>
                        </div>
                      ))}

                      {filteredExercises.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                          No matching exercises found.
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =======================================================
                3.3 DIET PLAN ENGINE & FOOD CONFIGURATION
                ======================================================= */}
            {activeTab === "DIET" && (
              <div className="space-y-6">
                
                {/* Diet Preset Templates & Top Controls Bar */}
                <div className="bg-[#171717] border border-[#2A2A2A] p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Diet Plan Category</label>
                      <input
                        type="text"
                        value={dietCategory}
                        onChange={(e) => setDietCategory(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white uppercase font-bold focus:border-[#FF7A00] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Load Preset Diet Template</label>
                      <select
                        onChange={(e) => handleApplyPresetDiet(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="">Choose blueprint diet preset...</option>
                        {PRESET_DIET_PLANS.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-[#A0A0A0] uppercase block">Daily Hydration Target (L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={macroWaterGoal}
                        onChange={(e) => setMacroWaterGoal(parseFloat(e.target.value) || 3.0)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white uppercase focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setShowPrintPreview("DIET")}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-xs font-bold text-white flex items-center gap-2 active:scale-95 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Diet
                    </button>
                    <button
                      onClick={handleSaveDietPlanToServer}
                      className="px-5 py-2.5 bg-[#FF7A00] hover:bg-orange-500 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 active:scale-95 transition shadow-lg shadow-orange-500/10 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Diet
                    </button>
                  </div>
                </div>

                {/* Macrometric Goal Real-time Calculation Panel banner */}
                <div className="bg-[#171717]/80 border border-[#2A2A2A] rounded-2xl p-5 flex flex-wrap gap-6 justify-between items-center relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="space-y-1 relative z-10">
                    <strong className="text-xs font-mono uppercase text-[#A0A0A0] tracking-wide block">Real-time Consolidation Targets</strong>
                    <p className="text-[10px] text-zinc-400 leading-normal">Total nutritional sum computed instantly based on added ingredients.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10 font-mono text-center">
                    
                    <div className="px-5 py-2 bg-zinc-950/80 border border-zinc-850 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold">CALORIES SUMMARY</span>
                      <strong className="text-xl text-white font-black">{currentMacros.calories.toFixed(0)} <span className="text-xs text-zinc-500">kcal</span></strong>
                    </div>

                    <div className="px-5 py-2 bg-zinc-950/80 border border-zinc-850 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold text-emerald-400">PROTEIN</span>
                      <strong className="text-xl text-emerald-400 font-black">{currentMacros.protein.toFixed(0)} <span className="text-xs text-zinc-500">g</span></strong>
                    </div>

                    <div className="px-5 py-2 bg-zinc-950/80 border border-zinc-850 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold text-blue-400">CARBOHYDRATES</span>
                      <strong className="text-xl text-blue-400 font-black">{currentMacros.carbs.toFixed(0)} <span className="text-xs text-zinc-500">g</span></strong>
                    </div>

                    <div className="px-5 py-2 bg-zinc-950/80 border border-zinc-850 rounded-xl">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold text-pink-400">FAT SUMMARY</span>
                      <strong className="text-xl text-pink-400 font-black">{currentMacros.fat.toFixed(0)} <span className="text-xs text-zinc-500">g</span></strong>
                    </div>

                  </div>
                </div>

                {/* Diet Grid Layout: Meal Slots Planner (Left) VS Food Library (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left (2-Span Column): Slotted meals planner */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-black font-mono text-emerald-400 uppercase tracking-widest pl-1">Consolidated Diet Meal Structure Slots</h3>
                    
                    <div className="space-y-3">
                      {Object.keys(dietMeals).map((mealSlot) => (
                        <div key={mealSlot} className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                              {mealSlot}
                              {dietMeals[mealSlot].length === 0 && <span className="text-[10px] text-zinc-500 ml-2 lowercase font-normal">(empty slot)</span>}
                            </h4>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Subtotal: {dietMeals[mealSlot].reduce((acc, current) => acc + current.calories * current.qty, 0).toFixed(0)} kcal
                            </span>
                          </div>

                          {/* Consumed food list */}
                          {dietMeals[mealSlot].length === 0 ? (
                            <div className="border border-dashed border-[#222] rounded-xl py-3 text-center text-[10px] text-zinc-600 font-mono">
                              Click "+" button in Food Database to load ingredients
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {dietMeals[mealSlot].map((item, idx) => (
                                <div key={idx} className="bg-zinc-950 border border-zinc-850 px-3 py-2 rounded-xl flex justify-between items-center gap-3 text-xs">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-white block truncate">{item.qty}x {item.name}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      Serving: {item.servingSize} • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <span className="text-[11px] font-bold text-emerald-400 font-mono">{(item.calories * item.qty).toFixed(0)} kcal</span>
                                    <button
                                      onClick={() => handleRemoveFoodFromMeal(mealSlot, idx)}
                                      className="p-1 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-red-400"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>

                    {/* Overall Notes and text layout */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-2">
                      <label className="text-xs font-bold text-white uppercase font-mono tracking-wider block">Additional Coach nutritional warnings & guidelines</label>
                      <textarea
                        value={dietNotes}
                        onChange={(e) => setDietNotes(e.target.value)}
                        placeholder="cheat meals strictly limited. Stay clear of processed sugar..."
                        className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:border-[#FF7A00] focus:outline-none text-white font-medium resize-none"
                      ></textarea>
                    </div>

                  </div>

                  {/* Right (1-Span Column): Searchable Food Database Catalog */}
                  <div className="space-y-4">
                    <div className="border-b border-[#2A2A2A] pb-2">
                      <h3 className="text-xs font-black font-mono uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-emerald-400" />
                        ImveloGYM Food Database
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Select meal slot and add items below.</p>
                    </div>

                    {/* Active target meal slot select */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-4 rounded-2xl space-y-2 text-xs">
                      
                      {/* Search box */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                        <input
                          type="text"
                          value={foodSearch}
                          onChange={(e) => setFoodSearch(e.target.value)}
                          placeholder="Search foods (Oats, Beef, Chicken...)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 pl-8 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                        />
                      </div>

                      {/* Filter category */}
                      <select
                        value={foodFilterCategory}
                        onChange={(e) => setFoodFilterCategory(e.target.value)}
                        className="w-full bg-zinc-950 border border-[#2A2A2A] rounded p-2 text-[11px] text-zinc-300 focus:outline-none"
                      >
                        <option value="">All Diet Meal Slots</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Post-Workout">Post-Workout</option>
                        <option value="Pre-Workout">Pre-Workout</option>
                        <option value="Evening Snack">Evening Snack</option>
                      </select>

                    </div>

                    {/* Food Listing Section */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filteredFoods.map((food, idx) => (
                        <div key={idx} className="bg-[#171717] border border-[#2A2A2A] p-3 rounded-xl hover:bg-zinc-900 transition-all flex justify-between items-center gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="font-extrabold text-white block">{food.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              Unit: {food.servingSize} • Cal: {food.calories}kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                            </span>
                          </div>

                          {/* Quick add triggers buttons for each active slot */}
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => {
                                // Default to a smart meal slot depending on choice or Breakfast
                                const slot = foodFilterCategory || food.category || "Breakfast";
                                handleAddFoodToMeal(slot, food);
                              }}
                              className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-md text-[10px]"
                              title={`Add to Slot`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredFoods.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                          No matching foods indexed yet.
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =======================================================
                3.4 ATHLETE PROGRESS LOGS & ANALYTICS CHARTS
                ======================================================= */}
            {activeTab === "ANALYTICS" && (
              <div className="space-y-6">
                
                {/* Visual logs input and tracking panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left (1-Span column): Logging panel */}
                  <div className="bg-[#171717] border border-[#2A2A2A] p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">Log Physical Measurements</h3>
                    
                    <form onSubmit={handleAddMeasurementLog} className="space-y-3 font-mono text-xs">
                      
                      <div className="space-y-1">
                        <label className="text-zinc-400 uppercase text-[9px] block">Weight (kg) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 82.5"
                          value={newLogWeight}
                          onChange={(e) => setNewLogWeight(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 uppercase text-[9px] block">Body Fat Percentage (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 15.4"
                          value={newLogBodyFat}
                          onChange={(e) => setNewLogBodyFat(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 uppercase text-[9px] block">Waistline (cm)</label>
                        <input
                          type="number"
                          step="1"
                          placeholder="e.g. 84"
                          value={newLogWaist}
                          onChange={(e) => setNewLogWaist(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-500 uppercase text-[9px] block">Progress Snapshot Photo File</label>
                        <div className="border border-dashed border-[#2A2A2A] rounded-xl p-4 text-center text-[10px] text-zinc-500 relative cursor-pointer hover:border-[#FF7A00] transition-colors">
                          📷 Drop Photo files here or click
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={() => showNotification("Progress photo loaded successfully!")}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-[#FF7A00] hover:bg-orange-500 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        Submit Performance Record
                      </button>

                    </form>
                  </div>

                  {/* Right (2-Span Column): Analytics graphs using Recharts */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Weight reduction scale chart */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">Weight & Waistline Progress Chart</h4>
                          <span className="text-[10px] text-zinc-500 font-mono">Real-time trend analysis tracking</span>
                        </div>
                        <TrendingUp className="w-5 h-5 text-[#FF7A00]" />
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[...memberProgressHistory].reverse()}>
                            <defs>
                              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                            <XAxis dataKey="date" stroke="#666" fontSize={11} />
                            <YAxis stroke="#666" fontSize={11} domain={["auto", "auto"]} />
                            <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                            <Area type="monotone" dataKey="weight" stroke="#FF7A00" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2.5} name="Weight (kg)" />
                            <Area type="monotone" dataKey="waist" stroke="#3B82F6" fillOpacity={0} strokeWidth={2} name="Waist (cm)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Progress History List table */}
                    <div className="bg-[#171717] border border-[#2A2A2A] p-6 rounded-2xl space-y-4">
                      <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">History Performance Logs</h4>
                      
                      <div className="overflow-x-auto text-xs text-left font-mono">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[#2A2A2A] text-zinc-500 text-[10px]">
                              <th className="py-2">RECORD DATE</th>
                              <th className="py-2">ATHLETE WEIGHT</th>
                              <th className="py-2">CALCULATED BMI</th>
                              <th className="py-2">BODY FAT %</th>
                              <th className="py-2">WAISTLINE</th>
                              <th className="py-2 text-right">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2A2A2A]/40 text-zinc-300">
                            {memberProgressHistory.map((item, index) => (
                              <tr key={index}>
                                <td className="py-3 font-sans font-bold text-white">{item.date}</td>
                                <td className="py-3">{item.weight} kg</td>
                                <td className="py-3">{item.bmi} kg/m²</td>
                                <td className="py-3 text-red-400">{item.bodyFat}%</td>
                                <td className="py-3">{item.waist} cm</td>
                                <td className="py-3 text-right">
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold py-0.5 px-2 rounded-full uppercase">
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =======================================================
                3.5 GEN AI SMART LAB ZONE
                ======================================================= */}
            {activeTab === "AI_ZONE" && (
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Visual Glassmorphism AI generator */}
                <div className="bg-gradient-to-br from-[#171717] to-zinc-950 border border-[#FF7A00]/20 rounded-3xl p-8 space-y-6 relative overflow-hidden text-center shadow-[0_10px_40px_rgba(255,122,0,0.05)]">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="space-y-3 max-w-xl mx-auto">
                    <div className="inline-flex py-1 px-3 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-full text-[#FF7A00] text-[10px] uppercase font-mono tracking-widest font-black">
                      🧬 Google Gemini 2.0 Tech Preview
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight">AI Kinetic & Nutritional Generator</h2>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Leverage advanced context weight models, biological profiling databases, and athletic sore vectors to map ideal progress routines instantly.
                    </p>
                  </div>

                  {/* Settings selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-left max-w-2xl mx-auto">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase text-[9px]">Athlete Target Goal</label>
                      <select
                        value={aiGoal}
                        onChange={(e) => setAiGoal(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#FF7A00]"
                      >
                        <option value="Muscle Gain Plan">Muscle Gain Plan</option>
                        <option value="Weight Loss Plan">Weight Loss Plan</option>
                        <option value="Strength Plan">Strength Plan</option>
                        <option value="Keto Balance Plan">Keto Balance Plan</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase text-[9px]">Anatomical Focus Area</label>
                      <select
                        value={aiFocalArea}
                        onChange={(e) => setAiFocalArea(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#FF7A00]"
                      >
                        <option value="Chest and Back">Chest and Back</option>
                        <option value="Legs and Core">Legs and Core</option>
                        <option value="Shoulders and Arms">Shoulders and Arms</option>
                        <option value="Full Body Cardio">Full Body Cardio</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-bold uppercase text-[9px]">Athlete Experience</label>
                      <select
                        value={aiFitnessLevel}
                        onChange={(e) => setAiFitnessLevel(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#FF7A00]"
                      >
                        <option value="Beginner">Beginner Level</option>
                        <option value="Intermediate">Intermediate Level</option>
                        <option value="Advanced">Advanced Pro Athlete</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 max-w-sm mx-auto">
                    <button
                      type="button"
                      disabled={aiIsGenerating}
                      onClick={handleTriggerAIGenerator}
                      className="w-full py-3 bg-[#FF7A00] disabled:bg-zinc-800 hover:bg-orange-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-orange-500/20"
                    >
                      {aiIsGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Stream-Mapping Kinematics...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Synthesize AI Blueprint
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-zinc-500 mt-2 block font-mono">Processes ~14k biological vectors</span>
                  </div>

                </div>

                {/* AI generated result visual display */}
                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#171717] border border-orange-500/20 rounded-3xl p-6 space-y-4"
                    >
                      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-[#FF7A00] rounded-full inline-block animate-pulse"></span>
                          <strong className="text-xs font-mono uppercase text-white tracking-widest">Generated AI Blueprint Routines</strong>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">Synthesis complete</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                        <div className="p-3 bg-zinc-950 rounded-xl">
                          <span className="text-zinc-500 block uppercase font-bold text-[9px]">TARGET CALORIES</span>
                          <strong className="text-white text-base">{aiResult.caloriesTarget} kcal / day</strong>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl">
                          <span className="text-zinc-500 block uppercase font-bold text-[9px]">PROTEIN BASE</span>
                          <strong className="text-emerald-400 text-base">{aiResult.proteinTarget} grams</strong>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl">
                          <span className="text-zinc-500 block uppercase font-bold text-[9px]">COMPLEX CATEGORIES</span>
                          <strong className="text-white text-base">3 Heavy days</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-mono uppercase text-[#A0A0A0] tracking-wider block">Generated Scheduled Exercises</span>
                        <div className="space-y-1">
                          {Object.entries(aiResult.schedule).map(([day, list]: any) => (
                            <div key={day} className="p-2 bg-zinc-950/60 rounded-lg flex justify-between text-xs font-mono select-none">
                              <span className="text-white font-bold">{day}:</span>
                              <span className="text-zinc-300 font-sans">{list.map((e: any) => e.name).join(" + ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-zinc-950/70 border-l border-[#FF7A00]/40 p-3 rounded-lg text-xs leading-relaxed text-zinc-400 italic">
                        <strong>AI coach notes:</strong> {aiResult.advice}
                      </div>

                      <div className="pt-3 border-t border-[#2A2A2A] flex justify-end">
                        <button
                          onClick={handleApplyAiGeneratedResult}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition"
                        >
                          <Check className="w-4 h-4" /> Inject Routine into Builder
                        </button>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}

      {/* =======================================================
          4. PRINT PREVIEW MODAL SCREEN (CSS Print Layer)
          ======================================================= */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col justify-between p-6 md:p-12 overflow-y-auto font-sans text-white">
          <div className="max-w-3xl mx-auto w-full space-y-8 bg-zinc-900 p-8 md:p-12 rounded-3xl border border-zinc-800 shadow-2xl relative">
            
            {/* Top Close handle bar */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="p-2 bg-emerald-500 text-black font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" /> Trigger System Print
              </button>
              <button
                onClick={() => setShowPrintPreview(null)}
                className="p-2 bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg text-xs"
              >
                &times; Close Preview
              </button>
            </div>

            {/* Print Header */}
            <div className="text-center pb-6 border-b border-zinc-800 space-y-2">
              <span className="text-xs uppercase font-mono tracking-widest text-[#FF7A00]">ImveloGYM Athletic Blueprint</span>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                {showPrintPreview === "WORKOUT" ? "Workout Routine Guide" : "Personalized Nutrition Map"}
              </h2>
              {selectedMember && (
                <div className="text-zinc-400 text-sm font-semibold">
                  Prepared For: <span className="text-white">{selectedMember.fullName}</span> ({selectedMember.memberId}) • Date: {new Date().toISOString().split("T")[0]}
                </div>
              )}
            </div>

            {/* Condition WORKOUT Plan layout */}
            {showPrintPreview === "WORKOUT" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(schedule).map(([day, exercisesList]) => {
                    const list = exercisesList as any[];
                    return (
                      <div key={day} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                        <h4 className="text-base font-bold font-mono text-[#FF7A00] uppercase mb-2">{day}</h4>
                        {list.length === 0 ? (
                          <span className="text-xs text-zinc-500 font-mono italic">Rest and muscular recovery day</span>
                        ) : (
                          <div className="space-y-2">
                            {list.map((ex, idx) => (
                              <div key={idx} className="text-xs border-b border-zinc-900 pb-2 flex justify-between items-center">
                                <div>
                                  <strong className="text-white block">{ex.name}</strong>
                                  <span className="text-zinc-500">Sets: {ex.sets} • Reps: {ex.reps} • Mins: {ex.durationMin}</span>
                                </div>
                                <span className="text-zinc-400 italic text-[11px]">Note: {ex.notes}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
                  <strong className="text-[#FF7A00] block mb-1 uppercase font-mono">Special Coach Guidelines:</strong>
                  <p className="text-zinc-400 italic">{workoutNotes}</p>
                </div>
              </div>
            )}

            {/* Condition DIET Nutrition layout */}
            {showPrintPreview === "DIET" && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4 text-center font-mono">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">DAILY CALORIES</span>
                    <strong className="text-lg text-emerald-400">{currentMacros.calories.toFixed(0)} kcal</strong>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">PROTEIN BUDGET</span>
                    <strong className="text-lg text-[#FF7A00]">{currentMacros.protein.toFixed(0)} grams</strong>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(dietMeals).map(([slot, foodsList]) => {
                    const list = foodsList as any[];
                    return (
                      <div key={slot} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                        <h4 className="text-base font-bold font-mono text-emerald-400 uppercase mb-2">{slot}</h4>
                        {list.length === 0 ? (
                          <span className="text-xs text-zinc-500 font-mono italic">No items customized</span>
                        ) : (
                          <div className="space-y-2">
                            {list.map((food, idx) => (
                              <div key={idx} className="text-xs border-b border-zinc-900 pb-2 flex justify-between items-center">
                                <div>
                                  <strong className="text-white block">{food.qty}x {food.name}</strong>
                                  <span className="text-zinc-500">Serving: {food.servingSize} • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g</span>
                                </div>
                                <span className="text-emerald-400 font-bold font-mono">{(food.calories * food.qty).toFixed(0)} kcal</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
                  <strong className="text-[#FF7A00] block mb-1 uppercase font-mono">Coach Diet Guidelines notes:</strong>
                  <p className="text-zinc-400 italic">{dietNotes}</p>
                </div>
              </div>
            )}

            {/* Footer and Sign Off */}
            <div className="text-center pt-6 border-t border-zinc-800 text-xs font-mono text-zinc-500">
              ImveloGYM &bull; Premium Gym Enterprise Systems &bull; Powered by Antigravity CRM
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
