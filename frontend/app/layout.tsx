import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Cinzel, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

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
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}


