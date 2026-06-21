import { Request, Response, NextFunction } from "express";
import { AuthService, TokenPayload } from "../services/auth.service";

// Access authenticated user on request
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  const decoded = AuthService.verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired session token." });
  }

  (req as any).user = decoded;
  next();
}

// Middleware to authorize specific roles
export function authorize(allowedRoles: ("SUPER_ADMIN" | "GYM_OWNER" | "TRAINER" | "RECEPTIONIST" | "MEMBER")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as TokenPayload;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${user.role}' is not authorized to perform this action.` 
      });
    }

    next();
  };
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["MANAGE_MEMBERS", "MANAGE_PAYMENTS", "MANAGE_STAFF", "VIEW_REPORTS", "MANAGE_PLANS", "MANAGE_SETTINGS"],
  GYM_OWNER: ["MANAGE_MEMBERS", "MANAGE_PAYMENTS", "MANAGE_STAFF", "VIEW_REPORTS", "MANAGE_PLANS", "MANAGE_SETTINGS"],
  RECEPTIONIST: ["MANAGE_MEMBERS", "MANAGE_PAYMENTS", "VIEW_REPORTS"],
  TRAINER: ["MANAGE_MEMBERS"],
  MEMBER: []
};

// Middleware to authorize specific permissions
export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as TokenPayload;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    if (user.role === "SUPER_ADMIN") {
      return next();
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: `Access denied. Permission '${requiredPermission}' is required.`
      });
    }

    next();
  };
}
