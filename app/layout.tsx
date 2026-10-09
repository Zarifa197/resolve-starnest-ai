import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resolve — Cause-aware customer recovery",
  description: "Analyze customer events, choose a relevant response, and track the outcome.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
