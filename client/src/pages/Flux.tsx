import { type CSSProperties } from "react";
import {
  useFluxClock,
  useReducedMotion,
  useCrossfade,
} from "@/hooks/useFluxDisplay";
import { TsukiLayout } from "@/components/TsukiLayout";
import { formatFluxTime } from "@/lib/sekkiColors";
import {
  getFluxSelection,
  FLUX_PERIOD_LABELS,
  type FluxSelection,
} from "@/lib/fluxPalettes";

const monthNames = [
  "睦月",
  "如月",
  "弥生",
  "卯月",
  "皐月",
  "水無月",
  "文月",
  "葉月",
  "長月",
  "神無月",
  "霜月",
  "師走",
];
const weekdays = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

function Gradient({ color, phase }: { color: FluxSelection; phase: string }) {
  return (
    <div
      className={`flux-gradient-set flux-gradient-${phase}`}
      style={{ "--flux-color": color.hex } as CSSProperties}
      data-color={color.hex}
    >
      <div className="flux-gradient-arrival">
        <div className="flux-wash flux-wash-one" />
        <div className="flux-wash flux-wash-two">
          <div className="flux-breath" />
        </div>
        <div className="flux-wash flux-wash-three" />
      </div>
    </div>
  );
}

function ColorCopy({
  color,
  phase,
  previous = false,
}: {
  color: FluxSelection;
  phase: string;
  previous?: boolean;
}) {
  return (
    <div
      className={`flux-color-copy flux-copy-${phase}`}
      aria-hidden={previous || undefined}
      data-sekki={color.sekki}
      data-period={color.period}
    >
      <div className="flux-color-center">
        <h2 className="flux-color-name" aria-label={color.colorName}>
          <span aria-hidden="true">
            {Array.from(color.colorName).map((letter, index) => (
              <span
                className="flux-letter"
                style={
                  { "--letter-delay": `${index * 120}ms` } as CSSProperties
                }
                key={index}
              >
                {letter}
              </span>
            ))}
          </span>
        </h2>
        <p className="flux-color-details">
          {color.colorReading} <span aria-hidden="true">—</span>{" "}
          <span lang="en">{color.romaji}</span>{" "}
          <span aria-hidden="true">—</span> {color.hex}
        </p>
        <p className="flux-line">{color.line}</p>
      </div>
      <p
        className="flux-vertical"
        aria-label={`${color.sekki}（${color.sekkiReading}）`}
      >
        {color.sekki}
      </p>
    </div>
  );
}

export default function Flux() {
  const now = useFluxClock();
  const reduced = useReducedMotion();
  const selection = getFluxSelection(now);
  const clock = useCrossfade(formatFluxTime(now), 800, reduced);
  const season = useCrossfade(selection, 4000, reduced);
  const phase = season.previous ? "next" : season.changed ? "steady" : "entry";

  return (
    <TsukiLayout variant="flux">
      <section className="flux" lang="ja" aria-labelledby="flux-title">
        <div className="flux-backdrops" aria-hidden="true">
          {season.previous && (
            <Gradient
              color={season.previous}
              phase="previous"
              key={season.previous.id}
            />
          )}
          <Gradient
            color={season.current}
            phase={phase}
            key={season.current.id}
          />
        </div>
        <div className="flux-content">
          <header className="flux-masthead">
            <p>FLUX / 二十四節気と伝統色</p>
            <h1 id="flux-title">Flux — いまの色</h1>
          </header>
          <div className="flux-timeblock">
            <div className="flux-clock" aria-label="現在時刻">
              {clock.previous && (
                <span
                  className="flux-clock-previous"
                  aria-hidden="true"
                  key={clock.previous}
                >
                  {clock.previous}
                </span>
              )}
              <time
                dateTime={clock.current}
                className={clock.previous ? "flux-clock-next" : undefined}
                key={clock.current}
              >
                {clock.current}
              </time>
            </div>
            <p className="flux-calendar">
              {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日{" "}
              {weekdays[now.getDay()]}
              <span>
                {" "}
                ・ {monthNames[now.getMonth()]} ・ {selection.sekki} ・{" "}
                {FLUX_PERIOD_LABELS[selection.period]}
              </span>
            </p>
          </div>
          <div className="flux-colors">
            {season.previous && (
              <ColorCopy
                color={season.previous}
                phase="previous"
                previous
                key={season.previous.id}
              />
            )}
            <ColorCopy
              color={season.current}
              phase={phase}
              key={season.current.id}
            />
          </div>
          <p className="flux-calendar-note">節気の始まりは、暦の目安です。</p>
        </div>
      </section>
    </TsukiLayout>
  );
}
