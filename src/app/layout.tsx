import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beleram — Intelligent DJ Studio",
  description: "A web-based DJ studio with real audio mixing, waveforms, EQ, and intelligent auto-DJ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a18" }}>
        {children}
      </body>
    </html>
  );
}
