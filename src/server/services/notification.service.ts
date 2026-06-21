import { db, Notification, MemberProfile, User, MemberMembership } from "../database/database";

export class NotificationService {
  /**
   * List notifications for a member or all notifications for an owner/admin
   */
  public static getNotifications(gymId: string, userId?: string): Notification[] {
    const notifications = db.getNotifications();
    return notifications.filter(notif => {
      const matchGym = notif.gymId === gymId || notif.gymId === null;
      if (!matchGym) return false;
      if (userId) {
        return notif.userId === userId || notif.userId === null;
      }
      return true;
    });
  }

  /**
   * Mark a notification as read
   */
  public static markAsRead(notificationId: string, userId: string): Notification {
    const notifications = db.getNotifications();
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) throw new Error("Notification not found.");
    
    if (!notif.isReadBy.includes(userId)) {
      notif.isReadBy.push(userId);
      db.save();
    }
    return notif;
  }

  /**
   * Clean/batch create automated reminders (expiry, birthday, fee due)
   */
  public static triggerAutomatedReminders(gymId: string): void {
    const members = db.getMembers();
    const users = db.getUsers();
    const memberships = db.getMemberMemberships().filter(m => m.gymId === gymId);
    const notifications = db.getNotifications();
    
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    // 1. Membership Expiry Reminders (7-day, 3-day, 1-day)
    memberships.forEach(msh => {
      if (msh.status !== "Active") return;
      
      const memberUser = users.find(u => u.id === msh.memberId);
      if (!memberUser) return;

      const endDate = new Date(msh.endDate);
      const diffMs = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        const title = `Membership Expiration Warning: ${diffDays} Day(s) Left`;
        const message = `Dear ${memberUser.fullName}, your gym plan is ending on ${msh.endDate}. Renew soon to avoid access interruption!`;
        const code = `expiry-${msh.id}-${diffDays}`;

        // Verify we haven't logged this specific threshold already
        const alreadyNotified = notifications.some(n => n.userId === msh.memberId && n.title === title);
        if (!alreadyNotified) {
          notifications.push({
            id: "notif-" + Math.floor(100000 + Math.random() * 900000),
            gymId,
            type: "Membership Expiry",
            title,
            message,
            userId: msh.memberId,
            isReadBy: [],
            scheduledFor: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // 2. Birthday Reminders
    members.forEach(member => {
      if (!member.dob) return;
      const memberUser = users.find(u => u.id === member.id);
      if (!memberUser) return;
      
      const dobMatch = member.dob.substring(5); // "MM-DD"
      const todayMatch = todayStr.substring(5); // "MM-DD"
      
      if (dobMatch === todayMatch) {
        const title = `Happy Birthday, ${memberUser.fullName}! 🎂`;
        const message = `We wish you a fantastic birthday filled with heavy lifts, great meals, and positive strides! Enjoy your special day!`;
        
        // Ensure only one birthday notification per year
        const currentYear = new Date().getFullYear();
        const alreadyNotified = notifications.some(n => 
          n.userId === member.id && 
          n.type === "Birthday" && 
          new Date(n.createdAt).getFullYear() === currentYear
        );

        if (!alreadyNotified) {
          notifications.push({
            id: "notif-" + Math.floor(100000 + Math.random() * 900000),
            gymId,
            type: "Birthday",
            title,
            message,
            userId: member.id,
            isReadBy: [],
            scheduledFor: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // 3. Fee Due Reminders
    const payments = db.getPayments().filter(p => p.gymId === gymId);
    payments.forEach(pay => {
      if (pay.status === "Pending" || pay.status === "Overdue") {
        const title = `Fee Outstanding Notice`;
        const message = `Your invoice of $${pay.amount} for '${pay.type}' remains outstanding. Please make payment soon.`;
        
        const alreadyNotified = notifications.some(n => n.userId === pay.memberId && n.title === title);
        if (!alreadyNotified) {
          notifications.push({
            id: "notif-" + Math.floor(100000 + Math.random() * 900000),
            gymId,
            type: "Fee Due",
            title,
            message,
            userId: pay.memberId,
            isReadBy: [],
            scheduledFor: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    db.save();
  }
}
