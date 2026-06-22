import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { runDatabaseInitialization } from "./init-db";

// Define DB paths
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "gymflow_db.json");

// Define Interfaces representing our full multi-tenant CRM database tables
export interface Role {
  id: string;
  name: "SUPER_ADMIN" | "GYM_OWNER" | "TRAINER" | "RECEPTIONIST" | "MEMBER";
  description: string;
}

export interface Gym {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  subscriptionPlan: "BASIC" | "PREMIUM" | "ENTERPRISE";
  subscriptionExpiry: string;
  createdAt: string;
}

export interface User {
  id: string;
  gymId: string | null; // null for Super Admins
  roleId: string; // references Role
  role: "SUPER_ADMIN" | "GYM_OWNER" | "TRAINER" | "RECEPTIONIST" | "MEMBER";
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  refreshToken?: string;
  forcePasswordChange?: boolean;
  createdAt: string;
}

export interface MemberProfile {
  id: string; // Matches User.id
  memberId: string; // Display ID, e.g., "MEMBER-1001"
  gender: "Male" | "Female" | "Other";
  dob: string;
  height: number; // in cm
  weight: number; // in kg
  bmi: number;
  bloodGroup: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joiningDate: string;
  trainerId: string | null; // Asssigned trainer User.id
  activePlanId: string | null; // MembershipPlan ID
  status: "Active" | "Inactive" | "Expired" | "Pending";
  photo: string; // URL string or placeholder
  occupation?: string;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  biceps?: number;
  thigh?: number;
  fitnessGoal?: string;
  medicalConditions?: string;
  injuries?: string;
  allergies?: string;
  medications?: string;
  trainerNotes?: string;
  medicalWarnings?: string;
  locker?: string;
  ptPackage?: string;
  startDate?: string;
  endDate?: string;
}

export interface MembershipPlan {
  id: string;
  gymId: string;
  name: string; // e.g. "Monthly Basic", "Quarterly Pro", etc.
  duration: "Monthly" | "Quarterly" | "Half Yearly" | "Annual" | "Custom";
  price: number;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string; // references User.id
  amount: number;
  type: "Registration Fee" | "Membership Fee" | "Personal Training Fee";
  paymentMode: "Cash" | "UPI" | "Bank" | "Card";
  status: "Paid" | "Pending" | "Overdue";
  dueDate: string | null;
  paymentDate: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string; // e.g., "INV-2026-0001"
  paymentId: string; // references Payment
  gymId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issuedAt: string;
  discount?: number;
  dueDate?: string | null;
  notes?: string | null;
  status?: "Paid" | "Pending" | "Overdue";
  paymentMode?: "Cash" | "UPI" | "Bank" | "Card";
  membershipPlan?: string | null;
  billingPeriod?: string | null;
}

export interface WhatsappSettings {
  id: string;
  gymId: string;
  provider: "Meta" | "Twilio" | "360dialog" | "Interakt" | "AiSensy" | "WhatsAppWeb";
  apiKey: string;
  phoneNumberId: string;
  wabaId: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  gymId: string;
  type: string; // "Welcome Member", "Payment Received", "Invoice Generated", "Membership Renewal", "Membership Expiry", "Fee Due Reminder", "Birthday Wishes", "Festival Greetings", "Promotional Offer", "Attendance Reminder", "Gym Closed Notice"
  title: string;
  bodyText: string;
  variables: string[]; // e.g. ["MemberName", "GymName", "Amount", "DueDate", "InvoiceNumber", "MembershipPlan"]
  updatedAt: string;
}

export interface CommunicationLog {
  id: string;
  gymId: string;
  memberId: string;
  memberName: string;
  type: string; // "WhatsApp", "Email", "SMS"
  category: string; // Template category, e.g. "Welcome Member", "Invoice Generated"
  message: string;
  status: "Sent" | "Failed" | "Pending";
  sentAt: string;
}

export interface BillingReminder {
  id: string;
  gymId: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  type: "Membership Expiry" | "Payment Overdue" | "Pending Payment" | "Due Soon";
  status: "Pending" | "Sent" | "Dismissed";
  dueDate: string;
  daysRemaining: number;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  gymId: string;
  memberId: string;
  type: "Invoice" | "Receipt" | "MembershipCard";
  referenceId: string; // e.g. invoiceNo or paymentId
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export interface Attendance {
  id: string;
  gymId: string;
  memberId: string; // references User.id
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM:SS
  timeOut: string | null; // HH:MM:SS
  remarks: string;
  markedBy: string; // User ID/Name marking it
}

export interface WorkoutPlan {
  id: string;
  gymId: string;
  memberId: string; // references User.id
  trainerId: string; // references User.id
  assignedDate: string;
  exercises: {
    name: string;
    sets: number;
    reps: string; // e.g. "12-10-8" or "10"
    durationMin: number;
    notes: string;
  }[];
  notes: string;
  history: {
    date: string;
    completed: boolean;
    remarks: string;
  }[];
}

export interface DietPlan {
  id: string;
  gymId: string;
  memberId: string; // references User.id
  trainerId: string; // references User.id
  assignedDate: string;
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string;
  };
  targets: {
    calories: number;
    proteinGrams: number;
    waterIntakeLiters: number;
  };
  notes: string;
}

export interface Notification {
  id: string;
  gymId: string | null; // null for Super Admin announcements
  type: "Membership Expiry" | "Fee Due" | "Birthday" | "Announcement";
  title: string;
  message: string;
  userId: string | null; // Target user, null for bulk/broadcast
  isReadBy: string[]; // List of userIds who marked read
  scheduledFor: string;
  createdAt: string;
}

export interface FutureCameraAttendance {
  id: string;
  gymId: string;
  placeholderText: string;
  notes: string;
  deviceStatus: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface MemberMembership {
  id: string;
  gymId: string;
  memberId: string; // references User.id
  planId: string; // references MembershipPlan.id
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: "Active" | "Expired" | "Frozen" | "Cancelled";
  pricePaid: number;
  freezeDate?: string;
  cancelDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  gymId: string;
  category: "Rent" | "Salary" | "Electricity" | "Water" | "Equipment" | "Maintenance" | "Marketing" | "Miscellaneous";
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  createdAt: string;
}

export interface Settings {
  id: string;
  gymId: string;
  gymName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  currency: string;
  workingHours: string;
  receiptFooter: string;
  paymentQr: string;
  taxPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  gymId: string | null;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface MemberProgress {
  id: string;
  gymId: string;
  memberId: string;
  date: string;
  weight: number;
  bmi: number;
  bodyFat: number;
  chest: number;
  waist: number;
  hip: number;
  biceps: number;
  thigh: number;
  notes: string;
  createdAt: string;
}

export interface MemberProgressPhoto {
  id: string;
  gymId: string;
  memberId: string;
  date: string;
  category: "Front" | "Side" | "Back" | "Comparison";
  photoPath: string;
  createdAt: string;
}

export interface MemberTimeline {
  id: string;
  gymId: string;
  memberId: string;
  date: string;
  type: string; // 'Registration' | 'Attendance' | 'Payment' | 'Renewal' | 'Workout' | 'Diet' | 'TrainerNotes'
  title: string;
  description: string;
  createdAt: string;
}

// Entire Database Structure
export interface DatabaseStructure {
  roles: Role[];
  permissions: Permission[];
  gyms: Gym[];
  users: User[];
  members: MemberProfile[];
  membershipPlans: MembershipPlan[];
  memberMemberships: MemberMembership[];
  payments: Payment[];
  invoices: Invoice[];
  attendance: Attendance[];
  workoutPlans: WorkoutPlan[];
  dietPlans: DietPlan[];
  notifications: Notification[];
  expenses: Expense[];
  settings: Settings[];
  auditLogs: AuditLog[];
  futureCameraAttendance: FutureCameraAttendance[];
  memberProgress: MemberProgress[];
  memberProgressPhotos: MemberProgressPhoto[];
  memberTimeline: MemberTimeline[];
  whatsappSettings?: WhatsappSettings[];
  messageTemplates?: MessageTemplate[];
  communicationLogs?: CommunicationLog[];
  billingReminders?: BillingReminder[];
  generatedDocuments?: GeneratedDocument[];
}

// Create a singleton DB helper class
class CRMDatabase {
  private data: DatabaseStructure;
  public isMySQLActive = false;
  private dbPool: mysql.Pool | null = null;

  constructor() {
    this.data = this.loadDB();
  }

