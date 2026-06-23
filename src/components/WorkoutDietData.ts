export interface ExerciseItem {
  name: string;
  category: "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs" | "Cardio" | "Core" | "Functional" | "CrossFit" | "HIIT" | "Custom";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  targetMuscles: string;
  description: string;
  instructions: string;
  sets: number;
  reps: string;
  restTime: string;
  durationMin: number;
  videoUrl?: string;
  demoImage?: string;
  notes: string;
}

export interface FoodItem {
  name: string;
  calories: number; // kcal
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  servingSize: string;
  category: "Breakfast" | "Mid-Morning" | "Lunch" | "Evening Snack" | "Dinner" | "Pre-Workout" | "Post-Workout" | "Other";
}

export const MOCK_EXERCISE_LIBRARY: ExerciseItem[] = [
  {
    name: "Barbell Back Squats",
    category: "Legs",
    difficulty: "Intermediate",
    targetMuscles: "Quadriceps, Glutes, Hamstrings",
    description: "The king of lower body movements, focusing on core tightness and depth.",
    instructions: "Rest barbell on trapezius, stand feet shoulder-width, squat down until thighs are parallel to ground, drive through heels to return upright.",
    sets: 4,
    reps: "8-12 reps",
    restTime: "90s",
    durationMin: 12,
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMMwg",
    demoImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=200",
    notes: "Ensure heels remain firmly planted on the gym floor."
  },
  {
    name: "Incline Dumbbell Press",
    category: "Chest",
    difficulty: "Intermediate",
    targetMuscles: "Upper Pectoralis Major, Anterior Deltoids, Triceps",
    description: "An angled bench press focusing on the upper chest fibers.",
    instructions: "Set bench to 30-45 degree angle. Hold dumbbells at shoulder level, press vertically overhead with control, slowly descend back to chest.",
    sets: 3,
    reps: "10-12 reps",
    restTime: "60s",
    durationMin: 10,
    videoUrl: "https://www.youtube.com/watch?v=8iP_HC44Y7s",
    notes: "Squeeze the upper chest at the peak of contraction."
  },
  {
    name: "Wide Grip Lat Pulldown",
    category: "Back",
    difficulty: "Beginner",
    targetMuscles: "Latissimus Dorsi, Teres Major, Biceps",
    description: "A machine exercise targeting upper back width and posture correction.",
    instructions: "Sit securely, grasp lat bar with a wide pronated grip. Pull bar down gracefully to upper chest level, engage shoulder blades, return under resistance.",
    sets: 4,
    reps: "12 reps",
    restTime: "60s",
    durationMin: 10,
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    notes: "Avoid swinging the waist; pull exclusively using back muscles."
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    category: "Shoulders",
    difficulty: "Beginner",
    targetMuscles: "Anterior Deltoids, Lateral Deltoids, Triceps",
    description: "Direct vertical shoulder loading to build overhead stability.",
    instructions: "Sit upright on heavy utility bench, hold bells beside ears, press both weights smoothly overhead until arms are nearly straight.",
    sets: 3,
    reps: "10 reps",
    restTime: "75s",
    durationMin: 8,
    videoUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog",
    notes: "Keep lower back aligned with the pad; do not arch aggressively."
  },
  {
    name: "Standing Bicep Barbell Curl",
    category: "Biceps",
    difficulty: "Beginner",
    targetMuscles: "Biceps Brachii, Brachialis",
    description: "Classic movement for peak biceps conditioning.",
    instructions: "Stand erect holding barbell with underhand shoulder-width grip, curl bar toward shoulders by contracting biceps only.",
    sets: 3,
    reps: "12 reps",
    restTime: "60s",
    durationMin: 8,
    notes: "Do not let elbows drift forward; maintain rigid shoulder posture."
  },
  {
    name: "Tricep Pushdowns (Cable Rope)",
    category: "Triceps",
    difficulty: "Beginner",
    targetMuscles: "Triceps Brachii (Lateral & Medial heads)",
    description: "Rigid isolation of the posterior arm extensions.",
    instructions: "Grasp rope attachments on high pulley. Stand with athletic lean, flare rope ends outward while completely straightening elbows downward.",
    sets: 3,
    reps: "15 reps",
    restTime: "60s",
    durationMin: 8,
    notes: "Pin shoulders down and backward; keep elbows close to your torso."
  },
  {
    name: "Hanging Leg Raises",
    category: "Core",
    difficulty: "Advanced",
    targetMuscles: "Rectus Abdominis, Iliopsoas (Hip Flexors)",
    description: "High intensity lower abdominal pull and grip conditioner.",
    instructions: "Hang from pull-up bar, keep legs straight or slightly soft, raise feet up to 90 degrees using purely abdominal force.",
    sets: 3,
    reps: "12-15 reps",
    restTime: "60s",
    durationMin: 6,
    notes: "Control the descent to eliminate pendulum momentum."
  },
  {
    name: "Kettlebell Swing",
    category: "Functional",
    difficulty: "Intermediate",
    targetMuscles: "Gluteus Maximus, Hamstrings, Spinal Erectors",
    description: "Dynamic ballistic movement targeting core and posterior chain power.",
    instructions: "Stand shoulder-width over bell, hinge at hips while grabbing handle, swing bell backward between legs, then snap hips forward to pop it to chest height.",
    sets: 4,
    reps: "20 swings",
    restTime: "60s",
    durationMin: 10,
    notes: "This is a hip hinge movement, NOT a traditional leg squat!"
  },
  {
    name: "Treadmill Sprint Intervals (HIIT)",
    category: "HIIT",
    difficulty: "Advanced",
    targetMuscles: "Cardiovascular Engine, Quads, Calves",
    description: "High intensity sprint routines calculated to burn visceral fat.",
    instructions: "Warm up for 3 mins. Alternate 30 seconds of maximum speed sprinting with 60 seconds of light recovery walking. Repeat 10-15 rounds.",
    sets: 1,
    reps: "15 rounds",
    restTime: "60s",
    durationMin: 20,
    notes: "Maintain erect sprint form and focus on controlled breathing."
  },
  {
    name: "Abdominal Planks",
    category: "Core",
    difficulty: "Beginner",
    targetMuscles: "Transversus Abdominis, Multifidus",
    description: "Isometric core integration designed to protect lower vertebral disks.",
    instructions: "Balance weight on forearms and toes, maintain flat table back profile, contract belly button inward towards spine.",
    sets: 3,
    reps: "60 seconds",
    restTime: "45s",
    durationMin: 5,
    notes: "Do not let hips sag or protrude upward during hold intervals."
  }
];

