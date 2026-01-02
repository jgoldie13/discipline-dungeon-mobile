import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import { MicroTasksProvider } from "@/components/MicroTasksSheet";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const navItems = [
  { href: "/mobile", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/phone/block", label: "Block" },
  { href: "/build", label: "Build" },
  { href: "/settings", label: "Settings" },
];

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
        className={`${inter.variable} ${cinzel.variable} bg-slate-950 text-dd-text antialiased`}
      >
        <ToastProvider>
          <MicroTasksProvider>
            <div className="min-h-dvh">
              <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 md:px-8">
                <aside className="glass-panel hidden w-60 shrink-0 flex-col gap-6 rounded-xl p-4 md:flex">
                  <div className="font-serif text-xs uppercase tracking-widest text-dd-text">
                    Discipline Dungeon
                  </div>
                  <nav aria-label="Primary">
                    <ul className="space-y-2 text-sm font-semibold">
                      {navItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block rounded-lg px-3 py-2 text-dd-muted/80 transition-colors hover:text-dd-text hover:bg-dd-surface/60"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </aside>
                <main className="flex-1 pb-20 md:pb-6">{children}</main>
              </div>
            </div>
            <div className="md:hidden">
              <BottomNav />
            </div>
          </MicroTasksProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
