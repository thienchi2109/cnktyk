import { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/lib/db/utils";
import { LoginSchema } from "@/lib/db/schemas";

// Extend the JWT type to include our custom fields
declare module "@auth/core/jwt" {
  interface JWT {
    sub: string;
    role: "SoYTe" | "DonVi" | "NguoiHanhNghe" | "Auditor";
    unitId?: string;
    username: string;
    sessionStart: number;
  }
}

// Extend the Session type to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "SoYTe" | "DonVi" | "NguoiHanhNghe" | "Auditor";
      unitId?: string;
    };
  }

  interface User {
    id: string;
    username: string;
    role: "SoYTe" | "DonVi" | "NguoiHanhNghe" | "Auditor";
    unitId?: string;
  }
}

export const authConfig: NextAuthConfig = {
  basePath: "/api/auth",
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        TenDangNhap: { label: "Username", type: "text" },
        MatKhau: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validate input using Zod schema
          const validatedFields = LoginSchema.safeParse(credentials);
          
          if (!validatedFields.success) {
            console.error("[AUTH] Invalid login fields:", validatedFields.error);
            return null;
          }

          const { TenDangNhap, MatKhau } = validatedFields.data;

          console.log("[AUTH] Attempting authentication for:", TenDangNhap);

          // Authenticate user using existing utility
          const authResult = await authenticateUser(TenDangNhap, MatKhau);
          
          if (!authResult.success || !authResult.user) {
            console.error("[AUTH] Authentication failed:", authResult.message);
            return null;
          }

          console.log("[AUTH] Authentication successful for:", authResult.user.username);

          // Return user object that matches our User interface
          return {
            id: authResult.user.id,
            username: authResult.user.username,
            role: authResult.user.role,
            unitId: authResult.user.unitId || undefined,
          };
        } catch (error) {
          console.error("[AUTH] Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours session duration
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.unitId = user.unitId;
        token.username = user.username;
        token.sessionStart = Date.now();
      }

      // Check if session has expired (2 hours)
      if (typeof token.sessionStart === 'number' && Date.now() - token.sessionStart > 2 * 60 * 60 * 1000) {
        // Session expired, return null to force re-authentication
        return null;
      }

      // Refresh token on each request to extend JWT expiry
      if (trigger === "update") {
        // Keep existing token data but refresh timestamp
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      console.log("[AUTH] Session callback - token:", { 
        sub: token.sub, 
        role: token.role, 
        username: token.username,
        hasSessionStart: typeof token.sessionStart === 'number' 
      });

      // Check if token is valid and not expired
      if (!token.sub || !token.role) {
        console.error("[AUTH] Invalid token - missing sub or role");
        return { ...session, user: undefined } as any;
      }

      // For new sessions, sessionStart might not be set yet
      // Only check expiry if sessionStart exists
      if (typeof token.sessionStart === 'number') {
        const sessionAge = Date.now() - token.sessionStart;
        if (sessionAge > 2 * 60 * 60 * 1000) {
          console.error("[AUTH] Session expired - age:", sessionAge);
          return { ...session, user: undefined } as any;
        }
      }

      // Update session user with our custom fields
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).unitId = token.unitId;
      }

      console.log("[AUTH] Session callback - returning valid session");
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};