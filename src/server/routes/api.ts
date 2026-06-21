import { Router, Request, Response } from "express";
import { db, User, MemberProfile, MembershipPlan, Payment, Invoice, Attendance, WorkoutPlan, DietPlan, Notification, Gym } from "../database/database";
import { AuthService } from "../services/auth.service";
import { authenticate, authorize, requirePermission } from "../middleware/auth";
import { MembershipService } from "../services/membership.service";
import { PaymentService } from "../services/payment.service";
import { ExpenseService } from "../services/expense.service";
import { NotificationService } from "../services/notification.service";
import { SettingsService } from "../services/settings.service";
import { CameraAttendanceService } from "../services/camera.service";
import { AuditService } from "../services/audit.service";

const router = Router();

// ==========================================
// 1. AUTHENTICATION MODULE
// ==========================================

// SECURE LOGIN WITH DUAL TOKENS (ACCESS + REFRESH)
router.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Verify hash using bcryptjs with automatic pbkdf2 fallback
  const isMatch = db.verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: `Account is ${user.status.toLowerCase()}. Contact administration.` });
  }

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);

  // Store refresh token within database record
  user.refreshToken = refreshToken;
  db.save();

  // Return clean, un-hashed user profile containing credentials and meta
  res.json({
    token: accessToken,
    refreshToken: refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      phone: user.phone,
    }
  });
});

// PASS RECOVERY & RESET PASSWORD
router.post("/auth/reset", (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required." });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "User not found with this email." });
  }

  const creds = db.createCredentials(newPassword);
  user.passwordHash = creds.hash;
  user.passwordSalt = creds.salt;
  user.refreshToken = ""; // clear session on reset
  db.save();

  res.json({ message: "Password updated successfully! You can now log in." });
});

// TOKEN REFRESH ENDPOINT
router.post("/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }
  
  const decoded = AuthService.verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired refresh token." });
  }
  
  const users = db.getUsers();
  const user = users.find(u => u.id === decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(410).json({ error: "Expired or mismatched refresh session." });
  }
  
  const newAccessToken = AuthService.generateAccessToken(user);
  res.json({ token: newAccessToken });
});

// SECURE LOGOUT (INVALIDATES SESSION REFRESH KEYS)
router.post("/auth/logout", authenticate, (req: Request, res: Response) => {
  const userPayload = (req as any).user;
  if (userPayload) {
    const user = db.getUsers().find(u => u.id === userPayload.userId);
    if (user) {
      user.refreshToken = ""; // Revoke token
      db.save();
    }
  }
  res.json({ success: true, message: "Logged out successfully." });
});

// Current user verification/refresh
router.get("/auth/verify", authenticate, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const users = db.getUsers();
  const user = users.find((u) => u.id === payload.userId);

  if (!user) {
    return res.status(404).json({ error: "Authenticated user not found." });
  }

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      phone: user.phone,
    }
  });
});

// ==========================================
// 2. SAAS GYM MANAGEMENT (Super Admin only)
// ==========================================
router.get("/gyms", authenticate, authorize(["SUPER_ADMIN"]), (req: Request, res: Response) => {
  res.json(db.getGyms());
});

router.post("/gyms", authenticate, authorize(["SUPER_ADMIN"]), (req: Request, res: Response) => {
  const { name, address, phone, email, subscriptionPlan, subscriptionExpiry } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Gym Name and Email are required." });
  }

  const slugs = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  const newGym: Gym = {
    id: "gym-" + Math.floor(1000 + Math.random() * 9000),
    name,
    slug: slugs,
    address: address || "",
    phone: phone || "",
    email,
    status: "ACTIVE",
    subscriptionPlan: subscriptionPlan || "BASIC",
    subscriptionExpiry: subscriptionExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    createdAt: new Date().toISOString()
  };

  db.getGyms().push(newGym);
  db.save();
  res.status(201).json(newGym);
});

router.put("/gyms/:id", authenticate, authorize(["SUPER_ADMIN"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, phone, email, status, subscriptionPlan, subscriptionExpiry } = req.body;

  const gyms = db.getGyms();
  const gym = gyms.find((g) => g.id === id);

  if (!gym) {
    return res.status(404).json({ error: "Gym record not found." });
  }

  if (name !== undefined) gym.name = name;
  if (address !== undefined) gym.address = address;
  if (phone !== undefined) gym.phone = phone;
  if (email !== undefined) gym.email = email;
  if (status !== undefined) gym.status = status;
  if (subscriptionPlan !== undefined) gym.subscriptionPlan = subscriptionPlan;
  if (subscriptionExpiry !== undefined) gym.subscriptionExpiry = subscriptionExpiry;

  db.save();
  res.json(gym);
});

