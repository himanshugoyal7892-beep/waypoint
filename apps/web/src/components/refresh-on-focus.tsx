"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

/** Reloads the page's data when the user comes back to this tab (e.g. after the builder). */
export function RefreshOnFocus() {
  const router = useRouter();
  React.useEffect(() => {
    const onShow = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [router]);
  return null;
}
