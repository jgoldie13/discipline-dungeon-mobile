import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import { MicroTasksProvider } from "@/components/MicroTasksSheet";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discipline Dungeon",
  description: "Build your cathedral through disciplined action. Track tasks, defeat distractions, level up.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Discipline Dungeon",
  },
  formatDetection: {
    telephone: false,
  },
};

// Next.js 14+ requires viewport in separate export
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <MicroTasksProvider>
            <div className="min-h-dvh pb-20">{children}</div>
            <BottomNav />
          </MicroTasksProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
