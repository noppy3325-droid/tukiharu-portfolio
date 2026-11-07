import { SEKKI_COLORS, getSekkiColor, type SekkiColor } from "./sekkiColors.ts";

export type FluxPeriod = "morning" | "day" | "evening" | "night";
export type FluxSelection = SekkiColor & { id: string; period: FluxPeriod };
type Paint = Pick<SekkiColor, "colorName" | "colorReading" | "romaji" | "hex">;
export const FLUX_PERIOD_LABELS: Record<FluxPeriod, string> = {
  morning: "朝",
  day: "昼",
  evening: "夕",
  night: "夜",
};
const periods: readonly FluxPeriod[] = ["morning", "day", "evening", "night"];

// Additional swatches: https://nipponcolors.com/ (reference values, no runtime request).
export const EXTRA_FLUX_COLORS: readonly Paint[] = [
  {
    colorName: "桃色",
    colorReading: "ももいろ",
    romaji: "MOMO",
    hex: "#F596AA",
  },
  {
    colorName: "薄紅",
    colorReading: "うすべに",
    romaji: "USUBENI",
    hex: "#E87A90",
  },
  {
    colorName: "曙色",
    colorReading: "あけぼのいろ",
    romaji: "AKEBONO",
    hex: "#F19483",
  },
  {
    colorName: "灰桜",
    colorReading: "はいざくら",
    romaji: "HAIZAKURA",
    hex: "#D7C4BB",
  },
  {
    colorName: "梅鼠",
    colorReading: "うめねずみ",
    romaji: "UMENEZUMI",
    hex: "#9E7A7A",
  },
  {
    colorName: "白茶",
    colorReading: "しらちゃ",
    romaji: "SHIRACHA",
    hex: "#BC9F77",
  },
  {
    colorName: "鳥の子色",
    colorReading: "とりのこいろ",
    romaji: "TORINOKO",
    hex: "#DAC9A6",
  },
  {
    colorName: "菜の花色",
    colorReading: "なのはないろ",
    romaji: "NANOHANA",
    hex: "#F7D94C",
  },
  {
    colorName: "裏柳",
    colorReading: "うらやなぎ",
    romaji: "URAYANAGI",
    hex: "#B5CAA0",
  },
  {
    colorName: "松葉色",
    colorReading: "まつばいろ",
    romaji: "MATSUBA",
    hex: "#42602D",
  },
  {
    colorName: "白緑",
    colorReading: "びゃくろく",
    romaji: "BYAKUROKU",
    hex: "#A8D8B9",
  },
  {
    colorName: "青竹色",
    colorReading: "あおたけいろ",
    romaji: "AOTAKE",
    hex: "#00896C",
  },
  {
    colorName: "瓶覗",
    colorReading: "かめのぞき",
    romaji: "KAMENOZOKI",
    hex: "#A5DEE4",
  },
  {
    colorName: "空色",
    colorReading: "そらいろ",
    romaji: "SORA",
    hex: "#58B2DC",
  },
  {
    colorName: "縹色",
    colorReading: "はなだいろ",
    romaji: "HANADA",
    hex: "#006284",
  },
  {
    colorName: "瑠璃色",
    colorReading: "るりいろ",
    romaji: "RURI",
    hex: "#005CAF",
  },
  {
    colorName: "藤紫",
    colorReading: "ふじむらさき",
    romaji: "FUJIMURASAKI",
    hex: "#8A6BBE",
  },
  {
    colorName: "桔梗色",
    colorReading: "ききょういろ",
    romaji: "KIKYO",
    hex: "#6A4C9C",
  },
  {
    colorName: "紫苑色",
    colorReading: "しおんいろ",
    romaji: "SHION",
    hex: "#8F77B5",
  },
  {
    colorName: "琥珀色",
    colorReading: "こはくいろ",
    romaji: "KOHAKU",
    hex: "#CA7A2C",
  },
  {
    colorName: "赤朽葉",
    colorReading: "あかくちば",
    romaji: "AKAKUCHIBA",
    hex: "#C78550",
  },
  {
    colorName: "柿渋色",
    colorReading: "かきしぶいろ",
    romaji: "KAKISHIBU",
    hex: "#A35E47",
  },
  {
    colorName: "紺色",
    colorReading: "こんいろ",
    romaji: "KON",
    hex: "#0F2540",
  },
  {
    colorName: "銀鼠",
    colorReading: "ぎんねず",
    romaji: "GINNEZUMI",
    hex: "#91989F",
  },
];

