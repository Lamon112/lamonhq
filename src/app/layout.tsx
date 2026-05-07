import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lamon HQ",
  description:
    "Interaktivna gamificirana app za upravljanje Lamon Agency — vizualni ecosystem operacija.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
