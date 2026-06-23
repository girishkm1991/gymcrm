import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Helper: Save Base64 Image to uploads folder
export function saveBase64Image(base64Data: string, prefix: string): string {
  if (!base64Data || (!base64Data.startsWith("data:") && base64Data.includes("/uploads/"))) {
    return base64Data;
  }
  if (!base64Data.startsWith("data:")) {
    return base64Data; // Url or placeholder
  }

  try {
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let fileBuffer: Buffer;
    let ext = "png";

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      fileBuffer = Buffer.from(matches[2], 'base64');
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
      else if (mimeType.includes("webp")) ext = "webp";
    } else {
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (fileBuffer.length > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit");
    }

    const filename = `${prefix}-${Math.floor(Math.random() * 89999 + 10000)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, fileBuffer);

    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Base64 save failure:", err);
    return base64Data;
  }
}

// Helper: QR token security
function generateQrToken(memberId: string, gymId: string): string {
  const secret = "gymflow_qr_token_salt_2026";
  const hash = crypto.createHash("sha256").update(`${memberId}:${gymId}:${secret}`).digest("hex");
  return `${memberId}_${gymId}_${hash.substring(0, 16)}`;
}

function validateQrToken(token: string): { memberId: string; gymId: string } | null {
  const parts = token.split("_");
  if (parts.length !== 3) return null;
  const [memberId, gymId, hash] = parts;
  const secret = "gymflow_qr_token_salt_2026";
  const expectedHash = crypto.createHash("sha256").update(`${memberId}:${gymId}:${secret}`).digest("hex");
  if (expectedHash.substring(0, 16) === hash) {
    return { memberId, gymId };
  }
  return null;
}

import { db, User, MemberProfile, MembershipPlan, Payment, Invoice, Attendance, WorkoutPlan, DietPlan, Notification, Gym, WhatsappSettings, MessageTemplate, CommunicationLog, BillingReminder, GeneratedDocument } from "../database/database";
import { AuthService } from "../services/auth.service";
import { authenticate, authorize, requirePermission } from "../middleware/auth";
import { MembershipService } from "../services/membership.service";
import { PaymentService } from "../services/payment.service";
import { ExpenseService } from "../services/expense.service";
import { NotificationService } from "../services/notification.service";
import { SettingsService } from "../services/settings.service";
import { CameraAttendanceService } from "../services/camera.service";
import { AuditService } from "../services/audit.service";
import { CommunicationService } from "../services/communication.service";

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
      forcePasswordChange: !!user.forcePasswordChange,
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

// FORCE CHANGE PASSWORD FOR FIRST LOGIN
router.post("/auth/force-change-password", (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "User not found with this email." });
  }

  const isMatch = db.verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
  if (!isMatch) {
    return res.status(401).json({ error: "Current password verification failed." });
  }

  const creds = db.createCredentials(newPassword);
  user.passwordHash = creds.hash;
  user.passwordSalt = creds.salt;
  user.forcePasswordChange = false;
  user.refreshToken = ""; // clear session on forced update
  db.save();

  res.json({ message: "Password forced change completed successfully. You can now log in!" });
});

// MULTI-TENANT GYM OWNER ONBOARDING REGISTRATION
router.post("/auth/register", async (req: Request, res: Response) => {
  const {
    // Gym Info
    gymName,
    gymLogo,
    address,
    city,
    state,
    country,
    pincode,
    phone,
    email,
    // Owner Info
    ownerName,
    ownerPhone,
    ownerEmail,
    ownerPassword,
    confirmPassword,
    // Business Info
    timezone,
    currency,
    gstNumber,
    // Agreement
    acceptTerms,
    acceptPrivacy
  } = req.body;

  // 1. Check required fields are present
  if (
    !gymName || !address || !city || !state || !country || !pincode || !phone || !email ||
    !ownerName || !ownerPhone || !ownerEmail || !ownerPassword || !confirmPassword ||
    !timezone || !currency
  ) {
    return res.status(400).json({ error: "All required fields must be completed." });
  }

  // 2. Agreement checks
  if (!acceptTerms || !acceptPrivacy) {
    return res.status(400).json({ error: "You must accept the Terms & Conditions and Privacy Policy." });
  }

  // 3. Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || !emailRegex.test(ownerEmail)) {
    return res.status(400).json({ error: "Please provide valid email addresses." });
  }

  // 4. Password confirmation matching
  if (ownerPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  // 5. Password strength check (e.g. minimum 6 characters)
  if (ownerPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const crypto = await import("crypto");
    const gymId = `gym-${crypto.randomBytes(4).toString("hex")}`;
    const ownerId = `usr-owner-${crypto.randomBytes(4).toString("hex")}`;
    const gymSlug = gymName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create Gym record
    const newGym = {
      id: gymId,
      name: gymName,
      slug: gymSlug,
      address: `${address}, ${city}, ${state}, ${country} - ${pincode}`,
      phone: phone,
      email: email,
      status: "ACTIVE" as const,
      subscriptionPlan: "BASIC" as const,
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };

    // User credentials creation via bcryptjs
    const ownerCreds = db.createCredentials(ownerPassword);
    const newOwnerUser = {
      id: ownerId,
      gymId: gymId,
      roleId: "role-2",
      role: "GYM_OWNER" as const,
      fullName: ownerName,
      email: ownerEmail.toLowerCase(),
      passwordHash: ownerCreds.hash,
      passwordSalt: ownerCreds.salt,
      phone: ownerPhone,
      status: "ACTIVE" as const,
      refreshToken: null,
      createdAt: new Date().toISOString()
    };

    // Settings record creation
    const newSettings = {
      id: `set-${crypto.randomBytes(4).toString("hex")}`,
      gymId: gymId,
      gymName: gymName,
      logo: gymLogo || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=64&auto=format&fit=crop",
      address: `${address}, ${city}, ${state}, ${country} - ${pincode}`,
      phone: phone,
      email: email,
      gstNumber: gstNumber || "",
      currency: currency,
      workingHours: "06:00 AM - 10:00 PM",
      receiptFooter: "Thank you for training with us. Eat clean, lift heavy!",
      paymentQr: "",
      taxPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Default membership plans list
    const defaultPlans = [
      {
        id: `plan-mon-${crypto.randomBytes(4).toString("hex")}`,
        gymId: gymId,
        name: "Monthly",
        duration: "Monthly" as const,
        price: 49.99,
        description: "Standard monthly membership with complete facility access.",
        createdAt: new Date().toISOString()
      },
      {
        id: `plan-qrt-${crypto.randomBytes(4).toString("hex")}`,
        gymId: gymId,
        name: "Quarterly",
        duration: "Quarterly" as const,
        price: 129.99,
        description: "Quarterly value pack with a custom trainer orientation.",
        createdAt: new Date().toISOString()
      },
      {
        id: `plan-hlf-${crypto.randomBytes(4).toString("hex")}`,
        gymId: gymId,
        name: "Half Yearly",
        duration: "Half Yearly" as const,
        price: 239.99,
        description: "A 6-month continuous fitness pass with full locker privileges.",
        createdAt: new Date().toISOString()
      },
      {
        id: `plan-ann-${crypto.randomBytes(4).toString("hex")}`,
        gymId: gymId,
        name: "Annual",
        duration: "Annual" as const,
        price: 399.99,
        description: "Optimal 12-month value plan with free monthly standard body-index review.",
        createdAt: new Date().toISOString()
      }
    ];

    // Notification welcome record
    const newNotification = {
      id: `notif-${crypto.randomBytes(4).toString("hex")}`,
      gymId: gymId,
      type: "Announcement" as const,
      title: "Welcome to GymFlow CRM!",
      message: `Your gym workspace "${gymName}" has been successfully provisioned with isolated multi-tenant parameters. Start by updating your settings or inviting athletes.`,
      userId: ownerId,
      isReadBy: [],
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Save transactionally block - both DB and Memory list
    await db.registerTenantTransaction(newGym, newOwnerUser, newSettings, defaultPlans, newNotification);

    // Return successfully on-boarded JWT tokens
    const accessToken = AuthService.generateAccessToken(newOwnerUser);
    const refreshToken = AuthService.generateRefreshToken(newOwnerUser);

    // Store session active refresh parameter
    newOwnerUser.refreshToken = refreshToken;
    db.save();

    res.status(201).json({
      message: "Congratulations! Gym workspace and admin account created successfully.",
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: newOwnerUser.id,
        fullName: newOwnerUser.fullName,
        email: newOwnerUser.email,
        role: newOwnerUser.role,
        gymId: newOwnerUser.gymId,
        phone: newOwnerUser.phone,
      }
    });

  } catch (err: any) {
    console.error("[Onboarding error]", err);
    res.status(500).json({ error: err.message || "A transactional server error occurred during onboarding registration." });
  }
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
      endDate: profile?.endDate || "",
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
    photo,
    occupation,
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
    trainerNotes,
    medicalWarnings,
    locker,
    ptPackage,
    startDate,
    endDate
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

  // Process Base64 photo of member or use standard asset placeholder
  const memberPhotoUrl = photo ? saveBase64Image(photo, `profile-${newUserId}`) : "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=250&auto=format&fit=crop";

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
    photo: memberPhotoUrl,
    occupation: occupation || "",
    bodyFat: Number(bodyFat || 0),
    chest: Number(chest || 0),
    waist: Number(waist || 0),
    hip: Number(hip || 0),
    biceps: Number(biceps || 0),
    thigh: Number(thigh || 0),
    fitnessGoal: fitnessGoal || "",
    medicalConditions: medicalConditions || "",
    injuries: injuries || "",
    allergies: allergies || "",
    medications: medications || "",
    trainerNotes: trainerNotes || "",
    medicalWarnings: medicalWarnings || "",
    locker: locker || "",
    ptPackage: ptPackage || "",
    startDate: startDate || "",
    endDate: endDate || ""
  };

  db.getMembers().push(newProfile);

  // Add timeline entry for registration
  db.addTimelineEntry(gymId, newUserId, "Registration", "Registered Account", `Successfully joined gym under Member ID: ${displayId}.`);

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
    photo,
    occupation,
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
    trainerNotes,
    medicalWarnings,
    locker,
    ptPackage,
    startDate,
    endDate
  } = req.body;

  // Let trainer update weight, height, BMI, photo and status notes, let receptionist/owner update everything
  if (fullName !== undefined && user.role !== "TRAINER") memberUser.fullName = fullName;
  if (phone !== undefined && user.role !== "TRAINER") memberUser.phone = phone;

  if (profile) {
    if (gender !== undefined && user.role !== "TRAINER") profile.gender = gender;
    if (dob !== undefined && user.role !== "TRAINER") profile.dob = dob;
    
    if (height !== undefined) profile.height = Number(height);
    if (weight !== undefined) profile.weight = Number(weight);
    
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
    
    // Support photo upload mapping via Base64 saving
    if (photo !== undefined) {
      profile.photo = saveBase64Image(photo, `profile-${id}`);
    }

    // Capture and map all Phase 3B physical, medical, and personal fields
    if (occupation !== undefined) profile.occupation = occupation;
    if (bodyFat !== undefined) profile.bodyFat = Number(bodyFat || 0);
    if (chest !== undefined) profile.chest = Number(chest || 0);
    if (waist !== undefined) profile.waist = Number(waist || 0);
    if (hip !== undefined) profile.hip = Number(hip || 0);
    if (biceps !== undefined) profile.biceps = Number(biceps || 0);
    if (thigh !== undefined) profile.thigh = Number(thigh || 0);
    if (fitnessGoal !== undefined) profile.fitnessGoal = fitnessGoal;
    if (medicalConditions !== undefined) profile.medicalConditions = medicalConditions;
    if (injuries !== undefined) profile.injuries = injuries;
    if (allergies !== undefined) profile.allergies = allergies;
    if (medications !== undefined) profile.medications = medications;
    if (medicalWarnings !== undefined) profile.medicalWarnings = medicalWarnings;
    if (locker !== undefined) profile.locker = locker;
    if (ptPackage !== undefined) profile.ptPackage = ptPackage;
    if (startDate !== undefined) profile.startDate = startDate;
    if (endDate !== undefined) profile.endDate = endDate;

    // Handle Trainer Notes changes and write timeline log
    if (trainerNotes !== undefined) {
      const oldNotes = profile.trainerNotes;
      profile.trainerNotes = trainerNotes;
      if (oldNotes !== trainerNotes && trainerNotes.trim() !== "") {
        db.addTimelineEntry(memberUser.gymId, id, "TrainerNotes", "Trainer Note Added", `Trainer recorded notes: "${trainerNotes}"`);
      }
    }

    // Auto record physical stats progress entry if updated
    if (weight !== undefined || bodyFat !== undefined || chest !== undefined || waist !== undefined) {
      const todayStr = new Date().toISOString().split("T")[0];
      const progressList = db.getMemberProgress();
      const existingToday = progressList.find(p => p.memberId === id && p.date === todayStr);
      
      if (existingToday) {
        if (weight !== undefined) existingToday.weight = Number(weight);
        existingToday.bmi = profile.bmi;
        if (bodyFat !== undefined) existingToday.bodyFat = Number(bodyFat);
        if (chest !== undefined) existingToday.chest = Number(chest);
        if (waist !== undefined) existingToday.waist = Number(waist);
        if (hip !== undefined) existingToday.hip = Number(hip);
        if (biceps !== undefined) existingToday.biceps = Number(biceps);
        if (thigh !== undefined) existingToday.thigh = Number(thigh);
      } else {
        const newProgress = {
          id: "progress-" + Math.floor(100000 + Math.random() * 900000),
          gymId: memberUser.gymId,
          memberId: id,
          date: todayStr,
          weight: Number(weight !== undefined ? weight : profile.weight),
          bmi: profile.bmi,
          bodyFat: Number(bodyFat !== undefined ? bodyFat : profile.bodyFat || 0),
          chest: Number(chest !== undefined ? chest : profile.chest || 0),
          waist: Number(waist !== undefined ? waist : profile.waist || 0),
          hip: Number(hip !== undefined ? hip : profile.hip || 0),
          biceps: Number(biceps !== undefined ? biceps : profile.biceps || 0),
          thigh: Number(thigh !== undefined ? thigh : profile.thigh || 0),
          notes: trainerNotes || profile.trainerNotes || "",
          createdAt: new Date().toISOString()
        };
        progressList.push(newProgress);
      }
    }
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
// 14B. WHATSAPP & AUTO-BILLING ENDPOINTS
// ==========================================
router.get("/whatsapp/settings", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  let configs = db.getWhatsappSettings().filter(c => c.gymId === gymId);
  if (configs.length === 0) {
    const dummy: WhatsappSettings = {
      id: "set-wa-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      provider: "WhatsAppWeb",
      apiKey: "DEMO_KEY_XYZ_123",
      phoneNumberId: "+15551234567",
      wabaId: "waba-001",
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.getWhatsappSettings().push(dummy);
    db.save();
    configs = [dummy];
  }
  res.json(configs[0]);
});

router.put("/whatsapp/settings", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { provider, apiKey, phoneNumberId, wabaId, status } = req.body;
  
  let config = db.getWhatsappSettings().find(c => c.gymId === gymId);
  if (!config) {
    config = {
      id: "set-wa-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      provider: provider || "WhatsAppWeb",
      apiKey: apiKey || "",
      phoneNumberId: phoneNumberId || "",
      wabaId: wabaId || "",
      status: status || "Inactive",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.getWhatsappSettings().push(config);
  } else {
    if (provider) config.provider = provider;
    config.apiKey = apiKey !== undefined ? apiKey : config.apiKey;
    config.phoneNumberId = phoneNumberId !== undefined ? phoneNumberId : config.phoneNumberId;
    config.wabaId = wabaId !== undefined ? wabaId : config.wabaId;
    if (status) config.status = status;
    config.updatedAt = new Date().toISOString();
  }
  db.save();
  res.json(config);
});

router.get("/whatsapp/templates", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const templates = db.getMessageTemplates().filter(t => t.gymId === gymId);
  res.json(templates);
});

router.put("/whatsapp/templates/:type", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { title, bodyText, variables } = req.body;
  if (!title || !bodyText) {
    return res.status(400).json({ error: "Title and bodyText are required." });
  }
  let template = db.getMessageTemplates().find(t => t.gymId === gymId && t.type === req.params.type);
  if (!template) {
    template = {
      id: "tpl-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      type: req.params.type,
      title,
      bodyText,
      variables: variables || ["MemberName", "GymName"],
      updatedAt: new Date().toISOString()
    };
    db.getMessageTemplates().push(template);
  } else {
    template.title = title;
    template.bodyText = bodyText;
    if (variables) template.variables = variables;
    template.updatedAt = new Date().toISOString();
  }
  db.save();
  res.json(template);
});

router.get("/billing/reminders", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const reminders = CommunicationService.generateActiveReminders(gymId);
  res.json(reminders);
});

router.delete("/billing/reminders/:id", authenticate, (req: Request, res: Response) => {
  const reminders = db.getBillingReminders();
  const index = reminders.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    reminders[index].status = "Dismissed";
    db.save();
    return res.json({ success: true, message: "Reminder dismissed successfully." });
  }
  res.status(404).json({ error: "Reminder not found." });
});

router.get("/billing/pdf/:type/:id", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { type, id } = req.params;

  if (type !== "Invoice" && type !== "Receipt" && type !== "MembershipCard") {
    return res.status(400).json({ error: "Invalid document type." });
  }

  let doc = db.getGeneratedDocuments().find(d => d.gymId === gymId && d.type === type && (d.referenceId === id || d.memberId === id));
  if (!doc) {
    let targetMemberId = id;
    if (type === "Invoice") {
      const inv = db.getInvoices().find(i => i.invoiceNo === id || i.id === id);
      if (inv) targetMemberId = inv.memberId;
    } else if (type === "Receipt") {
      const pm = db.getPayments().find(p => p.id === id);
      if (pm) targetMemberId = pm.memberId;
    }
    
    doc = CommunicationService.generateDocument({
      gymId,
      memberId: targetMemberId,
      type,
      referenceId: id
    });
  }

  if (fs.existsSync(doc.filePath)) {
    res.setHeader("Content-Type", "text/html");
    res.send(fs.readFileSync(doc.filePath, "utf-8"));
  } else {
    const regenerated = CommunicationService.generateDocument({
      gymId,
      memberId: doc.memberId,
      type,
      referenceId: doc.referenceId
    });
    res.setHeader("Content-Type", "text/html");
    res.send(fs.readFileSync(regenerated.filePath, "utf-8"));
  }
});

router.get("/communication/logs", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const logs = db.getCommunicationLogs().filter(l => l.gymId === gymId);
  res.json(logs);
});

router.post("/communication/send", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { memberId, type, category, variables } = req.body;

  if (!memberId || !category) {
    return res.status(400).json({ error: "Required fields: memberId, category" });
  }

  const memberUser = db.getUsers().find(u => u.id === memberId);
  if (!memberUser) {
    return res.status(404).json({ error: "Member not found." });
  }

  const memberProfile = db.getMembers().find(m => m.id === memberId);
  if (!memberProfile) {
    return res.status(404).json({ error: "Member profile card not found." });
  }

  const template = db.getMessageTemplates().find(t => t.gymId === gymId && t.type === category);
  const bodyText = template ? template.bodyText : `Hello {{MemberName}},\n\nUpdate regarding your gym membership at {{GymName}}.\n\nBest Regards.`;

  const gymSettings = db.getSettings().find(s => s.gymId === gymId);
  const gymObj = db.getGyms().find(g => g.id === gymId);
  const gymName = gymSettings?.gymName || gymObj?.name || "GymFlow Club";

  const parsedMsg = CommunicationService.parseTemplate(bodyText, {
    MemberName: memberUser.fullName,
    GymName: gymName,
    ...variables
  });

  const logId = "log-" + Math.floor(100000 + Math.random() * 900000);
  const newLog: CommunicationLog = {
    id: logId,
    gymId,
    memberId,
    memberName: memberUser.fullName,
    type: "WhatsApp",
    category,
    message: parsedMsg,
    status: "Sent",
    sentAt: new Date().toISOString()
  };

  db.getCommunicationLogs().push(newLog);
  db.addTimelineEntry(gymId, memberId, "Timeline", "Message Sent (" + category + ")", parsedMsg.substring(0, 80) + "...");
  db.save();

  const phone = memberUser.phone || "";
  const cleanedPhone = phone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(parsedMsg)}`;

  res.json({
    success: true,
    message: parsedMsg,
    whatsappUrl,
    log: newLog
  });
});

