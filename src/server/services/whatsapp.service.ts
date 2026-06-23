import { db, CommunicationLog } from "../database/database";
import { CommunicationService } from "./communication.service";

export class WhatsAppService {
  /**
   * Helper to clean phone numbers: remove signs, spaces, non-numeric etc.
   */
  private static cleanPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, "");
    return cleaned;
  }

  /**
   * Send WhatsApp message via calling real provider API.
   * Logs request/response and returns standard payload.
   */
  public static async sendWhatsAppMessage(
    phone: string,
    message: string,
    gymId: string = "gym-1",
    memberId: string = "system",
    memberName: string = "System Test",
    category: string = "Test Message"
  ): Promise<{ success: boolean; status: "Sent" | "Failed" | "Pending"; error?: string; whatsappUrl?: string }> {
    const cleanedPhone = this.cleanPhoneNumber(phone);
    if (!cleanedPhone) {
      return { success: false, status: "Failed", error: "Invalid/empty phone number." };
    }

    const config = db.getWhatsappSettings().find((c) => c.gymId === gymId && c.status === "Active");
    if (!config) {
      const fallbackUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
      return {
        success: false,
        status: "Failed",
        error: "WhatsApp gateway is not configured. Please configure WhatsApp settings first.",
        whatsappUrl: fallbackUrl,
      };
    }

    const provider = config.provider;
    const apiKey = config.apiKey || "";
    const phoneNumberId = config.phoneNumberId || "";
    const wabaId = config.wabaId || "";

    // For WhatsApp Web fallback
    if (provider === "WhatsAppWeb") {
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
      
      // Save log as pending / sent manual fallback
      const logId = "log-" + Math.floor(100000 + Math.random() * 900000);
      const newLog: CommunicationLog = {
        id: logId,
        gymId,
        memberId,
        memberName,
        type: "WhatsApp",
        category,
        message,
        status: "Pending",
        sentAt: new Date().toISOString(),
      };
      db.getCommunicationLogs().push(newLog);
      db.addTimelineEntry(gymId, memberId, "Timeline", `Message Prepared (${category})`, message.substring(0, 80) + "...");
      db.save();

      return {
        success: true,
        status: "Pending",
        whatsappUrl,
      };
    }

    // Call real APIs
    let apiStatus: "Sent" | "Failed" | "Pending" = "Failed";
    let apiError: string | undefined;

    try {
      let response: Response;
      if (provider === "Meta") {
        response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanedPhone,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        });
      } else if (provider === "Twilio") {
        response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${wabaId || apiKey}/Messages.json`, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(`${wabaId || apiKey}:${apiKey}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: `whatsapp:+${cleanedPhone}`,
            From: `whatsapp:${phoneNumberId || "+14155238886"}`,
            Body: message,
          }),
        });
      } else if (provider === "AiSensy") {
        response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            apiKey,
            campaignName: "payment_reminder",
            destination: cleanedPhone,
            userName: memberName,
            source: "api",
            media: {},
            templateParams: [message],
          }),
        });
      } else if (provider === "Interakt") {
        response = await fetch("https://api.interakt.ai/v1/public/message/", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode: cleanedPhone.length > 10 ? `+${cleanedPhone.substring(0, cleanedPhone.length - 10)}` : "+91",
            phoneNumber: cleanedPhone.substring(cleanedPhone.length - 10),
            type: "Template",
            template: {
              name: "payment_reminder",
              languageCode: "en",
              bodyValues: [message],
            },
          }),
        });
      } else {
        const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
        return {
          success: true,
          status: "Pending",
          whatsappUrl,
        };
      }

      if (response && response.ok) {
        apiStatus = "Sent";
      } else {
        apiStatus = "Failed";
        const responseText = response ? await response.text() : "No response from API gateway";
        apiError = `Gateway error (${response?.status || "Unknown"}): ${responseText.substring(0, 200)}`;
      }
    } catch (err: any) {
      apiStatus = "Failed";
      apiError = err.message || "Network request failed.";
    }

    const logId = "log-" + Math.floor(100000 + Math.random() * 900000);
    const newLog: CommunicationLog = {
      id: logId,
      gymId,
      memberId,
      memberName,
      type: "WhatsApp",
      category,
      message: message + (apiError ? `\n\n[Error Log: ${apiError}]` : ""),
      status: apiStatus,
      sentAt: new Date().toISOString(),
    };
    db.getCommunicationLogs().push(newLog);

    if (apiStatus === "Sent") {
      db.addTimelineEntry(gymId, memberId, "Timeline", `Message Sent (${category})`, message.substring(0, 80) + "...");
    } else {
      db.addTimelineEntry(gymId, memberId, "Timeline", `Dispatch Failed (${category})`, `${apiError?.substring(0, 60)}...`);
    }
    db.save();

    return {
      success: apiStatus === "Sent",
      status: apiStatus,
      error: apiError,
    };
  }

  /**
   * Fetch template and send a payment reminder dynamically
   */
  public static async sendReminder(memberId: string): Promise<{ success: boolean; status: "Sent" | "Failed" | "Pending"; message?: string; error?: string; whatsappUrl?: string }> {
    const userObj = db.getUsers().find((u) => u.id === memberId);
    if (!userObj) {
      return { success: false, status: "Failed", error: "Registered member account not found." };
    }

    const profileObj = db.getMembers().find((m) => m.id === memberId);
    if (!profileObj) {
      return { success: false, status: "Failed", error: "Member profile card not found." };
    }

    const gymId = userObj.gymId || "gym-1";

    const phone = userObj.phone || "";
    if (!phone) {
      return { success: false, status: "Failed", error: "Member does not have a registered phone number." };
    }

    const template = db.getMessageTemplates().find((t) => t.gymId === gymId && t.type === "Fee Due Reminder");
    const bodyText = template?.bodyText || "Hello {{MemberName}},\n\nThis is a friendly alert that amount {{Amount}} is pending towards your membership {{MembershipPlan}}. Dues date is {{DueDate}}.\n\nPlease clear it at your earliest convenience.\n\nBest,\n{{GymName}}";

    const plans = db.getMembershipPlans();
    const activePlan = profileObj.activePlanId ? plans.find((p) => p.id === profileObj.activePlanId) : null;

    const payments = db.getPayments().filter((p) => p.memberId === memberId || (profileObj.memberId && p.memberId === profileObj.memberId));
    const unpaidPayments = payments.filter((p) => p.status === "Pending" || p.status === "Overdue");
    const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let amount = String(totalUnpaid);
    if (totalUnpaid === 0 && activePlan) {
      amount = String(activePlan.price);
    }

    let dueDate = "";
    if (unpaidPayments.length > 0) {
      const validPayments = unpaidPayments.filter((p) => p.dueDate);
      if (validPayments.length > 0) {
        const sorted = validPayments.sort((a, b) => {
          const t1 = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const t2 = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return t1 - t2;
        });
        dueDate = sorted[0].dueDate || "";
      }
    } else if (profileObj.endDate) {
      dueDate = profileObj.endDate;
    } else {
      dueDate = new Date().toISOString().split("T")[0];
    }

    const gymSettings = db.getSettings().find((s) => s.gymId === gymId);
    const gymObj = db.getGyms().find((g) => g.id === gymId);
    const gymName = gymSettings?.gymName || gymObj?.name || "Elite Fitness Club";

    const parsedMsg = CommunicationService.parseTemplate(bodyText, {
      MemberName: userObj.fullName,
      GymName: gymName,
      Amount: amount,
      DueDate: dueDate,
      MembershipPlan: activePlan?.name || "Active Access Plan",
    });

    const result = await this.sendWhatsAppMessage(phone, parsedMsg, gymId, memberId, userObj.fullName, "Fee Due Reminder");
    return {
      success: result.success,
      status: result.status,
      message: parsedMsg,
      error: result.error,
      whatsappUrl: result.whatsappUrl,
    };
  }

  /**
   * Send test message to configured number/phone 
   */
  public static async sendTestMessage(phone: string, gymId: string = "gym-1"): Promise<{ success: boolean; status: "Sent" | "Failed" | "Pending"; error?: string }> {
    const testMsg = "Hello! This is a test reminder dispatch. Your WhatsApp API Gateway configuration is working beautifully! 👍";
    const result = await this.sendWhatsAppMessage(phone, testMsg, gymId, "system", "API Test Admin", "Test Message");
    return {
      success: result.success,
      status: result.status,
      error: result.error,
    };
  }
}
