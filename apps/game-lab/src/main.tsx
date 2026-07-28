import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GameResults } from "@reading-advantage/game-contracts";
import { mountCartridge, primaryChibiEdition, secondaryEpicEdition, type APKGameHandle } from "@reading-advantage/advantage-play-kit";
import { myGameCartridge } from "@reading-advantage/game-cartridges";
import "./styles.css";

const input = [
  { term: "DOCTOR", translation: "บุคคลสวมชุดขาว ทำงานตรวจรักษาผู้ป่วยในโรงพยาบาล" },
  { term: "POLICE", translation: "ผู้พิทักษ์สันติราษฎร์ สวมเครื่องแบบ คอยจับผู้ร้ายและจัดระเบียบเมือง" },
  { term: "HAPPY", translation: "อารมณ์สดใส ยิ้มกว้าง มีความสุขเมื่อได้ทำสิ่งที่ชอบ" },
  { term: "TIRED", translation: "ความรู้สึกอยากหลับตาพักผ่อนหลังเล่นกีฬาหรือทำงานมาเหนื่อยๆ" },
  { term: "CLOUD", translation: "กลุ่มก้อนปุยขาวลอยอยู่บนท้องฟ้า ยามฝนตกจะเปลี่ยนเป็นสีเทาเข้ม" },
  { term: "RIVER", translation: "สายน้ำยาวไหลผ่านหุบเขาและหมู่บ้าน เป็นที่อยู่อาศัยของปลา" },
  { term: "BUTTERFLY", translation: "แมลงปีกสวยงาม คอยบินตอมดมเกสรดอกไม้ตามสวนธรรมชาติ" },
  { term: "AIRPLANE", translation: "พาหนะบินได้ขนาดใหญ่พานักท่องเที่ยวข้ามทวีปผ่านกลีบเมฆ" },
  { term: "SUNNY", translation: "อากาศร้อนจัด มีแดดแรง ท้องฟ้าเปิดแจ่มใส เหมาะแก่การไปทะเล" },
  { term: "PLAYGROUND", translation: "สถานที่กว้างขวาง เต็มไปด้วยเครื่องเล่นสนุกๆ และสายไหมหวานฉ่ำ" },
];
function App() {
  const host = useRef<HTMLDivElement>(null); const handle = useRef<APKGameHandle | undefined>(undefined);
  const [wide, setWide] = useState(false); const [epic, setEpic] = useState(false); const [result, setResult] = useState<GameResults>(); const [event, setEvent] = useState("Mounting...");
  useEffect(() => { if (!host.current) return; host.current.replaceChildren(); setResult(undefined); handle.current = mountCartridge(host.current, myGameCartridge, input, epic ? secondaryEpicEdition : primaryChibiEdition, setResult, (next) => setEvent(`${next.code}: ${next.message}`), 42); return () => handle.current?.destroy(); }, [epic, wide]);
  return <main><header><p className="eyebrow">ADVANTAGE PLAY KIT</p><h1>Contestant Game Lab</h1><p>Build only in the protected cartridge workspace, then validate the production import boundary.</p></header><nav><button onClick={() => setWide(!wide)}>{wide ? "Compact 390x844" : "Wide 1440x900"}</button><button onClick={() => setEpic(!epic)}>{epic ? "Primary Chibi" : "Secondary Epic"}</button><button onClick={() => handle.current?.restart()}>Restart</button></nav><section className={wide ? "frame wide" : "frame compact"}><div ref={host} className="game" /></section><aside><strong>Diagnostics:</strong> {event}{result && <pre>{JSON.stringify(result, null, 2)}</pre>}</aside></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
