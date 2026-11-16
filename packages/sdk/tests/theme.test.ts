import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_TIP, readableOn, tipThemeVars } from "../src/ui/theme";
import { TourUI } from "../src/ui/tooltip";

afterEach(() => {
  TourUI.destroyAll();
  TourUI.setTheme(null, DEFAULT_TIP);
  document.body.replaceChildren();
});

describe("tip theme", () => {
  it("picks readable text for any brand colour", () => {
    expect(readableOn("#1A7F37")).toBe("#ffffff");
    expect(readableOn("#F5E642")).toBe("#0f172a");
  });

  it("light, dark and brand styles set the expected surfaces", () => {
    expect(tipThemeVars(DEFAULT_TIP, null)["--wp-bg"]).toBe("#ffffff");
    expect(tipThemeVars({ ...DEFAULT_TIP, style: "DARK" }, "#1A7F37")["--wp-bg"]).toBe("#161a33");
    const brand = tipThemeVars({ ...DEFAULT_TIP, style: "BRAND" }, "#1A7F37");
    expect(brand["--wp-bg"]).toBe("#1A7F37");
    expect(brand["--wp-primary-btn"]).toBe("#ffffff");
    expect(brand["--wp-on-primary"]).toBe("#1A7F37");
  });

  it("dark style swaps a near-black brand colour for one that stays visible", () => {
    expect(tipThemeVars({ ...DEFAULT_TIP, style: "DARK" }, "#0B0C10")["--wp-primary"]).toBe(
      "#8a85ff",
    );
  });

  it("corners, backdrop and font map to variables", () => {
    const v = tipThemeVars(
      { style: "LIGHT", corners: "SQUARE", progress: "BAR", font: "SITE", backdrop: false },
      null,
      "Georgia, serif",
    );
    expect(v["--wp-radius"]).toBe("0px");
    expect(v["--wp-backdrop"]).toBe("transparent");
    expect(v["--wp-font"]).toBe("Georgia, serif");
  });

  it("renders dots or a bar while keeping the spoken step count", () => {
    const target = document.createElement("button");
    document.body.append(target);
    const step = {
      id: "s",
      stepOrder: 2,
      pageUrl: "/",
      cssSelector: "button",
      title: "T",
      description: "",
      placement: "BOTTOM",
      allowSkip: true,
      nextButtonLabel: "Next",
      backButtonLabel: "Back",
    } as never;
    const actions = { onNext() {}, onBack() {}, onSkip() {} };

    TourUI.setTheme(null, { ...DEFAULT_TIP, progress: "DOTS" });
    let ui = new TourUI(actions);
    ui.show(target, { step, index: 1, total: 4 });
    expect(ui.shadow.querySelectorAll(".dot")).toHaveLength(4);
    expect(ui.shadow.querySelector(".dot.on")).not.toBeNull();
    expect(ui.shadow.querySelector(".counter")?.textContent).toContain("2 of 4");
    ui.destroy();

    TourUI.setTheme("#1A7F37", { ...DEFAULT_TIP, progress: "BAR", style: "BRAND" });
    ui = new TourUI(actions);
    ui.show(target, { step, index: 1, total: 4 });
    expect((ui.shadow.querySelector(".bar > i") as HTMLElement).style.width).toBe("50%");
    const host = document.querySelector("[data-ptour-host]") as HTMLElement;
    expect(host.style.getPropertyValue("--wp-bg")).toBe("#1A7F37");
    ui.destroy();
  });
});
