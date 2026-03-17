import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessAudit — AI Wheelchair Accessibility Auditor",
  description:
    "AI-powered wheelchair accessibility auditing using street-level imagery and NVIDIA Nemotron vision models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
