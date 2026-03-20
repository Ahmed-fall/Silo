import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import LiveAlertsPanel from "@/components/LiveAlertsPanel";
import Link from "next/link";
import { Cpu, LayoutDashboard, Settings, Wheat } from "lucide-react";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Silo — AI Grain Preservation System",
  description:
    "Real-time monitoring and intelligent management for national grain preservation infrastructure.",
};

// ─── Nav links ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/silos", label: "Silos", icon: Wheat },
  { href: "/ai", label: "AI Engine", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-slate-950 text-slate-200 flex overflow-hidden">
        <AlertProvider>
          {/* ── Left sidebar ── */}
          <aside
            className="
              hidden lg:flex flex-col shrink-0 w-64
              bg-slate-950/80 border-r border-slate-800
              backdrop-blur-xl
            "
          >
            {/* Logo / brand */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
              <div
                className="
                  flex items-center justify-center size-9 rounded-xl
                  bg-gradient-to-br from-emerald-500 to-teal-600
                  shadow-lg shadow-emerald-900/40
                "
              >
                <Wheat size={18} className="text-white" />
              </div>
              <div>
                <p className="font-space-grotesk font-bold text-base text-white tracking-tight leading-none">
                  Silo
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">
                  Grain Intelligence
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-slate-400 text-sm font-medium
                    hover:text-slate-100 hover:bg-slate-800/60
                    transition-all duration-150
                    group
                  "
                >
                  <Icon
                    size={17}
                    className="text-slate-500 group-hover:text-emerald-400 transition-colors"
                  />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Sidebar footer */}
            <div className="px-4 py-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-600 text-center tracking-wider uppercase">
                v0.1.0 — Beta
              </p>
            </div>
          </aside>

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Topbar */}
            <header
              className="
                shrink-0 flex items-center justify-between
                px-4 lg:px-6 py-3
                bg-slate-950/70 border-b border-slate-800 backdrop-blur-md
              "
            >
              {/* Mobile brand */}
              <div className="flex items-center gap-2 lg:hidden">
                <Wheat size={20} className="text-emerald-400" />
                <span className="font-space-grotesk font-bold text-white text-sm">
                  Silo
                </span>
              </div>

              {/* Page breadcrumb placeholder (grows) */}
              <div className="hidden lg:block" />

              {/* Right controls */}
              <div className="flex items-center gap-3">
                {/* WS live dot — rendered by panel; this is just a spacer for layout */}
                <LiveAlertsPanel />
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </AlertProvider>
      </body>
    </html>
  );
}
