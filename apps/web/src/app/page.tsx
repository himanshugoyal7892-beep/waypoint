import { PRODUCT } from "@waypoint/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{PRODUCT.name}</h1>
      <p className="text-muted-foreground">
        {PRODUCT.tagline}. Point at elements on your site, write a few tips, and publish.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/sign-up">Create an account</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
