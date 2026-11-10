"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12">
      <Alert tone="error" title="Something went wrong">
        We couldn&apos;t load this page. The problem has been logged. Try again, or go back to your
        projects.
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/projects">Back to projects</Link>
        </Button>
      </div>
    </div>
  );
}
