import { db, Expense, Payment } from "../database/database";
import { AuditService } from "./audit.service";

export class ExpenseService {
  /**
   * Create an Expense record
   */
  public static createExpense(params: {
    gymId: string;
    category: "Rent" | "Salary" | "Electricity" | "Water" | "Equipment" | "Maintenance" | "Marketing" | "Miscellaneous";
    amount: number;
    date: string;
    description: string;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): Expense {
    const expenses = db.getExpenses();
    
    const newExpense: Expense = {
      id: "exp-" + Math.floor(100000 + Math.random() * 900000),
      gymId: params.gymId,
      category: params.category,
      amount: Number(params.amount),
      date: params.date,
      description: params.description || "",
      createdAt: new Date().toISOString()
    };
    
    expenses.push(newExpense);
    db.save();

    AuditService.log({
      gymId: params.gymId,
      userId: params.actor.id,
      userName: params.actor.name,
      userRole: params.actor.role,
      action: "Expense Created",
      details: `Created expense category '${params.category}' of $${params.amount}`,
      ipAddress: params.actor.ipAddress
    });

    return newExpense;
  }

  /**
   * Read expenses
   */
  public static getExpenses(gymId: string): Expense[] {
    return db.getExpenses().filter(exp => exp.gymId === gymId);
  }

  /**
   * Update an Expense
   */
  public static updateExpense(id: string, params: Partial<Omit<Expense, "id" | "gymId">>, actor: any): Expense {
    const expenses = db.getExpenses();
    const expense = expenses.find(exp => exp.id === id);
    if (!expense) throw new Error("Expense record not found.");
    
    if (params.category !== undefined) expense.category = params.category;
    if (params.amount !== undefined) expense.amount = Number(params.amount);
    if (params.date !== undefined) expense.date = params.date;
    if (params.description !== undefined) expense.description = params.description;
    
    db.save();

    AuditService.log({
      gymId: expense.gymId,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "Expense Updated",
      details: `Updated expense record '${id}'`,
      ipAddress: actor.ipAddress
    });

    return expense;
  }

  /**
   * Delete an Expense
   */
  public static deleteExpense(id: string, actor: any): void {
    const expenses = db.getExpenses();
    const index = expenses.findIndex(exp => exp.id === id);
    if (index === -1) throw new Error("Expense record not found.");
    
    const [deleted] = expenses.splice(index, 1);
    db.save();

    AuditService.log({
      gymId: deleted.gymId,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "Expense Deleted",
      details: `Deleted expense category '${deleted.category}' of $${deleted.amount}`,
      ipAddress: actor.ipAddress
    });
  }

  /**
   * Compiled financial statistics (income, expenses, profit structure)
   */
  public static getFinancialMetrics(gymId: string) {
    const payments = db.getPayments().filter(p => p.gymId === gymId && p.status === "Paid");
    const expenses = db.getExpenses().filter(e => e.gymId === gymId);
    
    // Sum gross income
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Sum gross expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const netProfit = totalIncome - totalExpenses;
    
    // Monthly metrics (calculated from calendar dates)
    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // e.g., "2026-06"
    const currentYearPrefix = new Date().getFullYear().toString(); // e.g., "2026"
    
    const monthlyIncome = payments
      .filter(p => p.paymentDate && p.paymentDate.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + p.amount, 0);
      
    const monthlyExpenses = expenses
      .filter(e => e.date && e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
      
    const monthlyNetProfit = monthlyIncome - monthlyExpenses;
    
    // Yearly metrics
    const yearlyIncome = payments
      .filter(p => p.paymentDate && p.paymentDate.startsWith(currentYearPrefix))
      .reduce((sum, p) => sum + p.amount, 0);
      
    const yearlyExpenses = expenses
      .filter(e => e.date && e.date.startsWith(currentYearPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
      
    const yearlyNetProfit = yearlyIncome - yearlyExpenses;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      monthlyNetProfit: Math.round(monthlyNetProfit * 100) / 100,
      yearlyIncome: Math.round(yearlyIncome * 100) / 100,
      yearlyExpenses: Math.round(yearlyExpenses * 100) / 100,
      yearlyNetProfit: Math.round(yearlyNetProfit * 100) / 100
    };
  }
}
