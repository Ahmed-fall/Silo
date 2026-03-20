import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import LiveAlertsPanel from "@/components/LiveAlertsPanel";
import Sidebar from "@/components/Sidebar";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Silo — AI Grain Preservation System",
  description:
    "Real-time monitoring and intelligent management for national grain preservation infrastructure.",
};

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakarta.variable} h-full antialiased dark`}
    >
      <body className="h-full flex overflow-hidden">
        <AlertProvider>
          {/* ── Left sidebar ── */}
          <Sidebar />

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Topbar */}
            <header className="
              shrink-0 flex items-center justify-between
              px-4 lg:px-6 py-3
              border-b border-white/[0.04]
              bg-slate-950/60 backdrop-blur-xl
            ">
              {/* Mobile brand */}
              <div className="flex items-center gap-2 lg:hidden">
                <span className="font-outfit font-bold text-white text-sm">Silo</span>
              </div>

              <div className="hidden lg:block" />

              {/* Right: Bell + alerts panel */}
              <LiveAlertsPanel />
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
