import Phaser from "phaser";
import {
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";
import {
  competitionAssetResolver,
  type CompetitionAssetResolver,
} from "./competition-palette";

export * from "./competition-palette";

/** Current compatible runtime API. */
export const APK_RUNTIME_API_VERSION = "1.0.0";

/** Development edition supplied by the host. */
export interface RuntimeEdition {
  id: "primary-chibi" | "secondary-epic";
  title: string;
  colors: { background: number; panel: number; accent: number; text: string };
}

/** Browser-safe cartridge metadata. */
export interface RuntimeCartridgeManifest {
  id: string;
  title: string;
  description: string;
  version: string;
  runtimeApiVersion: string;
  inputMode: "vocabulary" | "sentence";
  requiredAssetBindings: readonly string[];
  capabilities: readonly string[];
}

/** Services supplied while creating the Phaser config. */
export interface CartridgeGameConfigContext {
  input: VocabularyInput;
  edition: RuntimeEdition;
  complete(result: unknown): void;
  diagnostic(event: { code: string; message: string }): void;
  seed?: number;
  assets: CompetitionAssetResolver;
}

/** Importable Phaser cartridge. */
export interface RuntimeCartridge {
  manifest: RuntimeCartridgeManifest;
  createGameConfig(context: CartridgeGameConfigContext): Phaser.Types.Core.GameConfig;
}

/** Minimal imperative host handle. */
export interface APKGameHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}

/** Bright development edition fixture. */
export const primaryChibiEdition: RuntimeEdition = {
  id: "primary-chibi",
  title: "Primary Chibi (development)",
  colors: {
    background: 0xdff6ff,
    panel: 0xffffff,
    accent: 0xff7a59,
    text: "#172554",
  },
};

/** Dark development edition fixture. */
export const secondaryEpicEdition: RuntimeEdition = {
  id: "secondary-epic",
  title: "Secondary Epic (development)",
  colors: {
    background: 0x090d1a,
    panel: 0x20283a,
    accent: 0x9b7cff,
    text: "#f8fafc",
  },
};

/**
 * Mounts one cartridge and owns validation, completion-once, restart, and teardown.
 * @param container The host element that owns the Phaser game.
 * @param cartridge The verified cartridge to run.
 * @param input The host-owned learning input.
 * @param edition The development edition used for preview semantics.
 * @param onComplete Receives one validated learning result.
 * @param onDiagnostic Optionally receives diagnostic events from the cartridge.
 * @param seed Optional deterministic seed supplied by the host.
 * @param assets Organizer-owned competition palette resolver.
 * @returns Imperative controls for the mounted game.
 */
export function mountCartridge(
  container: HTMLElement,
  cartridge: RuntimeCartridge,
  input: unknown,
  edition: RuntimeEdition,
  onComplete: (result: GameResults) => void,
  onDiagnostic?: (event: { code: string; message: string }) => void,
  seed?: number,
  assets: CompetitionAssetResolver = competitionAssetResolver,
): APKGameHandle {
  const parsed = (
    cartridge.manifest.inputMode === "sentence"
      ? sentenceInputSchema
      : vocabularyInputSchema
  ).parse(input);
  let completed = false;
  let game: Phaser.Game;

  const create = () => {
    const config = cartridge.createGameConfig({
      input: parsed,
      edition,
      seed,
      assets,
      diagnostic: (event) => onDiagnostic?.(event),
      complete: (value) => {
        if (completed) return;
        completed = true;
        onComplete(gameResultsSchema.parse(value));
      },
    });
    game = new Phaser.Game({ ...config, parent: container });
  };

  create();

  return {
    pause: () => game.scene.getScenes(true).forEach((scene) => scene.scene.pause()),
    resume: () => game.scene.getScenes(false).forEach((scene) => scene.scene.resume()),
    restart: () => {
      game.destroy(true);
      completed = false;
      create();
    },
    setMuted: (muted) => {
      game.sound.mute = muted;
    },
    destroy: () => game.destroy(true),
  };
}
