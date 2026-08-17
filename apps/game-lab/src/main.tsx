import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GameResults } from "@reading-advantage/game-contracts";
import {
  DEFAULT_RESPONSIVE_RUNTIME_OPTIONS,
  createDevelopmentEdition,
  createPhaserGameFactory,
  mountCartridge,
  type APKGameHandle,
} from "@reading-advantage/advantage-play-kit";
import {
  candidateManifest,
  myGameCartridge,
} from "@reading-advantage/game-cartridges";
import "./styles.css";

const learningInput = [
  { term: "แมว", translation: "cat" },
  { term: "สุนัข", translation: "dog" },
  { term: "หนังสือ", translation: "book" },
];

/** Local host for candidate cartridge authoring and responsive review. */
function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<APKGameHandle | undefined>(undefined);
  const mountGenerationRef = useRef(0);
  const [wide, setWide] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<GameResults>();
  const [diagnostic, setDiagnostic] = useState("Mounting candidate...");

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const generation = mountGenerationRef.current + 1;
    mountGenerationRef.current = generation;
    let cancelled = false;
    container.replaceChildren();
    setPaused(false);
    setMuted(false);
    setResult(undefined);

    void createDevelopmentEdition(candidateManifest.semanticAssetRequirements)
      .then((edition) => {
        if (cancelled || generation !== mountGenerationRef.current) return undefined;
        return mountCartridge(
          {
            container,
            cartridge: myGameCartridge,
            input: learningInput,
            edition,
            seed: 42,
            responsive: DEFAULT_RESPONSIVE_RUNTIME_OPTIONS,
            host: {
              complete: setResult,
              diagnostic: (event) =>
                setDiagnostic(`${event.level.toUpperCase()} ${event.code}: ${event.message}`),
            },
          },
          createPhaserGameFactory(),
        );
      })
      .then((handle) => {
        if (!handle) return;
        if (cancelled || generation !== mountGenerationRef.current) {
          void handle.destroy();
          return;
        }
        handleRef.current = handle;
      })
      .catch((error: unknown) => {
        setDiagnostic(error instanceof Error ? error.message : "Candidate failed to mount");
      });

    return () => {
      cancelled = true;
      mountGenerationRef.current += 1;
      const handle = handleRef.current;
      handleRef.current = undefined;
      void handle?.destroy();
    };
  }, []);

  const togglePause = () => {
    if (paused) handleRef.current?.resume();
    else handleRef.current?.pause();
    setPaused(!paused);
  };

  const toggleMute = () => {
    handleRef.current?.setMuted(!muted);
    setMuted(!muted);
  };

  const restart = () => {
    setResult(undefined);
    void handleRef.current?.restart();
  };

  return (
    <main>
      <header>
        <p className="eyebrow">ADVANTAGE PLAY KIT / BETA AUTHORING</p>
        <h1>{candidateManifest.title}</h1>
        <p>
          Build a real import candidate. Production catalog, asset, host, and owner
          acceptance still happen after the pull request.
        </p>
      </header>
      <nav aria-label="Game lab controls">
        <button type="button" onClick={() => setWide(!wide)}>
          {wide ? "Compact 390x844" : "Wide 1440x900"}
        </button>
        <button type="button" onClick={togglePause}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={toggleMute}>
          {muted ? "Unmute" : "Mute"}
        </button>
        <button type="button" onClick={restart}>Restart</button>
      </nav>
      <section className={wide ? "frame wide" : "frame compact"}>
        <div ref={hostRef} className="game" />
      </section>
      <aside aria-live="polite">
        <strong>Diagnostics</strong>
        <p>{diagnostic}</p>
        {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
