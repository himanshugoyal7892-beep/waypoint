import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requirePageUser();
  const projects = await listProjects(user.id);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each project is one website, with its own install snippet and tours."
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden /> New project
            </Link>
          </Button>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title="Start with your website"
          description="Create a project for your website to get an install snippet, then build your first tour."
          action={
            <Button asChild>
              <Link href="/dashboard/projects/new">Create a project</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <article className="relative flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-[0_1px_2px_rgb(27_31_75/0.05)] transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-[0_6px_20px_rgb(27_31_75/0.08)]">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-display text-lg font-semibold text-primary"
                    aria-hidden
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold">
                      <Link
                        href={`/dashboard/projects/${p.id}`}
                        className="outline-none after:absolute after:inset-0 after:rounded-xl"
                      >
                        {p.name}
                      </Link>
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">{p.domain}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <Badge>
                    {p._count.tours} tour{p._count.tours === 1 ? "" : "s"}
                  </Badge>
                  {p.tours.length > 0 && <Badge variant="success">{p.tours.length} live</Badge>}
                  {p.allowedOrigins.length === 0 && (
                    <Badge variant="warning">Needs a website address</Badge>
                  )}
                </div>
                <p className="mt-auto pt-4 text-xs text-muted-foreground">
                  Created {formatDate(p.createdAt)}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
