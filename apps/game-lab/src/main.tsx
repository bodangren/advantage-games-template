import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GameResults } from "@reading-advantage/game-contracts";
import { mountCartridge, primaryChibiEdition, secondaryEpicEdition, type APKGameHandle } from "@reading-advantage/advantage-play-kit";
import { myGameCartridge } from "@reading-advantage/game-cartridges";
import "./styles.css";

const input = [
  { term: "The brave knight protects the village", translation: "อัศวินผู้กล้าหาญปกป้องหมู่บ้าน" },
  { term: "She collects crystals in the dark cave", translation: "เธอเก็บคริสตัลในถ้ำมืด" },
  { term: "We journey through the ancient maze together", translation: "เราเดินทางผ่านเขาวงกตโบราณด้วยกัน" },
  { term: "A clever fox jumps over the lazy dog", translation: "จิ้งจอกเจ้าเล่ห์กระโดดข้ามหมาขี้เกียจ" },
  { term: "They found treasure under the old tree", translation: "พวกเขาพบสมบัติใต้ต้นไม้เก่าแก่" },
];
function App() {
  const host = useRef<HTMLDivElement>(null); const handle = useRef<APKGameHandle | undefined>(undefined);
  const [wide, setWide] = useState(false); const [epic, setEpic] = useState(false); const [result, setResult] = useState<GameResults>(); const [event, setEvent] = useState("Mounting...");
  useEffect(() => { if (!host.current) return; host.current.replaceChildren(); setResult(undefined); handle.current = mountCartridge(host.current, myGameCartridge, input, epic ? secondaryEpicEdition : primaryChibiEdition, setResult, (next) => setEvent(`${next.code}: ${next.message}`), 42); return () => handle.current?.destroy(); }, [epic, wide]);
  return <main><header><p className="eyebrow">ADVANTAGE PLAY KIT</p><h1>Contestant Game Lab</h1><p>Build only in the protected cartridge workspace, then validate the production import boundary.</p></header><nav><button onClick={() => setWide(!wide)}>{wide ? "Compact 390x844" : "Wide 1440x900"}</button><button onClick={() => setEpic(!epic)}>{epic ? "Primary Chibi" : "Secondary Epic"}</button><button onClick={() => handle.current?.restart()}>Restart</button></nav><section className={wide ? "frame wide" : "frame compact"}><div ref={host} className="game" /></section><aside><strong>Diagnostics:</strong> {event}{result && <pre>{JSON.stringify(result, null, 2)}</pre>}</aside></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
