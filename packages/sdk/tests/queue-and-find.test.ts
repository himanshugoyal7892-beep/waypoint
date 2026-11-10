import { afterEach, describe, expect, it, vi } from "vitest";
import { EventQueue } from "../src/analytics/queue";
import { findElement } from "../src/runtime/find-element";

const ids = () => ({ visitorId: "v_12345678", sessionId: "s_12345678" });
const always = () => true;

describe("EventQueue", () => {
  afterEach(() => vi.useRealTimers());

  it("batches events and posts text/plain JSON with sanitised URLs", async () => {
    vi.useFakeTimers();
    history.replaceState({}, "", "/cart?email=a@b.com#ptb_token=secret");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));
    const q = new EventQueue(
      "https://api.example.com/api/public/v1/events",
      "pk_demoShop0000000000000000",
      ids,
    );
    q.track({ eventName: "tour_started", tourId: "t1", tourVersion: 1 });
    q.track({ eventName: "step_viewed", tourId: "t1", tourVersion: 1, stepId: "s1", stepOrder: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/api/public/v1/events");
    expect((init!.headers as Record<string, string>)["Content-Type"]).toMatch(/^text\/plain/);
    expect(init!.credentials).toBe("omit");
    const body = JSON.parse(init!.body as string);
    expect(body.projectKey).toBe("pk_demoShop0000000000000000");
    expect(body.events).toHaveLength(2);
    expect(body.events[0].currentUrl).toBe(`${location.origin}/cart`);
    expect(Object.keys(body.events[1]).sort()).toEqual(
      [
        "anonymousVisitorId",
        "clientEventId",
        "currentUrl",
        "eventName",
        "sessionId",
        "stepId",
        "stepOrder",
        "timestamp",
        "tourId",
        "tourVersion",
      ].sort(),
    );
    q.destroy();
  });

  it("uses sendBeacon with a text/plain Blob when the page is hidden", () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const q = new EventQueue("https://api.example.com/e", "pk_demoShop0000000000000000", ids);
    q.track({ eventName: "tour_skipped", tourId: "t1", tourVersion: 1 });
    window.dispatchEvent(new Event("pagehide"));
    expect(beacon).toHaveBeenCalledTimes(1);
    const blob = (beacon.mock.calls[0] as unknown as [string, Blob])[1];
    expect(blob.type).toMatch(/^text\/plain/);
    expect(fetchMock).not.toHaveBeenCalled();
    q.destroy();
  });

  it("does nothing when disabled (preview mode)", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const q = new EventQueue(
      "https://api.example.com/e",
      "pk_demoShop0000000000000000",
      ids,
      false,
    );
    q.track({ eventName: "tour_started", tourId: "t1", tourVersion: 1 });
    q.flush(false);
    expect(fetchMock).not.toHaveBeenCalled();
    q.destroy();
  });
});

describe("findElement", () => {
  afterEach(() => (document.body.textContent = ""));

  it("finds an existing element", async () => {
    document.body.append(Object.assign(document.createElement("button"), { id: "go" }));
    const r = await findElement("#go", { visible: always });
    expect(r.element?.id).toBe("go");
  });

  it("waits for an element rendered later", async () => {
    setTimeout(() => {
      const b = document.createElement("div");
      b.setAttribute("data-tour-id", "late");
      document.body.append(b);
    }, 30);
    const r = await findElement('[data-tour-id="late"]', { visible: always, timeoutMs: 1000 });
    expect(r.element).not.toBeNull();
  });

  it("times out gracefully", async () => {
    const r = await findElement("#missing", { visible: always, timeoutMs: 50 });
    expect(r).toEqual({ element: null, reason: "timeout" });
  });

  it("reports invalid selectors without throwing", async () => {
    // Real browsers throw a SyntaxError for malformed selectors; happy-dom is lenient, so simulate it.
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      throw new DOMException("bad selector", "SyntaxError");
    });
    expect(await findElement("div[[[", { visible: always })).toEqual({
      element: null,
      reason: "invalid_selector",
    });
  });

  it("can be aborted", async () => {
    const ctrl = new AbortController();
    const p = findElement("#never", { visible: always, timeoutMs: 5000, signal: ctrl.signal });
    ctrl.abort();
    expect(await p).toEqual({ element: null, reason: "aborted" });
  });
});
