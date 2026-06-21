import { db, Payment, Invoice, MemberProfile, User, Settings } from "../database/database";
import { AuditService } from "./audit.service";

export class PaymentService {
  /**
   * Automatically generate consecutive invoice numbers: INV-YYYY-000001
   */
  public static generateNextInvoiceNumber(gymId: string): string {
    const invoices = db.getInvoices();
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;
    
    // Find all invoices for this gym and year
    const activeInvoices = invoices.filter(inv => inv.gymId === gymId && inv.invoiceNo.startsWith(prefix));
    
    let maxSeq = 0;
    activeInvoices.forEach(inv => {
      // Extract numeric sequence e.g. "000021"
      const suffix = inv.invoiceNo.substring(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    });
    
    const nextSeq = maxSeq + 1;
    const formattedSeq = String(nextSeq).padStart(6, "0");
    return `${prefix}${formattedSeq}`;
  }

  /**
   * Atomic Transactional Payment + Invoice Creation
   */
  public static collectFee(params: {
    gymId: string;
    memberId: string;
    amount: number;
    type: "Registration Fee" | "Membership Fee" | "Personal Training Fee";
    paymentMode: "Cash" | "UPI" | "Bank" | "Card";
    notes?: string;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): { payment: Payment; invoice: Invoice } {
    // 1. Validations
    const users = db.getUsers();
    const members = db.getMembers();
    
    const user = users.find(u => u.id === params.memberId);
    if (!user) throw new Error("Member user account not found.");
    
    const memberProfile = members.find(m => m.id === params.memberId);
    if (!memberProfile) throw new Error("Member profile card not found.");

    // Retrieve Gym Settings for proper tax calculations
    const settings = db.getSettings().find(s => s.gymId === params.gymId);
    const taxRate = settings ? settings.taxPercentage : 11; // fallback to 11%

    const taxAmount = Math.round((params.amount * (taxRate / 100)) * 100) / 100;
    const totalAmount = params.amount + taxAmount;

    // START ATOMIC BLOCK
    try {
      const paymentId = "pay-" + Math.floor(100000 + Math.random() * 900000);
      const invoiceId = "inv-" + Math.floor(100000 + Math.random() * 900000);
      
      const invoiceNo = this.generateNextInvoiceNumber(params.gymId);
      
      const newPayment: Payment = {
        id: paymentId,
        gymId: params.gymId,
        memberId: params.memberId,
        amount: totalAmount,
        type: params.type,
        paymentMode: params.paymentMode,
        status: "Paid",
        dueDate: null,
        paymentDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString()
      };

      const newInvoice: Invoice = {
        id: invoiceId,
        invoiceNo: invoiceNo,
        paymentId: paymentId,
        gymId: params.gymId,
        memberId: params.memberId,
        memberName: user.fullName,
        memberEmail: user.email,
        amount: params.amount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        issuedAt: new Date().toISOString(),
      };

      // Push and write atomically
      db.getPayments().push(newPayment);
      db.getInvoices().push(newInvoice);
      db.save(); // Atomic persistent transaction save

      AuditService.log({
        gymId: params.gymId,
        userId: params.actor.id,
        userName: params.actor.name,
        userRole: params.actor.role,
        action: "Payment Received",
        details: `Collected ${totalAmount} (${params.type} via ${params.paymentMode}) for ${user.fullName}. Invoiced: ${invoiceNo}`,
        ipAddress: params.actor.ipAddress
      });

      return { payment: newPayment, invoice: newInvoice };
    } catch (err: any) {
      // Any error rolled back by not persisting
      throw new Error("Financial database transaction failed: " + err.message);
    }
  }

  /**
   * Fetch payment detail combined with parent Invoice record for printable receipts
   */
  public static getReceiptDetails(invoiceNo: string) {
    const invoices = db.getInvoices();
    const payments = db.getPayments();
    const gyms = db.getGyms();
    
    const invoice = invoices.find(inv => inv.invoiceNo === invoiceNo);
    if (!invoice) throw new Error("Invoice record not found.");
    
    const payment = payments.find(p => p.id === invoice.paymentId);
    const gym = gyms.find(g => g.id === invoice.gymId);
    
    const setting = db.getSettings().find(s => s.gymId === invoice.gymId);
    
    return {
      invoice,
      payment,
      gym,
      setting
    };
  }
}
