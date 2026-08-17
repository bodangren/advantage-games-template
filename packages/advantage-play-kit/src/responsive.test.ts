import { describe, expect, it } from "vitest";
import { resolveResponsiveComposition } from "./responsive";

const base = {
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  inputCapabilities: { touch: true, pointer: true, keyboard: true },
  accessibility: { textScale: 1, touchScale: 1 },
};

describe("responsive composition", () => {
  it("selects compact and wide profiles", () => {
    expect(resolveResponsiveComposition({ ...base, viewport: { width: 390, height: 844 } })).toMatchObject({
      supported: true,
      profile: "compact",
      inputMode: "hybrid",
    });
    expect(resolveResponsiveComposition({ ...base, viewport: { width: 1440, height: 900 } })).toMatchObject({
      supported: true,
      profile: "wide",
      inputMode: "hybrid",
    });
  });

  it("fails closed for unsupported usable geometry", () => {
    expect(resolveResponsiveComposition({ ...base, viewport: { width: 300, height: 470 } })).toEqual({
      supported: false,
      code: "UNSUPPORTED_VIEWPORT_SIZE",
      guidance: "Use a viewport of at least 320x480 after safe-area and accessibility scaling.",
    });
  });
});
