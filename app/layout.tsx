import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { getProjects } from "@/lib/store";

export const metadata: Metadata = {
  title: "Freelance HQ — Project Management",
  description: "Track SEO, web development and digital marketing projects in one place.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const projects = await getProjects();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base-950 font-sans text-neutral-200 antialiased">
        <div className="flex min-h-screen">
          <Sidebar projects={projects} />
          <main className="flex-1 pb-20 md:pb-0">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