// Each row is morning / day / evening / night. null retains that term's original set.
// The added lines are original site copy, not historical quotations.
type Choice = readonly [colorName: string, line: string] | null;
const rotations: Record<string, readonly [Choice, Choice, Choice, Choice]> = {
  小寒: [
    null,
    ["白群", "冬の昼の低い空に、青い静けさが薄く広がる。"],
    ["灰桜", "凍えた道に残る夕映えが、雪の影をほのかに染める。"],
    ["紺色", "小寒の夜は深く、窓の外の輪郭まで静まり返る。"],
  ],
  大寒: [
    ["銀鼠", "大寒の朝、曇った窓の向こうで空がゆっくり明るむ。"],
    null,
    ["鳥の子色", "短い日の名残が、冷たい部屋の壁に柔らかく留まる。"],
    ["縹色", "寒さの底の夜に、澄んだ青だけが遠く続いている。"],
  ],
  立春: [
    ["桃色", "まだ冷たい朝に、春を待つつぼみの色を見つける。"],
    null,
    ["薄紅", "立春の夕空に、ほどけかけた花のような紅がにじむ。"],
    ["梅鼠", "春の名を聞いた夜、梅の枝は淡い影の中で眠る。"],
  ],
  雨水: [
    ["瓶覗", "朝の雪解けに、澄んだ水の青さが少しずつ戻る。"],
    null,
    ["白茶", "雨のあとの土に夕日が差し、冬の色が柔らかくほどける。"],
    ["藍色", "雨水の夜、軒から落ちるしずくが暗い青に溶ける。"],
  ],
  啓蟄: [
    ["裏柳", "湿った朝の光に、開き始めた葉の裏が透けて見える。"],
    null,
    ["白緑", "春の夕方、草の明るさが日の名残をそっと抱く。"],
    ["松葉色", "土が動き始める季節の夜、緑の気配はまだ静かだ。"],
  ],
  春分: [
    null,
    ["桃色", "春分の昼、花びらの明るさが空と道の間を満たす。"],
    ["曙色", "同じ長さの昼を見送り、春の夕空が温かな色を残す。"],
    ["梅鼠", "春分の夜、花の影が柔らかな灰色の中に重なる。"],
  ],
  清明: [
    null,
    ["菜の花色", "澄んだ春の昼に、菜の花の黄色が風の行方を教える。"],
    ["萌木色", "夕日を受けた若葉が、清らかな一日の光を返す。"],
    ["松葉色", "清明の夜、木々の深い緑に昼の暖かさが残っている。"],
  ],
  穀雨: [
    ["瓶覗", "雨上がりの朝、葉先のしずくが淡い空を映す。"],
    null,
    ["藤紫", "春の雨がやんだ夕方、藤の房の紫がゆっくり深まる。"],
    ["桔梗色", "穀雨の夜、濡れた空気の奥に青紫の静けさが沈む。"],
  ],
  立夏: [
    ["白緑", "夏の入口の朝、若い葉に白い光がすべっていく。"],
    null,
    ["青竹色", "日が傾いても、竹の青さには新しい夏の力がある。"],
    ["松葉色", "立夏の夜風が、昼に濃くなった木々の色を休ませる。"],
  ],
  小満: [
    ["裏柳", "満ちていく緑の朝に、葉の裏まで光が届く。"],
    null,
    ["水色", "小満の夕方、水面に残る明るさが一日を長くする。"],
    ["青竹色", "草木の満ちる夜、深い青緑の中を風だけが渡る。"],
  ],
  芒種: [
    ["瓶覗", "田の朝の水鏡に、空のいちばん淡い青が広がる。"],
    null,
    ["空色", "苗の並ぶ水面が、夕暮れ前の広い空を映している。"],
    ["縹色", "芒種の夜、湿った風の向こうで水の青が深くなる。"],
  ],
  夏至: [
    ["空色", "早く明ける夏至の朝、空はもう遠くまで開いている。"],
    null,
    ["藤紫", "長い昼の終わりに、紫陽花の影と夕空の紫が重なる。"],
    ["瑠璃色", "ようやく訪れた夏至の夜に、澄んだ青の余韻が漂う。"],
  ],
  小暑: [
    null,
    ["空色", "小暑の昼、まぶしい空の青さを水辺の風がほどく。"],
    ["桔梗色", "暑さの残る夕方、青紫の空に風の涼しさを探す。"],
    ["瑠璃色", "小暑の夜、水を思わせる深い青が一日の熱を冷ます。"],
  ],
  大暑: [
    ["若竹色", "暑い日を迎える前の朝、葉陰の緑に涼しさが残る。"],
    null,
    ["曙色", "大暑の夕日が、熱を帯びた空を柔らかな朱に染める。"],
    ["紺色", "暑さの深い夜、広い紺の空に小さな風の通り道がある。"],
  ],
  立秋: [
    ["女郎花色", "まだ夏の朝に、秋を待つ草の淡い黄色が揺れる。"],
    ["白緑", "暦では秋でも、昼の葉陰には夏の緑がまだ息づく。"],
    null,
    ["紺色", "暦の秋の夜、残る暑さの上に紺の静けさが降りる。"],
  ],
  処暑: [
    ["鳥の子色", "処暑の朝、差し込む光の白さが少し穏やかになる。"],
    null,
    ["琥珀色", "夏を送り出す夕日が、草の先に琥珀の色を留める。"],
    ["紫苑色", "暑さの引く夜、薄い紫の空に秋の気配が混じる。"],
  ],
  白露: [
    null,
    ["紫苑色", "白露の昼、秋の草花の紫が澄んだ光に浮かぶ。"],
    ["薄紅", "草の露が乾いたあと、冷え始める夕空に紅が残る。"],
    ["縹色", "白露の夜、明日の露を待つ葉の上に深い青が広がる。"],
  ],
  秋分: [
    ["白茶", "秋分の朝、乾いた光が道と木々の色を柔らかくする。"],
    ["黄櫨色", "昼と夜が並ぶ頃、葉の黄色が澄んだ日差しを受ける。"],
    null,
    ["紫苑色", "秋分の夜、薄紫の静けさが昼の長さをそっと引き取る。"],
  ],
  寒露: [
    ["鳥の子色", "冷たい露の朝に、低い光が淡い金色で道を照らす。"],
    null,
    ["赤朽葉", "寒露の夕方、色づく葉に温かな赤茶が重なっていく。"],
    ["蘇芳色", "露の冷える夜、深い紅が秋の静けさを包んでいる。"],
  ],
  霜降: [
    ["銀杏色", "霜を待つ朝、黄色い葉が薄い光を集めている。"],
    null,
    ["柿渋色", "秋の夕日が落ちる道に、熟した柿のような茶が残る。"],
    ["朽葉色", "霜降の夜、重なる落ち葉の茶が冷たい地面を覆う。"],
  ],
  立冬: [
    ["鳥の子色", "冬の入口の朝、低い光が白い壁を淡く温める。"],
    null,
    ["琥珀色", "立冬の短い夕方に、銀杏の黄が琥珀の深さを帯びる。"],
    ["千歳緑", "冬の立つ夜、色を保つ木々に静かな緑が宿る。"],
  ],
  小雪: [
    ["銀鼠", "小雪の朝、雪を含んだような雲が銀色に明るむ。"],
    null,
    ["白茶", "日が傾くと、落ち葉の道に柔らかな茶の余韻が残る。"],
    ["藍色", "小雪の夜、深い藍の空に冷たい空気が満ちていく。"],
  ],
  大雪: [
    ["雪色", "大雪の朝、積もる白さが遠くの音まで柔らかくする。"],
    null,
    ["灰桜", "雪を待つ夕空に、日の名残の淡い紅が静かに沈む。"],
    ["紺色", "大雪の夜、窓の外の深い紺に雪の気配が漂う。"],
  ],
  冬至: [
    ["鳥の子色", "遅く明ける冬至の朝、淡い光が少しずつ部屋に届く。"],
    ["雪色", "いちばん短い昼を、冬の白い光がゆっくり渡っていく。"],
    ["琥珀色", "冬至の夕日が、長い夜の前に小さな温もりを残す。"],
    null,
  ],
};

const swatches = Object.fromEntries(
  [...SEKKI_COLORS, ...EXTRA_FLUX_COLORS].map(color => [color.colorName, color])
);
export const FLUX_PALETTES: Readonly<
  Record<string, Readonly<Record<FluxPeriod, FluxSelection>>>
> = Object.fromEntries(
  SEKKI_COLORS.map(base => [
    base.sekki,
    Object.fromEntries(
      periods.map((period, index) => {
        const choice = rotations[base.sekki][index];
        const paint = choice ? swatches[choice[0]] : base;
        if (!paint) throw new Error(`Unknown Flux color: ${choice?.[0]}`);
        return [
          period,
          {
            ...base,
            colorName: paint.colorName,
            colorReading: paint.colorReading,
            romaji: paint.romaji,
            hex: paint.hex,
            line: choice ? choice[1] : base.line,
            id: `${base.sekki}:${period}`,
            period,
          },
        ];
      })
    ) as Record<FluxPeriod, FluxSelection>,
  ])
);

export function getFluxPeriod(date: Date): FluxPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

export function getFluxSelection(date: Date): FluxSelection {
  return FLUX_PALETTES[getSekkiColor(date).sekki][getFluxPeriod(date)];
}