// ==========================================
// 3. DASHBOARD STATS MODULE
// ==========================================
router.get("/dashboard/stats", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const users = db.getUsers();
  const members = db.getMembers();
  const paymentRecords = db.getPayments();
  const attendanceLogs = db.getAttendance();

  // Helper date matching today
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD (e.g. 2026-06-21)

  // 1. Super Admin Stats
  if (user.role === "SUPER_ADMIN") {
    const gyms = db.getGyms();
    const activeSubscriptionCount = gyms.filter(g => g.status === "ACTIVE").length;
    const basicPlanCount = gyms.filter(g => g.subscriptionPlan === "BASIC").length;
    const premiumPlanCount = gyms.filter(g => g.subscriptionPlan === "PREMIUM").length;
    const enterprisePlanCount = gyms.filter(g => g.subscriptionPlan === "ENTERPRISE").length;

    // Sum overall earnings simulated across all payments
    const totalSaaSEars = paymentRecords.reduce((sum, p) => sum + (p.status === "Paid" ? p.amount : 0), 0);

    return res.json({
      totalGyms: gyms.length,
      activeGyms: activeSubscriptionCount,
      suspendedGyms: gyms.filter(g => g.status === "SUSPENDED").length,
      saasRevenue: Math.round(totalSaaSEars * 0.15), // Simulate SaaS licensing cuts
      revenueDistribution: [
        { name: "Basic Plan", value: basicPlanCount },
        { name: "Premium Plan", value: premiumPlanCount },
        { name: "Enterprise Plan", value: enterprisePlanCount },
      ],
      monthlyGrowths: [
        { month: "Jan", gyms: 1 },
        { month: "Feb", gyms: 1 },
        { month: "Mar", gyms: 2 },
        { month: "Apr", gyms: 2 },
        { month: "May", gyms: 2 },
        { month: "Jun", gyms: gyms.length },
      ]
    });
  }

  // 2. Gym Specific Stats (Owner, Receptionist, Trainer, Member)
  // Query all users belonging to this specific gym
  const gymUsers = users.filter((u) => u.gymId === gymId);
  const gymMemberProfiles = members.filter((m) => {
    const matchedUser = users.find(u => u.id === m.id);
    return matchedUser && matchedUser.gymId === gymId;
  });

  const gymPayments = paymentRecords.filter((p) => p.gymId === gymId);
  const gymAttendance = attendanceLogs.filter((a) => a.gymId === gymId);

  // Stats calculation
  const totalGymMembers = gymMemberProfiles.length;
  const activeGymMembers = gymMemberProfiles.filter((m) => m.status === "Active").length;
  const expiredGymMembers = gymMemberProfiles.filter((m) => m.status === "Expired").length;
  const pendingGymMembers = gymMemberProfiles.filter((m) => m.status === "Pending" || m.status === "Inactive").length;

  const todayAttendanceLogs = gymAttendance.filter((a) => a.date === todayStr);
  const todayAttendanceCount = todayAttendanceLogs.length;

  const attendanceRate = totalGymMembers > 0 ? Math.round((todayAttendanceCount / totalGymMembers) * 100) : 0;

  // Payments calculations
  const pendingFeesSum = gymPayments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const todayCollectionSum = gymPayments
    .filter((p) => p.status === "Paid" && p.paymentDate?.startsWith(todayStr))
    .reduce((sum, p) => sum + p.amount, 0);

  // Monthly Revenue sum (e.g., current month is June "2026-06")
  const currentMonthStr = todayStr.substring(0, 7);
  const monthlyRevenueSum = gymPayments
    .filter((p) => p.status === "Paid" && p.paymentDate?.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + p.amount, 0);

  // Format Charts
  const revenueChart = [
    { name: "Jan", revenue: 850 },
    { name: "Feb", revenue: 1200 },
    { name: "Mar", revenue: 1900 },
    { name: "Apr", revenue: 1450 },
    { name: "May", revenue: 2200 },
    { name: "Jun", revenue: monthlyRevenueSum || 2700 }
  ];

  const attendanceChart = [
    { name: "Mon", attendance: 3 },
    { name: "Tue", attendance: 4 },
    { name: "Wed", attendance: 2 },
    { name: "Thu", attendance: 5 },
    { name: "Fri", attendance: 6 },
    { name: "Sat", attendance: 4 },
    { name: "Sun", attendance: 2 },
  ];

  const newMemberChart = [
    { name: "Mar", members: 3 },
    { name: "Apr", members: 2 },
    { name: "May", members: 1 },
    { name: "Jun", members: gymMemberProfiles.filter(m => m.joiningDate.startsWith("2026-06")).length || 2 }
  ];

  res.json({
    totalMembers: totalGymMembers,
    activeMembers: activeGymMembers,
    expiredMemberships: expiredGymMembers,
    pendingMemberships: pendingGymMembers,
    todayAttendance: todayAttendanceCount,
    attendancePercentage: attendanceRate,
    pendingFees: pendingFeesSum,
    todayCollection: todayCollectionSum,
    monthlyRevenue: monthlyRevenueSum,
    revenueChart,
    attendanceChart,
    newMemberChart,
  });
});

// ==========================================
// 4. MEMBER MANAGEMENT MODULE (CRUD)
// ==========================================

