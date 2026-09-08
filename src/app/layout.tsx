import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { VotingProvider } from "@/context/VotingContext";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "โหวตสตาฟในดวงใจ ปี 2026",
  description: "แอพพลิเคชันโหวตสตาฟในดวงใจ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body suppressHydrationWarning className={`${kanit.variable} font-sans min-h-screen bg-slate-50 text-slate-800`}>
        <VotingProvider>
          {children}
        </VotingProvider>
      </body>
    </html>
  );
}
