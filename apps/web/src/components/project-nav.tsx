"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;
  const items = [
    { href: base, label: "Overview", active: pathname === base },
    { href: `${base}/install`, label: "Install", active: pathname.startsWith(`${base}/install`) },
    { href: `${base}/tours`, label: "Tours", active: pathname.startsWith(`${base}/tours`) },
  ];
  return (
    <nav aria-label="Project" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "inline-block border-b-2 px-1 pb-2 text-sm",
                i.active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
