import fs from "fs";
import path from "path";
import { db, MessageTemplate, CommunicationLog, BillingReminder, GeneratedDocument, Invoice, Payment } from "../database/database";

export class CommunicationService {
  private static getDocsDir(): string {
    const dir = path.join(process.cwd(), "data", "documents");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Parse variables like {{MemberName}}, {{Amount}} inside templates
   */
  public static parseTemplate(
    templateText: string,
    variables: {
      MemberName?: string;
      GymName?: string;
      Amount?: string;
      DueDate?: string;
      InvoiceNumber?: string;
      MembershipPlan?: string;
      [key: string]: string | undefined;
    }
  ): string {
    let result = templateText;
    Object.keys(variables).forEach((key) => {
      const value = variables[key] || "";
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, value);
    });
    return result;
  }

  /**
   * Simulates/Generates a professional document file (HTML or Text styled with PDF structure)
   * and saves it to the persistent Docker data volume directory
   */
  public static generateDocument(params: {
    gymId: string;
    memberId: string;
    type: "Invoice" | "Receipt" | "MembershipCard";
    referenceId: string;
  }): GeneratedDocument {
    const dir = this.getDocsDir();
    const docId = `doc-${Math.floor(100000 + Math.random() * 900000)}`;
    const fileName = `${params.type}-${params.referenceId}-${docId}.html`; // Storing high-fidelity styled printable file
    const filePath = path.join(dir, fileName);

    const gymSettings = db.getSettings().find((s) => s.gymId === params.gymId);
    const gym = db.getGyms().find((g) => g.id === params.gymId);
    const gymName = gymSettings?.gymName || gym?.name || "Elite Fitness Club";
    const user = db.getUsers().find((u) => u.id === params.memberId);
    const memberName = user?.fullName || "Gym Member";

    let content = "";

    if (params.type === "Invoice") {
      const invoice = db.getInvoices().find((inv) => inv.invoiceNo === params.referenceId || inv.id === params.referenceId);
      const invNo = invoice?.invoiceNo || params.referenceId;
      const amount = invoice?.amount || 2500;
      const tax = invoice?.taxAmount || 275;
      const total = invoice?.totalAmount || (amount + tax);
      const discount = invoice?.discount || 0;
      const date = invoice?.issuedAt?.split("T")[0] || new Date().toISOString().split("T")[0];
      const dueDate = invoice?.dueDate || date;
      const plan = invoice?.membershipPlan || "Quarterly Premium Pack";
      const period = invoice?.billingPeriod || `${date} to renewal`;

      content = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1c1917; background-color: #fafaf9; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e7e5e4; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e7e5e4; padding-bottom: 24px; }
    .logo-section h1 { margin: 0; color: #16a34a; font-size: 28px; font-weight: 800; }
    .logo-section p { margin: 4px 0 0; color: #78716c; font-size: 13px; }
    .meta-section { text-align: right; }
    .meta-section h2 { margin: 0; text-transform: uppercase; font-size: 20px; font-weight: 700; color: #78716c; }
    .meta-section p { margin: 4px 0 0; font-size: 13px; }
    .details { display: grid; grid-template-cols: 1fr 1fr; gap: 32px; padding: 24px 0; border-bottom: 1px solid #e7e5e4; }
    .details h3 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; }
    .details p { margin: 4px 0; font-size: 14px; }
    .line-items { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .line-items th { background-color: #f5f5f4; border-bottom: 1px solid #e7e5e4; text-align: left; padding: 12px; font-size: 13px; text-transform: uppercase; color: #78716c; }
    .line-items td { padding: 12px; border-bottom: 1px solid #e7e5e4; font-size: 14px; }
    .totals { float: right; width: 300px; margin-top: 16px; border-top: 1px solid #e7e5e4; padding-top: 12px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 2px dashed #e7e5e4; padding-top: 12px; margin-top: 8px; color: #16a34a; }
    .footer { clear: both; margin-top: 60px; text-align: center; border-top: 1px solid #e7e5e4; padding-top: 24px; color: #a8a29e; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-paid { background-color: #dcfce7; color: #15803d; }
    .badge-pending { background-color: #fef9c3; color: #a16207; }
  </style>
</head>
<body>
  <div class="invoice-card" id="invoice-printable">
    <div class="header">
      <div class="logo-section">
        <h1>${gymName}</h1>
        <p>${gymSettings?.address || "404 Barbell Lane, Core Gym Area"}</p>
        <p>Phone: ${gymSettings?.phone || "+1-555-GYM-FLOW"}</p>
        ${gymSettings?.gstNumber ? `<p>GSTIN: ${gymSettings.gstNumber}</p>` : ""}
      </div>
      <div class="meta-section">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invNo}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        <p><span class="badge ${invoice?.status !== "Pending" ? "badge-paid" : "badge-pending"}">${invoice?.status || "Paid"}</span></p>
      </div>
    </div>

    <div class="details">
      <div>
        <h3>Billed To:</h3>
        <p><strong>${memberName}</strong></p>
        <p>Member ID: ${params.memberId}</p>
        <p>Email: ${user?.email || "customer@gymflow.com"}</p>
        <p>Phone: ${user?.phone || "Unknown Phone"}</p>
      </div>
      <div>
        <h3>Payment Info:</h3>
        <p>Method: ${invoice?.paymentMode || "Cash"}</p>
        <p>Billing Cycle: ${period}</p>
        <p>Transaction ID: ${invoice?.paymentId || "N/A"}</p>
      </div>
    </div>

    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Base Price</th>
          <th style="text-align: right;">Discount</th>
          <th style="text-align: right;">Tax Amount</th>
          <th style="text-align: right;">Total Row</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${plan}</strong><br/><span style="font-size: 12px; color: #78716c;">Membership Access License & Gym Attendance</span></td>
          <td style="text-align: right;">${gymSettings?.currency || "$"}${amount.toFixed(2)}</td>
          <td style="text-align: right;">${gymSettings?.currency || "$"}${discount.toFixed(2)}</td>
          <td style="text-align: right;">${gymSettings?.currency || "$"}${tax.toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">${gymSettings?.currency || "$"}${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Base Total:</span>
        <span>${gymSettings?.currency || "$"}${amount.toFixed(2)}</span>
      </div>
      ${discount > 0 ? `
      <div class="totals-row" style="color: #b45309;">
        <span>Promo Discount:</span>
        <span>-${gymSettings?.currency || "$"}${discount.toFixed(2)}</span>
      </div>` : ""}
      <div class="totals-row">
        <span>Tax (${gymSettings?.taxPercentage || 11}%):</span>
        <span>${gymSettings?.currency || "$"}${tax.toFixed(2)}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Dues:</span>
        <span>${gymSettings?.currency || "$"}${total.toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p>${gymSettings?.receiptFooter || "Thank you for training with us! Keep up the sweat!"}</p>
      <p style="margin-top: 8px; font-size: 10px; color: #a8a29e;">Generated by GymFlow CRM v3.0 SaaS Platform. Stored securely on persistent node volume storage.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else if (params.type === "Receipt") {
      const payment = db.getPayments().find((p) => p.id === params.referenceId);
      const invoices = db.getInvoices();
      const invoice = invoices.find((inv) => inv.paymentId === params.referenceId);
      const amt = payment?.amount || invoice?.totalAmount || 1500;
      const type = payment?.type || "Membership Fee";
      const mode = payment?.paymentMode || "Card";
      const date = payment?.paymentDate || payment?.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0];

      content = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; background-color: #fbfbfb; display: flex; justify-content: center; }
    .receipt-slip { width: 380px; padding: 24px; border: 1px dashed #d6d3d1; background: #ffffff; text-align: center; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .title { margin: 0; font-size: 22px; color: #15803d; font-weight: bold; }
    .subtitle { margin: 4px 0 0; font-size: 12px; color: #78716c; text-transform: uppercase; }
    .divider { height: 1px; border-bottom: 1px dashed #d6d3d1; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; text-align: left; }
    .info-row span:first-child { color: #78716c; }
    .amount-box { background: #f0fdf4; border-radius: 6px; padding: 12px; font-weight: bold; font-size: 22px; color: #16a34a; margin: 16px 0; border: 1px solid #bbf7d0; }
  </style>
</head>
<body>
  <div class="receipt-slip" id="receipt-slip">
    <div class="title">${gymName}</div>
    <div class="subtitle">Official Payment Slip</div>
    <div class="divider"></div>
    
    <div class="info-row">
      <span>Receipt ID:</span>
      <span>${params.referenceId}</span>
    </div>
    <div class="info-row">
      <span>Invoice #:</span>
      <span>${invoice?.invoiceNo || "N/A"}</span>
    </div>
    <div class="info-row">
      <span>Date:</span>
      <span>${date}</span>
    </div>
    <div class="info-row">
      <span>Member:</span>
      <span><strong>${memberName}</strong></span>
    </div>
    <div class="info-row">
      <span>Category:</span>
      <span>${type}</span>
    </div>
    <div class="info-row">
      <span>Payment Mode:</span>
      <span>${mode}</span>
    </div>

    <div class="amount-box">
      ${gymSettings?.currency || "$"}${amt.toFixed(2)}
    </div>

    <div class="divider"></div>
    <p style="font-size: 11px; margin: 0; color: #a8a29e; line-height: 1.4;">${gymSettings?.receiptFooter || "Thank you for choosing style and performance!"}</p>
    <p style="font-size: 9px; margin-top: 12px; color: #d6d3d1;">Authorized Entry Slip &bull; Powered by GymFlow CRM</p>
  </div>
</body>
</html>
      `;
    } else {
      // Membership Card Layout
      const qrValue = `GYMFLOW-MEMBER-${params.memberId}`;
      const member = db.getMembers().find((m) => m.id === params.memberId);
      const photoSrc = member?.photo || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200";

      content = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', sans-serif; padding: 20px; display: flex; justify-content: center; background-color: #1c1917; }
    .member-card { width: 350px; height: 210px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; border-radius: 12px; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #334155; position: relative; overflow: hidden; }
    .bg-circle { position: absolute; width: 200px; height: 200px; background: rgba(34, 197, 94, 0.05); border-radius: 50%; top: -80px; right: -80px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; z-index: 2; }
    .card-header h2 { margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 0.05em; color: #22c55e; }
    .member-info { display: flex; gap: 14px; align-items: center; z-index: 2; }
    .photo-frame { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 2px solid #22c55e; background-color: #334155; }
    .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
    .meta-fields h3 { margin: 0; font-size: 15px; font-weight: 600; color: #f8fafc; }
    .meta-fields p { margin: 2px 0 0; font-size: 11px; color: #94a3b8; font-family: monospace; }
    .card-footer { display: flex; justify-content: space-between; align-items: flex-end; z-index: 2; }
    .expiry { font-size: 9px; color: #64748b; text-transform: uppercase; }
    .expiry strong { color: #cbd5e1; }
    .qr-holder { background: white; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="member-card" id="member-pass-digital">
    <div class="bg-circle"></div>
    <div class="card-header">
      <h2>${gymName}</h2>
      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; background: #22c55e; color: #012d12; padding: 2px 6px; border-radius: 999px;">PASSPORT</span>
    </div>
    
    <div class="member-info">
      <div class="photo-frame">
        <img src="${photoSrc}" alt="Avatar"/>
      </div>
      <div class="meta-fields">
        <h3>${memberName}</h3>
        <p>ID: ${params.memberId.toUpperCase()}</p>
        <p style="color: #22c55e; font-size: 10px;">Status: Valid Active Member</p>
      </div>
    </div>

    <div class="card-footer">
      <div class="expiry">
        Issued on <strong>${new Date().toLocaleDateString("en-US")}</strong>
      </div>
      <div class="qr-holder">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(qrValue)}" width="40" height="40" alt="QR-ID"/>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    }

    fs.writeFileSync(filePath, content, "utf-8");
    const fileSize = fs.statSync(filePath).size;

    const newDoc: GeneratedDocument = {
      id: docId,
      gymId: params.gymId,
      memberId: params.memberId,
      type: params.type,
      referenceId: params.referenceId,
      filePath,
      fileSize,
      createdAt: new Date().toISOString()
    };

    // Save metadata
    if (!db.getGeneratedDocuments()) {
      (db as any).data.generatedDocuments = [];
    }
    db.getGeneratedDocuments().push(newDoc);
    db.save();

    return newDoc;
  }

  /**
   * Evaluates and updates automated reminders based on membership end dates and billing periods
   */
  public static generateActiveReminders(gymId: string): BillingReminder[] {
    const members = db.getMembers();
    const users = db.getUsers();
    const plans = db.getMembershipPlans();
    const invoices = db.getInvoices().filter((i) => i.gymId === gymId);
    
    const remindersList = db.getBillingReminders();
    if (!remindersList) {
      (db as any).data.billingReminders = [];
    }

    const activeReminders = remindersList.filter((r) => r.gymId === gymId);
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    members.forEach((m) => {
      const user = users.find((u) => u.id === m.id);
      if (!user) return;

      // Ensure membership timeline checks
      if (m.endDate) {
        const expiryDate = new Date(m.endDate);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const plan = plans.find((p) => p.id === m.activePlanId);
        const planName = plan?.name || "Premium Plan";
        const amount = plan?.price || 0;

        // 1. Check for Membership Expiry
        if (diffDays >= -7 && diffDays <= 7) {
          const type = diffDays < 0 ? "Payment Overdue" : "Membership Expiry";
          const exists = remindersList.find(
            (r) => r.memberId === m.id && r.type === "Membership Expiry" && r.dueDate === m.endDate && r.status === "Pending"
          );

          if (!exists) {
            const reminderId = `rem-${Math.floor(100000 + Math.random() * 900000)}`;
            const newRem: BillingReminder = {
              id: reminderId,
              gymId,
              memberId: m.id,
              memberName: user.fullName,
              planName,
              amount,
              type: "Membership Expiry",
              status: "Pending",
              dueDate: m.endDate,
              daysRemaining: diffDays,
              createdAt: new Date().toISOString()
            };
            remindersList.push(newRem);
          } else {
            exists.daysRemaining = diffDays;
          }
        }
      }
    });

    // 2. Check for Pending/Overdue payments from Invoices
    invoices.forEach((inv) => {
      if (inv.status === "Pending") {
        const user = users.find((u) => u.id === inv.memberId);
        if (!user) return;

        const docDueDate = inv.dueDate ? new Date(inv.dueDate) : today;
        const diffTime = docDueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const type = diffDays < 0 ? "Payment Overdue" : "Pending Payment";
        const exists = remindersList.find(
          (r) => r.memberId === inv.memberId && r.type === "Pending Payment" && r.dueDate === inv.dueDate && r.status === "Pending"
        );

        if (!exists) {
          const reminderId = `rem-${Math.floor(100000 + Math.random() * 900000)}`;
          const newRem: BillingReminder = {
            id: reminderId,
            gymId,
            memberId: inv.memberId,
            memberName: user.fullName,
            planName: inv.membershipPlan || "Membership Dues",
            amount: inv.totalAmount,
            type: "Pending Payment",
            status: "Pending",
            dueDate: inv.dueDate || todayStr,
            daysRemaining: diffDays,
            createdAt: new Date().toISOString()
          };
          remindersList.push(newRem);
        } else {
          exists.daysRemaining = diffDays;
        }
      }
    });

    db.save();
    return remindersList.filter((r) => r.gymId === gymId);
  }
}
