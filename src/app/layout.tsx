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
      <body className={`${kanit.variable} font-sans bg-slate-100 min-h-screen flex justify-center`}>
        <div className="w-full max-w-md min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden">
          <VotingProvider>
            {children}
          </VotingProvider>
        </div>
      </body>
    </html>
  );
}