router.post("/billing/bulk", authenticate, authorize(["GYM_OWNER"]), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { memberIds, action, type, amount, paymentMode, membershipPlan } = req.body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "Required array: memberIds" });
  }

  const results: any[] = [];
  const actor = { id: user.userId, name: user.email, role: user.role };

  for (const id of memberIds) {
    try {
      if (action === "INVOICE") {
        const amt = Number(amount) || 1200;
        const transaction = PaymentService.collectFee({
          gymId,
          memberId: id,
          amount: amt,
          type: type || "Membership Fee",
          paymentMode: paymentMode || "Cash",
          membershipPlan: membershipPlan || "Standard Bulk Renewal",
          actor
        });
        results.push({ memberId: id, success: true, invoiceNo: transaction.invoice.invoiceNo });
      } else if (action === "REMINDER") {
        const memberUser = db.getUsers().find(u => u.id === id);
        if (!memberUser) continue;
        const template = db.getMessageTemplates().find(t => t.gymId === gymId && t.type === "Fee Due Reminder");
        const bodyText = template?.bodyText || "Hi {{MemberName}},\n\nFriendly reminder regarding dues at {{GymName}}.";
        const msg = CommunicationService.parseTemplate(bodyText, {
          MemberName: memberUser.fullName,
          GymName: "Elite Fitness Gym",
          Amount: String(amount || 1200),
          DueDate: new Date().toISOString().split("T")[0]
        });

        const newLog: CommunicationLog = {
          id: "log-" + Math.floor(100000 + Math.random() * 900000),
          gymId,
          memberId: id,
          memberName: memberUser.fullName,
          type: "WhatsApp",
          category: "Fee Due Reminder",
          message: msg,
          status: "Sent",
          sentAt: new Date().toISOString()
        };
        db.getCommunicationLogs().push(newLog);
        results.push({ memberId: id, success: true, message: "Reminder registered in billing timeline." });
      }
    } catch (err: any) {
      results.push({ memberId: id, success: false, error: err.message });
    }
  }

  db.save();
  res.json({ success: true, results });
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

  // New multi-tenant Phase 3B metrics
  const today = new Date();
  const todayMonthDay = todayStr.substring(5, 10); // MM-DD
  
  // Start of this month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const newMembersThisMonth = gymMembers.filter(m => {
    if (!m.joiningDate) return false;
    const jDate = new Date(m.joiningDate);
    return jDate >= startOfMonth && jDate <= today;
  }).length;

  const frozenCount = gymMembers.filter(m => m.status === "Inactive" || m.status === "Pending").length;

  const todaysBirthdays = gymMembers.filter(m => {
    if (!m.dob) return false;
    return m.dob.substring(5, 10) === todayMonthDay;
  }).map(m => {
    const u = db.getUsers().find(userObj => userObj.id === m.id);
    return {
      id: m.id,
      name: u?.fullName || "Member",
      photo: m.photo
    };
  });

  const memberMemberships = db.getMemberMemberships().filter(m => m.gymId === gymId);
  const activeMemberships = memberMemberships.filter(m => m.status === "Active");

  // Next week expiries date boundary
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  const expiriesThisWeek = activeMemberships.filter(msh => {
    const eDate = new Date(msh.endDate);
    const todayZero = new Date(todayStr);
    const eDateZero = new Date(msh.endDate);
    return eDateZero >= todayZero && eDateZero <= next7Days;
  }).map(msh => {
    const m = gymMembers.find(memberObj => memberObj.id === msh.memberId);
    const u = db.getUsers().find(userObj => userObj.id === msh.memberId);
    return {
      memberId: msh.memberId,
      name: u?.fullName || "Member",
      expiryDate: msh.endDate,
      planName: db.getMembershipPlans().find(p => p.id === msh.planId)?.name || "Plan"
    };
  });

  // Next 30 days renewals due count
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);
  const renewalsCount = activeMemberships.filter(msh => {
    const eDate = new Date(msh.endDate);
    const todayZero = new Date(todayStr);
    const eDateZero = new Date(msh.endDate);
    return eDateZero >= todayZero && eDateZero <= next30Days;
  }).length;

  // QR Attendance logged today count
  const qrAttendanceCount = db.getAttendance().filter(a => 
    a.gymId === gymId && 
    a.date === todayStr && 
    (a.remarks && a.remarks.toLowerCase().includes("qr"))
  ).length;

  res.json({
    membersCountTotal,
    genders: {
      femaleCount,
      maleCount
    },
    financial,
    membershipsStats,
    attendanceTodayCount,
    newMembersThisMonth,
    renewalsCount,
    frozenCount,
    todaysBirthdays,
    qrAttendanceCount,
    expiriesThisWeek
  });
});

