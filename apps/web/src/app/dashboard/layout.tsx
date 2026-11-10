import { UserButton } from "@clerk/nextjs";
import { PRODUCT } from "@waypoint/shared";
import { Compass } from "lucide-react";
import Link from "next/link";
import { requirePageUser } from "@/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Compass className="size-5 text-primary" aria-hidden />
              {PRODUCT.name}
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link
                href="/dashboard/projects"
                className="text-muted-foreground hover:text-foreground"
              >
                Projects
              </Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
    </>
  );
}
