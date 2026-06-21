import crypto from "crypto";
import { db, User } from "../database/database";

const JWT_SECRET = process.env.JWT_SECRET || "gymflow-super-secure-token-signing-secret-key-2026";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "GYM_OWNER" | "TRAINER" | "RECEPTIONIST" | "MEMBER";
  gymId: string | null;
  exp: number;
}

export class AuthService {
  // Sign a JWT-compatible access token with custom expire ms duration (defaults to 15 mins)
  public static generateAccessToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      exp: Date.now() + 15 * 60 * 1000, // 15 Minutes
    };
    
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payloadEncoded}`)
      .digest("base64url");
      
    return `${header}.${payloadEncoded}.${signature}`;
  }

  // Sign a JWT-compatible refresh token (7 days)
  public static generateRefreshToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT-REFRESH" })).toString("base64url");
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Days
    };
    
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    
    const signature = crypto
      .createHmac("sha256", JWT_SECRET + "-refresh-signing-salt")
      .update(`${header}.${payloadEncoded}`)
      .digest("base64url");
      
    return `${header}.${payloadEncoded}.${signature}`;
  }

  // Verify and decode a JWT-compatible token
  public static verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      
      const [header, payloadEncoded, signature] = parts;
      
      const expectedSignature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${header}.${payloadEncoded}`)
        .digest("base64url");
        
      if (signature !== expectedSignature) {
        return null; // Signature mismatch
      }
      
      const payload: TokenPayload = JSON.parse(
        Buffer.from(payloadEncoded, "base64url").toString("utf8")
      );
      
      if (payload.exp < Date.now()) {
        return null; // Expired
      }
      
      return payload;
    } catch (err) {
      return null;
    }
  }

  // Verify and decode a Refresh token
  public static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      
      const [header, payloadEncoded, signature] = parts;
      
      const expectedSignature = crypto
        .createHmac("sha256", JWT_SECRET + "-refresh-signing-salt")
        .update(`${header}.${payloadEncoded}`)
        .digest("base64url");
        
      if (signature !== expectedSignature) {
        return null;
      }
      
      const payload: TokenPayload = JSON.parse(
        Buffer.from(payloadEncoded, "base64url").toString("utf8")
      );
      
      if (payload.exp < Date.now()) {
        return null; // Expired
      }
      
      return payload;
    } catch (err) {
      return null;
    }
  }

  // Legacy fallback token for seamless backward path compatibility
  public static generateToken(user: User): string {
    return this.generateAccessToken(user);
  }
}
