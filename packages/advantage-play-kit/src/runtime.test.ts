import { describe, expect, it, vi } from "vitest";
import { developmentEdition } from "./development-edition";
import {
  mountCartridge,
  type GameFactoryContext,
  type RuntimeCartridge,
} from "./runtime";

const validResult = {
  accuracy: 1,
  xp: 10,
  score: 100,
  correctAnswers: 1,
  totalAttempts: 1,
};

describe("APK beta runtime", () => {
  it("validates completion once and cleans up restart and destroy", async () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 390 });
    Object.defineProperty(container, "clientHeight", { value: 844 });
    const contexts: GameFactoryContext[] = [];
    const destroy = vi.fn();
    const complete = vi.fn();
    const cartridge: RuntimeCartridge = {
      manifest: {
        id: "runtime-test",
        title: "Runtime Test",
        description: "Runtime fixture",
        version: "0.1.0",
        runtimeApiVersion: "1.0.0",
        inputMode: "vocabulary",
        requiredAssetBindings: ["ui/20x20/inventory/slot"],
        capabilities: [],
      },
      createGameConfig: () => ({}),
    };
    const handle = await mountCartridge(
      {
        container,
        cartridge,
        input: [{ term: "แมว", translation: "cat" }],
        edition: developmentEdition,
        host: { complete },
      },
      (context) => {
        contexts.push(context);
        return { destroy };
      },
    );

    contexts[0]!.complete(validResult);
    contexts[0]!.complete(validResult);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(handle.getDiagnostics().completionCount).toBe(1);

    await handle.restart();
    expect(destroy).toHaveBeenCalledTimes(1);
    contexts[1]!.complete(validResult);
    expect(complete).toHaveBeenCalledTimes(2);

    await handle.destroy();
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(handle.getDiagnostics().status).toBe("destroyed");
  });

  it("rejects invalid results without completing the host", async () => {
    const container = document.createElement("div");
    const complete = vi.fn();
    let context: GameFactoryContext | undefined;
    const cartridge: RuntimeCartridge = {
      manifest: {
        id: "invalid-result-test",
        title: "Invalid Result Test",
        description: "Runtime fixture",
        version: "0.1.0",
        runtimeApiVersion: "1.0.0",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
        capabilities: [],
      },
      createGameConfig: () => ({}),
    };
    const handle = await mountCartridge(
      {
        container,
        cartridge,
        input: [{ term: "a", translation: "b" }],
        edition: developmentEdition,
        host: { complete },
      },
      (nextContext) => {
        context = nextContext;
        return { destroy: vi.fn() };
      },
    );
    context!.complete({ score: -1 });
    expect(complete).not.toHaveBeenCalled();
    expect(handle.getDiagnostics().lastEvent?.code).toBe("INVALID_GAME_RESULTS");
    await handle.destroy();
  });
});
