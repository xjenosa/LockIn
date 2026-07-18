import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Buzzer",
  description: "Kahoot-style team buzzer trivia — host on the big screen, buzz on your phone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // avoid double-tap zoom fighting the buzzer
  themeColor: "#060CE9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body className="font-sans bg-boarddark text-white min-h-screen">{children}</body>
    </html>
  );
}