// LIST MEMBERS with pagination, search & filters
router.get("/members", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const users = db.getUsers();
  const members = db.getMembers();
  const plans = db.getMembershipPlans();

  // Filter users by role MEMBER and correct gymId (if not super admin)
  let gymMembers = users.filter((u) => u.role === "MEMBER" && (user.role === "SUPER_ADMIN" || u.gymId === gymId));

  // Merge profile details
  let mergedList = gymMembers.map((usr) => {
    const profile = members.find((p) => p.id === usr.id);
    const plan = profile ? plans.find((pl) => pl.id === profile.activePlanId) : null;
    const trainerRef = profile ? users.find((t) => t.id === profile.trainerId) : null;

    return {
      id: usr.id,
      memberId: profile?.memberId || "N/A",
      fullName: usr.fullName,
      email: usr.email,
      phone: usr.phone,
      gender: profile?.gender || "N/A",
      dob: profile?.dob || "N/A",
      height: profile?.height || 0,
      weight: profile?.weight || 0,
      bmi: profile?.bmi || 0,
      bloodGroup: profile?.bloodGroup || "N/A",
      address: profile?.address || "N/A",
      emergencyContactName: profile?.emergencyContactName || "N/A",
      emergencyContactPhone: profile?.emergencyContactPhone || "N/A",
      joiningDate: profile?.joiningDate || "N/A",
      status: profile?.status || "Inactive",
      photo: profile?.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop",
      trainerId: profile?.trainerId || null,
      trainerName: trainerRef ? trainerRef.fullName : "Unassigned",
      activePlanId: profile?.activePlanId || null,
      planName: plan ? plan.name : "No Plan",
    };
  });

  // Apply Global Search (Name, Phone, Email, Member ID, Trainer name, or Membership name)
  const search = req.query.search?.toString().toLowerCase();
  if (search) {
    mergedList = mergedList.filter(
      (m) =>
        m.fullName.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        m.phone.includes(search) ||
        m.memberId.toLowerCase().includes(search) ||
        m.trainerName.toLowerCase().includes(search) ||
        m.planName.toLowerCase().includes(search)
    );
  }

  // Apply Filters
  const statusFilter = req.query.status?.toString();
  if (statusFilter && statusFilter !== "ALL") {
    mergedList = mergedList.filter((m) => m.status.toLowerCase() === statusFilter.toLowerCase());
  }

  const genderFilter = req.query.gender?.toString();
  if (genderFilter && genderFilter !== "ALL") {
    mergedList = mergedList.filter((m) => m.gender.toLowerCase() === genderFilter.toLowerCase());
  }

  // Support Pagination
  const page = parseInt(req.query.page?.toString() || "1");
  const limit = parseInt(req.query.limit?.toString() || "15");
  const total = mergedList.length;
  const startIndex = (page - 1) * limit;
  const paginatedList = mergedList.slice(startIndex, startIndex + limit);

  res.json({
    data: paginatedList,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET INDIVIDUAL MEMBER DETAILS
router.get("/members/:id", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const users = db.getUsers();
  const members = db.getMembers();
  const plans = db.getMembershipPlans();
  const payments = db.getPayments();
  const attendanceLogs = db.getAttendance();

  const memberUser = users.find((u) => u.id === id);
  if (!memberUser || (user.role !== "SUPER_ADMIN" && memberUser.gymId !== user.gymId)) {
    return res.status(404).json({ error: "Gym member not found." });
  }

  const profile = members.find((p) => p.id === id);
  const plan = profile ? plans.find((pl) => pl.id === profile.activePlanId) : null;
  const trainerRef = profile ? users.find((t) => t.id === profile.trainerId) : null;

  // Gather specific history
  const memberPayments = payments.filter((p) => p.memberId === id);
  const memberAttendance = attendanceLogs.filter((a) => a.memberId === id);
  
  const workoutPlan = db.getWorkoutPlans().find((w) => w.memberId === id);
  const dietPlan = db.getDietPlans().find((d) => d.memberId === id);

  res.json({
    id: memberUser.id,
    memberId: profile?.memberId || "N/A",
    fullName: memberUser.fullName,
    email: memberUser.email,
    phone: memberUser.phone,
    gender: profile?.gender || "Male",
    dob: profile?.dob || "",
    height: profile?.height || 0,
    weight: profile?.weight || 0,
    bmi: profile?.bmi || 0,
    bloodGroup: profile?.bloodGroup || "O+",
    address: profile?.address || "",
    emergencyContactName: profile?.emergencyContactName || "",
    emergencyContactPhone: profile?.emergencyContactPhone || "",
    joiningDate: profile?.joiningDate || "",
    status: profile?.status || "Inactive",
    photo: profile?.photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop",
    trainerId: profile?.trainerId || null,
    trainerName: trainerRef ? trainerRef.fullName : "None Assigned",
    activePlanId: profile?.activePlanId || null,
    planName: plan ? plan.name : "None",
    payments: memberPayments,
    attendance: memberAttendance,
    workoutPlan: workoutPlan || null,
    dietPlan: dietPlan || null,
  });
});

// CREATE MEMBER
router.post("/members", authenticate, authorize(["GYM_OWNER", "RECEPTIONIST"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const {
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
    trainerId,
    activePlanId,
    photo
  } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: "Full Name and Email are required." });
  }

  const users = db.getUsers();
  const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  // Create login credentials for the member
  const newUserId = "usr-" + Math.floor(100000 + Math.random() * 900000);
  const creds = db.createCredentials("password123"); // default password set to 'password123'

  const newUser: User = {
    id: newUserId,
    gymId,
    roleId: "role-5",
    role: "MEMBER",
    fullName,
    email,
    passwordHash: creds.hash,
    passwordSalt: creds.salt,
    phone: phone || "",
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  // Height and weight for BMI
  const hMt = (height || 170) / 100;
  const computedBMI = parseFloat(((weight || 70) / (hMt * hMt)).toFixed(1));

  // Determine static standard Member Display Code
  const displayId = "MEM-" + Math.floor(1000 + Math.random() * 9000);

  const newProfile: MemberProfile = {
    id: newUserId,
    memberId: displayId,
    gender: gender || "Male",
    dob: dob || "1995-01-01",
    height: height || 170,
    weight: weight || 70,
    bmi: computedBMI,
    bloodGroup: bloodGroup || "O+",
    address: address || "",
    emergencyContactName: emergencyContactName || "",
    emergencyContactPhone: emergencyContactPhone || "",
    joiningDate: new Date().toISOString().split("T")[0],
    trainerId: trainerId || null,
    activePlanId: activePlanId || null,
    status: activePlanId ? "Active" : "Inactive",
    photo: photo || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop"
  };

  db.getMembers().push(newProfile);

  // Auto record initial Payment record if a plan is purchased
  if (activePlanId) {
    const plans = db.getMembershipPlans();
    const plan = plans.find(p => p.id === activePlanId);
    if (plan) {
      const payId = "pay-" + Math.floor(1000 + Math.random() * 9000);
      const newPayment: Payment = {
        id: payId,
        gymId,
        memberId: newUserId,
        amount: plan.price,
        type: "Membership Fee",
        paymentMode: "Cash",
        status: "Pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Due inside 1 week
        paymentDate: null,
        createdAt: new Date().toISOString()
      };
      db.getPayments().push(newPayment);
    }
  }

  db.save();
  res.status(201).json({ message: "Member profile created successfully!", userId: newUserId });
});

// UPDATE MEMBER
router.put("/members/:id", authenticate, authorize(["GYM_OWNER", "RECEPTIONIST", "TRAINER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const users = db.getUsers();
  const members = db.getMembers();

  const memberUser = users.find(u => u.id === id);
  if (!memberUser || (user.role !== "SUPER_ADMIN" && memberUser.gymId !== user.gymId)) {
    return res.status(404).json({ error: "Member not found." });
  }

  const profile = members.find(p => p.id === id);

  const {
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
    trainerId,
    activePlanId,
    status,
    photo
  } = req.body;

  // Let trainer update weight, height, BMI, photo and status notes, let receptionist/owner update everything
  if (fullName !== undefined && user.role !== "TRAINER") memberUser.fullName = fullName;
  if (phone !== undefined && user.role !== "TRAINER") memberUser.phone = phone;

  if (profile) {
    if (gender !== undefined && user.role !== "TRAINER") profile.gender = gender;
    if (dob !== undefined && user.role !== "TRAINER") profile.dob = dob;
    
    if (height !== undefined) profile.height = height;
    if (weight !== undefined) profile.weight = weight;
    
    // Recalculate BMI on updates
    if (height !== undefined || weight !== undefined) {
      const hMt = (profile.height) / 100;
      profile.bmi = parseFloat(((profile.weight) / (hMt * hMt)).toFixed(1));
    }

    if (bloodGroup !== undefined && user.role !== "TRAINER") profile.bloodGroup = bloodGroup;
    if (address !== undefined && user.role !== "TRAINER") profile.address = address;
    if (emergencyContactName !== undefined && user.role !== "TRAINER") profile.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined && user.role !== "TRAINER") profile.emergencyContactPhone = emergencyContactPhone;
    
    if (trainerId !== undefined && user.role !== "TRAINER") profile.trainerId = trainerId;
    if (activePlanId !== undefined && user.role !== "TRAINER") {
      profile.activePlanId = activePlanId;
      if (activePlanId && profile.status === "Inactive") {
        profile.status = "Active";
      }
    }
    
    if (status !== undefined && user.role !== "TRAINER") profile.status = status;
    if (photo !== undefined) profile.photo = photo;
  }

  db.save();
  res.json({ message: "Member profile updated successfully!" });
});

// DELETE MEMBER
router.delete("/members/:id", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const users = db.getUsers();
  const members = db.getMembers();

  const userIdx = users.findIndex(u => u.id === id && u.gymId === user.gymId);
  if (userIdx === -1) {
    return res.status(404).json({ error: "Member not found." });
  }

  // Remove elements
  users.splice(userIdx, 1);
  const profileIdx = members.findIndex(m => m.id === id);
  if (profileIdx !== -1) {
    members.splice(profileIdx, 1);
  }

  // Clean up relevant workouts/diets
  const wpIdx = db.getWorkoutPlans().findIndex(w => w.memberId === id);
  if (wpIdx !== -1) db.getWorkoutPlans().splice(wpIdx, 1);
  const dpIdx = db.getDietPlans().findIndex(d => d.memberId === id);
  if (dpIdx !== -1) db.getDietPlans().splice(dpIdx, 1);

  db.save();
  res.json({ message: "Member deleted successfully." });
});

