import { FolderKanban, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        description="Each project is one website with its own install snippet and tours."
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
          icon={<FolderKanban />}
          title="No projects yet"
          description="Create a project for your website to get an install snippet and start building tours."
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
              <Card className="relative h-full transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="outline-none after:absolute after:inset-0 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{p.domain}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge>
                    {p._count.tours} tour{p._count.tours === 1 ? "" : "s"}
                  </Badge>
                  {p.tours.length > 0 && (
                    <Badge variant="success">{p.tours.length} published</Badge>
                  )}
                  {p.allowedOrigins.length === 0 && (
                    <Badge variant="warning">No allowed origins</Badge>
                  )}
                  <span className="ml-auto">Created {formatDate(p.createdAt)}</span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
