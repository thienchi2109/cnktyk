import type { Metadata } from "next";
import "./globals.css";

// Use system fonts for better compatibility
const systemFonts = [
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  '"Noto Sans"',
  "sans-serif",
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
  '"Noto Color Emoji"',
];

const systemMonoFonts = [
  "ui-monospace",
  "SFMono-Regular",
  '"SF Mono"',
  "Consolas",
  '"Liberation Mono"',
  "Menlo",
  "monospace",
];

import { AuthProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Hệ thống quản lý đào tạo nhân lực ngành y tế",
  description: "Healthcare practitioner compliance tracking system for the Department of Health",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch session on server to prevent unnecessary client-side fetch
  const session = await auth();

  return (
    <html lang="en" className="light">
      <body
        className="antialiased bg-white"
        style={{
          fontFamily: systemFonts.join(', '),
        }}
      >
        <QueryProvider>
          <AuthProvider session={session}>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
