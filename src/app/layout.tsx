import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "./components/SessionProvider";

export const metadata: Metadata = {
  title: "Wahyu Redjo Template",
  description: "Automated Template Creator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
