import { db, MemberMembership, MemberProfile, MembershipPlan } from "../database/database";
import { AuditService } from "./audit.service";

export class MembershipService {
  /**
    * Calculate dynamic End Date based on Plan duration and Start Date
    */
  public static calculateEndDate(startDateStr: string, duration: string): string {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) {
      throw new Error("Invalid start date format.");
    }
    
    const end = new Date(start);
    switch (duration) {
      case "Monthly":
        end.setMonth(end.getMonth() + 1);
        break;
      case "Quarterly":
        end.setMonth(end.getMonth() + 3);
        break;
      case "Half Yearly":
        end.setMonth(end.getMonth() + 6);
        break;
      case "Annual":
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        // Default Custom / 30-day base fallback
        end.setDate(end.getDate() + 30);
        break;
    }
    
    // Convert to standard YYYY-MM-DD
    return end.toISOString().split("T")[0];
  }

  /**
    * Calculate days remaining until expiry
    */
  public static calculateDaysRemaining(endDateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    
    const diffMs = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Add / Initialize a new membership for a member
   */
  public static addMembership(params: {
    gymId: string;
    memberId: string;
    planId: string;
    startDate: string;
    pricePaid: number;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): MemberMembership {
    const members = db.getMembers();
    const plans = db.getMembershipPlans();
    
    const member = members.find(m => m.id === params.memberId);
    if (!member) throw new Error("Member profile not found.");
    
    const plan = plans.find(p => p.id === params.planId);
    if (!plan) throw new Error("Membership plan not found.");
    
    const endDate = this.calculateEndDate(params.startDate, plan.duration);
    
    // De-activate existing memberships for this member
    const existing = db.getMemberMemberships().filter(msh => msh.memberId === params.memberId);
    existing.forEach(msh => {
      if (msh.status === "Active") {
        msh.status = "Expired";
        msh.updatedAt = new Date().toISOString();
      }
    });

    const newMembership: MemberMembership = {
      id: "msh-" + Math.floor(100000 + Math.random() * 900000),
      gymId: params.gymId,
      memberId: params.memberId,
      planId: params.planId,
      startDate: params.startDate,
      endDate: endDate,
      status: "Active",
      pricePaid: params.pricePaid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.getMemberMemberships().push(newMembership);
    
    // Update active fields on Member Profile
    member.activePlanId = params.planId;
    member.status = "Active";
    
    db.save();

    AuditService.log({
      gymId: params.gymId,
      userId: params.actor.id,
      userName: params.actor.name,
      userRole: params.actor.role,
      action: "Membership Added",
      details: `Added plan '${plan.name}' for Member Display ID: ${member.memberId}`,
      ipAddress: params.actor.ipAddress
    });

    return newMembership;
  }

  /**
   * Renew current membership or add consecutive future plan
   */
  public static renewMembership(params: {
    gymId: string;
    memberId: string;
    planId: string;
    startDateStr?: string; // If ignored, will start consecutive after expiry (or today if expired)
    pricePaid: number;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): MemberMembership {
    const members = db.getMembers();
    const plans = db.getMembershipPlans();
    
    const member = members.find(m => m.id === params.memberId);
    if (!member) throw new Error("Member profile not found.");
    
    const plan = plans.find(p => p.id === params.planId);
    if (!plan) throw new Error("Plan not found.");
    
    // Find active or latest membership to determine consecutive start date
    const memberships = db.getMemberMemberships().filter(msh => msh.memberId === params.memberId);
    const activeMsh = memberships.find(msh => msh.status === "Active");
    
    let nextStart = params.startDateStr || new Date().toISOString().split("T")[0];
    if (!params.startDateStr && activeMsh) {
      const activeEndDate = new Date(activeMsh.endDate);
      const today = new Date();
      if (activeEndDate > today) {
        // Start day after the current active end date
        const dayAfter = new Date(activeEndDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        nextStart = dayAfter.toISOString().split("T")[0];
      }
    }
    
    // If consecutive renewal, we might mark active as expired once next plan starts, 
    // but for simple CRM we will set next active inline.
    if (activeMsh && nextStart <= new Date().toISOString().split("T")[0]) {
      // Deactivate current active since new renewal starts immediately
      activeMsh.status = "Expired";
      activeMsh.updatedAt = new Date().toISOString();
    }
    
    const nextEnd = this.calculateEndDate(nextStart, plan.duration);
    
    const renewedMsh: MemberMembership = {
      id: "msh-" + Math.floor(100000 + Math.random() * 900000),
      gymId: params.gymId,
      memberId: params.memberId,
      planId: params.planId,
      startDate: nextStart,
      endDate: nextEnd,
      status: "Active",
      pricePaid: params.pricePaid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.getMemberMemberships().push(renewedMsh);
    
    // Ensure profile reflects active fields
    member.activePlanId = params.planId;
    member.status = "Active";
    db.save();

    AuditService.log({
      gymId: params.gymId,
      userId: params.actor.id,
      userName: params.actor.name,
      userRole: params.actor.role,
      action: "Membership Renewed",
      details: `Renewed plan '${plan.name}' (Start: ${nextStart}, End: ${nextEnd}) for Member Display ID: ${member.memberId}`,
      ipAddress: params.actor.ipAddress
    });

    return renewedMsh;
  }

  /**
   * Upgrade immediate plan
   */
  public static upgradeMembership(params: {
    gymId: string;
    memberId: string;
    newPlanId: string;
    pricePaid: number;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): MemberMembership {
    const memberships = db.getMemberMemberships().filter(msh => msh.memberId === params.memberId);
    const active = memberships.find(msh => msh.status === "Active");
    
    if (active) {
      active.status = "Expired";
      active.updatedAt = new Date().toISOString();
    }
    
    // Create new upgrade commencing today
    const todayStr = new Date().toISOString().split("T")[0];
    return this.addMembership({
      gymId: params.gymId,
      memberId: params.memberId,
      planId: params.newPlanId,
      startDate: todayStr,
      pricePaid: params.pricePaid,
      actor: {
        ...params.actor,
        role: params.actor.role,
        name: params.actor.name
      }
    });
  }

  /**
   * Freeze plan to halt dynamic depletion
   */
  public static freezeMembership(params: {
    memberId: string;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): MemberMembership {
    const memberships = db.getMemberMemberships().filter(msh => msh.memberId === params.memberId);
    const active = memberships.find(msh => msh.status === "Active");
    if (!active) throw new Error("No active membership found to freeze.");
    
    active.status = "Frozen";
    active.freezeDate = new Date().toISOString().split("T")[0];
    active.updatedAt = new Date().toISOString();
    
    const member = db.getMembers().find(m => m.id === params.memberId);
    if (member) member.status = "Inactive";
    
    db.save();

    AuditService.log({
      gymId: active.gymId,
      userId: params.actor.id,
      userName: params.actor.name,
      userRole: params.actor.role,
      action: "Membership Frozen",
      details: `Froze membership plan id '${active.id}' for member ${params.memberId}`,
      ipAddress: params.actor.ipAddress
    });

    return active;
  }

  /**
   * Cancel plan
   */
  public static cancelMembership(params: {
    memberId: string;
    actor: { id: string; name: string; role: string; ipAddress?: string };
  }): MemberMembership {
    const memberships = db.getMemberMemberships().filter(msh => msh.memberId === params.memberId);
    const active = memberships.find(msh => msh.status === "Active" || msh.status === "Frozen");
    if (!active) throw new Error("No active/frozen membership found to cancel.");
    
    active.status = "Cancelled";
    active.cancelDate = new Date().toISOString().split("T")[0];
    active.updatedAt = new Date().toISOString();
    
    const member = db.getMembers().find(m => m.id === params.memberId);
    if (member) {
      member.status = "Expired";
      member.activePlanId = null;
    }
    
    db.save();

    AuditService.log({
      gymId: active.gymId,
      userId: params.actor.id,
      userName: params.actor.name,
      userRole: params.actor.role,
      action: "Membership Cancelled",
      details: `Cancelled membership plan id '${active.id}' for member ${params.memberId}`,
      ipAddress: params.actor.ipAddress
    });

    return active;
  }

  /**
   * Fetch aggregate statistics for CRM dashboard
   */
  public static getDashboardMetrics(gymId: string): {
    activeMemberships: number;
    expiringSoon: number;
    expiredMembers: number;
  } {
    const memberships = db.getMemberMemberships().filter(msh => msh.gymId === gymId);
    
    let activeMemberships = 0;
    let expiringSoon = 0;
    let expiredMembers = db.getMembers().filter(m => m.status === "Expired" || m.status === "Inactive").length;
    
    memberships.forEach(msh => {
      if (msh.status === "Active") {
        activeMemberships++;
        const days = this.calculateDaysRemaining(msh.endDate);
        if (days > 0 && days <= 7) {
          expiringSoon++;
        }
      }
    });
    
    return {
      activeMemberships,
      expiringSoon,
      expiredMembers
    };
  }
}
