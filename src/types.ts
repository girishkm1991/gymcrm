export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: "SUPER_ADMIN" | "GYM_OWNER" | "TRAINER" | "RECEPTIONIST" | "MEMBER";
  gymId: string | null;
  phone: string;
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

export interface Member {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  height: number;
  weight: number;
  bmi: number;
  bloodGroup: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joiningDate: string;
  status: "Active" | "Inactive" | "Expired" | "Pending";
  photo: string;
  trainerId: string | null;
  trainerName: string;
  activePlanId: string | null;
  planName: string;
  endDate?: string;
}

export interface MembershipPlan {
  id: string;
  gymId: string;
  name: string;
  duration: "Monthly" | "Quarterly" | "Half Yearly" | "Annual" | "Custom";
  price: number;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
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
  invoiceNo: string;
  paymentId: string;
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
  memberId: string;
  memberName: string;
  memberEmail: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  remarks: string;
  markedBy: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  durationMin: number;
  notes: string;
}

export interface WorkoutPlan {
  id: string;
  gymId: string;
  memberId: string;
  trainerId: string;
  assignedDate: string;
  exercises: WorkoutExercise[];
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
  memberId: string;
  trainerId: string;
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

export interface SystemNotification {
  id: string;
  gymId: string | null;
  type: "Membership Expiry" | "Fee Due" | "Birthday" | "Announcement";
  title: string;
  message: string;
  userId: string | null;
  isReadBy: string[];
  scheduledFor: string;
  createdAt: string;
}
