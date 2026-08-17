/** Compact or wide spatial profile selected from usable geometry. */
export type LayoutProfile = "compact" | "wide";

/** Safe-area insets supplied by the browser host. */
export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Rectangle inside the viewport after safe-area subtraction. */
export interface ResponsiveRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A supported responsive composition for one game session. */
export interface SupportedResponsiveComposition {
  readonly supported: true;
  readonly profile: LayoutProfile;
  readonly inputMode: "touch" | "pointer-keyboard" | "hybrid";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly safeRect: ResponsiveRect;
  readonly gameplayRect: ResponsiveRect;
  readonly promptRect: ResponsiveRect;
  readonly controlsRect: ResponsiveRect;
}

/** An unsupported geometry result with actionable guidance. */
export interface UnsupportedResponsiveComposition {
  readonly supported: false;
  readonly code: "UNSUPPORTED_VIEWPORT_SIZE";
  readonly guidance: string;
}

/** Input required to resolve a compact or wide composition. */
export interface ResponsiveCompositionRequest {
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly safeArea: SafeAreaInsets;
  readonly inputCapabilities: Readonly<{
    touch: boolean;
    pointer: boolean;
    keyboard: boolean;
  }>;
  readonly accessibility: Readonly<{ textScale: number; touchScale: number }>;
}

/** Host options that enable APK-owned responsive composition. */
export interface ResponsiveRuntimeOptions {
  readonly safeArea: SafeAreaInsets;
  readonly inputCapabilities: ResponsiveCompositionRequest["inputCapabilities"];
  readonly accessibility: ResponsiveCompositionRequest["accessibility"];
}

/** Default safe-area and input values used by the local game lab. */
export const DEFAULT_RESPONSIVE_RUNTIME_OPTIONS: ResponsiveRuntimeOptions =
  Object.freeze({
    safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
    inputCapabilities: Object.freeze({ touch: true, pointer: true, keyboard: true }),
    accessibility: Object.freeze({ textScale: 1, touchScale: 1 }),
  });

/**
 * Resolves compact and wide regions from usable geometry.
 * @param request Viewport, safe-area, input, and accessibility values.
 * @returns A supported composition or an actionable unsupported result.
 */
export function resolveResponsiveComposition(
  request: ResponsiveCompositionRequest,
): SupportedResponsiveComposition | UnsupportedResponsiveComposition {
  const { width, height } = request.viewport;
  const safeWidth = width - request.safeArea.left - request.safeArea.right;
  const safeHeight = height - request.safeArea.top - request.safeArea.bottom;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    safeWidth < 320 * request.accessibility.touchScale ||
    safeHeight < 480 * request.accessibility.textScale
  ) {
    return {
      supported: false,
      code: "UNSUPPORTED_VIEWPORT_SIZE",
      guidance: "Use a viewport of at least 320x480 after safe-area and accessibility scaling.",
    };
  }

  const profile: LayoutProfile = safeWidth >= 800 ? "wide" : "compact";
  const safeRect = {
    x: request.safeArea.left,
    y: request.safeArea.top,
    width: safeWidth,
    height: safeHeight,
  };
  const promptHeight = profile === "compact" ? safeHeight * 0.25 : safeHeight * 0.22;
  const controlsHeight = profile === "compact" ? safeHeight * 0.32 : safeHeight * 0.25;
  const gameplayRect = {
    x: safeRect.x,
    y: safeRect.y + promptHeight,
    width: safeWidth,
    height: safeHeight - promptHeight - controlsHeight,
  };
  const inputMode = request.inputCapabilities.touch
    ? request.inputCapabilities.keyboard || request.inputCapabilities.pointer
      ? "hybrid"
      : "touch"
    : "pointer-keyboard";

  return Object.freeze({
    supported: true,
    profile,
    inputMode,
    viewport: Object.freeze({ width, height }),
    safeRect: Object.freeze(safeRect),
    promptRect: Object.freeze({
      x: safeRect.x,
      y: safeRect.y,
      width: safeWidth,
      height: promptHeight,
    }),
    gameplayRect: Object.freeze(gameplayRect),
    controlsRect: Object.freeze({
      x: safeRect.x,
      y: gameplayRect.y + gameplayRect.height,
      width: safeWidth,
      height: controlsHeight,
    }),
  });
}
