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

export const metadata: Metadata = {
  title: "Hệ thống quản lý đào tạo nhân lực y tế",
  description: "Healthcare practitioner compliance tracking system for the Department of Health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className="antialiased bg-white"
        style={{
          fontFamily: systemFonts.join(', '),
        }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
