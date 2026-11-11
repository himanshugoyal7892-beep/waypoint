"use client";

import { UserButton } from "@clerk/nextjs";
import { FolderKanban, Home, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Logo, YouAreHere } from "@/components/brand";
import { cn } from "@/lib/utils";

export interface SidebarProject {
  id: string;
  name: string;
}

function NavLink({
  href,
  active,
  children,
  icon,
  depth = 0,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  depth?: 0 | 1;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        depth === 1 && "ml-4 py-1.5 pl-4 text-[13px]",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-ink-muted hover:bg-white/5 hover:text-white",
      )}
    >
      {icon && <span className="[&_svg]:size-4 opacity-80">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active && <YouAreHere />}
      {active && <span className="sr-only">(current page)</span>}
    </Link>
  );
}

function NavContent({
  projects,
  userLabel,
  onNavigate,
}: {
  projects: SidebarProject[];
  userLabel: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const projectBase = (id: string) => `/dashboard/projects/${id}`;
  const currentProject = projects.find(
    (p) => pathname === projectBase(p.id) || pathname.startsWith(`${projectBase(p.id)}/`),
  );

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="space-y-1 px-3">
        <NavLink
          href="/dashboard"
          active={pathname === "/dashboard"}
          icon={<Home />}
          onNavigate={onNavigate}
        >
          Home
        </NavLink>
        <NavLink
          href="/dashboard/projects"
          active={pathname === "/dashboard/projects" || pathname === "/dashboard/projects/new"}
          icon={<FolderKanban />}
          onNavigate={onNavigate}
        >
          All projects
        </NavLink>
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="mb-1.5 px-3 text-xs font-medium text-ink-muted/80">Your projects</p>
        {projects.length === 0 ? (
          <p className="px-3 text-xs text-ink-muted/80">None yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const base = projectBase(p.id);
              const open = currentProject?.id === p.id;
              return (
                <li key={p.id}>
                  <Link
                    href={base}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                      open ? "text-white" : "text-ink-muted hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                        open ? "bg-primary text-white" : "bg-white/10",
                      )}
                      aria-hidden="true"
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </Link>
                  {open && (
                    <ul
                      className="mt-0.5 mb-2 space-y-0.5 border-l border-white/10 ml-6"
                      aria-label={`${p.name} sections`}
                    >
                      <li>
                        <NavLink
                          href={base}
                          active={pathname === base}
                          depth={1}
                          onNavigate={onNavigate}
                        >
                          Overview
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          href={`${base}/install`}
                          active={pathname.startsWith(`${base}/install`)}
                          depth={1}
                          onNavigate={onNavigate}
                        >
                          Install
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          href={`${base}/tours`}
                          active={pathname.startsWith(`${base}/tours`)}
                          depth={1}
                          onNavigate={onNavigate}
                        >
                          Tours
                        </NavLink>
                      </li>
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/dashboard/projects/new"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Plus className="size-4" aria-hidden /> New project
        </Link>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
        <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        <span className="truncate text-sm text-ink-muted">{userLabel}</span>
      </div>
    </div>
  );
}

export function AppSidebar({
  projects,
  userLabel,
}: {
  projects: SidebarProject[];
  userLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink lg:flex">
        <div className="px-6 py-5">
          <Link
            href="/dashboard"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Logo tone="light" />
          </Link>
        </div>
        <NavContent projects={projects} userLabel={userLabel} />
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Link href="/dashboard">
          <Logo tone="light" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="rounded-md p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </header>
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[60px] bottom-0 z-30 bg-ink pt-3 lg:hidden"
        >
          <NavContent projects={projects} userLabel={userLabel} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
