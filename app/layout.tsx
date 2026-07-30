import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freelance HQ — Project Management",
  description: "Track SEO, web development and digital marketing projects in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base-950 font-sans text-neutral-200 antialiased">{children}</body>
    </html>
  );
}