// ==========================================
// 17B. ADVANCED MEMBER LIFECYCLE & QR ATTENDANCE
// ==========================================

// RECORD WEIGHT, BMI, BODY FAT AND RELEVANT MEASUREMENTS
router.post("/members/:id/progress", authenticate, authorize(["GYM_OWNER", "TRAINER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  const member = db.getMembers().find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ error: "Member profile not found." });
  }

  const {
    date,
    weight,
    bmi,
    bodyFat,
    chest,
    waist,
    hip,
    biceps,
    thigh,
    notes
  } = req.body;

  let finalBMI = bmi;
  if (!finalBMI && weight && member.height) {
    const hMt = member.height / 100;
    finalBMI = parseFloat((weight / (hMt * hMt)).toFixed(1));
  }

  const newProgressRec = {
    id: "progress-" + Math.floor(100000 + Math.random() * 900000),
    gymId,
    memberId: id,
    date: date || new Date().toISOString().split("T")[0],
    weight: Number(weight || member.weight || 0),
    bmi: Number(finalBMI || member.bmi || 0),
    bodyFat: Number(bodyFat || member.bodyFat || 0),
    chest: Number(chest || member.chest || 0),
    waist: Number(waist || member.waist || 0),
    hip: Number(hip || member.hip || 0),
    biceps: Number(biceps || member.biceps || 0),
    thigh: Number(thigh || member.thigh || 0),
    notes: notes || "",
    createdAt: new Date().toISOString()
  };

  db.getMemberProgress().push(newProgressRec);

  // Update latest stats on member profile
  if (weight) member.weight = Number(weight);
  if (finalBMI) member.bmi = Number(finalBMI);
  if (bodyFat) member.bodyFat = Number(bodyFat);
  if (chest) member.chest = Number(chest);
  if (waist) member.waist = Number(waist);
  if (hip) member.hip = Number(hip);
  if (biceps) member.biceps = Number(biceps);
  if (thigh) member.thigh = Number(thigh);
  if (notes) member.trainerNotes = notes;

  db.save();

  // Log timeline
  db.addTimelineEntry(gymId, id, "Workout", "Physical Stats Recorded", `Measurements logged (Weight: ${weight || member.weight}kg, Body Fat: ${bodyFat || member.bodyFat}%).`);

  res.status(201).json({ success: true, progress: newProgressRec });
});

