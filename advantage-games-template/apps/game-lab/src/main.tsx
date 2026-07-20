import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GameResults } from "@reading-advantage/game-contracts";
import { mountCartridge, primaryChibiEdition, secondaryEpicEdition, type APKGameHandle } from "@reading-advantage/advantage-play-kit";
import { myGameCartridge } from "@reading-advantage/game-cartridges";
import "./styles.css";

const input = [
  { term: "courage", translation: "ความกล้าหาญ" },
  { term: "journey", translation: "การเดินทาง" },
  { term: "protect", translation: "ปกป้อง" },
  { term: "wisdom", translation: "ปัญญา" },
  { term: "freedom", translation: "เสรีภาพ" },
  { term: "strength", translation: "ความแข็งแกร่ง" },
  { term: "friendship", translation: "มิตรภาพ" },
  { term: "success", translation: "ความสำเร็จ" },
  { term: "happiness", translation: "ความสุข" },
  { term: "knowledge", translation: "ความรู้" },
  { term: "patience", translation: "ความอดทน" },
  { term: "respect", translation: "ความเคารพ" },
  { term: "harmony", translation: "ความสามัคคี" },
];
function App() {
  const host = useRef<HTMLDivElement>(null); const handle = useRef<APKGameHandle | undefined>(undefined);
  const [wide, setWide] = useState(false); const [epic, setEpic] = useState(false); const [result, setResult] = useState<GameResults>(); const [event, setEvent] = useState("Mounting...");
  useEffect(() => { if (!host.current) return; host.current.replaceChildren(); setResult(undefined); handle.current = mountCartridge(host.current, myGameCartridge, input, epic ? secondaryEpicEdition : primaryChibiEdition, setResult, (next) => setEvent(`${next.code}: ${next.message}`)); return () => handle.current?.destroy(); }, [epic, wide]);
  return <main><header><p className="eyebrow">ADVANTAGE PLAY KIT</p><h1>Contestant Game Lab</h1><p>Build only in the protected cartridge workspace, then validate the production import boundary.</p></header><nav><button onClick={() => setWide(!wide)}>{wide ? "Compact 390x844" : "Wide 1440x900"}</button><button onClick={() => setEpic(!epic)}>{epic ? "Primary Chibi" : "Secondary Epic"}</button><button onClick={() => handle.current?.restart()}>Restart</button></nav><section className={wide ? "frame wide" : "frame compact"}><div ref={host} className="game" /></section><aside><strong>Diagnostics:</strong> {event}{result && <pre>{JSON.stringify(result, null, 2)}</pre>}</aside></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
