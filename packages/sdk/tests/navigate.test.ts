import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateTo } from "../src/navigate";

afterEach(() => {
  document.body.textContent = "";
  vi.useRealTimers();
});

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement("a");
  a.href = href;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  document.body.append(a);
  return a;
}

describe("navigateTo", () => {
  it("clicks an in-page link to the same path so SPA routers navigate in-app", () => {
    vi.useFakeTimers();
    const a = link("/products/aurora");
    const clicked = vi.fn((e: Event) => {
      e.preventDefault();
      history.pushState({}, "", "/products/aurora");
    });
    a.addEventListener("click", clicked);
    const assign = vi.spyOn(location, "assign").mockImplementation(() => {});
    navigateTo("/products/aurora");
    vi.advanceTimersByTime(2500);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("ignores new-tab, download, query-string and other-origin links", () => {
    link("/x", { target: "_blank" });
    link("/x", { download: "" });
    link("/x?ref=1");
    link("https://other.example.com/x");
    const assign = vi.spyOn(location, "assign").mockImplementation(() => {});
    navigateTo("/x");
    expect(assign).toHaveBeenCalledWith("/x");
  });

  it("falls back to a full page load if the app does not navigate", () => {
    vi.useFakeTimers();
    const a = link("/y");
    a.addEventListener("click", (e) => e.preventDefault()); // app swallows the click
    const assign = vi.spyOn(location, "assign").mockImplementation(() => {});
    navigateTo("/y");
    vi.advanceTimersByTime(2500);
    expect(assign).toHaveBeenCalledWith("/y");
  });
});
