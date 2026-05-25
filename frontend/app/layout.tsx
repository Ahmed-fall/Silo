import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Cinzel, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import { SettingsProvider } from "@/context/SettingsContext";
import LiveAlertsPanel from "@/components/LiveAlertsPanel";
import Sidebar from "@/components/Sidebar";
import WheatParallaxField from "@/components/WheatParallaxField";

const outfit = Outfit({
  subsets: ["latin"], variable: "--font-outfit",
  display: "swap", weight: ["400","500","600","700","800"],
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"], variable: "--font-plus-jakarta",
  display: "swap", weight: ["400","500","600","700"],
});
const cinzel = Cinzel({
  subsets: ["latin"], variable: "--font-cinzel",
  display: "swap", weight: ["400","600","700"],
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"], variable: "--font-ibm-mono",
  display: "swap", weight: ["400","500"],
});

export const metadata: Metadata = {
  title: "Silo — State Grain Preservation Intelligence",
  description: "Secure real-time monitoring and intelligent management for national grain preservation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${outfit.variable} ${plusJakarta.variable} ${cinzel.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body
        className="h-full flex overflow-hidden relative"
        style={{ color: "var(--text-primary)" }}
      >
        {/* ── Parallax wheat field — fixed behind everything ── */}
        <WheatParallaxField />

        <SettingsProvider>
          <AlertProvider>
            {/* Sidebar gets a z-index to stay above the field */}
            <div className="relative z-10 shrink-0 flex">
              <Sidebar />
            </div>
            <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
              <header
                className="shrink-0 flex items-center justify-between px-4 lg:px-8 py-3"
                style={{
                  borderBottom: "1px solid var(--border-muted)",
                  backgroundColor: "var(--bg-elevated)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                {/* Mobile brand */}
                <div className="flex items-center gap-2 lg:hidden">
                  <span
                    className="font-cinzel font-semibold text-sm tracking-widest uppercase"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Silo
                  </span>
                </div>
                <div className="hidden lg:block" />
                <LiveAlertsPanel />
              </header>
              <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                {children}
              </main>
            </div>
          </AlertProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}