  // Initialize MySQL environment (called from server start)
  public async initMySQL(): Promise<void> {
    const dbHost = process.env.DB_HOST;
    if (!dbHost) {
      console.log("[CRMDatabase] No DB_HOST set in environment. Running with local JSON database fallback.");
      return;
    }

    try {
      console.log("[CRMDatabase] Running MySQL table creation and validation check...");
      await runDatabaseInitialization(false, 30);

      const dbPort = parseInt(process.env.DB_PORT || "3306");
      const dbName = process.env.DB_NAME || "gymcrm";
      const dbUser = process.env.DB_USER || "gymuser";
      const dbPassword = process.env.DB_PASSWORD || "gympass";

      this.dbPool = mysql.createPool({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
      });

      console.log("[CRMDatabase] Successfully created MySQL connection pool!");

      // Verify if database needs seeding, i.e. if users table has no records
      const [rows]: any = await this.dbPool.query("SELECT COUNT(*) as count FROM users");
      const userCount = rows[0]?.count || 0;

      if (userCount === 0) {
        console.log("[CRMDatabase] MySQL Database tables are empty. Initiating high-fidelity data seeding...");
        
        const seed = this.generateSeedData();
        const conn = await this.dbPool.getConnection();
        try {
          await conn.beginTransaction();

          // Roles
          for (const r of seed.roles) {
            await conn.query("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)", [r.id, r.name, r.description]);
          }
          // Permissions
          for (const p of seed.permissions || []) {
            await conn.query("INSERT INTO permissions (id, name, description) VALUES (?, ?, ?)", [p.id, p.name, p.description]);
          }
          // Gyms
          for (const g of seed.gyms) {
            await conn.query("INSERT INTO gyms (id, name, slug, address, phone, email, status, subscriptionPlan, subscriptionExpiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [g.id, g.name, g.slug, g.address, g.phone, g.email, g.status, g.subscriptionPlan, g.subscriptionExpiry, g.createdAt]);
          }
          // Users
          for (const u of seed.users) {
            await conn.query("INSERT INTO users (id, gymId, roleId, role, fullName, email, passwordHash, passwordSalt, phone, status, refreshToken, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [u.id, u.gymId, u.roleId, u.role, u.fullName, u.email, u.passwordHash, u.passwordSalt, u.phone, u.status, u.refreshToken || null, u.createdAt]);
          }
          // Members
          for (const m of seed.members) {
            await conn.query("INSERT INTO members (id, memberId, gender, dob, height, weight, bmi, bloodGroup, address, emergencyContactName, emergencyContactPhone, joiningDate, trainerId, activePlanId, status, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [m.id, m.memberId, m.gender, m.dob, m.height, m.weight, m.bmi, m.bloodGroup, m.address, m.emergencyContactName, m.emergencyContactPhone, m.joiningDate, m.trainerId || null, m.activePlanId || null, m.status, m.photo]);
          }
          // Membership Plans
          for (const p of seed.membershipPlans) {
            await conn.query("INSERT INTO membership_plans (id, gymId, name, duration, price, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [p.id, p.gymId, p.name, p.duration, p.price, p.description, p.createdAt]);
          }
          // Member Memberships
          for (const m of seed.memberMemberships || []) {
            await conn.query("INSERT INTO member_memberships (id, gymId, memberId, planId, startDate, endDate, status, pricePaid, freezeDate, cancelDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [m.id, m.gymId, m.memberId, m.planId, m.startDate, m.endDate, m.status, m.pricePaid, m.freezeDate || null, m.cancelDate || null, m.createdAt, m.updatedAt]);
          }
          // Payments
          for (const p of seed.payments) {
            await conn.query("INSERT INTO payments (id, gymId, memberId, amount, type, paymentMode, status, dueDate, paymentDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.gymId, p.memberId, p.amount, p.type, p.paymentMode, p.status, p.dueDate || null, p.paymentDate || null, p.createdAt]);
          }
          // Invoices
          for (const i of seed.invoices) {
            await conn.query("INSERT INTO invoices (id, invoiceNo, paymentId, gymId, memberId, memberName, memberEmail, amount, taxAmount, totalAmount, issuedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [i.id, i.invoiceNo, i.paymentId, i.gymId, i.memberId, i.memberName, i.memberEmail, i.amount, i.taxAmount, i.totalAmount, i.issuedAt]);
          }
          // Attendance
          for (const a of seed.attendance) {
            await conn.query("INSERT INTO attendance (id, gymId, memberId, date, timeIn, timeOut, remarks, markedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [a.id, a.gymId, a.memberId, a.date, a.timeIn, a.timeOut || null, a.remarks, a.markedBy]);
          }
          // Workout Plans
          for (const w of seed.workoutPlans) {
            await conn.query("INSERT INTO workout_plans (id, gymId, memberId, trainerId, assignedDate, exercises, notes, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [w.id, w.gymId, w.memberId, w.trainerId, w.assignedDate, JSON.stringify(w.exercises), w.notes, JSON.stringify(w.history)]);
          }
          // Diet Plans
          for (const d of seed.dietPlans) {
            await conn.query("INSERT INTO diet_plans (id, gymId, memberId, trainerId, assignedDate, meals, targets, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [d.id, d.gymId, d.memberId, d.trainerId, d.assignedDate, JSON.stringify(d.meals), JSON.stringify(d.targets), d.notes]);
          }
          // Notifications
          for (const n of seed.notifications) {
            await conn.query("INSERT INTO notifications (id, gymId, type, title, message, userId, isReadBy, scheduledFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [n.id, n.gymId, n.type, n.title, n.message, n.userId, JSON.stringify(n.isReadBy), n.scheduledFor, n.createdAt]);
          }
          // Expenses
          for (const e of seed.expenses || []) {
            await conn.query("INSERT INTO expenses (id, gymId, category, amount, date, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [e.id, e.gymId, e.category, e.amount, e.date, e.description, e.createdAt]);
          }
          // Settings
          for (const s of seed.settings || []) {
            await conn.query("INSERT INTO settings (id, gymId, gymName, logo, address, phone, email, gstNumber, currency, workingHours, receiptFooter, paymentQr, taxPercentage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.id, s.gymId, s.gymName, s.logo, s.address, s.phone, s.email, s.gstNumber, s.currency, s.workingHours, s.receiptFooter, s.paymentQr, s.taxPercentage, s.createdAt, s.updatedAt]);
          }
          // Audit Logs
          for (const l of seed.auditLogs || []) {
            await conn.query("INSERT INTO audit_logs (id, gymId, userId, userName, userRole, action, details, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [l.id, l.gymId, l.userId, l.userName, l.userRole, l.action, l.details, l.ipAddress, l.createdAt]);
          }
          // Future Camera Attendance
          for (const c of seed.futureCameraAttendance) {
            await conn.query("INSERT INTO future_camera_attendance (id, gymId, placeholderText, notes, deviceStatus) VALUES (?, ?, ?, ?, ?)", [c.id, c.gymId, c.placeholderText, c.notes, c.deviceStatus]);
          }

          await conn.commit();
          console.log("[CRMDatabase] Database tables seeded successfully!");
        } catch (seedErr) {
          await conn.rollback();
          throw seedErr;
        } finally {
          conn.release();
        }
      }

      // Load all records from MySQL tables into this.data structures
      console.log("[CRMDatabase] Loading relational records from MySQL database...");
      
      const [usersRows] = await this.dbPool.query("SELECT * FROM users");
      const [rolesRows] = await this.dbPool.query("SELECT * FROM roles");
      const [permissionsRows] = await this.dbPool.query("SELECT * FROM permissions");
      const [gymsRows] = await this.dbPool.query("SELECT * FROM gyms");
      const [membersRows] = await this.dbPool.query("SELECT * FROM members");
      const [membershipPlansRows] = await this.dbPool.query("SELECT * FROM membership_plans");
      const [memberMembershipsRows] = await this.dbPool.query("SELECT * FROM member_memberships");
      const [paymentsRows] = await this.dbPool.query("SELECT * FROM payments");
      const [invoicesRows] = await this.dbPool.query("SELECT * FROM invoices");
      const [attendanceRows] = await this.dbPool.query("SELECT * FROM attendance");
      const [workoutPlansRows] = await this.dbPool.query("SELECT * FROM workout_plans");
      const [dietPlansRows] = await this.dbPool.query("SELECT * FROM diet_plans");
      const [notificationsRows] = await this.dbPool.query("SELECT * FROM notifications");
      const [expensesRows] = await this.dbPool.query("SELECT * FROM expenses");
      const [settingsRows] = await this.dbPool.query("SELECT * FROM settings");
      const [auditLogsRows] = await this.dbPool.query("SELECT * FROM audit_logs");
      const [futureCameraAttendanceRows] = await this.dbPool.query("SELECT * FROM future_camera_attendance");
      const [progressRows] = await this.dbPool.query("SELECT * FROM member_progress");
      const [photosRows] = await this.dbPool.query("SELECT * FROM member_progress_photos");
      const [timelineRows] = await this.dbPool.query("SELECT * FROM member_timeline");

      let whatsappSettingsRows = [];
      let messageTemplatesRows = [];
      let communicationLogsRows = [];
      let billingRemindersRows = [];
      let generatedDocumentsRows = [];

      try { const [rows] = await this.dbPool.query("SELECT * FROM whatsapp_settings"); whatsappSettingsRows = rows as any[]; } catch (e) {}
      try { const [rows] = await this.dbPool.query("SELECT * FROM message_templates"); messageTemplatesRows = rows as any[]; } catch (e) {}
      try { const [rows] = await this.dbPool.query("SELECT * FROM communication_logs"); communicationLogsRows = rows as any[]; } catch (e) {}
      try { const [rows] = await this.dbPool.query("SELECT * FROM billing_reminders"); billingRemindersRows = rows as any[]; } catch (e) {}
      try { const [rows] = await this.dbPool.query("SELECT * FROM generated_documents"); generatedDocumentsRows = rows as any[]; } catch (e) {}

      this.data = {
        roles: rolesRows as Role[],
        permissions: permissionsRows as Permission[],
        gyms: gymsRows as Gym[],
        users: usersRows as User[],
        members: membersRows as MemberProfile[],
        membershipPlans: membershipPlansRows as MembershipPlan[],
        memberMemberships: memberMembershipsRows as MemberMembership[],
        payments: paymentsRows as Payment[],
        invoices: (invoicesRows as any[]).map(inv => ({
          ...inv,
          discount: inv.discount || 0,
          status: inv.status || 'Paid',
          paymentMode: inv.paymentMode || 'Cash'
        })),
        attendance: attendanceRows as Attendance[],
        workoutPlans: (workoutPlansRows as any[]).map(w => ({
          ...w,
          exercises: typeof w.exercises === 'string' ? JSON.parse(w.exercises) : w.exercises,
          history: typeof w.history === 'string' ? JSON.parse(w.history) : w.history,
        })),
        dietPlans: (dietPlansRows as any[]).map(d => ({
          ...d,
          meals: typeof d.meals === 'string' ? JSON.parse(d.meals) : d.meals,
          targets: typeof d.targets === 'string' ? JSON.parse(d.targets) : d.targets,
        })),
        notifications: (notificationsRows as any[]).map(n => ({
          ...n,
          isReadBy: typeof n.isReadBy === 'string' ? JSON.parse(n.isReadBy) : n.isReadBy,
        })),
        expenses: expensesRows as Expense[],
        settings: settingsRows as Settings[],
        auditLogs: auditLogsRows as AuditLog[],
        futureCameraAttendance: futureCameraAttendanceRows as FutureCameraAttendance[],
        memberProgress: progressRows as MemberProgress[],
        memberProgressPhotos: photosRows as MemberProgressPhoto[],
        memberTimeline: timelineRows as MemberTimeline[],
        whatsappSettings: whatsappSettingsRows.map((s: any) => ({ ...s })),
        messageTemplates: messageTemplatesRows.map((t: any) => ({
          ...t,
          variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : (t.variables || [])
        })),
        communicationLogs: communicationLogsRows.map((l: any) => ({ ...l })),
        billingReminders: billingRemindersRows.map((r: any) => ({ ...r })),
        generatedDocuments: generatedDocumentsRows.map((d: any) => ({ ...d }))
      };

      this.isMySQLActive = true;
      console.log("[CRMDatabase] MySQL Database integration active and fully loaded with connection pool.");
    } catch (err: any) {
      console.error("[CRMDatabase] Failed to initialize MySQL connection pool. Error details:", err?.message || err);
      this.isMySQLActive = false;
      console.log("[CRMDatabase] Running with local JSON fallback (SaaS high-resiliency mode enabled).");
    }
  }

  // Save changes to MySQL transactionally
  public async saveToMySQL(): Promise<void> {
    if (!this.dbPool || !this.isMySQLActive) return;
    const conn = await this.dbPool.getConnection();

    try {
      await conn.beginTransaction();

      // Clear tables and insert current memory state
      await conn.query("DELETE FROM roles");
      for (const r of this.data.roles) {
        await conn.query("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)", [r.id, r.name, r.description]);
      }

      await conn.query("DELETE FROM permissions");
      for (const p of this.data.permissions || []) {
        await conn.query("INSERT INTO permissions (id, name, description) VALUES (?, ?, ?)", [p.id, p.name, p.description]);
      }

      await conn.query("DELETE FROM gyms");
      for (const g of this.data.gyms) {
        await conn.query("INSERT INTO gyms (id, name, slug, address, phone, email, status, subscriptionPlan, subscriptionExpiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [g.id, g.name, g.slug, g.address, g.phone, g.email, g.status, g.subscriptionPlan, g.subscriptionExpiry, g.createdAt]);
      }

      await conn.query("DELETE FROM users");
      for (const u of this.data.users) {
        await conn.query("INSERT INTO users (id, gymId, roleId, role, fullName, email, passwordHash, passwordSalt, phone, status, refreshToken, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [u.id, u.gymId, u.roleId, u.role, u.fullName, u.email, u.passwordHash, u.passwordSalt, u.phone, u.status, u.refreshToken || null, u.createdAt]);
      }

      await conn.query("DELETE FROM members");
      for (const m of this.data.members) {
        await conn.query(
          `INSERT INTO members (
            id, memberId, gender, dob, height, weight, bmi, bloodGroup, address, emergencyContactName, emergencyContactPhone, joiningDate, trainerId, activePlanId, status, photo,
            occupation, bodyFat, chest, waist, hip, biceps, thigh, fitnessGoal, medicalConditions, injuries, allergies, medications, trainerNotes, medicalWarnings, locker, ptPackage, startDate, endDate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id, m.memberId, m.gender, m.dob, m.height, m.weight, m.bmi, m.bloodGroup, m.address, m.emergencyContactName, m.emergencyContactPhone, m.joiningDate, m.trainerId || null, m.activePlanId || null, m.status, m.photo,
            m.occupation || null, m.bodyFat || 0, m.chest || 0, m.waist || 0, m.hip || 0, m.biceps || 0, m.thigh || 0, m.fitnessGoal || null, m.medicalConditions || null,
            m.injuries || null, m.allergies || null, m.medications || null, m.trainerNotes || null, m.medicalWarnings || null, m.locker || null, m.ptPackage || null, m.startDate || null, m.endDate || null
          ]
        );
      }

      await conn.query("DELETE FROM membership_plans");
      for (const p of this.data.membershipPlans) {
        await conn.query("INSERT INTO membership_plans (id, gymId, name, duration, price, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [p.id, p.gymId, p.name, p.duration, p.price, p.description, p.createdAt]);
      }

      await conn.query("DELETE FROM member_memberships");
      for (const m of this.data.memberMemberships || []) {
        await conn.query("INSERT INTO member_memberships (id, gymId, memberId, planId, startDate, endDate, status, pricePaid, freezeDate, cancelDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [m.id, m.gymId, m.memberId, m.planId, m.startDate, m.endDate, m.status, m.pricePaid, m.freezeDate || null, m.cancelDate || null, m.createdAt, m.updatedAt]);
      }

      await conn.query("DELETE FROM payments");
      for (const p of this.data.payments) {
        await conn.query("INSERT INTO payments (id, gymId, memberId, amount, type, paymentMode, status, dueDate, paymentDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.gymId, p.memberId, p.amount, p.type, p.paymentMode, p.status, p.dueDate || null, p.paymentDate || null, p.createdAt]);
      }

      await conn.query("DELETE FROM invoices");
      for (const i of this.data.invoices) {
        await conn.query("INSERT INTO invoices (id, invoiceNo, paymentId, gymId, memberId, memberName, memberEmail, amount, taxAmount, totalAmount, issuedAt, discount, dueDate, notes, status, paymentMode, membershipPlan, billingPeriod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          i.id, i.invoiceNo, i.paymentId, i.gymId, i.memberId, i.memberName, i.memberEmail, i.amount, i.taxAmount, i.totalAmount, i.issuedAt,
          i.discount || 0, i.dueDate || null, i.notes || null, i.status || "Paid", i.paymentMode || "Cash", i.membershipPlan || null, i.billingPeriod || null
        ]);
      }

      await conn.query("DELETE FROM attendance");
      for (const a of this.data.attendance) {
        await conn.query("INSERT INTO attendance (id, gymId, memberId, date, timeIn, timeOut, remarks, markedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [a.id, a.gymId, a.memberId, a.date, a.timeIn, a.timeOut || null, a.remarks, a.markedBy]);
      }

      await conn.query("DELETE FROM workout_plans");
      for (const w of this.data.workoutPlans) {
        await conn.query("INSERT INTO workout_plans (id, gymId, memberId, trainerId, assignedDate, exercises, notes, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [w.id, w.gymId, w.memberId, w.trainerId, w.assignedDate, JSON.stringify(w.exercises), w.notes, JSON.stringify(w.history)]);
      }

      await conn.query("DELETE FROM diet_plans");
      for (const d of this.data.dietPlans) {
        await conn.query("INSERT INTO diet_plans (id, gymId, memberId, trainerId, assignedDate, meals, targets, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [d.id, d.gymId, d.memberId, d.trainerId, d.assignedDate, JSON.stringify(d.meals), JSON.stringify(d.targets), d.notes]);
      }

      await conn.query("DELETE FROM notifications");
      for (const n of this.data.notifications) {
        await conn.query("INSERT INTO notifications (id, gymId, type, title, message, userId, isReadBy, scheduledFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [n.id, n.gymId, n.type, n.title, n.message, n.userId, JSON.stringify(n.isReadBy), n.scheduledFor, n.createdAt]);
      }

      await conn.query("DELETE FROM expenses");
      for (const e of this.data.expenses || []) {
        await conn.query("INSERT INTO expenses (id, gymId, category, amount, date, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [e.id, e.gymId, e.category, e.amount, e.date, e.description, e.createdAt]);
      }

      await conn.query("DELETE FROM settings");
      for (const s of this.data.settings || []) {
        await conn.query("INSERT INTO settings (id, gymId, gymName, logo, address, phone, email, gstNumber, currency, workingHours, receiptFooter, paymentQr, taxPercentage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.id, s.gymId, s.gymName, s.logo, s.address, s.phone, s.email, s.gstNumber, s.currency, s.workingHours, s.receiptFooter, s.paymentQr, s.taxPercentage, s.createdAt, s.updatedAt]);
      }

      await conn.query("DELETE FROM audit_logs");
      for (const l of this.data.auditLogs || []) {
        await conn.query("INSERT INTO audit_logs (id, gymId, userId, userName, userRole, action, details, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [l.id, l.gymId, l.userId, l.userName, l.userRole, l.action, l.details, l.ipAddress, l.createdAt]);
      }

      await conn.query("DELETE FROM future_camera_attendance");
      for (const c of this.data.futureCameraAttendance) {
        await conn.query("INSERT INTO future_camera_attendance (id, gymId, placeholderText, notes, deviceStatus) VALUES (?, ?, ?, ?, ?)", [c.id, c.gymId, c.placeholderText, c.notes, c.deviceStatus]);
      }

      await conn.query("DELETE FROM member_progress");
      for (const p of this.data.memberProgress || []) {
        await conn.query("INSERT INTO member_progress (id, gymId, memberId, date, weight, bmi, bodyFat, chest, waist, hip, biceps, thigh, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.gymId, p.memberId, p.date, p.weight, p.bmi, p.bodyFat, p.chest, p.waist, p.hip, p.biceps, p.thigh, p.notes, p.createdAt]);
      }

      await conn.query("DELETE FROM member_progress_photos");
      for (const ph of this.data.memberProgressPhotos || []) {
        await conn.query("INSERT INTO member_progress_photos (id, gymId, memberId, date, category, photoPath, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [ph.id, ph.gymId, ph.memberId, ph.date, ph.category, ph.photoPath, ph.createdAt]);
      }

      await conn.query("DELETE FROM member_timeline");
      for (const tl of this.data.memberTimeline || []) {
        await conn.query("INSERT INTO member_timeline (id, gymId, memberId, date, type, title, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [tl.id, tl.gymId, tl.memberId, tl.date, tl.type, tl.title, tl.description, tl.createdAt]);
      }

      try {
        await conn.query("DELETE FROM whatsapp_settings");
        for (const s of this.data.whatsappSettings || []) {
          await conn.query("INSERT INTO whatsapp_settings (id, gymId, provider, apiKey, phoneNumberId, wabaId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.id, s.gymId, s.provider, s.apiKey, s.phoneNumberId, s.wabaId, s.status, s.createdAt, s.updatedAt]);
        }
      } catch (e) {}

      try {
        await conn.query("DELETE FROM message_templates");
        for (const t of this.data.messageTemplates || []) {
          await conn.query("INSERT INTO message_templates (id, gymId, type, title, bodyText, variables, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [t.id, t.gymId, t.type, t.title, t.bodyText, JSON.stringify(t.variables), t.updatedAt]);
        }
      } catch (e) {}

      try {
        await conn.query("DELETE FROM communication_logs");
        for (const l of this.data.communicationLogs || []) {
          await conn.query("INSERT INTO communication_logs (id, gymId, memberId, memberName, type, category, message, status, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [l.id, l.gymId, l.memberId, l.memberName, l.type, l.category, l.message, l.status, l.sentAt]);
        }
      } catch (e) {}

      try {
        await conn.query("DELETE FROM billing_reminders");
        for (const r of this.data.billingReminders || []) {
          await conn.query("INSERT INTO billing_reminders (id, gymId, memberId, memberName, planName, amount, type, status, dueDate, daysRemaining, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [r.id, r.gymId, r.memberId, r.memberName, r.planName, r.amount, r.type, r.status, r.dueDate, r.daysRemaining, r.createdAt]);
        }
      } catch (e) {}

      try {
        await conn.query("DELETE FROM generated_documents");
        for (const d of this.data.generatedDocuments || []) {
          await conn.query("INSERT INTO generated_documents (id, gymId, memberId, type, referenceId, filePath, fileSize, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [d.id, d.gymId, d.memberId, d.type, d.referenceId, d.filePath, d.fileSize, d.createdAt]);
        }
      } catch (e) {}

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Register a new multi-tenant Gym with transaction and rollback support
  public async registerTenantTransaction(
    gym: Gym, 
    user: any, 
    settings: any, 
    plans: any[], 
    notification: any
  ): Promise<void> {
    // 1. Validate duplicates before anything else:
    // Check if gym name matches existing gyms
    const existingGym = this.data.gyms.find(g => g.name.toLowerCase() === gym.name.toLowerCase());
    if (existingGym) {
      throw new Error("Gym name already exists. Please choose a unique name.");
    }
    // Check if owner email matches existing users
    const existingUserEmail = this.data.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existingUserEmail) {
      throw new Error("Email address is already registered.");
    }
    // Check if mobile number is duplicated
    const existingUserPhone = this.data.users.find(u => u.phone === user.phone);
    if (existingUserPhone) {
      throw new Error("Mobile number is already registered.");
    }

    // Backup the memory state for rollback inside JSON fallbacks
    const jsonBackup = JSON.parse(JSON.stringify(this.data));

    // 2. SQL transactional execution
    if (this.isMySQLActive && this.dbPool) {
      const conn = await this.dbPool.getConnection();
      try {
        await conn.beginTransaction();

        // Insert Gym record
        await conn.query(
          "INSERT INTO gyms (id, name, slug, address, phone, email, status, subscriptionPlan, subscriptionExpiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [gym.id, gym.name, gym.slug, gym.address, gym.phone, gym.email, gym.status, gym.subscriptionPlan, gym.subscriptionExpiry, gym.createdAt]
        );

        // Insert User record
        await conn.query(
          "INSERT INTO users (id, gymId, roleId, role, fullName, email, passwordHash, passwordSalt, phone, status, refreshToken, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [user.id, user.gymId, user.roleId, user.role, user.fullName, user.email, user.passwordHash, user.passwordSalt, user.phone, user.status, null, user.createdAt]
        );

        // Insert Settings record
        await conn.query(
          "INSERT INTO settings (id, gymId, gymName, logo, address, phone, email, gstNumber, currency, workingHours, receiptFooter, paymentQr, taxPercentage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [settings.id, settings.gymId, settings.gymName, settings.logo, settings.address, settings.phone, settings.email, settings.gstNumber, settings.currency, settings.workingHours, settings.receiptFooter, settings.paymentQr, settings.taxPercentage, settings.createdAt, settings.updatedAt]
        );

        // Insert plans list
        for (const p of plans) {
          await conn.query(
            "INSERT INTO membership_plans (id, gymId, name, duration, price, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [p.id, p.gymId, p.name, p.duration, p.price, p.description, p.createdAt]
          );
        }

        // Insert Notification record
        await conn.query(
          "INSERT INTO notifications (id, gymId, type, title, message, userId, isReadBy, scheduledFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [notification.id, notification.gymId, notification.type, notification.title, notification.message, notification.userId, JSON.stringify(notification.isReadBy), notification.scheduledFor, notification.createdAt]
        );

        await conn.commit();
      } catch (mysqlErr: any) {
        try {
          await conn.rollback();
        } catch (rbErr) {}
        // Restore memory state if we modified it partially
        this.data = jsonBackup;
        throw mysqlErr;
      } finally {
        conn.release();
      }
    }

    // 3. Update memory state for downstream API lookups
    this.data.gyms.push(gym);
    this.data.users.push(user);
    this.data.settings.push(settings);
    for (const p of plans) {
      this.data.membershipPlans.push(p);
    }
    this.data.notifications.push(notification);

    // Write-out JSON file to persist changes in backup mode
    this.saveStructure(this.data);
  }


  // Get path for DB source
  private getDbPath(): string {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return DB_FILE;
  }

  // Helper: Hash password
  public hashPassword(Password: string, Salt: string): string {
    if (Password.startsWith("$2a$") || Password.startsWith("$2b$")) {
      return Password;
    }
    return crypto.pbkdf2Sync(Password, Salt, 1000, 64, "sha512").toString("hex");
  }

  // Helper: Verify password using bcrypt or pbkdf2
  public verifyPassword(plain: string, hash: string, salt?: string): boolean {
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
      try {
        return bcrypt.compareSync(plain, hash);
      } catch (err) {
        return false;
      }
    }
    if (salt) {
      const calculated = crypto.pbkdf2Sync(plain, salt, 1000, 64, "sha512").toString("hex");
      return calculated === hash;
    }
    return false;
  }

  // Helper: Create new Salt and Hash using bcryptjs
  public createCredentials(Password: string) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(Password, salt);
    return { salt, hash };
  }

  // Load database from file or create dynamic seed data
  private loadDB(): DatabaseStructure {
    const dbPath = this.getDbPath();

    if (fs.existsSync(dbPath)) {
      try {
        const fileContent = fs.readFileSync(dbPath, "utf-8");
        const parsed = JSON.parse(fileContent) as any;
        
        // Relational Upgrade schemas backfill
        const seeded = this.generateSeedData();
        if (!parsed.permissions) parsed.permissions = seeded.permissions;
        if (!parsed.memberMemberships) parsed.memberMemberships = seeded.memberMemberships;
        if (!parsed.expenses) parsed.expenses = seeded.expenses;
        if (!parsed.settings) parsed.settings = seeded.settings;
        if (!parsed.auditLogs) parsed.auditLogs = seeded.auditLogs;
        
        if (!parsed.whatsappSettings) parsed.whatsappSettings = seeded.whatsappSettings || [];
        if (!parsed.messageTemplates) parsed.messageTemplates = seeded.messageTemplates || [];
        if (!parsed.communicationLogs) parsed.communicationLogs = seeded.communicationLogs || [];
        if (!parsed.billingReminders) parsed.billingReminders = seeded.billingReminders || [];
        if (!parsed.generatedDocuments) parsed.generatedDocuments = seeded.generatedDocuments || [];
        
        if (!parsed.memberProgress) parsed.memberProgress = [];
        if (!parsed.memberProgressPhotos) parsed.memberProgressPhotos = [];
        if (!parsed.memberTimeline) parsed.memberTimeline = [];

        // Check/Seed admin@gymflow.com on first load/installation
        if (parsed.users) {
          const adminUser = parsed.users.find((u: any) => u.email && u.email.toLowerCase() === "admin@gymflow.com");
          if (!adminUser) {
            const adminCreds = this.createCredentials("Admin@123");
            parsed.users.push({
              id: "usr-super",
              gymId: null,
              roleId: "role-1",
              role: "SUPER_ADMIN",
              fullName: "Alex Rivera",
              email: "admin@gymflow.com",
              passwordHash: adminCreds.hash,
              passwordSalt: adminCreds.salt,
              phone: "+1-555-0100",
              status: "ACTIVE",
              forcePasswordChange: true,
              createdAt: "2026-01-01T00:00:00Z",
            });
            this.saveStructure(parsed);
          } else if (adminUser.forcePasswordChange === undefined) {
            const adminCreds = this.createCredentials("Admin@123");
            adminUser.passwordHash = adminCreds.hash;
            adminUser.passwordSalt = adminCreds.salt;
            adminUser.forcePasswordChange = true;
            this.saveStructure(parsed);
          }
        }
        
        return parsed as DatabaseStructure;
      } catch (err) {
        console.error("Failed to parse database file. Re-seeding database.", err);
      }
    }

    // Initialize full structured seed dataset for sandbox environment
    const initialDB = this.generateSeedData();
    this.saveStructure(initialDB);
    return initialDB;
  }

  // Save the database memory structure to disk asynchronously/synchronously
  public save(): void {
    this.saveStructure(this.data);
    if (this.isMySQLActive) {
      this.saveToMySQL().catch((err) => {
        console.error("[CRMDatabase] Background MySQL save failed:", err);
      });
    }
  }

  private saveStructure(structure: DatabaseStructure): void {
    const dbPath = this.getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(structure, null, 2), "utf-8");
  }

  // Generate dynamic, high-fidelity mock data to make SaaS premium and usable out of the box
  private generateSeedData(): DatabaseStructure {
    console.log("Seeding Database for GymFlow CRM SaaS...");

    // Roles seed
    const roles: Role[] = [
      { id: "role-1", name: "SUPER_ADMIN", description: "SaaS Owner with global administrative access" },
      { id: "role-2", name: "GYM_OWNER", description: "Gym Owner managing branding, staffing, plans, and financials" },
      { id: "role-3", name: "TRAINER", description: "Fitness Coach creating plans and reviewing client progress" },
      { id: "role-4", name: "RECEPTIONIST", description: "Front desk ops registering members, taking fees, logging presence" },
      { id: "role-5", name: "MEMBER", description: "Active gym member tracking schedule, plans, and invoices" },
    ];

    // Gyms Seed - Support future Multi-Tenancy SaaS
    const gyms: Gym[] = [
      {
        id: "gym-1",
        name: "Elite Fitness Club",
        slug: "elite-fitness-club",
        address: "404 Powerhouse Boulevard, Metro City",
        phone: "+1-650-555-0199",
        email: "contact@elitefitness.com",
        status: "ACTIVE",
        subscriptionPlan: "PREMIUM",
        subscriptionExpiry: "2027-12-31",
        createdAt: "2026-01-15T09:00:00Z",
      },
      {
        id: "gym-2",
        name: "Iron Dungeon Gym",
        slug: "iron-dungeon",
        address: "88 Barbell Alley, Industrial Zone",
        phone: "+1-650-555-0201",
        email: "support@irondungeon.com",
        status: "ACTIVE",
        subscriptionPlan: "BASIC",
        subscriptionExpiry: "2026-11-30",
        createdAt: "2026-03-10T11:00:00Z",
      }
    ];

    // Password helper: default password 'password123'
    const creds = this.createCredentials("password123");
    const adminCreds = this.createCredentials("Admin@123");

    // Users seed
    const users: User[] = [
      {
        id: "usr-super",
        gymId: null,
        roleId: "role-1",
        role: "SUPER_ADMIN",
        fullName: "Alex Rivera",
        email: "admin@gymflow.com",
        passwordHash: adminCreds.hash,
        passwordSalt: adminCreds.salt,
        phone: "+1-555-0100",
        status: "ACTIVE",
        forcePasswordChange: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "usr-owner-1",
        gymId: "gym-1",
        roleId: "role-2",
        role: "GYM_OWNER",
        fullName: "Marcus Aurelius Strength",
        email: "owner@gymflow.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0101",
        status: "ACTIVE",
        createdAt: "2026-01-15T09:30:00Z",
      },
      {
        id: "usr-trainer-1",
        gymId: "gym-1",
        roleId: "role-3",
        role: "TRAINER",
        fullName: "Zara Thorne (Coach)",
        email: "trainer@gymflow.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0103",
        status: "ACTIVE",
        createdAt: "2026-01-16T10:00:00Z",
      },
      {
        id: "usr-receptionist-1",
        gymId: "gym-1",
        roleId: "role-4",
        role: "RECEPTIONIST",
        fullName: "Sarah Connor",
        email: "receptionist@gymflow.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0104",
        status: "ACTIVE",
        createdAt: "2026-01-18T08:00:00Z",
      },
      {
        id: "usr-member-1",
        gymId: "gym-1",
        roleId: "role-5",
        role: "MEMBER",
        fullName: "Chris Hemsworth (Vip Client)",
        email: "member@gymflow.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0105",
        status: "ACTIVE",
        createdAt: "2026-02-01T10:00:00Z",
      },
      // Additional users for beautiful table listing and analytics reporting:
      {
        id: "usr-member-2",
        gymId: "gym-1",
        roleId: "role-5",
        role: "MEMBER",
        fullName: "Emily Blunt",
        email: "emily@blunt.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0106",
        status: "ACTIVE",
        createdAt: "2026-02-15T14:40:00Z",
      },
      {
        id: "usr-member-3",
        gymId: "gym-1",
        roleId: "role-5",
        role: "MEMBER",
        fullName: "Dwayne Johnson",
        email: "rock@dwayne.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0107",
        status: "ACTIVE",
        createdAt: "2026-03-01T08:00:00Z",
      },
      {
        id: "usr-member-4",
        gymId: "gym-1",
        roleId: "role-5",
        role: "MEMBER",
        fullName: "Bruce Wayne",
        email: "bruce@waynecorp.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0108",
        status: "ACTIVE",
        createdAt: "2026-03-15T18:00:00Z",
      },
      {
        id: "usr-member-5",
        gymId: "gym-1",
        roleId: "role-5",
        role: "MEMBER",
        fullName: "Selina Kyle",
        email: "selina@cat.org",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0109",
        status: "ACTIVE",
        createdAt: "2026-04-01T12:00:00Z",
      }
    ];

    // Membership Plans Seed
    const membershipPlans: MembershipPlan[] = [
      {
        id: "plan-monthly",
        gymId: "gym-1",
        name: "Monthly Power Basic",
        duration: "Monthly",
        price: 49.99,
        description: "Standard monthly entry to barbell and locker section. No professional coaching.",
        createdAt: "2026-01-15T12:00:00Z",
      },
      {
        id: "plan-quarterly",
        gymId: "gym-1",
        name: "Quarterly Shred Max",
        duration: "Quarterly",
        price: 129.99,
        description: "3 Months unlimited access containing cardio + heavy powerlifting room and lockers.",
        createdAt: "2026-01-15T12:00:00Z",
      },
      {
        id: "plan-halfyearly",
        gymId: "gym-1",
        name: "Half Yearly Champion Plan",
        duration: "Half Yearly",
        price: 239.99,
        description: "6 Months with customized plan consults, hot steam room, and supplement discount.",
        createdAt: "2026-01-15T12:00:00Z",
      },
      {
        id: "plan-yearly",
        gymId: "gym-1",
        name: "Annual Olympic Golden Club",
        duration: "Annual",
        price: 399.99,
        description: "1 Year premium membership including 5 starter sessions withZara Thorne.",
        createdAt: "2026-01-15T12:00:00Z",
      }
    ];

    // Member Profiles Seed (Matches users: usr-member-1 ... usr-member-5)
    // Gender, Height, Weight, BMI, Blood Group, joining, trainer, plan, status
    const members: MemberProfile[] = [
      {
        id: "usr-member-1",
        memberId: "MEM-1001",
        gender: "Male",
        dob: "1983-08-11",
        height: 190,
        weight: 95,
        bmi: 26.3,
        bloodGroup: "O+",
        address: "742 Evergreen Terrace, Springfield",
        emergencyContactName: "Homer Simpson",
        emergencyContactPhone: "+1-555-1234",
        joiningDate: "2026-02-01",
        trainerId: "usr-trainer-1",
        activePlanId: "plan-yearly",
        status: "Active",
        photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=250&auto=format&fit=crop",
      },
      {
        id: "usr-member-2",
        memberId: "MEM-1002",
        gender: "Female",
        dob: "1989-10-23",
        height: 170,
        weight: 58,
        bmi: 20.1,
        bloodGroup: "A-",
        address: "12 Pine View Lane, Metro City",
        emergencyContactName: "John Blunt",
        emergencyContactPhone: "+1-555-0988",
        joiningDate: "2026-02-15",
        trainerId: "usr-trainer-1",
        activePlanId: "plan-monthly",
        status: "Active",
        photo: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=250&auto=format&fit=crop",
      },
      {
        id: "usr-member-3",
        memberId: "MEM-1003",
        gender: "Male",
        dob: "1972-05-02",
        height: 196,
        weight: 118,
        bmi: 30.7,
        bloodGroup: "AB+",
        address: "88 Muscle Beach Way, California",
        emergencyContactName: "Dany Garcia",
        emergencyContactPhone: "+1-555-1122",
        joiningDate: "2026-03-01",
        trainerId: null,
        activePlanId: "plan-yearly",
        status: "Active",
        photo: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=250&auto=format&fit=crop",
      },
      {
        id: "usr-member-4",
        memberId: "MEM-1004",
        gender: "Male",
        dob: "1985-04-17",
        height: 188,
        weight: 90,
        bmi: 25.5,
        bloodGroup: "O-",
        address: "Wayne Manor, Gotham Outskirts",
        emergencyContactName: "Alfred Pennyworth",
        emergencyContactPhone: "+1-555-1939",
        joiningDate: "2026-03-15",
        trainerId: "usr-trainer-1",
        activePlanId: "plan-monthly",
        status: "Expired",
        photo: "https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?q=80&w=250&auto=format&fit=crop",
      },
      {
        id: "usr-member-5",
        memberId: "MEM-1005",
        gender: "Female",
        dob: "1992-07-29",
        height: 172,
        weight: 56,
        bmi: 18.9,
        bloodGroup: "B+",
        address: "Flat 4B, 50 East Street, Gotham",
        emergencyContactName: "Bruce Wayne",
        emergencyContactPhone: "+1-555-1939",
        joiningDate: "2026-04-01",
        trainerId: null,
        activePlanId: "plan-quarterly",
        status: "Inactive",
        photo: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=250&auto=format&fit=crop",
      }
    ];

    // Payments & Invoices Seeds
    const payments: Payment[] = [
      {
        id: "pay-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        amount: 399.99,
        type: "Membership Fee",
        paymentMode: "UPI",
        status: "Paid",
        dueDate: "2026-02-01",
        paymentDate: "2026-02-01",
        createdAt: "2026-02-01T10:05:00Z",
      },
      {
        id: "pay-2",
        gymId: "gym-1",
        memberId: "usr-member-1",
        amount: 50.00,
        type: "Registration Fee",
        paymentMode: "Card",
        status: "Paid",
        dueDate: "2026-02-01",
        paymentDate: "2026-02-01",
        createdAt: "2026-02-01T10:00:00Z",
      },
      {
        id: "pay-3",
        gymId: "gym-1",
        memberId: "usr-member-2",
        amount: 49.99,
        type: "Membership Fee",
        paymentMode: "Cash",
        status: "Paid",
        dueDate: "2026-02-15",
        paymentDate: "2026-02-15",
        createdAt: "2026-02-15T14:45:00Z",
      },
      {
        id: "pay-4",
        gymId: "gym-1",
        memberId: "usr-member-3",
        amount: 399.99,
        type: "Membership Fee",
        paymentMode: "Bank",
        status: "Paid",
        dueDate: "2026-03-01",
        paymentDate: "2026-03-01",
        createdAt: "2026-03-01T08:10:00Z",
      },
      {
        id: "pay-5",
        gymId: "gym-1",
        memberId: "usr-member-4",
        amount: 49.99,
        type: "Membership Fee",
        paymentMode: "UPI",
        status: "Overdue",
        dueDate: "2026-04-15",
        paymentDate: null,
        createdAt: "2026-04-15T00:00:00Z",
      },
      {
        id: "pay-6",
        gymId: "gym-1",
        memberId: "usr-member-5",
        amount: 129.99,
        type: "Membership Fee",
        paymentMode: "Card",
        status: "Pending",
        dueDate: "2026-06-25",
        paymentDate: null,
        createdAt: "2026-06-01T00:00:00Z",
      }
    ];

    const invoices: Invoice[] = [
      {
        id: "inv-1",
        invoiceNo: "INV-2026-0001",
        paymentId: "pay-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        memberName: "Chris Hemsworth",
        memberEmail: "member@gymflow.com",
        amount: 399.99,
        taxAmount: 0.00,
        totalAmount: 399.99,
        issuedAt: "2026-02-01T10:05:00Z",
      },
      {
        id: "inv-2",
        invoiceNo: "INV-2026-0002",
        paymentId: "pay-2",
        gymId: "gym-1",
        memberId: "usr-member-1",
        memberName: "Chris Hemsworth",
        memberEmail: "member@gymflow.com",
        amount: 50.00,
        taxAmount: 0.00,
        totalAmount: 50.00,
        issuedAt: "2026-02-01T10:00:00Z",
      },
      {
        id: "inv-3",
        invoiceNo: "INV-2026-0003",
        paymentId: "pay-3",
        gymId: "gym-1",
        memberId: "usr-member-2",
        memberName: "Emily Blunt",
        memberEmail: "emily@blunt.com",
        amount: 49.99,
        taxAmount: 0.00,
        totalAmount: 49.99,
        issuedAt: "2026-02-15T14:45:00Z",
      },
      {
        id: "inv-4",
        invoiceNo: "INV-2026-0004",
        paymentId: "pay-4",
        gymId: "gym-1",
        memberId: "usr-member-3",
        memberName: "Dwayne Johnson",
        memberEmail: "rock@dwayne.com",
        amount: 399.99,
        taxAmount: 0.00,
        totalAmount: 399.99,
        issuedAt: "2026-03-01T08:10:00Z",
      }
    ];

    // Attendance logs for visual charts
    // Generate dates in May and June 2026
    const attendance: Attendance[] = [
      {
        id: "att-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        date: "2026-06-20",
        timeIn: "07:30:00",
        timeOut: "09:00:00",
        remarks: "Heavy squat session",
        markedBy: "usr-receptionist-1",
      },
      {
        id: "att-2",
        gymId: "gym-1",
        memberId: "usr-member-2",
        date: "2026-06-20",
        timeIn: "08:15:00",
        timeOut: "09:15:00",
        remarks: "Locker key returned",
        markedBy: "usr-receptionist-1",
      },
      {
        id: "att-3",
        gymId: "gym-1",
        memberId: "usr-member-3",
        date: "2026-06-20",
        timeIn: "06:00:00",
        timeOut: "08:00:00",
        remarks: "Cardio warmup only",
        markedBy: "usr-trainer-1",
      },
      {
        id: "att-4",
        gymId: "gym-1",
        memberId: "usr-member-1",
        date: "2026-06-19",
        timeIn: "07:45:00",
        timeOut: "09:15:00",
        remarks: "Standard cardio run",
        markedBy: "usr-receptionist-1",
      },
      {
        id: "att-5",
        gymId: "gym-1",
        memberId: "usr-member-2",
        date: "2026-06-19",
        timeIn: "08:30:00",
        timeOut: null,
        remarks: "Regular workout",
        markedBy: "usr-owner-1",
      },
      {
        id: "att-6",
        gymId: "gym-1",
        memberId: "usr-member-1",
        date: "2026-06-18",
        timeIn: "07:30:00",
        timeOut: "09:00:00",
        remarks: "Bench press target hit",
        markedBy: "usr-receptionist-1",
      },
      {
        id: "att-7",
        gymId: "gym-1",
        memberId: "usr-member-3",
        date: "2026-06-18",
        timeIn: "10:00:00",
        timeOut: "11:30:00",
        remarks: "Leg day",
        markedBy: "usr-trainer-1",
      }
    ];

    // Workout Plans Seed
    const workoutPlans: WorkoutPlan[] = [
      {
        id: "work-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        trainerId: "usr-trainer-1",
        assignedDate: "2026-06-10",
        exercises: [
          { name: "Barbell Back Squats", sets: 4, reps: "12, 10, 8, 6", durationMin: 15, notes: "Increase weight each set, keep spine neutral" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10, 10, 8", durationMin: 12, notes: "30-degree incline, control the negative" },
          { name: "Weighted Pull-Ups", sets: 3, reps: "AMRAP", durationMin: 10, notes: "Use 10kg vest if possible, focus on lats" },
          { name: "Romanian Deadlifts", sets: 3, reps: "12, 10, 10", durationMin: 12, notes: "Feel the stretch in hamstrings" },
          { name: "Cable Crunches", sets: 4, reps: "15, 15, 12, 12", durationMin: 8, notes: "Squeeze abs at bottom" }
        ],
        notes: "Perform 3 times a week, focus on progressive muscle overload.",
        history: [
          { date: "2026-06-12", completed: true, remarks: "Heavy deadlifts achieved" },
          { date: "2026-06-15", completed: true, remarks: "Completed everything in 55 mins" },
          { date: "2026-06-17", completed: true, remarks: "Excellent chest power" }
        ],
      },
      {
        id: "work-2",
        gymId: "gym-1",
        memberId: "usr-member-2",
        trainerId: "usr-trainer-1",
        assignedDate: "2026-06-15",
        exercises: [
          { name: "Goblet Squats", sets: 3, reps: "15", durationMin: 10, notes: "Keep kettlebell high" },
          { name: "Dumbbell Shoulder Press", sets: 3, reps: "12", durationMin: 10, notes: "Neutral grip" },
          { name: "Lat Pulldowns", sets: 3, reps: "12, 10, 10", durationMin: 12, notes: "Drive elbows down" },
          { name: "Cardio Run", sets: 1, reps: "20 mins", durationMin: 20, notes: "Maintain moderate intensity (Zone 2)" }
        ],
        notes: "Fat loss emphasis. Stay hydrated.",
        history: []
      }
    ];

    // Diet Plans Seed
    const dietPlans: DietPlan[] = [
      {
        id: "diet-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        trainerId: "usr-trainer-1",
        assignedDate: "2026-06-10",
        meals: {
          breakfast: "4 Scrambled Eggs (whole) with spinach, 2 slices of whole wheat toast, 1 Banana.",
          lunch: "200g Grilled Chicken Breast, 1 cup of Brown Rice, Broccoli, and avocado slices.",
          dinner: "180g Baked Salmon fillets, Sweet potato mash, Asparagus with olive oil drizzle.",
          snacks: "Whey protein shake with oat milk, hand full of almonds, Greek yogurt."
        },
        targets: {
          calories: 2800,
          proteinGrams: 180,
          waterIntakeLiters: 4,
        },
        notes: "No sugar drinks, cheat meal only once in 15 days on Sunday.",
      },
      {
        id: "diet-2",
        gymId: "gym-1",
        memberId: "usr-member-2",
        trainerId: "usr-trainer-1",
        assignedDate: "2026-06-15",
        meals: {
          breakfast: "Oatmeal topped with fresh blueberries, chia seeds, and 1 scoop of Isolate protein.",
          lunch: "Mixed greens salad with tuna, cherry tomatoes, cucumbers, light olive oil dressing.",
          dinner: "Lean turkey cutlet (150g), roasted zucchini, mixed peppers, and cauliflower mash.",
          snacks: "Apple slices with almond butter, boiled egg whites."
        },
        targets: {
          calories: 1600,
          proteinGrams: 110,
          waterIntakeLiters: 3,
        },
        notes: "Keto-friendly with slow digesting carbs early in the morning."
      }
    ];

    // Notifications Seed
    const notifications: Notification[] = [
      {
        id: "notif-1",
        gymId: "gym-1",
        type: "Membership Expiry",
        title: "Membership Expiry Notice",
        message: "Bruce Wayne's 'Monthly Power Basic' plan expired on 2026-04-15.",
        userId: "usr-member-4",
        isReadBy: [],
        scheduledFor: "2026-04-10T12:00:00Z",
        createdAt: "2026-04-10T12:00:00Z",
      },
      {
        id: "notif-2",
        gymId: "gym-1",
        type: "Fee Due",
        title: "Upcoming Fee Reminder",
        message: "Your quarterly membership fee renewal of 129.99 is scheduled on 2026-06-25.",
        userId: "usr-member-5",
        isReadBy: [],
        scheduledFor: "2026-06-18T10:00:00Z",
        createdAt: "2026-06-18T10:00:00Z",
      },
      {
        id: "notif-3",
        gymId: "gym-1",
        type: "Birthday",
        title: "Happy Birthday Wishes!",
        message: "The GymFlow CRM team wishes Selina Kyle a healthy and powerful birthday today!",
        userId: "usr-member-5",
        isReadBy: [],
        scheduledFor: "2026-07-29T08:00:00Z",
        createdAt: "2026-06-21T00:00:00Z",
      },
      {
        id: "notif-4",
        gymId: null,
        type: "Announcement",
        title: "System Update: Summer Shred Launch",
        message: "We've added custom workout routines for powerlifters! Speak to Zara Connor or Coach Zara.",
        userId: null,
        isReadBy: [],
        scheduledFor: "2026-06-20T09:00:00Z",
        createdAt: "2026-06-20T09:00:00Z",
      }
    ];

    // Future Camera Attendance
    const futureCameraAttendance: FutureCameraAttendance[] = [
      {
        id: "cam-1",
        gymId: "gym-1",
        placeholderText: "Future Camera Attendance Terminal v1.0",
        notes: "Planned placement at the main reception entrance turnstile. Powered by lightweight secure device nodes.",
        deviceStatus: "PRE-ORDERED",
      }
    ];

    const permissions: Permission[] = [
      { id: "perm-1", name: "MANAGE_MEMBERS", description: "Create, view, update, delete members" },
      { id: "perm-2", name: "MANAGE_PAYMENTS", description: "Collect payments, void payments, issue invoices" },
      { id: "perm-3", name: "MANAGE_STAFF", description: "Invite, update staff accounts" },
      { id: "perm-4", name: "VIEW_REPORTS", description: "View analytics, and download reports" },
      { id: "perm-5", name: "MANAGE_PLANS", description: "Configure membership pricing and plans" },
      { id: "perm-6", name: "MANAGE_SETTINGS", description: "Modify gym profile and receipt branding" }
    ];

    const memberMemberships: MemberMembership[] = [
      {
        id: "msh-1",
        gymId: "gym-1",
        memberId: "usr-member-1",
        planId: "plan-yearly",
        startDate: "2026-02-01",
        endDate: "2027-02-01",
        status: "Active",
        pricePaid: 399.99,
        createdAt: "2026-02-01T10:05:00Z",
        updatedAt: "2026-02-01T10:05:00Z"
      },
      {
        id: "msh-2",
        gymId: "gym-1",
        memberId: "usr-member-2",
        planId: "plan-monthly",
        startDate: "2026-06-01",
        endDate: "2026-07-01",
        status: "Active",
        pricePaid: 49.99,
        createdAt: "2026-06-01T14:45:00Z",
        updatedAt: "2026-06-01T14:45:00Z"
      },
      {
        id: "msh-3",
        gymId: "gym-1",
        memberId: "usr-member-3",
        planId: "plan-yearly",
        startDate: "2026-03-01",
        endDate: "2027-03-01",
        status: "Active",
        pricePaid: 399.99,
        createdAt: "2026-03-01T08:10:00Z",
        updatedAt: "2026-03-01T08:10:00Z"
      },
      {
        id: "msh-4",
        gymId: "gym-1",
        memberId: "usr-member-4",
        planId: "plan-monthly",
        startDate: "2026-03-15",
        endDate: "2026-04-15",
        status: "Expired",
        pricePaid: 49.99,
        createdAt: "2026-03-15T18:00:00Z",
        updatedAt: "2026-04-15T00:00:00Z"
      }
    ];

    const expenses: Expense[] = [
      { id: "exp-1", gymId: "gym-1", category: "Rent", amount: 1200, date: "2026-06-01", description: "Monthly facility lease payment", createdAt: "2026-06-01T09:00:00Z" },
      { id: "exp-2", gymId: "gym-1", category: "Salary", amount: 1500, date: "2026-06-05", description: "Staff payroll (Zara, receptionist, Connor)", createdAt: "2026-06-05T18:00:00Z" },
      { id: "exp-3", gymId: "gym-1", category: "Electricity", amount: 280, date: "2026-06-10", description: "AC power bill", createdAt: "2026-06-10T10:00:00Z" },
      { id: "exp-4", gymId: "gym-1", category: "Water", amount: 45, date: "2026-06-10", description: "Showers utility bill", createdAt: "2026-06-10T10:15:00Z" },
      { id: "exp-5", gymId: "gym-1", category: "Equipment", amount: 450, date: "2026-06-12", description: "New 20kg lifting Olympic plates", createdAt: "2026-06-12T14:30:00Z" },
      { id: "exp-6", gymId: "gym-1", category: "Maintenance", amount: 120, date: "2026-06-15", description: "Cable crossover pulley lubrication", createdAt: "2026-06-15T11:00:00Z" },
      { id: "exp-7", gymId: "gym-1", category: "Marketing", amount: 150, date: "2026-06-18", description: "Instagram geo-targeted flyers promotion", createdAt: "2026-06-18T16:00:00Z" }
    ];

    const settings: Settings[] = [
      {
        id: "set-1",
        gymId: "gym-1",
        gymName: "Elite Fitness Club",
        logo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=64&auto=format&fit=crop",
        address: "404 Powerhouse Boulevard, Metro City",
        phone: "+1-650-555-0199",
        email: "contact@elitefitness.com",
        gstNumber: "GST-29AAAAA0000A1Z5",
        currency: "USD",
        workingHours: "06:00 AM - 10:00 PM",
        receiptFooter: "Thank you for training with Elite Fitness Club. Eat clean, lift heavy!",
        paymentQr: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=elitefitness@upi&pn=Elite%20Fitness",
        taxPercentage: 11,
        createdAt: "2026-01-15T09:00:00Z",
        updatedAt: "2026-01-15T09:00:00Z"
      },
      {
        id: "set-2",
        gymId: "gym-2",
        gymName: "Iron Dungeon Gym",
        logo: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=64&auto=format&fit=crop",
        address: "88 Barbell Alley, Industrial Zone",
        phone: "+1-650-555-0201",
        email: "support@irondungeon.com",
        gstNumber: "GST-29BBBBB1111B2Z6",
        currency: "USD",
        workingHours: "05:00 AM - 11:00 PM",
        receiptFooter: "Iron Sharpens Iron. Welcome to the Dungeon.",
        paymentQr: "",
        taxPercentage: 8,
        createdAt: "2026-03-10T11:00:00Z",
        updatedAt: "2026-03-10T11:00:00Z"
      }
    ];

    const auditLogs: AuditLog[] = [
      {
        id: "log-1",
        gymId: "gym-1",
        userId: "usr-owner-1",
        userName: "Marcus Aurelius Strength",
        userRole: "GYM_OWNER",
        action: "Member Created",
        details: "Registered new member Chris Hemsworth",
        ipAddress: "127.0.0.1",
        createdAt: "2026-02-01T10:00:00Z"
      },
      {
        id: "log-2",
        gymId: "gym-1",
        userId: "usr-receptionist-1",
        userName: "Sarah Connor",
        userRole: "RECEPTIONIST",
        action: "Payment Received",
        details: "Collected $399.99 for Chris Hemsworth Annual Plan",
        ipAddress: "192.168.1.15",
        createdAt: "2026-02-01T10:05:00Z"
      }
    ];

    const messageTemplates: MessageTemplate[] = [
      {
        id: "tpl-1",
        gymId: "gym-1",
        type: "Welcome Member",
        title: "Welcome to Elite Fitness!",
        bodyText: "Hello {{MemberName}},\n\nWelcome to {{GymName}}! Your registration is complete and your membership plan is {{MembershipPlan}}.\n\nLet's crush your fitness goals together!\n\nBest Regards,\nTeam {{GymName}}",
        variables: ["MemberName", "GymName", "MembershipPlan"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-2",
        gymId: "gym-1",
        type: "Payment Received",
        title: "Fee Receipt Confirmation",
        bodyText: "Dear {{MemberName}},\n\nWe have successfully received your payment of {{Amount}} for {{MembershipPlan}} membership plan. Your invoice sequence number is {{InvoiceNumber}}.\n\nThank you for being part of {{GymName}}!",
        variables: ["MemberName", "Amount", "MembershipPlan", "InvoiceNumber", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-3",
        gymId: "gym-1",
        type: "Invoice Generated",
        title: "New Invoice Available",
        bodyText: "Hello {{MemberName}},\n\nYour invoice {{InvoiceNumber}} has been successfully generated for plan {{MembershipPlan}} with amount {{Amount}}. The fee payment is due on {{DueDate}}.\n\nClick the link or contact front desk to clear dues.\n\nBest regards,\n{{GymName}}",
        variables: ["MemberName", "InvoiceNumber", "MembershipPlan", "Amount", "DueDate", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-4",
        gymId: "gym-1",
        type: "Membership Renewal",
        title: "Membership Renewed Successfully",
        bodyText: "Hello {{MemberName}},\n\nThank you for renewing your subscription at {{GymName}}! Your new {{MembershipPlan}} plan starts immediately and is valid until {{DueDate}}.\n\nKeep up the spectacular work!",
        variables: ["MemberName", "GymName", "MembershipPlan", "DueDate"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-5",
        gymId: "gym-1",
        type: "Membership Expiry",
        title: "Your Membership Expiry Status",
        bodyText: "Dear {{MemberName}},\n\nThis is to notify you that your active association subscription profile is set to expire on {{DueDate}}.\n\nRenew today to avoid break in workout status.\n\nTeam {{GymName}}",
        variables: ["MemberName", "DueDate", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-6",
        gymId: "gym-1",
        type: "Fee Due Reminder",
        title: "Gym Dues Notice",
        bodyText: "Hello {{MemberName}},\n\nThis is a friendly alert that amount {{Amount}} is pending towards your membership {{MembershipPlan}}. Dues date is {{DueDate}}.\n\nPlease clear it at your earliest convenience.\n\nBest,\n{{GymName}}",
        variables: ["MemberName", "Amount", "MembershipPlan", "DueDate", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-7",
        gymId: "gym-1",
        type: "Birthday Wishes",
        title: "Happy Birthday from Team!",
        bodyText: "Happy Birthday {{MemberName}}! 🎂🎉\n\nWishing you a fantastic day ahead filled with joy, happiness, and incredible fitness milestones!\n\nCelebrate your day,\nTeam {{GymName}}",
        variables: ["MemberName", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-8",
        gymId: "gym-1",
        type: "Festival Greetings",
        title: "Happy Festive Season!",
        bodyText: "Hello {{MemberName}},\n\nWishing you and your family a very happy and prosperous festival season! Stay active and enjoy the celebrations.\n\nCheers,\nTeam {{GymName}}",
        variables: ["MemberName", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-9",
        gymId: "gym-1",
        type: "Promotional Offer",
        title: "Exclusive Discount Coupon Inside",
        bodyText: "Hello {{MemberName}},\n\nBring a friend to workout this month and get 20% off on your next renewal! Grab this deal before it ends.\n\nContact front desk at {{GymName}} for details.",
        variables: ["MemberName", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-10",
        gymId: "gym-1",
        type: "Attendance Reminder",
        title: "We miss you at the gym!",
        bodyText: "Hello {{MemberName}},\n\nWe haven't seen you around recently! Regular workouts are the key to long-term accomplishments.\n\nHope to see you back on the gym floor soon!\n\nBest,\nTeam {{GymName}}",
        variables: ["MemberName", "GymName"],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tpl-11",
        gymId: "gym-1",
        type: "Gym Closed Notice",
        title: "Important Operations Notice",
        bodyText: "Dear {{MemberName}},\n\nPlease note that {{GymName}} will remain closed on holidays. Regular workouts resume on standard timings from next day.\n\nThank you for understanding,\nManagement",
        variables: ["MemberName", "GymName"],
        updatedAt: new Date().toISOString()
      }
    ];

    const whatsappSettings: WhatsappSettings[] = [
      {
        id: "set-wa-1",
        gymId: "gym-1",
        provider: "WhatsAppWeb",
        apiKey: "DEMO_KEY_XYZ_123",
        phoneNumberId: "123456789",
        wabaId: "waba_id_888",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const communicationLogs: CommunicationLog[] = [];
    const billingReminders: BillingReminder[] = [];
    const generatedDocuments: GeneratedDocument[] = [];

    return {
      roles,
      permissions,
      gyms,
      users,
      members,
      membershipPlans,
      memberMemberships,
      payments,
      invoices,
      attendance,
      workoutPlans,
      dietPlans,
      notifications,
      expenses,
      settings,
      auditLogs,
      futureCameraAttendance,
      memberProgress: [],
      memberProgressPhotos: [],
      memberTimeline: [],
      whatsappSettings,
      messageTemplates,
      communicationLogs,
      billingReminders,
      generatedDocuments
    };
  }

  // Get data tables
  public getRoles() { return this.data.roles; }
  public getPermissions() { return this.data.permissions || []; }
  public getGyms() { return this.data.gyms; }
  public getUsers() { return this.data.users; }
  public getMembers() { return this.data.members; }
  public getMembershipPlans() { return this.data.membershipPlans; }
  public getMemberMemberships() { return this.data.memberMemberships || []; }
  public getPayments() { return this.data.payments; }
  public getInvoices() { return this.data.invoices; }
  public getAttendance() { return this.data.attendance; }
  public getWorkoutPlans() { return this.data.workoutPlans; }
  public getDietPlans() { return this.data.dietPlans; }
  public getNotifications() { return this.data.notifications; }
  public getExpenses() { return this.data.expenses || []; }
  public getSettings() { return this.data.settings || []; }
  public getAuditLogs() { return this.data.auditLogs || []; }
  public getFutureCameraAttendance() { return this.data.futureCameraAttendance; }
  public getMemberProgress() { if (!this.data.memberProgress) this.data.memberProgress = []; return this.data.memberProgress; }
  public getMemberProgressPhotos() { if (!this.data.memberProgressPhotos) this.data.memberProgressPhotos = []; return this.data.memberProgressPhotos; }
  public getMemberTimeline() { if (!this.data.memberTimeline) this.data.memberTimeline = []; return this.data.memberTimeline; }
  public getWhatsappSettings() { if (!this.data.whatsappSettings) this.data.whatsappSettings = []; return this.data.whatsappSettings; }
  public getMessageTemplates() { if (!this.data.messageTemplates) this.data.messageTemplates = []; return this.data.messageTemplates; }
  public getCommunicationLogs() { if (!this.data.communicationLogs) this.data.communicationLogs = []; return this.data.communicationLogs; }
  public getBillingReminders() { if (!this.data.billingReminders) this.data.billingReminders = []; return this.data.billingReminders; }
  public getGeneratedDocuments() { if (!this.data.generatedDocuments) this.data.generatedDocuments = []; return this.data.generatedDocuments; }

  public addTimelineEntry(gymId: string, memberId: string, type: string, title: string, description: string): void {
    if (!this.data.memberTimeline) {
      this.data.memberTimeline = [];
    }
    const newEntry: MemberTimeline = {
      id: "tl-" + Math.floor(100000 + Math.random() * 900000),
      gymId,
      memberId,
      date: new Date().toISOString().split("T")[0],
      type,
      title,
      description,
      createdAt: new Date().toISOString()
    };
    this.data.memberTimeline.push(newEntry);
    this.save();
  }
}

export const db = new CRMDatabase();
