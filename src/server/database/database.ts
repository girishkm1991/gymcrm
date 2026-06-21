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
}

// Create a singleton DB helper class
class CRMDatabase {
  private data: DatabaseStructure;
  public isMySQLActive = false;
  private dbConnection: mysql.Connection | null = null;

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
      await runDatabaseInitialization(true, 2);

      const dbPort = parseInt(process.env.DB_PORT || "3306");
      const dbName = process.env.DB_NAME || "gymcrm";
      const dbUser = process.env.DB_USER || "gymuser";
      const dbPassword = process.env.DB_PASSWORD || "gympass";

      this.dbConnection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      });

      console.log("[CRMDatabase] Successfully connected to MySQL database!");

      // Verify if database needs seeding, i.e. if users table has no records
      const [rows]: any = await this.dbConnection.query("SELECT COUNT(*) as count FROM users");
      const userCount = rows[0]?.count || 0;

      if (userCount === 0) {
        console.log("[CRMDatabase] MySQL Database tables are empty. Initiating high-fidelity data seeding...");
        
        const seed = this.generateSeedData();
        const conn = this.dbConnection;

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
        
        console.log("[CRMDatabase] Database tables seeded successfully!");
      }

      // Load all records from MySQL tables into this.data structures
      console.log("[CRMDatabase] Loading relational records from MySQL database...");
      
      const conn = this.dbConnection;
      const [usersRows] = await conn.query("SELECT * FROM users");
      const [rolesRows] = await conn.query("SELECT * FROM roles");
      const [permissionsRows] = await conn.query("SELECT * FROM permissions");
      const [gymsRows] = await conn.query("SELECT * FROM gyms");
      const [membersRows] = await conn.query("SELECT * FROM members");
      const [membershipPlansRows] = await conn.query("SELECT * FROM membership_plans");
      const [memberMembershipsRows] = await conn.query("SELECT * FROM member_memberships");
      const [paymentsRows] = await conn.query("SELECT * FROM payments");
      const [invoicesRows] = await conn.query("SELECT * FROM invoices");
      const [attendanceRows] = await conn.query("SELECT * FROM attendance");
      const [workoutPlansRows] = await conn.query("SELECT * FROM workout_plans");
      const [dietPlansRows] = await conn.query("SELECT * FROM diet_plans");
      const [notificationsRows] = await conn.query("SELECT * FROM notifications");
      const [expensesRows] = await conn.query("SELECT * FROM expenses");
      const [settingsRows] = await conn.query("SELECT * FROM settings");
      const [auditLogsRows] = await conn.query("SELECT * FROM audit_logs");
      const [futureCameraAttendanceRows] = await conn.query("SELECT * FROM future_camera_attendance");

      this.data = {
        roles: rolesRows as Role[],
        permissions: permissionsRows as Permission[],
        gyms: gymsRows as Gym[],
        users: usersRows as User[],
        members: membersRows as MemberProfile[],
        membershipPlans: membershipPlansRows as MembershipPlan[],
        memberMemberships: memberMembershipsRows as MemberMembership[],
        payments: paymentsRows as Payment[],
        invoices: invoicesRows as Invoice[],
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
      };

      this.isMySQLActive = true;
      console.log("[CRMDatabase] MySQL Database integration active and fully loaded.");
    } catch (err: any) {
      console.error("[CRMDatabase] Failed to initialize MySQL connection. Running with local JSON fallback.", err);
      this.isMySQLActive = false;
    }
  }

  // Save changes to MySQL transactionally
  public async saveToMySQL(): Promise<void> {
    if (!this.dbConnection || !this.isMySQLActive) return;
    const conn = this.dbConnection;

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
        await conn.query("INSERT INTO members (id, memberId, gender, dob, height, weight, bmi, bloodGroup, address, emergencyContactName, emergencyContactPhone, joiningDate, trainerId, activePlanId, status, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [m.id, m.memberId, m.gender, m.dob, m.height, m.weight, m.bmi, m.bloodGroup, m.address, m.emergencyContactName, m.emergencyContactPhone, m.joiningDate, m.trainerId || null, m.activePlanId || null, m.status, m.photo]);
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
        await conn.query("INSERT INTO invoices (id, invoiceNo, paymentId, gymId, memberId, memberName, memberEmail, amount, taxAmount, totalAmount, issuedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [i.id, i.invoiceNo, i.paymentId, i.gymId, i.memberId, i.memberName, i.memberEmail, i.amount, i.taxAmount, i.totalAmount, i.issuedAt]);
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

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }
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

    // Users seed
    const users: User[] = [
      {
        id: "usr-super",
        gymId: null,
        roleId: "role-1",
        role: "SUPER_ADMIN",
        fullName: "Alex Rivera",
        email: "admin@gymflow.com",
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        phone: "+1-555-0100",
        status: "ACTIVE",
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
}

export const db = new CRMDatabase();
