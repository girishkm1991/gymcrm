import { db, AuditLog } from "../database/database";

export class AuditService {
  /**
    * Record an administrative or financial action in the SQL-compatible audit logs table
    */
  public static log(params: {
    gymId: string | null;
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    details: string;
    ipAddress?: string;
  }): AuditLog {
    const logs = db.getAuditLogs();
    
    const newLog: AuditLog = {
      id: "log-" + Math.floor(100000 + Math.random() * 900000),
      gymId: params.gymId,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress || "127.0.0.1",
      createdAt: new Date().toISOString()
    };
    
    logs.push(newLog);
    db.save();
    return newLog;
  }

  /**
    * Fetch logs for a given gym, or all logs for SUPER_ADMIN
    */
  public static getLogs(gymId: string | null): AuditLog[] {
    const logs = db.getAuditLogs();
    if (!gymId) {
      return logs;
    }
    return logs.filter(log => log.gymId === gymId);
  }
}
