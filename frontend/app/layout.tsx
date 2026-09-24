import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/common/DemoBanner";

export const metadata: Metadata = {
  title: "SoilPilot — Digital Soil Mapping & Soil Health Portal",
  description: "Farmer-friendly digital soil mapping, cadastral Gat-based field access, soil health cards, and crop recommendations.",
  keywords: ["Soil Health", "Digital Soil Mapping", "Farmer Portal", "Agriculture", "Soil Test", "Gat Number"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-surface-subtle font-sans">
        <Providers>
          <DemoBanner />
          <Header />
          <AppShell>{children}</AppShell>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