// ==========================================
// 5. MEMBERSHIP PLANS MODULE
// ==========================================
router.get("/membership-plans", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;
  const plans = db.getMembershipPlans().filter(p => user.role === "SUPER_ADMIN" || p.gymId === gymId);
  res.json(plans);
});

router.post("/membership-plans", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;
  const { name, duration, price, description } = req.body;

  if (!name || !duration || !price) {
    return res.status(400).json({ error: "Plan Name, Duration and Price are required." });
  }

  const newPlan: MembershipPlan = {
    id: "plan-" + Math.floor(1000 + Math.random() * 9000),
    gymId: gymId!,
    name,
    duration,
    price: parseFloat(price),
    description: description || "",
    createdAt: new Date().toISOString()
  };

  db.getMembershipPlans().push(newPlan);
  db.save();
  res.status(201).json(newPlan);
});

router.put("/membership-plans/:id", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, duration, price, description } = req.body;

  const plans = db.getMembershipPlans();
  const plan = plans.find(p => p.id === id);

  if (!plan) {
    return res.status(404).json({ error: "Plan not found." });
  }

  if (name !== undefined) plan.name = name;
  if (duration !== undefined) plan.duration = duration;
  if (price !== undefined) plan.price = parseFloat(price);
  if (description !== undefined) plan.description = description;

  db.save();
  res.json(plan);
});