// GET PROGRESS RECORDS (FOR GRAPHS / TRENDS)
router.get("/members/:id/progress", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  const member = db.getMembers().find(m => m.id === id);
  if (!member) return res.status(404).json({ error: "Member not found." });

  const list = db.getMemberProgress().filter(p => p.memberId === id && p.gymId === gymId);
  res.json(list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
});

// POST PROGRESS COMPARISON PHOTO
router.post("/members/:id/progress-photos", authenticate, authorize(["GYM_OWNER", "TRAINER"]), (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  const { category, photo } = req.body;
  if (!category || !photo) {
    return res.status(400).json({ error: "Missing required fields: category, photo" });
  }

  try {
    const photoUrl = saveBase64Image(photo, `progress-${category.toLowerCase()}`);
    
    const newPhoto = {
      id: "ph-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      memberId: id,
      date: new Date().toISOString().split("T")[0],
      category: category as "Front" | "Side" | "Back" | "Comparison",
      photoPath: photoUrl,
      createdAt: new Date().toISOString()
    };

    db.getMemberProgressPhotos().push(newPhoto);
    db.save();

    // Log timeline
    db.addTimelineEntry(gymId, id, "Workout", "Progress Photo Uploaded", `Uploaded progress photo under category '${category}'.`);

    res.status(201).json({ success: true, photo: newPhoto });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET PROGRESS COMPARISON PHOTOS
router.get("/members/:id/progress-photos", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  const photos = db.getMemberProgressPhotos().filter(p => p.memberId === id && p.gymId === gymId);
  res.json(photos);
});

// GET CHRONOLOGICAL TIMELINE OF ALL LOGGED EVENTS
router.get("/members/:id/timeline", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  // Double check user authorization to avoid leak
  const targetUser = db.getUsers().find(u => u.id === id);
  if (!targetUser || (user.role !== "SUPER_ADMIN" && targetUser.gymId !== user.gymId)) {
    return res.status(403).json({ error: "Permission Denied." });
  }

  const list = db.getMemberTimeline().filter(t => t.memberId === id && t.gymId === gymId);
  res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// GET QR SIGNATURE FOR MEMBER TO DISPLAY OR RENDER
router.get("/members/:id/qr", authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";

  const member = db.getMembers().find(m => m.id === id);
  if (!member) return res.status(404).json({ error: "Member not found." });

  const token = generateQrToken(id, gymId);
  res.json({ token });
});

// SCAN QR CODE FOR ATTENDANCE CHECK-IN / CHECK-OUT WITH DUPLICATION BLOCK
router.post("/attendance/scan-qr", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { qrToken } = req.body;

  if (!qrToken) {
    return res.status(400).json({ error: "QR token is required." });
  }

  const verified = validateQrToken(qrToken);
  if (!verified) {
    return res.status(400).json({ error: "Invalid QR Security Signature." });
  }

  if (verified.gymId !== gymId) {
    return res.status(403).json({ error: "Access Denied: Member registered in a separate branch/gym." });
  }

  const { memberId } = verified;
  const memberObj = db.getMembers().find(m => m.id === memberId);
  const memberUser = db.getUsers().find(u => u.id === memberId);
  if (!memberObj || !memberUser) {
    return res.status(404).json({ error: "Gym member not found." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit' });

  // Lookup existing logs for today
  const attendanceToday = db.getAttendance().find(a => a.gymId === gymId && a.memberId === memberId && a.date === todayStr);

  if (attendanceToday) {
    if (!attendanceToday.timeOut) {
      // Check-out scanning
      attendanceToday.timeOut = timeNow;
      db.save();
      
      db.addTimelineEntry(gymId, memberId, "Attendance", "Checked Out via QR", `Session ends. Logged exit at ${timeNow}.`);
      return res.json({
        success: true,
        status: "checked_out",
        member: { id: memberId, name: memberUser.fullName, code: memberObj.memberId },
        attendance: attendanceToday
      });
    } else {
      return res.status(400).json({ error: "Already checked in and checked out for today. Multiple check-ins blocked." });
    }
  } else {
    // Check-in scanning
    const newLog = {
      id: "att-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      memberId,
      date: todayStr,
      timeIn: timeNow,
      timeOut: null,
      remarks: "Checked in using QR Code scanner",
      markedBy: user.email
    };
    db.getAttendance().push(newLog);
    db.save();

    db.addTimelineEntry(gymId, memberId, "Attendance", "Checked In via QR", `Session started. Logged entry at ${timeNow}.`);
    return res.json({
      success: true,
      status: "checked_in",
      member: { id: memberId, name: memberUser.fullName, code: memberObj.memberId },
      attendance: newLog
    });
  }
});

// SEARCH & EXPORT REPORTS payload GENERATION
router.get("/reports/:type", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gymId = user.gymId || "gym-1";
  const { type } = req.params;

  if (type === "member") {
    const list = db.getMembers().filter(m => {
      const u = db.getUsers().find(usr => usr.id === m.id);
      return u && u.gymId === gymId;
    }).map(m => {
      const u = db.getUsers().find(usr => usr.id === m.id);
      const plan = db.getMembershipPlans().find(p => p.id === m.activePlanId);
      return {
        memberDisplayId: m.memberId,
        fullName: u?.fullName || "N/A",
        email: u?.email || "N/A",
        phone: u?.phone || "N/A",
        joiningDate: m.joiningDate,
        activePlan: plan?.name || "No Plan",
        status: m.status
      };
    });
    return res.json(list);
  }

  if (type === "progress") {
    const list = db.getMemberProgress().filter(p => p.gymId === gymId).map(p => {
      const m = db.getMembers().find(mo => mo.id === p.memberId);
      const u = db.getUsers().find(usr => usr.id === p.memberId);
      return {
        date: p.date,
        memberDisplayId: m?.memberId || "N/A",
        memberName: u?.fullName || "N/A",
        weight: p.weight,
        bmi: p.bmi,
        bodyFat: p.bodyFat,
        chest: p.chest,
        waist: p.waist,
        hip: p.hip,
        biceps: p.biceps,
        thigh: p.thigh,
        notes: p.notes
      };
    });
    return res.json(list);
  }

  if (type === "attendance") {
    const list = db.getAttendance().filter(a => a.gymId === gymId).map(a => {
      const m = db.getMembers().find(mo => mo.id === a.memberId);
      const u = db.getUsers().find(usr => usr.id === a.memberId);
      return {
        date: a.date,
        memberDisplayId: m?.memberId || "N/A",
        memberName: u?.fullName || "N/A",
        timeIn: a.timeIn,
        timeOut: a.timeOut || "Active",
        remarks: a.remarks,
        markedBy: a.markedBy
      };
    });
    return res.json(list);
  }

  if (type === "renewal") {
    const memberships = db.getMemberMemberships().filter(msh => msh.gymId === gymId);
    const list = memberships.map(msh => {
      const m = db.getMembers().find(mo => mo.id === msh.memberId);
      const u = db.getUsers().find(usr => usr.id === msh.memberId);
      const plan = db.getMembershipPlans().find(p => p.id === msh.planId);
      return {
        memberDisplayId: m?.memberId || "N/A",
        memberName: u?.fullName || "N/A",
        planName: plan?.name || "N/A",
        startDate: msh.startDate,
        endDate: msh.endDate,
        pricePaid: msh.pricePaid,
        status: msh.status
      };
    });
    return res.json(list);
  }

  if (type === "trainer") {
    const trainers = db.getUsers().filter(u => u.gymId === gymId && u.role === "TRAINER");
    const list = trainers.map(t => {
      const assigned = db.getMembers().filter(m => m.trainerId === t.id);
      return {
        trainerName: t.fullName,
        trainerEmail: t.email,
        trainerPhone: t.phone,
        status: t.status,
        assignedClientsCount: assigned.length,
        clients: assigned.map(m => {
          const u = db.getUsers().find(usr => usr.id === m.id);
          return `${u?.fullName || "Client"} (${m.memberId})`;
        }).join(", ")
      };
    });
    return res.json(list);
  }

  res.status(400).json({ error: "Invalid report type requested." });
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
