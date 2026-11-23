import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import IdleTimeout from "@/app/assets/components/auth/idle-timeout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VINIX7 | Smart Assignment Platform",
  description: "Platform pengumpulan tugas kelompok VINIX7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IdleTimeout />
        {children}
      </body>
    </html>
  );
}
