import React, { useState, useEffect } from "react";
import { 
  Dumbbell, Heart, PlusCircle, Check, X, ShieldAlert, Award, ChevronDown, CheckSquare, RefreshCw, Trash2
} from "lucide-react";
import api from "../services/api";
import { Member } from "../types";

interface WorkoutDietViewProps {
  user: any;
}

export default function WorkoutDietView({ user }: WorkoutDietViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form parameters Workout
  const [exercises, setExercises] = useState<any[]>([
    { name: "Barbell Back Squats", sets: 4, reps: "12, 10, 8, 6", durationMin: 15, notes: "Neutral Spine" }
  ]);
  const [workoutNotes, setWorkoutNotes] = useState("");

  // Form parameters Diet
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [snacks, setSnacks] = useState("");
  const [calories, setCalories] = useState(2500);
  const [proteinGrams, setProteinGrams] = useState(150);
  const [waterIntakeLiters, setWaterIntakeLiters] = useState(3.5);
  const [dietNotes, setDietNotes] = useState("");

  // Member completion ticks
  const [memberTicks, setMemberTicks] = useState<boolean[]>([]);

  // Toggle editor panes
  const [activePane, setActivePane] = useState<"WORKOUT" | "DIET">("WORKOUT");

  async function loadInitialData() {
    setLoading(true);
    try {
      if (user.role === "MEMBER") {
        // Automatically fetch for current session
        const workRes = await api.get(`/workouts/${user.id}`);
        setWorkoutPlan(workRes.data);
        if (workRes.data?.exercises) {
          setMemberTicks(new Array(workRes.data.exercises.length).fill(false));
        }

        const dietRes = await api.get(`/diet/${user.id}`);
        setDietPlan(dietRes.data);
      } else {
        // Coaches get Member list to pick from
        const memRes = await api.get("/members?limit=1000");
        setMembers(memRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load routines database.", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Load plans on selecting Member
  const handleSelectMember = async (mId: string) => {
    setSelectedMemberId(mId);
    if (!mId) return;

    setLoading(true);
    try {
      const workRes = await api.get(`/workouts/${mId}`);
      if (workRes.data) {
        setWorkoutPlan(workRes.data);
        setExercises(workRes.data.exercises || []);
        setWorkoutNotes(workRes.data.notes || "");
      } else {
        setWorkoutPlan(null);
        setExercises([{ name: "Standard Exercise", sets: 3, reps: "12", durationMin: 10, notes: "" }]);
        setWorkoutNotes("");
      }

      const dietRes = await api.get(`/diet/${mId}`);
      if (dietRes.data) {
        setDietPlan(dietRes.data);
        setBreakfast(dietRes.data.meals?.breakfast || "");
        setLunch(dietRes.data.meals?.lunch || "");
        setDinner(dietRes.data.meals?.dinner || "");
        setSnacks(dietRes.data.meals?.snacks || "");
        setCalories(dietRes.data.targets?.calories || 2000);
        setProteinGrams(dietRes.data.targets?.proteinGrams || 120);
        setWaterIntakeLiters(dietRes.data.targets?.waterIntakeLiters || 3.0);
        setDietNotes(dietRes.data.notes || "");
      } else {
        setDietPlan(null);
        setBreakfast("");
        setLunch("");
        setDinner("");
        setSnacks("");
        setCalories(2000);
        setProteinGrams(120);
        setWaterIntakeLiters(3.0);
        setDietNotes("");
      }
    } catch (err) {
      console.error("Err loading chosen user targets.", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExerciseRow = () => {
    setExercises([...exercises, { name: "", sets: 3, reps: "10-12", durationMin: 10, notes: "" }]);
  };

  const handleRemoveExerciseRow = (idx: number) => {
    const list = [...exercises];
    list.splice(idx, 1);
    setExercises(list);
  };

  const handleUpdateExerciseRow = (idx: number, field: string, val: any) => {
    const list = [...exercises];
    list[idx][field] = val;
    setExercises(list);
  };

  // Submit Workout Plan
  const handleSubmitWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert("Selected Member is required to allocate workouts.");
      return;
    }

    try {
      const response = await api.post("/workouts", {
        memberId: selectedMemberId,
        exercises,
        notes: workoutNotes
      });
      alert(response.data.message || "Workout guidelines locked in!");
      handleSelectMember(selectedMemberId);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error compiling workout lines.");
    }
  };

  // Submit Diet Plan
  const handleSubmitDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert("Selected Member is required to allocate nutrition plans.");
      return;
    }

    try {
      const response = await api.post("/diet", {
        memberId: selectedMemberId,
        meals: { breakfast, lunch, dinner, snacks },
        targets: { calories, proteinGrams, waterIntakeLiters },
        notes: dietNotes
      });
      alert(response.data.message || "Diet parameters compiled successfully!");
      handleSelectMember(selectedMemberId);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error registering diet layout.");
    }
  };

  // Member marks workout complete on current session
  const [isDoneSubmitting, setIsDoneSubmitting] = useState(false);
  const handleMarkHistoryCompleted = async () => {
    if (!workoutPlan) return;
    setIsDoneSubmitting(true);
    try {
      await api.post(`/workouts/${workoutPlan.id}/history`, {
        completed: true,
        remarks: "Interactive app checkbox completion stamps."
      });
      alert("Congratulations Champ! Your training history log has been sent to Coach Zara.");
      setMemberTicks(new Array(memberTicks.length).fill(true));
    } catch (err) {
      alert("Error logging workout history lines.");
    } finally {
      setIsDoneSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Central header */}
      <div className="border-b border-zinc-850 pb-4">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
          {user.role === "MEMBER" ? "My Personal Training Desk" : "Workout & Nutrition Architect"}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {user.role === "MEMBER" ? "Mark off completed exercises and check daily nutritional targets." : "Design customized routines and high-protein diet guidelines for physical athletes."}
        </p>
      </div>

      {/* Selector dropdown for Coach/Staff */}
      {user.role !== "MEMBER" && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
          <label className="text-xs font-bold font-mono text-zinc-400 block tracking-wider uppercase">Choose Athlete profile card</label>
          <select
            value={selectedMemberId}
            onChange={(e) => handleSelectMember(e.target.value)}
            className="w-full md:w-96 bg-zinc-950 border border-zinc-800 p-3 text-xs focus:border-amber-500 focus:outline-none text-zinc-300 rounded-lg font-medium"
          >
            <option value="">Select individual member...</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.fullName} ({m.memberId})</option>
            ))}
          </select>
        </div>
      )}

      {/* Double tab switcher */}
      {(user.role === "MEMBER" || selectedMemberId) && (
        <div className="flex border-b border-zinc-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActivePane("WORKOUT")}
            className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activePane === "WORKOUT" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" /> Workout Guidelines
          </button>
          <button
            type="button"
            onClick={() => setActivePane("DIET")}
            className={`py-3 px-5 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activePane === "DIET" ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Nutrition Diet Chart
          </button>
        </div>
      )}

      {/* Main workspace section */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : user.role !== "MEMBER" && !selectedMemberId ? (
        <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500 font-mono text-xs">
          Select an athlete profile card above to define workout or diet guidelines.
        </div>
      ) : (
        <>
          {/* PA1: WORKOUT GUIDELINES SUB PANELS */}
          {activePane === "WORKOUT" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2-Span): Assigning or viewing Exercise Cards */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Exercises List</h3>
                  {user.role !== "MEMBER" && (
                    <button
                      type="button"
                      onClick={handleAddExerciseRow}
                      className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white rounded text-[10px] font-mono font-bold cursor-pointer active:scale-95 transition"
                    >
                      + Add Exercise Row
                    </button>
                  )}
                </div>

                {/* Member Checksheets Tracker or Trainer Forms */}
                {user.role === "MEMBER" ? (
                  !workoutPlan ? (
                    <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                      No progressive workout routine assigned.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workoutPlan.exercises?.map((ex: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                            memberTicks[idx] ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-950 border-zinc-850"
                          }`}
                          onClick={() => {
                            const list = [...memberTicks];
                            list[idx] = !list[idx];
                            setMemberTicks(list);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!memberTicks[idx]}
                            readOnly
                            className="w-4 h-4 rounded border-zinc-800 text-amber-500 focus:ring-transparent mt-1 cursor-pointer shrink-0"
                          />
                          <div className="space-y-1 cursor-pointer">
                            <h4 className={`font-bold text-sm ${memberTicks[idx] ? "line-through text-zinc-500" : "text-white"}`}>
                              {ex.name}
                            </h4>
                            <span className="inline-block text-xs font-mono text-zinc-400">
                              Sets: {ex.sets} • Reps: <span className="text-amber-500 font-bold">{ex.reps}</span> • Duration: {ex.durationMin} minutes
                            </span>
                            <span className="block text-xs text-zinc-500">Coach instruction notes: {ex.notes}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Check-In Completed Button for history log */}
                      <div className="pt-4 border-t border-zinc-800/60 flex justify-end">
                        <button
                          type="button"
                          disabled={isDoneSubmitting || memberTicks.filter(Boolean).length === 0}
                          onClick={handleMarkHistoryCompleted}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-black font-extrabold rounded-xl text-xs active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
                        >
                          Log Workouts Completed
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  // Coach Editor form
                  <form onSubmit={handleSubmitWorkout} className="space-y-4 text-xs">
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {exercises.map((ex, idx) => (
                        <div key={idx} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseRow(idx)}
                            className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-red-400 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-zinc-500">EXERCISE NAME</label>
                              <input
                                type="text"
                                placeholder="E.g. Barbell Squats"
                                value={ex.name}
                                onChange={(e) => handleUpdateExerciseRow(idx, "name", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:border-amber-500 focus:outline-none text-white font-semibold"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-zinc-500">SETS</label>
                                <input
                                  type="number"
                                  placeholder="4"
                                  value={ex.sets}
                                  onChange={(e) => handleUpdateExerciseRow(idx, "sets", parseInt(e.target.value) || 0)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-zinc-500">REPS</label>
                                <input
                                  type="text"
                                  placeholder="12-10-8"
                                  value={ex.reps}
                                  onChange={(e) => handleUpdateExerciseRow(idx, "reps", e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-zinc-500">MINS</label>
                                <input
                                  type="number"
                                  placeholder="15"
                                  value={ex.durationMin}
                                  onChange={(e) => handleUpdateExerciseRow(idx, "durationMin", parseInt(e.target.value) || 0)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold text-zinc-500">EXERCISE TARGET NOTES</label>
                            <input
                              type="text"
                              placeholder="Keep heels planted..."
                              value={ex.notes}
                              onChange={(e) => handleUpdateExerciseRow(idx, "notes", e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-mono font-bold uppercase tracking-wider block mb-1">Workout Overall Guidelines</label>
                      <textarea
                        value={workoutNotes}
                        onChange={(e) => setWorkoutNotes(e.target.value)}
                        placeholder="Progressively overload, stay hydrated with 4L water, limit REST periods to 60s max"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      Assign Workout Guidelines
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Active Coach and History Logs summary */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4 text-xs">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">Rosters Summary</h3>
                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-zinc-500 block">TOTAL MOVEMENT STEPS</span>
                    <span className="text-white font-bold">{exercises.length} Exercises</span>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 text-xs">
                    <span className="text-zinc-500 block uppercase font-mono text-[9px] tracking-widest">History completion logs</span>
                    {workoutPlan?.history?.length === 0 ? (
                      <span className="text-zinc-500 text-[10px] block">No sessions completed yet.</span>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {workoutPlan?.history?.map((h: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-zinc-900">
                            <span className="text-zinc-300 font-sans font-bold">{h.date}</span>
                            <span className="text-emerald-500 font-bold uppercase">Checked OK</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* PA2: DIET CHART SUB PANELS */}
          {activePane === "DIET" && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-805 pb-3">
                <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-emerald-400">Daily Diet Meals target</h3>
                <span className="text-xs text-zinc-400 font-mono">Approved daily metrics</span>
              </div>

              {user.role === "MEMBER" ? (
                !dietPlan ? (
                  <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                    No customized diet meal plan published yet for your account.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div className="md:col-span-2 space-y-4">
                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850">
                        <strong className="text-amber-500 block mb-1">BREAKFAST</strong>
                        <p className="text-zinc-300 text-sm leading-relaxed">{dietPlan.meals?.breakfast}</p>
                      </div>
                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850">
                        <strong className="text-emerald-400 block mb-1">LUNCH MAIN</strong>
                        <p className="text-zinc-300 text-sm leading-relaxed">{dietPlan.meals?.lunch}</p>
                      </div>
                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850">
                        <strong className="text-amber-500 block mb-1">DINNER LATE SUPPER</strong>
                        <p className="text-zinc-300 text-sm leading-relaxed">{dietPlan.meals?.dinner}</p>
                      </div>
                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850">
                        <strong className="text-zinc-400 block mb-1">SNACKS & SHAKES</strong>
                        <p className="text-zinc-300 text-sm leading-relaxed">{dietPlan.meals?.snacks}</p>
                      </div>
                    </div>

                    <div className="space-y-4 font-mono">
                      <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Macros targets</h4>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-500">CALORIES</span>
                          <span className="text-white font-bold">{dietPlan.targets?.calories} kcal</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-500">PROTEIN</span>
                          <span className="text-emerald-400 font-bold">{dietPlan.targets?.proteinGrams}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-500">HYDRATION</span>
                          <span className="text-blue-400 font-bold">{dietPlan.targets?.waterIntakeLiters}L</span>
                        </div>
                      </div>

                      <div className="p-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl text-zinc-400 leading-relaxed text-[11px]">
                        <strong>Additional advice:</strong> {dietPlan.notes}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Trainer editor form
                <form onSubmit={handleSubmitDiet} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-mono font-bold uppercase block mb-1">BREAKFAST MEALS</label>
                      <textarea
                        value={breakfast}
                        onChange={(e) => setBreakfast(e.target.value)}
                        placeholder="4 Egg whites scrambled with spinach, Oatmeal"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none font-medium"
                        required
                      ></textarea>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-mono font-bold uppercase block mb-1">LUNCH MEALS</label>
                      <textarea
                        value={lunch}
                        onChange={(e) => setLunch(e.target.value)}
                        placeholder="200g Grilled Chicken, Steamed Broccoli and brown rice"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none font-medium"
                        required
                      ></textarea>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-mono font-bold uppercase block mb-1">DINNER MEALS</label>
                      <textarea
                        value={dinner}
                        onChange={(e) => setDinner(e.target.value)}
                        placeholder="Baked Salmon fillets with asparagus and sweet potato mash"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none font-medium"
                        required
                      ></textarea>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-mono font-bold uppercase block mb-1">SNACKS & SHAKES</label>
                      <textarea
                        value={snacks}
                        onChange={(e) => setSnacks(e.target.value)}
                        placeholder="Whey protein isolate shake, Handful of almonds"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-20 resize-none font-medium"
                      ></textarea>
                    </div>
                  </div>

                  {/* Calorimetric targets */}
                  <div className="grid grid-cols-3 gap-4 border-t border-b border-zinc-850 py-4 font-mono">
                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold text-[10px] uppercase block tracking-wider">Calories limit (kcal)</label>
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold text-[10px] uppercase block tracking-wider">Protein grams (g)</label>
                      <input
                        type="number"
                        value={proteinGrams}
                        onChange={(e) => setProteinGrams(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-emerald-400 font-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold text-[10px] uppercase block tracking-wider">Water Liters (L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={waterIntakeLiters}
                        onChange={(e) => setWaterIntakeLiters(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-blue-400 font-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-mono font-bold uppercase block mb-1">Coach diet advice notes</label>
                    <textarea
                      value={dietNotes}
                      onChange={(e) => setDietNotes(e.target.value)}
                      placeholder="Cheat meals allowed once in 15 days, sleep 8 Hours daily for cellular repair"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs focus:border-amber-500 focus:outline-none text-white h-16 resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-100 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/5 hover:border-transparent active:scale-95"
                  >
                    Lock Diet Target Plans
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
