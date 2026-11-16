"use client";

import { Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <ConfirmAction
      title={`Delete “${name}”?`}
      description={
        <p>
          This permanently deletes the project, all of its tours and steps, and its analytics. Sites
          using its install snippet will stop showing tours. This can&apos;t be undone.
        </p>
      }
      confirmLabel="Delete project"
      onConfirm={async () => {
        await apiFetch(`/api/admin/v1/projects/${projectId}`, { method: "DELETE" });
        toast.success("Project deleted");
        router.push("/dashboard/projects");
        router.refresh();
      }}
      trigger={
        <Button variant="outline" className="text-destructive">
          <Trash2 aria-hidden /> Delete project
        </Button>
      }
    />
  );
}

export function DeleteTourButton({
  tourId,
  name,
  afterHref,
}: {
  tourId: string;
  name: string;
  afterHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  return (
    <ConfirmAction
      title={`Delete “${name}”?`}
      description={
        <p>
          This permanently deletes the tour, its steps and its analytics. To hide it but keep its
          data, archive it instead.
        </p>
      }
      confirmLabel="Delete tour"
      onConfirm={async () => {
        await apiFetch(`/api/admin/v1/tours/${tourId}`, { method: "DELETE" });
        toast.success("Tour deleted");
        router.push(afterHref);
        router.refresh();
      }}
      trigger={
        <Button variant="outline" className="text-destructive">
          <Trash2 aria-hidden /> Delete tour
        </Button>
      }
    />
  );
}

export function DeleteStepButton({
  stepId,
  label,
  afterHref,
}: {
  stepId: string;
  label: string;
  afterHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  return (
    <ConfirmAction
      title="Delete this step?"
      description={
        <p>
          “{label}” will be removed and the remaining steps renumbered. This can&apos;t be undone.
        </p>
      }
      confirmLabel="Delete step"
      onConfirm={async () => {
        await apiFetch(`/api/admin/v1/steps/${stepId}`, { method: "DELETE" });
        toast.success("Step deleted");
        router.push(afterHref);
        router.refresh();
      }}
      trigger={
        <Button variant="outline" className="text-destructive">
          <Trash2 aria-hidden /> Delete step
        </Button>
      }
    />
  );
}
