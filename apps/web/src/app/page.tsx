import { PRODUCT } from "@waypoint/shared";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-[0_8px_30px_rgb(27_31_75/0.08)]">
        <h1 className="text-2xl font-semibold">Welcome to {PRODUCT.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account to build your first guided tour, or sign in to continue.
        </p>
        <div className="mt-6 grid gap-2">
          <Button asChild size="lg">
            <Link href="/sign-up">Create an account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
