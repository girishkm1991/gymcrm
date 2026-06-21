import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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

  constructor() {
    this.data = this.loadDB();
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