export const MOCK_FOOD_DATABASE: FoodItem[] = [
  { name: "Liquid Egg Whites", calories: 48, protein: 11, carbs: 1, fat: 0, servingSize: "100g", category: "Breakfast" },
  { name: "Quick Steel Oats", calories: 154, protein: 6, carbs: 27, fat: 3, servingSize: "40g raw", category: "Breakfast" },
  { name: "Grilled Chicken Breast (Skinless)", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: "100g cooked", category: "Lunch" },
  { name: "Baked Scottish Salmon Fillet", calories: 206, protein: 22, carbs: 0, fat: 12, servingSize: "100g cooked", category: "Dinner" },
  { name: "Whey Protein Isolate (Scoop)", calories: 120, protein: 25, carbs: 2, fat: 1, servingSize: "30g", category: "Post-Workout" },
  { name: "White Basmati Rice (Steamed)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: "100g", category: "Lunch" },
  { name: "Organic Brown Rice", calories: 112, protein: 2.5, carbs: 23, fat: 0.8, servingSize: "100g", category: "Lunch" },
  { name: "Raw Unsalted Almonds", calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: "28g", category: "Evening Snack" },
  { name: "Baked Sweet Potato", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: "100g", category: "Pre-Workout" },
  { name: "Natural Peanut Butter", calories: 188, protein: 8, carbs: 6, fat: 16, servingSize: "32g (2 tbsp)", category: "Mid-Morning" },
  { name: "Low-Fat Greek Yogurt (Plain)", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: "100g", category: "Breakfast" },
  { name: "Lean Grass-Fed Beef Mince", calories: 176, protein: 24, carbs: 0, fat: 9, servingSize: "100g", category: "Dinner" },
  { name: "Steamed Asparagus spears", calories: 20, protein: 2.2, carbs: 3.8, fat: 0.1, servingSize: "100g", category: "Dinner" },
  { name: "Post-Workout Cream of Rice", calories: 180, protein: 3.5, carbs: 40, fat: 0.5, servingSize: "50g dry", category: "Post-Workout" },
  { name: "Pre-Workout Black Coffee & Honey", calories: 64, protein: 0, carbs: 17, fat: 0, servingSize: "1 mug", category: "Pre-Workout" }
];

export const PRESET_PLANS = [
  {
    id: "p1",
    name: "Beginner Plan",
    description: "Gentle introductory circuit plan focusing on foundational motor movements and postural resilience.",
    exercises: [
      { name: "Wide Grip Lat Pulldown", sets: 3, reps: "12 reps", durationMin: 10, notes: "Postural recovery" },
      { name: "Standing Bicep Barbell Curl", sets: 3, reps: "12 reps", durationMin: 8, notes: "Keep elbows pinned" },
      { name: "Abdominal Planks", sets: 3, reps: "60 seconds", durationMin: 5, notes: "Squeeze lower abs" }
    ]
  },
  {
    id: "p2",
    name: "Weight Loss Plan",
    description: "High calorie burner using intense multi-joint compound routines paired with high intensity cardio intervals.",
    exercises: [
      { name: "Barbell Back Squats", sets: 4, reps: "15 reps", durationMin: 12, notes: "Keep tempo active" },
      { name: "Kettlebell Swing", sets: 4, reps: "20 swings", durationMin: 10, notes: "Explosive thrusts" },
      { name: "Treadmill Sprint Intervals (HIIT)", sets: 1, reps: "15 rounds", durationMin: 20, notes: "Sprints" }
    ]
  },
  {
    id: "p3",
    name: "Muscle Gain Plan",
    description: "Traditional hypertrophy structure with progressive overload principles and high focal volume.",
    exercises: [
      { name: "Barbell Back Squats", sets: 4, reps: "8-12 reps", durationMin: 12, notes: "Deep reps with slow eccentric hold" },
      { name: "Incline Dumbbell Press", sets: 4, reps: "10-12 reps", durationMin: 10, notes: "Maximize pump on upper chest" },
      { name: "Wide Grip Lat Pulldown", sets: 4, reps: "10-12 reps", durationMin: 12, notes: "Pull with elbows" }
    ]
  },
  {
    id: "p4",
    name: "Strength Plan",
    description: "Neurological strength template mapping heavy axial loads (1-5 rep range) and long rest cycles.",
    exercises: [
      { name: "Barbell Back Squats", sets: 5, reps: "5 reps", durationMin: 15, notes: "Warm up properly. Rest 3 mins between sets" },
      { name: "Incline Dumbbell Press", sets: 5, reps: "5 reps", durationMin: 12, notes: "Heavy loading safely" }
    ]
  },
  {
    id: "p5",
    name: "Women Fitness Plan",
    description: "Focused conditioning map highlighting glute dynamics, shoulders, and core balance metrics.",
    exercises: [
      { name: "Kettlebell Swing", sets: 4, reps: "15 swings", durationMin: 10, notes: "Glute focus" },
      { name: "Wide Grip Lat Pulldown", sets: 3, reps: "12 reps", durationMin: 8, notes: "Control descent" },
      { name: "Abdominal Planks", sets: 3, reps: "60 seconds", durationMin: 5, notes: "Stiff posture" }
    ]
  },
  {
    id: "p6",
    name: "Senior Citizen Plan",
    description: "Low-impact balance, joint articulation, and longevity support circuits to maintain muscle density.",
    exercises: [
      { name: "Wide Grip Lat Pulldown", sets: 2, reps: "10 reps", durationMin: 12, notes: "Light postural loading" },
      { name: "Abdominal Planks", sets: 3, reps: "30 seconds", durationMin: 8, notes: "Focal spine support" }
    ]
  }
];

export const PRESET_DIET_PLANS = [
  {
    id: "d1",
    name: "Weight Loss Plan",
    meals: {
      breakfast: "150g Egg whites scrambled with baby spinach + 30g raw oats boiled in water.",
      lunch: "150g Skinless Grilled chicken breast + 100g brown rice + unlimited greens/cucumber.",
      dinner: "150g Cod fillet or baked salmon + steamed asparagus with 1 tsp virgin olive oil.",
      snacks: "1 scoop Whey Protein Isolate mixed in cold water + 15g unsalted almonds."
    },
    targets: { calories: 1750, proteinGrams: 160, waterIntakeLiters: 4.0 },
    notes: "Strict deficit. Sip water with lemon slices. Zero caloric beverages allowed."
  },
  {
    id: "d2",
    name: "Weight Gain Plan",
    meals: {
      breakfast: "4 Whole eggs scrambled + 80g oats with 1 banana + 2 tbsp honey + 300ml whole milk.",
      lunch: "200g Grilled lean rump steak + 200g cooked white basmati rice + broccoli spears.",
      dinner: "200g Scottish salmon fillet + 250g sweet potato mash + baby leaf spinach with olive oil.",
      snacks: "2 slices sourdough toast with 2 tbsp peanut butter + 1 whey protein scoop shake."
    },
    targets: { calories: 3400, proteinGrams: 200, waterIntakeLiters: 3.5 },
    notes: "Aggressive surplus. Ensure consistency in snack times to hit targets easily."
  },
  {
    id: "d3",
    name: "Maintenance Plan",
    meals: {
      breakfast: "3 Egg whites + 1 whole egg scrambled, 50g oatmeal with handful of wild blueberries.",
      lunch: "150g Skinless grilled chicken breast + 150g baked sweet potato with steamed broccoli.",
      dinner: "150g Baked white fish or turkey steak + small avocado salad with lemon dash.",
      snacks: "150g low-fat plain Greek yogurt with 20g almonds + 1 green apple."
    },
    targets: { calories: 2200, proteinGrams: 155, waterIntakeLiters: 3.0 },
    notes: "Isocaloric balance. Keep meals highly balanced with trace vitamins."
  },
  {
    id: "d4",
    name: "Keto Plan",
    meals: {
      breakfast: "4 Scrambled eggs cooked in grass-fed butter + 4 bacon rashers + half avocado.",
      lunch: "200g Chicken thigh fillets with skin on, pan seared in coconut oil + rich lettuce cheddar salad.",
      dinner: "200g Fatty salmon baked with real hollandaise sauce + buttered sauteed greens.",
      snacks: "30g Pecan nuts or Macadamias + dry pork rinds."
    },
    targets: { calories: 2300, proteinGrams: 140, waterIntakeLiters: 4.5 },
    notes: "Under 25g net daily carbohydrates. Increase sodium and hydration to skip keto-flu risks."
  },
  {
    id: "d5",
    name: "Vegetarian Plan",
    meals: {
      breakfast: "150g scrambled organic tofu sauteed with mushrooms, tomatoes + 1 slice whole wheat bread.",
      lunch: "150g high-protein tempeh strips cooked with low-sodium soy sauce + green quinoa bowl.",
      dinner: "1 cup Lentil curry with cooked brown rice + mixed roasted summer garden veggies.",
      snacks: "200g Greek yogurt or plant-based protein scoop + 1 sliced banana with walnut kernels."
    },
    targets: { calories: 2000, proteinGrams: 125, waterIntakeLiters: 3.0 },
    notes: "High vegetarian protein focus. Blend legumes, seeds, and templates for total amino ratios."
  }
];
