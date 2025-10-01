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
            console.error("Invalid login fields:", validatedFields.error);
            return null;
          }

          const { TenDangNhap, MatKhau } = validatedFields.data;

          // Authenticate user using existing utility
          const authResult = await authenticateUser(TenDangNhap, MatKhau);
          
          if (!authResult.success || !authResult.user) {
            console.error("Authentication failed:", authResult.message);
            return null;
          }

          // Return user object that matches our User interface
          return {
            id: authResult.user.id,
            username: authResult.user.username,
            role: authResult.user.role,
            unitId: authResult.user.unitId || undefined,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours session duration
  },
  jwt: {
    maxAge: 5 * 60, // 5 minutes JWT expiry
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
      // Check if token is valid and not expired
      if (!token.sub || !token.role || typeof token.sessionStart !== 'number') {
        return { ...session, user: undefined } as any;
      }

      // Check session expiry
      if (Date.now() - (token.sessionStart as number) > 2 * 60 * 60 * 1000) {
        return { ...session, user: undefined } as any;
      }

      // Update session user with our custom fields
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).unitId = token.unitId;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};