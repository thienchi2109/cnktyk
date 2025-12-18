import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hệ thống quản lý đào tạo nhân lực ngành y tế",
  description: "Healthcare practitioner compliance tracking system for the Department of Health",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch session on server to prevent unnecessary client-side fetch
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} light`}>
      <body className="antialiased bg-white">
        <QueryProvider>
          <AuthProvider session={session}>
            {children}
          </AuthProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
