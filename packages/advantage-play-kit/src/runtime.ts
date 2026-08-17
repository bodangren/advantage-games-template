import {
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
  type SentenceInput,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";
import {
  resolveResponsiveComposition,
  type ResponsiveRuntimeOptions,
  type SupportedResponsiveComposition,
} from "./responsive";

/** Current browser runtime contract understood by APK. */
export const APK_RUNTIME_API_VERSION = "1.0.0";

/** Owner-authorized developer-kit contract pinned by this template. */
export const APK_DEVELOPER_KIT_API_VERSION = "2.0.0";

/** Monorepo revision used to build this standalone beta adapter. */
export const APK_SOURCE_COMMIT =
  "f6d1ed5a6e7d71caa60b5b822364294c405e181a";

/** Canonical learning content accepted by a cartridge launch. */
export type GameInput = VocabularyInput | SentenceInput;

/** Physical file kinds accepted by the development edition. */
export type PhysicalAssetKind = "image" | "spritesheet" | "audio";

/** Exact rectangular frame grid encoded in a raster. */
export interface FrameGrid {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly frameCount: number;
}

/** One named animation over frame indices. */
export interface AssetAnimation {
  readonly name: string;
  readonly frames: readonly number[];
  readonly frameRate: number;
  readonly repeat: number;
  readonly yoyo?: boolean;
}

/** One immutable physical file in the development asset snapshot. */
export interface PhysicalAssetFile {
  readonly id: string;
  readonly path: string;
  readonly kind: PhysicalAssetKind;
  readonly width: number;
  readonly height: number;
  readonly format: "png" | "ogg";
  readonly byteSize: number;
  readonly sha256: string;
  readonly grid?: FrameGrid;
  readonly animations?: Readonly<Record<string, AssetAnimation>>;
  readonly provenance: {
    readonly source: string;
    readonly license: string;
    readonly creator?: string;
  };
}

/** A bounded physical asset pack supplied by the development host. */
export interface AssetPackManifest {
  readonly id: string;
  readonly version: string;
  readonly root: string;
  readonly files: Readonly<Record<string, PhysicalAssetFile>>;
}

/** Runtime operation selected by a semantic binding. */
export type SemanticAssetUsage = "image" | "animation" | "audio";

/** One semantic role bound to a physical development file. */
export interface SemanticAssetBinding {
  readonly key: string;
  readonly file: string;
  readonly usage: SemanticAssetUsage;
  readonly animation?: string;
}

/** Audience-safe tuning that does not alter educational behavior. */
export interface AudienceTuning {
  readonly speed: number;
  readonly targetScale: number;
  readonly collisionScale: number;
  readonly intensity: number;
}

/** Complete development edition selected by the host. */
export interface RuntimeEdition {
  readonly id: string;
  readonly title: string;
  readonly runtimeApiVersion: string;
  readonly pack: AssetPackManifest;
  readonly bindings: Readonly<Record<string, SemanticAssetBinding>>;
  readonly tuning: AudienceTuning;
}

/** Browser-safe runtime metadata consumed by hosts. */
export interface RuntimeCartridgeManifest {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly runtimeApiVersion: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly requiredAssetBindings: readonly string[];
  readonly capabilities: readonly string[];
}

/** Structured runtime event rendered by the game lab. */
export interface APKDiagnosticEvent {
  readonly level: "debug" | "info" | "warning" | "error";
  readonly code: string;
  readonly message: string;
  readonly timestamp: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Diagnostic input accepted before the runtime adds a timestamp. */
export type APKDiagnosticInput = Omit<APKDiagnosticEvent, "timestamp"> & {
  readonly timestamp?: number;
};

/** Normalized pointer position and button state. */
export interface APKPointerState {
  readonly down: boolean;
  readonly released: boolean;
  readonly cancelled: boolean;
  readonly id: number | null;
  readonly kind: "mouse" | "pen" | "touch" | null;
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
}

/** Immutable normalized input snapshot read by a cartridge. */
export interface APKInputSnapshot {
  readonly keys: readonly string[];
  readonly pressed: readonly string[];
  readonly pointer: APKPointerState;
  readonly destroyed: boolean;
}

/** Browser input controller owned by one mounted cartridge. */
export interface APKInputController {
  snapshot(): APKInputSnapshot;
  cancelActiveGesture(): void;
  destroy(): void;
}

/** Context supplied while a cartridge creates its Phaser configuration. */
export interface CartridgeGameConfigContext {
  readonly input: GameInput;
  readonly edition: RuntimeEdition;
  readonly complete: (result: unknown) => void;
  readonly diagnostic: (event: APKDiagnosticInput) => void;
  readonly inputController: APKInputController;
  readonly composition?: SupportedResponsiveComposition;
  readonly seed?: number;
}

/** Phaser-native cartridge entry point consumed by the runtime. */
export interface RuntimeCartridge {
  readonly manifest: RuntimeCartridgeManifest;
  createGameConfig(
    context: CartridgeGameConfigContext,
  ): Readonly<Record<string, unknown>>;
}

/** Imperative game instance returned by a renderer factory. */
export interface APKGameInstance {
  pause?(): void;
  resume?(): void;
  resize?(width: number, height: number): void;
  recompose?(composition: SupportedResponsiveComposition): void;
  setMuted?(muted: boolean): void;
  destroy(): void | Promise<void>;
}

/** Fully validated values passed to a renderer factory. */
export interface GameFactoryContext extends CartridgeGameConfigContext {
  readonly container: HTMLElement;
  readonly cartridge: RuntimeCartridge;
}

/** Injectable renderer construction boundary used by production and tests. */
export type GameFactory = (
  context: GameFactoryContext,
) => APKGameInstance | Promise<APKGameInstance>;

/** Host callbacks available to the browser runtime. */
export interface APKHostAdapter {
  complete(result: GameResults): void | Promise<void>;
  diagnostic?(event: APKDiagnosticEvent): void;
  navigate?(destination: string): void;
}

/** Options required to mount one cartridge session. */
export interface MountCartridgeOptions {
  readonly container: HTMLElement;
  readonly cartridge: RuntimeCartridge;
  readonly input: unknown;
  readonly edition: RuntimeEdition;
  readonly host: APKHostAdapter;
  readonly seed?: number;
  readonly responsive?: ResponsiveRuntimeOptions;
}

/** Runtime state exposed to authoring tools. */
export interface APKRuntimeDiagnostics {
  readonly status:
    | "mounting"
    | "running"
    | "paused"
    | "restarting"
    | "completed"
    | "error"
    | "destroyed";
  readonly cartridgeId: string;
  readonly editionId: string;
  readonly restartCount: number;
  readonly completionCount: number;
  readonly muted: boolean;
  readonly width: number;
  readonly height: number;
  readonly layoutProfile?: "compact" | "wide";
  readonly lastEvent?: APKDiagnosticEvent;
}

/** Imperative lifecycle and diagnostics API returned to a host. */
export interface APKGameHandle {
  pause(): void;
  resume(): void;
  restart(): Promise<void>;
  setMuted(muted: boolean): void;
  getDiagnostics(): APKRuntimeDiagnostics;
  destroy(): Promise<void>;
}

/** Resolved semantic binding with its physical source. */
export interface ResolvedAssetBinding {
  readonly binding: SemanticAssetBinding;
  readonly file: PhysicalAssetFile;
  readonly url: string;
  readonly textureKey: string;
  readonly animationKey?: string;
}

/** Minimal Phaser loader surface used by the asset adapter. */
export interface PhysicalAssetLoader {
  image?(key: string, url: string): unknown;
  audio?(key: string, urls: string | string[]): unknown;
  spritesheet?(
    key: string,
    url: string,
    config: { frameWidth: number; frameHeight: number },
  ): unknown;
}

/** Minimal Phaser animation manager used by the asset adapter. */
export interface PhysicalAnimationManager {
  exists?(key: string): boolean;
  create(config: {
    key: string;
    frames: readonly { key: string; frame: number }[];
    frameRate: number;
    repeat: number;
    yoyo?: boolean;
  }): unknown;
}

/** Structured runtime error. */
export class APKRuntimeError extends Error {
  /** Machine-readable failure code. */
  readonly code: string;

  /** Optional safe diagnostic context. */
  readonly details?: Readonly<Record<string, unknown>>;

  /**
   * Creates a runtime error.
   * @param code Machine-readable failure code.
   * @param message Human-readable failure description.
   * @param details Optional diagnostic context.
   */
  constructor(
    code: string,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "APKRuntimeError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalizes keyboard and pointer input for one cartridge surface.
 * @param surface Element that owns browser gesture handling.
 * @returns A controller with deterministic teardown.
 */
export function createInputController(surface: HTMLElement): APKInputController {
  const keys = new Set<string>();
  const pressed = new Set<string>();
  const pointer = {
    down: false,
    released: false,
    cancelled: false,
    id: null as number | null,
    kind: null as "mouse" | "pen" | "touch" | null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  };
  const previousTouchAction = surface.style.touchAction;
  let destroyed = false;

  const onKeyDown = (event: KeyboardEvent) => {
    keys.add(event.code);
    if (!event.repeat) pressed.add(event.code);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onPointerDown = (event: PointerEvent) => {
    pointer.down = true;
    pointer.released = false;
    pointer.cancelled = false;
    pointer.id = event.pointerId;
    pointer.kind = normalizePointerKind(event.pointerType);
    pointer.startX = event.clientX;
    pointer.startY = event.clientY;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const finishPointer = (event: PointerEvent, cancelled: boolean) => {
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
    pointer.down = false;
    pointer.released = !cancelled;
    pointer.cancelled = cancelled;
    pointer.id = null;
    pointer.kind = normalizePointerKind(event.pointerType);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent) => finishPointer(event, true);
  const preventBrowserGesture = (event: Event) => event.preventDefault();

  surface.style.touchAction = "none";
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  surface.addEventListener("contextmenu", preventBrowserGesture);

  return {
    snapshot: () => {
      const snapshot: APKInputSnapshot = {
        keys: [...keys].sort(),
        pressed: [...pressed],
        pointer: { ...pointer },
        destroyed,
      };
      pressed.clear();
      pointer.released = false;
      return snapshot;
    },
    cancelActiveGesture: () => {
      pointer.down = false;
      pointer.released = false;
      pointer.cancelled = true;
      pointer.id = null;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      surface.style.touchAction = previousTouchAction;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
      surface.removeEventListener("contextmenu", preventBrowserGesture);
    },
  };
}

function normalizePointerKind(
  value: string,
): "mouse" | "pen" | "touch" {
  return value === "touch" || value === "pen" ? value : "mouse";
}

/**
 * Validates a development edition against required semantic bindings.
 * @param edition Untrusted edition value.
 * @param requiredBindings Semantic bindings required by the cartridge.
 * @returns The validated edition.
 */
export function validateEdition(
  edition: RuntimeEdition,
  requiredBindings: readonly string[],
): RuntimeEdition {
  if (edition.runtimeApiVersion !== APK_RUNTIME_API_VERSION) {
    throw new APKRuntimeError(
      "INCOMPATIBLE_RUNTIME",
      `Edition ${edition.id} requires runtime ${edition.runtimeApiVersion}`,
    );
  }
  const missing = requiredBindings.filter((key) => !edition.bindings[key]);
  if (missing.length > 0) {
    throw new APKRuntimeError(
      "MISSING_ASSET_SLOT",
      `Edition ${edition.id} is missing bindings: ${missing.join(", ")}`,
    );
  }
  for (const [key, binding] of Object.entries(edition.bindings)) {
    const file = edition.pack.files[binding.file];
    if (binding.key !== key || !file) {
      throw new APKRuntimeError("INVALID_EDITION", `Invalid asset binding ${key}`);
    }
    if (binding.animation && !file.animations?.[binding.animation]) {
      throw new APKRuntimeError("INVALID_EDITION", `Missing animation for ${key}`);
    }
  }
  return edition;
}

/**
 * Resolves one semantic asset binding from the host edition.
 * @param edition Validated host edition.
 * @param key Semantic asset key.
 * @returns The physical file and stable Phaser keys.
 */
export function resolveAssetBinding(
  edition: RuntimeEdition,
  key: string,
): ResolvedAssetBinding {
  const binding = edition.bindings[key];
  if (!binding) {
    throw new APKRuntimeError("MISSING_ASSET_SLOT", `Missing asset binding ${key}`);
  }
  const file = edition.pack.files[binding.file];
  if (!file) {
    throw new APKRuntimeError("INVALID_EDITION", `Missing physical file ${binding.file}`);
  }
  const textureKey = `${edition.id}:${file.id}`;
  return {
    binding,
    file,
    url: `${edition.pack.root}/${file.path}`,
    textureKey,
    ...(binding.animation
      ? { animationKey: `${textureKey}:${binding.animation}` }
      : {}),
  };
}

/**
 * Preloads selected semantic bindings without duplicate physical loads.
 * @param loader Phaser loader or a compatible test double.
 * @param edition Validated host edition.
 * @param keys Semantic asset keys.
 */
export function preloadAssetBindings(
  loader: PhysicalAssetLoader,
  edition: RuntimeEdition,
  keys: readonly string[],
): void {
  const loaded = new Set<string>();
  for (const key of keys) {
    const resolved = resolveAssetBinding(edition, key);
    if (loaded.has(resolved.file.id)) continue;
    loaded.add(resolved.file.id);
    if (resolved.file.kind === "spritesheet") {
      if (!resolved.file.grid || !loader.spritesheet) {
        throw new APKRuntimeError("INVALID_EDITION", `Invalid spritesheet ${resolved.file.id}`);
      }
      loader.spritesheet(resolved.textureKey, resolved.url, {
        frameWidth: resolved.file.grid.frameWidth,
        frameHeight: resolved.file.grid.frameHeight,
      });
    } else if (resolved.file.kind === "audio") {
      loader.audio?.(resolved.textureKey, resolved.url);
    } else {
      loader.image?.(resolved.textureKey, resolved.url);
    }
  }
}

/**
 * Registers selected descriptor-owned animations once.
 * @param manager Phaser animation manager or a compatible test double.
 * @param edition Validated host edition.
 * @param keys Semantic asset keys.
 */
export function registerAssetAnimations(
  manager: PhysicalAnimationManager,
  edition: RuntimeEdition,
  keys: readonly string[],
): void {
  for (const key of keys) {
    const resolved = resolveAssetBinding(edition, key);
    if (!resolved.animationKey || manager.exists?.(resolved.animationKey)) continue;
    const animation = resolved.file.animations?.[resolved.binding.animation!];
    if (!animation) continue;
    manager.create({
      key: resolved.animationKey,
      frames: animation.frames.map((frame) => ({ key: resolved.textureKey, frame })),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
      ...(animation.yoyo === undefined ? {} : { yoyo: animation.yoyo }),
    });
  }
}

/**
 * Creates the Phaser renderer factory used by the game lab.
 * @returns A lazy browser-only renderer factory.
 */
export function createPhaserGameFactory(): GameFactory {
  return async (context) => {
    const Phaser = await import("phaser");
    const config = context.cartridge.createGameConfig(context);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: "#0b1020",
      ...config,
      parent: context.container,
    });
    const activeScenes = () => game.scene.getScenes(true) as Array<{
      scene?: { pause?(): void; resume?(): void };
      apkRecompose?(composition: SupportedResponsiveComposition): void;
    }>;
    return {
      pause: () => activeScenes().forEach((scene) => scene.scene?.pause?.()),
      resume: () => activeScenes().forEach((scene) => scene.scene?.resume?.()),
      resize: () => game.scale.refresh(),
      recompose: (composition) =>
        activeScenes().forEach((scene) => scene.apkRecompose?.(composition)),
      setMuted: (muted) => {
        game.sound.mute = muted;
      },
      destroy: () => game.destroy(true),
    };
  };
}

/**
 * Mounts one cartridge with host-owned lifecycle and completion validation.
 * @param options Validated host launch options.
 * @param factory Injected renderer factory.
 * @returns Lifecycle controls and diagnostics.
 */
export async function mountCartridge(
  options: MountCartridgeOptions,
  factory: GameFactory,
): Promise<APKGameHandle> {
  const { cartridge, container, host } = options;
  if (cartridge.manifest.runtimeApiVersion !== APK_RUNTIME_API_VERSION) {
    throw new APKRuntimeError(
      "INCOMPATIBLE_RUNTIME",
      `Cartridge ${cartridge.manifest.id} requires runtime ${cartridge.manifest.runtimeApiVersion}`,
    );
  }
  const schema =
    cartridge.manifest.inputMode === "sentence"
      ? sentenceInputSchema
      : vocabularyInputSchema;
  const input = schema.parse(options.input) as GameInput;
  const edition = validateEdition(
    options.edition,
    cartridge.manifest.requiredAssetBindings,
  );
  const inputController = createInputController(container);
  let status: APKRuntimeDiagnostics["status"] = "mounting";
  let instance: APKGameInstance | undefined;
  let restartCount = 0;
  let completionCount = 0;
  let muted = false;
  let destroyed = false;
  let width = container.clientWidth;
  let height = container.clientHeight;
  let lastEvent: APKDiagnosticEvent | undefined;
  let composition = resolveComposition(options, width, height);

  const diagnostic = (event: APKDiagnosticInput) => {
    lastEvent = { ...event, timestamp: event.timestamp ?? Date.now() };
    host.diagnostic?.(lastEvent);
  };
  const complete = (candidate: unknown) => {
    if (destroyed || completionCount > 0) return;
    const parsed = gameResultsSchema.safeParse(candidate);
    if (!parsed.success) {
      diagnostic({
        level: "error",
        code: "INVALID_GAME_RESULTS",
        message: "Cartridge emitted invalid results",
        details: { issues: parsed.error.issues },
      });
      return;
    }
    completionCount = 1;
    status = "completed";
    diagnostic({ level: "info", code: "GAME_COMPLETED", message: "Game result accepted" });
    void Promise.resolve(host.complete(parsed.data)).catch((error: unknown) => {
      diagnostic({
        level: "error",
        code: "HOST_COMPLETION_FAILED",
        message: error instanceof Error ? error.message : "Host completion failed",
      });
    });
  };
  const create = async () => {
    instance = await factory({
      container,
      cartridge,
      input,
      edition,
      complete,
      diagnostic,
      inputController,
      ...(composition ? { composition } : {}),
      ...(options.seed === undefined ? {} : { seed: options.seed }),
    });
    instance.setMuted?.(muted);
    status = "running";
    diagnostic({ level: "info", code: "RUNTIME_READY", message: "Game runtime ready" });
  };

  let resizeObserver: ResizeObserver | undefined;
  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    instance?.resize?.(width, height);
    const next = resolveComposition(options, width, height);
    if (next && next.profile !== composition?.profile) {
      inputController.cancelActiveGesture();
      instance?.recompose?.(next);
    }
    composition = next;
  };

  try {
    await create();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }
  } catch (error) {
    status = "error";
    inputController.destroy();
    throw error;
  }

  return {
    pause: () => {
      if (destroyed) return;
      instance?.pause?.();
      status = "paused";
    },
    resume: () => {
      if (destroyed) return;
      instance?.resume?.();
      status = completionCount ? "completed" : "running";
    },
    restart: async () => {
      if (destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
      status = "restarting";
      await instance?.destroy();
      instance = undefined;
      completionCount = 0;
      restartCount += 1;
      await create();
    },
    setMuted: (nextMuted) => {
      if (destroyed) return;
      muted = nextMuted;
      instance?.setMuted?.(muted);
    },
    getDiagnostics: () => ({
      status,
      cartridgeId: cartridge.manifest.id,
      editionId: edition.id,
      restartCount,
      completionCount,
      muted,
      width,
      height,
      ...(composition ? { layoutProfile: composition.profile } : {}),
      ...(lastEvent ? { lastEvent } : {}),
    }),
    destroy: async () => {
      if (destroyed) return;
      destroyed = true;
      resizeObserver?.disconnect();
      inputController.destroy();
      await instance?.destroy();
      instance = undefined;
      status = "destroyed";
    },
  };
}

function resolveComposition(
  options: MountCartridgeOptions,
  width: number,
  height: number,
): SupportedResponsiveComposition | undefined {
  if (!options.responsive) return undefined;
  const result = resolveResponsiveComposition({
    viewport: { width, height },
    safeArea: options.responsive.safeArea,
    inputCapabilities: options.responsive.inputCapabilities,
    accessibility: options.responsive.accessibility,
  });
  if (!result.supported) {
    throw new APKRuntimeError(result.code, result.guidance);
  }
  return result;
}