router.delete("/membership-plans/:id", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const plans = db.getMembershipPlans();
  const planIndex = plans.findIndex(p => p.id === id);

  if (planIndex === -1) {
    return res.status(404).json({ error: "Plan not found." });
  }

  plans.splice(planIndex, 1);
  db.save();
  res.json({ message: "Membership plan deleted successfully." });
});

// ==========================================
// 6. PAYMENTS & INVOICES MODULE
// ==========================================
router.get("/payments", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const payments = db.getPayments();
  const users = db.getUsers();

  let filtered = payments.filter((p) => user.role === "SUPER_ADMIN" || p.gymId === gymId);

  // Return mapped payments with member full name for beautiful logs table
  const mapped = filtered.map((p) => {
    const memberObj = users.find(u => u.id === p.memberId);
    return {
      ...p,
      memberName: memberObj ? memberObj.fullName : "Deleted Member",
      memberEmail: memberObj ? memberObj.email : "N/A"
    };
  });

  res.json(mapped);
});

// Collect member fees manual entry
router.post("/payments", authenticate, authorize(["GYM_OWNER", "RECEPTIONIST"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const { memberId, amount, type, paymentMode, status, dueDate } = req.body;

  if (!memberId || !amount || !paymentMode) {
    return res.status(400).json({ error: "Member ID, Amount, and Payment Mode are required." });
  }

  const users = db.getUsers();
  const targetMember = users.find(u => u.id === memberId);
  if (!targetMember) {
    return res.status(404).json({ error: "Selected member not found." });
  }

  const paymentId = "pay-" + Math.floor(1000 + Math.random() * 9000);
  const curDateStr = new Date().toISOString().split("T")[0];

  const newPayment: Payment = {
    id: paymentId,
    gymId: gymId!,
    memberId,
    amount: parseFloat(amount),
    type: type || "Membership Fee",
    paymentMode,
    status: status || "Paid",
    dueDate: dueDate || curDateStr,
    paymentDate: status === "Paid" ? curDateStr : null,
    createdAt: new Date().toISOString()
  };

  db.getPayments().push(newPayment);

  // Auto Generate Invoice/Receipt if Paid
  if (status === "Paid") {
    const invoiceId = "inv-" + Math.floor(10000 + Math.random() * 90000);
    const invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNo,
      paymentId,
      gymId: gymId!,
      memberId,
      memberName: targetMember.fullName,
      memberEmail: targetMember.email,
      amount: parseFloat(amount),
      taxAmount: 0.00,
      totalAmount: parseFloat(amount),
      issuedAt: new Date().toISOString()
    };

    db.getInvoices().push(newInvoice);

    // Make sure user's profile status changes back to 'Active' on fee paid if they had expired
    const profile = db.getMembers().find(p => p.id === memberId);
    if (profile && (profile.status === "Expired" || profile.status === "Inactive")) {
      profile.status = "Active";
    }
  }

  db.save();
  res.status(201).json({ message: "Fee transaction recorded successfully!", payment: newPayment });
});

// Update Status Payment
router.put("/payments/:id", authenticate, authorize(["GYM_OWNER", "RECEPTIONIST"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, paymentMode } = req.body;

  const payments = db.getPayments();
  const pay = payments.find(p => p.id === id);

  if (!pay) {
    return res.status(404).json({ error: "Payment record not found." });
  }

  if (status !== undefined) {
    pay.status = status;
    if (status === "Paid") {
      pay.paymentDate = new Date().toISOString().split("T")[0];

      // Auto generate Invoice
      const targetMember = db.getUsers().find(u => u.id === pay.memberId);
      if (targetMember) {
        const invoiceId = "inv-" + Math.floor(10000 + Math.random() * 90000);
        const invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

        const newInvoice: Invoice = {
          id: invoiceId,
          invoiceNo,
          paymentId: pay.id,
          gymId: pay.gymId!,
          memberId: pay.memberId,
          memberName: targetMember.fullName,
          memberEmail: targetMember.email,
          amount: pay.amount,
          taxAmount: 0,
          totalAmount: pay.amount,
          issuedAt: new Date().toISOString()
        };
        db.getInvoices().push(newInvoice);

        // Reactivate Member Profile
        const profile = db.getMembers().find(m => m.id === pay.memberId);
        if (profile) profile.status = "Active";
      }
    }
  }

  if (paymentMode !== undefined) pay.paymentMode = paymentMode;

  db.save();
  res.json({ message: "Payment status revised successfully!" });
});

// GET INVOICE DETAILS
router.get("/invoices/:paymentId", authenticate, (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const user = (req as any).user;

  const invoices = db.getInvoices();
  const invoice = invoices.find(i => i.paymentId === paymentId);

  if (!invoice) {
    return res.status(404).json({ error: "Invoice registry not found for this payment." });
  }

  if (user.role !== "SUPER_ADMIN" && invoice.gymId !== user.gymId) {
    return res.status(403).json({ error: "Unauthorized access to this gym invoice." });
  }

  res.json(invoice);
});

