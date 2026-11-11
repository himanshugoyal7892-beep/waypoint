import Link from "next/link";
import { Logo } from "@/components/brand";

const POINTS = [
  {
    title: "Point, don't code",
    body: "Click any element on your site to anchor a step. No selectors to write.",
  },
  {
    title: "Publish in one click",
    body: "Tours go live through one snippet, including via Google Tag Manager.",
  },
  {
    title: "See where people drop off",
    body: "Starts, completions and step-by-step drop-off for every tour.",
  },
];

/** Split layout for sign-in / sign-up: product story on ink contours, form on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="contour-ink relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <Link
          href="/"
          className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Logo tone="light" />
        </Link>
        <div className="max-w-md">
          <h1 className="text-[40px] leading-[1.08] font-semibold">
            Show people the way around your product.
          </h1>
          <p className="mt-4 text-base text-ink-muted">
            Guided tours that point at the real buttons on your website, built in minutes without a
            code release.
          </p>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <svg viewBox="0 0 12 16" className="mt-1 h-4 w-3 shrink-0" aria-hidden="true">
                  <path
                    d="M6 0a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6Z"
                    fill="#F5A524"
                  />
                  <circle cx="6" cy="6" r="2.2" fill="#1B1F4B" />
                </svg>
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-ink-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-muted/70">
          Tours run in a sealed layer on your site: they never change your page or read its content.
        </p>
      </section>
      <section className="contour-ground flex flex-col items-center justify-center gap-6 px-5 py-12">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>
        {children}
      </section>
    </div>
  );
}
