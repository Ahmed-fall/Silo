import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import { SettingsProvider } from "@/context/SettingsContext";
import LiveAlertsPanel from "@/components/LiveAlertsPanel";
import Sidebar from "@/components/Sidebar";

const outfit = Outfit({
  subsets: ["latin"], variable: "--font-outfit",
  display: "swap", weight: ["400","500","600","700","800"],
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"], variable: "--font-plus-jakarta",
  display: "swap", weight: ["400","500","600","700"],
});

export const metadata: Metadata = {
  title: "Silo — AI Grain Preservation System",
  description: "Real-time monitoring and intelligent management for national grain preservation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${outfit.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body
        className="h-full flex overflow-hidden"
        style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <SettingsProvider>
          <AlertProvider>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <header
                className="shrink-0 flex items-center justify-between px-4 lg:px-6 py-3"
                style={{
                  borderBottom: "1px solid var(--border-muted)",
                  backgroundColor: "var(--bg-elevated)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                {/* Mobile brand */}
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="font-outfit font-bold text-sm" style={{ color: "var(--text-primary)" }}>Silo</span>
                </div>
                <div className="hidden lg:block" />
                <LiveAlertsPanel />
              </header>
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                {children}
              </main>
            </div>
          </AlertProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
