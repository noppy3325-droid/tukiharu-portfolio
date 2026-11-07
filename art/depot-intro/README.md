# デスクから入る

横型と縦型の編集用SVGには、部屋、机、モニター、人物と椅子のレイヤーがあります。人物の透過原画は同じフォルダーの `hazuki.png` です。Web用のレイヤーと画面矩形のマニフェストは `client/src/assets/depot-intro/` にあります。画面矩形はモニターのくり抜きに使う座標から算出しています。

人物はNotionに添付されたサンプルを優先し、組み込みの画像生成ツールで椅子ごと透過素材にしました。横型・縦型では、同じ人物の素材をそれぞれの構図に置いています。

> Extract/recreate ONLY the seated anime girl and dark charcoal office chair as one isolated game sprite on genuinely transparent background, using the supplied image as the exact canonical character and style. Preserve the short ash-gray hair silhouette and sweeping bangs, pale sky-blue eyes, large black over-ear headphones, beige hoodie, holding the same plain tan mug near face with both hands, gentle quiet expression, soft desaturated flat hand-drawn anime coloring. Keep 3/4 view facing right. Complete silhouette including chair seat and base, cropped at seated knees if necessary; no desk, monitor, room, background, words, extra accessories, or hairpins. Fill the frame with the character+chair with small transparent padding. Portrait-oriented sprite for website entrance illustration.

`PLAYWRIGHT_MODULE` にローカルのPlaywrightを指定して、リポジトリのルートから `node art/depot-intro/render.mjs` を実行すると、編集用SVGとWebPを再生成できます。合計容量は横型132,592バイト、縦型116,986バイトです。

参照元は [ポートフォリオサイト修正案](https://app.notion.com/p/tukiharu/40ddd8115c858092a4bde90248a9aaf9?source=copy_link) です。