// ==========================================
// 7. ATTENDANCE MODULE
// ==========================================
router.get("/attendance", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  const list = db.getAttendance().filter((a) => user.role === "SUPER_ADMIN" || a.gymId === gymId);
  const users = db.getUsers();

  const mapped = list.map((a) => {
    const memberObj = users.find(u => u.id === a.memberId);
    return {
      ...a,
      memberName: memberObj ? memberObj.fullName : "Deleted Member",
      memberEmail: memberObj ? memberObj.email : "N/A"
    };
  });

  res.json(mapped);
});

// MARK ATTENDANCE
router.post("/attendance", authenticate, authorize(["GYM_OWNER", "TRAINER", "RECEPTIONIST", "MEMBER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  let { memberId, date, timeIn, remarks, timeOut } = req.body;

  // Let member log their own presence, but default memberId to active session user if logged as member role
  if (user.role === "MEMBER") {
    memberId = user.userId;
  }

  if (!memberId) {
    return res.status(400).json({ error: "Member designation selection is required." });
  }

  const targetUser = db.getUsers().find(u => u.id === memberId);
  if (!targetUser) {
    return res.status(404).json({ error: "Member not declared." });
  }

  const curDateStr = new Date().toISOString().split("T")[0];
  const curTimeStr = new Date().toTimeString().split(" ")[0]; // HH:MM:SS

  const newId = "att-" + Math.floor(1000 + Math.random() * 9000);
  const newAttendance: Attendance = {
    id: newId,
    gymId: gymId || targetUser.gymId!,
    memberId,
    date: date || curDateStr,
    timeIn: timeIn || curTimeStr,
    timeOut: timeOut || null,
    remarks: remarks || "Manual Check-in",
    markedBy: user.fullName || "Self"
  };

  db.getAttendance().push(newAttendance);
  db.save();

  res.status(201).json({ message: "Attendance logged successfully!", attendance: newAttendance });
});

// UPDATE CHECKOUT
router.put("/attendance/:id", authenticate, authorize(["GYM_OWNER", "TRAINER", "RECEPTIONIST"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const { timeOut, remarks } = req.body;

  const attendanceRecord = db.getAttendance().find(a => a.id === id);
  if (!attendanceRecord) {
    return res.status(404).json({ error: "Log record not found." });
  }

  const curTimeStr = new Date().toTimeString().split(" ")[0];
  attendanceRecord.timeOut = timeOut || curTimeStr;
  if (remarks !== undefined) attendanceRecord.remarks = remarks;

  db.save();
  res.json({ message: "Checkout recorded successfully!", attendance: attendanceRecord });
});

// ==========================================
// 8. WORKOUT MANAGER MODULE (Trainer assigned)
// ==========================================
router.get("/workouts/:memberId", authenticate, (req: Request, res: Response) => {
  const { memberId } = req.params;
  const activePlan = db.getWorkoutPlans().find(w => w.memberId === memberId);
  res.json(activePlan || null);
});

router.post("/workouts", authenticate, authorize(["GYM_OWNER", "TRAINER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;
  const { memberId, exercises, notes } = req.body;

  if (!memberId || !exercises || !Array.isArray(exercises)) {
    return res.status(400).json({ error: "Member ID and list of exercises are required." });
  }

  const workoutPlans = db.getWorkoutPlans();
  let workout = workoutPlans.find(w => w.memberId === memberId);

  if (workout) {
    workout.exercises = exercises;
    workout.notes = notes || "";
    workout.trainerId = user.userId;
    workout.assignedDate = new Date().toISOString().split("T")[0];
  } else {
    workout = {
      id: "work-" + Math.floor(1000 + Math.random() * 9000),
      gymId: gymId!,
      memberId,
      trainerId: user.userId,
      assignedDate: new Date().toISOString().split("T")[0],
      exercises,
      notes: notes || "",
      history: []
    };
    workoutPlans.push(workout);
  }

  db.save();
  res.json({ message: "Workout guidelines locked in!", workout });
});

router.post("/workouts/:id/history", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const { completed, remarks } = req.body;

  const workout = db.getWorkoutPlans().find(w => w.id === id);
  if (!workout) {
    return res.status(404).json({ error: "Workout plan not found." });
  }

  workout.history.push({
    date: new Date().toISOString().split("T")[0],
    completed: !!completed,
    remarks: remarks || "Completed standard day"
  });

  db.save();
  res.json({ message: "Workout completion recorded successfully!" });
});


// ==========================================
// 9. DIET MANAGER MODULE (Trainer assigned)
// ==========================================
router.get("/diet/:memberId", authenticate, (req: Request, res: Response) => {
  const { memberId } = req.params;
  const activeDiet = db.getDietPlans().find(d => d.memberId === memberId);
  res.json(activeDiet || null);
});

router.post("/diet", authenticate, authorize(["GYM_OWNER", "TRAINER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;
  const { memberId, meals, targets, notes } = req.body;

  if (!memberId || !meals || !targets) {
    return res.status(400).json({ error: "Member ID, diet meals, and nutritional targets are required." });
  }

  const dietPlans = db.getDietPlans();
  let diet = dietPlans.find(d => d.memberId === memberId);

  if (diet) {
    diet.meals = meals;
    diet.targets = targets;
    diet.notes = notes || "";
    diet.trainerId = user.userId;
    diet.assignedDate = new Date().toISOString().split("T")[0];
  } else {
    diet = {
      id: "diet-" + Math.floor(1000 + Math.random() * 9000),
      gymId: gymId!,
      memberId,
      trainerId: user.userId,
      assignedDate: new Date().toISOString().split("T")[0],
      meals,
      targets,
      notes: notes || ""
    };
    dietPlans.push(diet);
  }

  db.save();
  res.json({ message: "Diet layout locked in successfully!", diet });
});

// ==========================================
// 10. NOTIFICATIONS MODULE
// ==========================================
router.get("/notifications", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId;

  // Render announcements or gym specific alerts targeted directly to this user or everyone
  const list = db.getNotifications().filter((n) => {
    const fromMyGym = n.gymId === null || n.gymId === gymId;
    const isTargetedToMe = n.userId === null || n.userId === user.userId;
    return fromMyGym && isTargetedToMe;
  });

  res.json(list);
});

router.post("/notifications", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type, title, message, userId } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }

  const newNotif: Notification = {
    id: "notif-" + Math.floor(1000 + Math.random() * 9000),
    gymId: user.gymId,
    type: type || "Announcement",
    title,
    message,
    userId: userId || null,
    isReadBy: [],
    scheduledFor: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.getNotifications().unshift(newNotif);
  db.save();
  res.status(201).json(newNotif);
});

