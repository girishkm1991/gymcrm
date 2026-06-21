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
  // Sign a JWT-compatible token using Node.js built-in crypto (HmacSHA256)
  public static generateToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 Hours
    };
    
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    
    // Create Hmac signature
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
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
      
      // Re-sign to verify integrity
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
      
      // Check expiration
      if (payload.exp < Date.now()) {
        return null; // Expired
      }
      
      return payload;
    } catch (err) {
      return null;
    }
  }
}
