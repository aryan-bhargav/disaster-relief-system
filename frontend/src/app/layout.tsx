import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReliefOps — Disaster Relief Resource Allocation and Coordination System",
  description: "Resource allocation and disaster relief emergency operations console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--canvas)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
