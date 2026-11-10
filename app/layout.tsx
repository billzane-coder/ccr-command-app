import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "CCR Commander",
  description:
    "The Ultimate Rebreather Companion — Deco, Run-Up, Checklists & Drills",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CCR Commander",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-slate-950">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}