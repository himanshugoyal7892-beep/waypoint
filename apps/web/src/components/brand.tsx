import { PRODUCT } from "@waypoint/shared";
import { cn } from "@/lib/utils";

/** Waypoint mark: a map pin on a route segment. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#4A44D6" />
      <path
        d="M6 24c4-1 6-5 10-5s6 3 10 2"
        fill="none"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="1.6"
        strokeDasharray="2 2.5"
        strokeLinecap="round"
      />
      <path d="M16 6.5a6 6 0 0 0-6 6c0 4.3 6 9.5 6 9.5s6-5.2 6-9.5a6 6 0 0 0-6-6Z" fill="#F5A524" />
      <circle cx="16" cy="12.5" r="2.2" fill="#1B1F4B" />
    </svg>
  );
}

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <LogoMark />
      {PRODUCT.name}
    </span>
  );
}

/** Small amber pin marking the current location in navigation. */
export function YouAreHere({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 16" className={cn("h-3.5 w-2.5 shrink-0", className)} aria-hidden="true">
      <path d="M6 0a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6Z" fill="#F5A524" />
      <circle cx="6" cy="6" r="2.2" fill="#1B1F4B" />
    </svg>
  );
}

/**
 * Empty-state illustration: a dotted route between waypoints, with the next pin still to be
 * placed. `variant` changes what sits at the end of the route.
 */
export function RouteIllustration({
  variant = "project",
}: {
  variant?: "project" | "tour" | "step" | "data";
}) {
  return (
    <svg viewBox="0 0 220 96" className="h-24 w-56" aria-hidden="true">
      <path
        d="M14 70 C 50 70, 52 30, 92 30 S 140 72, 176 58"
        fill="none"
        stroke="#C9CCEB"
        strokeWidth="2.5"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <circle cx="14" cy="70" r="6" fill="#ECEBFD" stroke="#4A44D6" strokeWidth="2" />
      <circle
        cx="92"
        cy="30"
        r="5"
        fill="#ECEBFD"
        stroke="#4A44D6"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      {variant === "data" ? (
        <g transform="translate(160 26)">
          <rect x="0" y="22" width="8" height="14" rx="2" fill="#C9CCEB" />
          <rect x="12" y="12" width="8" height="24" rx="2" fill="#A9A6F0" />
          <rect x="24" y="2" width="8" height="34" rx="2" fill="#4A44D6" />
        </g>
      ) : (
        <g transform="translate(164 18)">
          <path
            d="M12 0a12 12 0 0 0-12 12c0 8.4 12 20 12 20s12-11.6 12-20A12 12 0 0 0 12 0Z"
            fill="#F5A524"
          />
          <circle cx="12" cy="12" r="4.5" fill="#1B1F4B" />
          {variant !== "project" && <circle cx="12" cy="12" r="1.6" fill="#F5A524" />}
        </g>
      )}
    </svg>
  );
}
