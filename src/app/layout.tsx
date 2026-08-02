import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipeline — Aura Workstream",
  description:
    "Internal work operating system for Max Attention Technologies — opportunities, compliance, and delivery.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA" className="h-full">
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