router.post("/notifications/:id/read", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  const notif = db.getNotifications().find(n => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: "Notification not found." });
  }

  if (!notif.isReadBy.includes(user.userId)) {
    notif.isReadBy.push(user.userId);
    db.save();
  }

  res.json({ success: true });
});

// ==========================================
// 11. STAFF DIRECTORY (Add/Edit Trainers & Receptionists)
// ==========================================
router.get("/staff", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const staffUsers = db.getUsers().filter(u => u.gymId === user.gymId && (u.role === "TRAINER" || u.role === "RECEPTIONIST"));
  res.json(staffUsers);
});

// Invite staff member
router.post("/staff", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { fullName, email, phone, role } = req.body;

  if (!fullName || !email || !role) {
    return res.status(400).json({ error: "Staff Full Name, Email and Role (TRAINER or RECEPTIONIST) are required." });
  }

  const users = db.getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "A user with this email matches an active profile." });
  }

  const newStaffId = "usr-" + Math.floor(100000 + Math.random() * 900000);
  const creds = db.createCredentials("password123"); // Default password 'password123'

  const newStaffUser: User = {
    id: newStaffId,
    gymId: user.gymId,
    roleId: role === "TRAINER" ? "role-3" : "role-4",
    role: role,
    fullName,
    email,
    passwordHash: creds.hash,
    passwordSalt: creds.salt,
    phone: phone || "",
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };

  users.push(newStaffUser);
  db.save();

  res.status(201).json({ message: "Staff registered successfully! Default password is set to password123", staff: newStaffUser });
});

