import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    AUTO: 0,
    Scale: { RESIZE: 0, CENTER_BOTH: 0 },
    Scene: class {},
    Scenes: { Events: { SHUTDOWN: "shutdown" } },
  },
}));

import {
  developmentEdition,
  mountCartridge,
  type GameFactoryContext,
} from "@reading-advantage/advantage-play-kit";
import { candidateManifest, myGameCartridge } from "./index";

describe("candidate import compatibility", () => {
  it("keeps root metadata and the validated manifest aligned", async () => {
    const metadata = JSON.parse(
      await readFile("cartridge-candidate.json", "utf8"),
    ) as Record<string, string>;
    expect(metadata.cartridgeId).toBe(candidateManifest.id);
    expect(metadata.inputMode).toBe(candidateManifest.inputMode);
    expect(metadata.runtimeApiVersion).toBe(candidateManifest.runtimeApiVersion);
    expect(metadata.developerKitApiVersion).toBe(candidateManifest.developerKitApiVersion);
  });

  it("dynamically mounts through the runtime adapter", async () => {
    const container = document.createElement("div");
    const complete = vi.fn();
    let context: GameFactoryContext | undefined;
    const handle = await mountCartridge(
      {
        container,
        cartridge: myGameCartridge,
        input: [{ term: "แมว", translation: "cat" }],
        edition: developmentEdition,
        host: { complete },
      },
      (nextContext) => {
        context = nextContext;
        return { destroy: vi.fn() };
      },
    );
    expect(context?.cartridge.manifest.id).toBe("my-game");
    context!.complete({
      accuracy: 1,
      xp: 30,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
    expect(complete).toHaveBeenCalledTimes(1);
    await handle.destroy();
  });
});
