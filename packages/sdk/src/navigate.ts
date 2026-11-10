import { normalizePathname } from "@waypoint/shared/url";

/**
 * Goes to another page of the same site. If the page has an ordinary link to that path, it is
 * clicked so single-page apps (React/Next/Vue routers) navigate in-app and the tour keeps
 * running without a reload. Otherwise, or if the app doesn't navigate, a normal page load is used
 * and the tour resumes from saved progress.
 */
export function navigateTo(path: string, fallbackMs = 2000): void {
  const wanted = normalizePathname(path);
  const link = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
    (a) =>
      a.origin === location.origin &&
      normalizePathname(a.pathname) === wanted &&
      !a.search &&
      (!a.target || a.target === "_self") &&
      !a.hasAttribute("download"),
  );
  if (!link) {
    location.assign(path);
    return;
  }
  link.click();
  setTimeout(() => {
    if (normalizePathname(location.pathname) !== wanted) location.assign(path);
  }, fallbackMs);
}