// ==========================================
// 12. SPECIAL REPORTS / EXPORTS ENDPOINT
// ==========================================
router.get("/reports/export", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const type = req.query.type?.toString() || "members"; // members, revenue, attendance, expiry

  const users = db.getUsers();
  const members = db.getMembers();
  const payments = db.getPayments();
  const attendances = db.getAttendance();

  // Handle distinct files formats simple text layout
  if (type === "members") {
    const gymMembers = users.filter(u => u.gymId === user.gymId && u.role === "MEMBER");
    let csv = "Member ID,Full Name,Email,Phone,Gender,BMI,Status,Joining Date\n";
    
    gymMembers.forEach(u => {
      const p = members.find(m => m.id === u.id);
      csv += `"${p?.memberId || 'N/A'}","${u.fullName}","${u.email}","${u.phone}","${p?.gender || 'N/A'}",${p?.bmi || 0},"${p?.status || 'N/A'}","${p?.joiningDate || 'N/A'}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=members_report.csv");
    return res.send(csv);
  }

  if (type === "revenue") {
    const gymPays = payments.filter(p => p.gymId === user.gymId);
    let csv = "ID,Member ID,Amount,Type,Payment Mode,Status,Date\n";

    gymPays.forEach(p => {
      csv += `"${p.id}","${p.memberId}",${p.amount},"${p.type}","${p.paymentMode}","${p.status}","${p.paymentDate || 'N/A'}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=revenue_report.csv");
    return res.send(csv);
  }

  if (type === "attendance") {
    const gymAtts = attendances.filter(a => a.gymId === user.gymId);
    let csv = "ID,Member ID,Date,Time In,Time Out,Remarks,Marked By\n";

    gymAtts.forEach(a => {
      csv += `"${a.id}","${a.memberId}","${a.date}","${a.timeIn}","${a.timeOut || 'N/A'}","${a.remarks}","${a.markedBy}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
    return res.send(csv);
  }

  res.status(400).json({ error: "Unsupported report parameter requested." });
});

// ==========================================
// 13. SETTINGS ENDPOINTS
// ==========================================
router.get("/settings", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const config = SettingsService.getSettings(user.gymId || "gym-1");
  res.json(config);
});

router.put("/settings", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const actor = { id: user.userId, name: user.email, role: user.role };
  try {
    const updated = SettingsService.updateSettings(user.gymId || "gym-1", req.body, actor);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 14. INVOICES & PAYMENTS TRADING ENDPOINTS
// ==========================================
router.post("/payments/collect", authenticate, requirePermission("MANAGE_PAYMENTS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId, amount, type, paymentMode, notes } = req.body;
  
  if (!memberId || !amount || !type || !paymentMode) {
    return res.status(400).json({ error: "Required fields: memberId, amount, type, paymentMode" });
  }
  
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const transaction = PaymentService.collectFee({
      gymId: user.gymId || "gym-1",
      memberId,
      amount: Number(amount),
      type,
      paymentMode,
      notes,
      actor
    });
    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/payments/receipt/:invoiceNo", authenticate, (req: Request, res: Response) => {
  try {
    const receipt = PaymentService.getReceiptDetails(req.params.invoiceNo);
    res.json(receipt);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/payments/list", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const payments = db.getPayments().filter(p => p.gymId === user.gymId);
  res.json(payments);
});

// ==========================================
// 15. EXPENSE ENDPOINTS
// ==========================================
router.get("/expenses", authenticate, requirePermission("VIEW_REPORTS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const list = ExpenseService.getExpenses(user.gymId || "gym-1");
  res.json(list);
});

router.post("/expenses", authenticate, requirePermission("MANAGE_PAYMENTS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { category, amount, date, description } = req.body;
  if (!category || !amount || !date) {
    return res.status(400).json({ error: "Required fields: category, amount, date" });
  }
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const newExpense = ExpenseService.createExpense({
      gymId: user.gymId || "gym-1",
      category,
      amount: Number(amount),
      date,
      description,
      actor
    });
    res.status(201).json(newExpense);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/expenses/:id", authenticate, requirePermission("MANAGE_PAYMENTS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const updated = ExpenseService.updateExpense(req.params.id, req.body, actor);
    res.json(updated);
  } catch (err: any) {
    res.status(100).json({ error: err.message });
  }
});

router.delete("/expenses/:id", authenticate, requirePermission("MANAGE_PAYMENTS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    ExpenseService.deleteExpense(req.params.id, actor);
    res.json({ success: true, message: "Expense record removed." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 16. MEMBERSHIP ACTIONS ENDPOINTS
// ==========================================
router.post("/memberships/add", authenticate, requirePermission("MANAGE_MEMBERS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId, planId, startDate, pricePaid } = req.body;
  if (!memberId || !planId || !startDate || pricePaid === undefined) {
    return res.status(400).json({ error: "Missing required params: memberId, planId, startDate, pricePaid" });
  }
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const result = MembershipService.addMembership({
      gymId: user.gymId || "gym-1",
      memberId,
      planId,
      startDate,
      pricePaid: Number(pricePaid),
      actor
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/memberships/renew", authenticate, requirePermission("MANAGE_MEMBERS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId, planId, startDateStr, pricePaid } = req.body;
  if (!memberId || !planId || pricePaid === undefined) {
    return res.status(400).json({ error: "Missing parameters: memberId, planId, pricePaid" });
  }
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const result = MembershipService.renewMembership({
      gymId: user.gymId || "gym-1",
      memberId,
      planId,
      startDateStr,
      pricePaid: Number(pricePaid),
      actor
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/memberships/upgrade", authenticate, requirePermission("MANAGE_MEMBERS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId, newPlanId, pricePaid } = req.body;
  if (!memberId || !newPlanId || pricePaid === undefined) {
    return res.status(400).json({ error: "Missing parameters: memberId, newPlanId, pricePaid" });
  }
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const result = MembershipService.upgradeMembership({
      gymId: user.gymId || "gym-1",
      memberId,
      newPlanId,
      pricePaid: Number(pricePaid),
      actor
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/memberships/freeze", authenticate, requirePermission("MANAGE_MEMBERS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: "memberId is required." });
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const result = MembershipService.freezeMembership({ memberId, actor });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/memberships/cancel", authenticate, requirePermission("MANAGE_MEMBERS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: "memberId is required." });
  try {
    const actor = { id: user.userId, name: user.email, role: user.role };
    const result = MembershipService.cancelMembership({ memberId, actor });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/memberships/history/:memberId", authenticate, (req: Request, res: Response) => {
  const list = db.getMemberMemberships().filter(m => m.memberId === req.params.memberId);
  res.json(list);
});

// ==========================================
// 17. REVISED CRM DASHBOARD SUMMARY ENDPOINT
// ==========================================
router.get("/dashboard/summary", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  // Trigger automated notification checking logic for this user's workspace
  try {
    NotificationService.triggerAutomatedReminders(gymId);
  } catch (err) {
    console.error("Auto reminders failure", err);
  }

  const membersCountTotal = db.getUsers().filter(u => u.gymId === gymId && u.role === "MEMBER").length;
  
  const gymMembers = db.getMembers().filter(m => {
    const userMatched = db.getUsers().find(u => u.id === m.id);
    return userMatched && userMatched.gymId === gymId;
  });
  
  const femaleCount = gymMembers.filter(m => m.gender === "Female").length;
  const maleCount = gymMembers.filter(m => m.gender === "Male").length;

  const financial = ExpenseService.getFinancialMetrics(gymId);
  const membershipsStats = MembershipService.getDashboardMetrics(gymId);

  // Today's attendance headcount
  const todayStr = new Date().toISOString().split("T")[0];
  const attendanceTodayCount = db.getAttendance().filter(a => a.gymId === gymId && a.date === todayStr).length;

  res.json({
    membersCountTotal,
    genders: {
      femaleCount,
      maleCount
    },
    financial,
    membershipsStats,
    attendanceTodayCount
  });
});

// ==========================================
// 18. SYSTEM AUDIT LOGS ENDPOINT
// ==========================================
router.get("/audit-logs", authenticate, requirePermission("MANAGE_SETTINGS"), (req: Request, res: Response) => {
  const user = (req as any).user;
  const list = AuditService.getLogs(user.gymId);
  res.json(list);
});

export default router;
