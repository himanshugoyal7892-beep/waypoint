import type { Metadata } from "next";
import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New project"
        description="A project represents one website. You'll get an install snippet next."
        breadcrumbs={[{ href: "/dashboard/projects", label: "Projects" }]}
      />
      <Card>
        <CardContent className="pt-5">
          <ProjectForm
            mode="create"
            initial={{ name: "", domain: "", allowedOrigins: ["http://localhost:5173"] }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
