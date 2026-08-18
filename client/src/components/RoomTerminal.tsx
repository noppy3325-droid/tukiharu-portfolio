import { Sparkles, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";

type Command = "about" | "works" | "photos" | "help" | "clear";

const output: Record<Command, string> = {
  about: "こんにちは。この部屋は、好きなものと日々の記録をそっと並べる小さなポートフォリオです。",
  works: "作品一覧を見たいときは、デスクのPCをクリック。つくったものを一つずつ紹介しています。",
  photos: "ギャラリーを見たいときは、黄色いカメラをクリック。撮影メモもポラロイドに添えています。",
  help: "上のチップをクリックするだけで大丈夫です。PC・本棚・カメラも、気になるものから選んでみてください。",
  clear: "画面をすっきりしました。もう一度知りたいことがあれば、上のチップを選んでください。",
};

const chips: Array<{ command: Exclude<Command, "clear">; label: string }> = [
  { command: "about", label: "🌸 自己紹介" },
  { command: "works", label: "💻 作品一覧" },
  { command: "photos", label: "📷 ギャラリー" },
  { command: "help", label: "❓ ヘルプ" },
];

export default function RoomTerminal() {
  const [command, setCommand] = useState<Command>("help");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const sentence = output[command];
    let index = 0;
    setTyped("");
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(sentence.slice(0, index));
      if (index >= sentence.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [command]);

  return <section className="room-terminal" aria-label="部屋の案内ターミナル">
    <div className="terminal-topline"><span><TerminalSquare size={13} />room guide</span><i /><i /><i /></div>
    <div className="terminal-chips">{chips.map(chip => <button type="button" key={chip.command} onClick={() => setCommand(chip.command)}>{chip.label}</button>)}</div>
    <div className="terminal-output" aria-live="polite"><span className="terminal-prompt">guest@room:~$</span><p>{typed}<b aria-hidden="true">▍</b></p></div>
    <button type="button" className="terminal-clear" onClick={() => setCommand("clear")}><Sparkles size={11} /> clear</button>
  </section>;
}
