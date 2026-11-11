import { AppSidebar } from "@/components/app-sidebar";
import { requirePageUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const projects = await listProjects(user.id);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppSidebar
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        userLabel={user.name ?? user.email}
      />
      <div className="contour-ground min-h-screen lg:pl-64">
        <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </>
  );
}
