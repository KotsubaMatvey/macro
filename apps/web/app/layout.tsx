import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macro Access",
  description: "Track macro events. Read the regime. Trade the reaction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
