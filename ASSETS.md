# Assets

## サイトアイコン

ユーザー提供の「月春」の月と水色・紫の装飾を描いたPNGを使用。原画は `client/src/assets/icons/tsukiharu-source.png` に保存し、絵柄を維持したままアイコン用に縮小しています。

| ファイル | 用途 |
|---|---|
| `client/src/assets/icons/favicon.ico` | ブラウザ用、16・32・48・64・128・256pxを格納 |
| `client/src/assets/icons/favicon-32.png` | ブラウザ用の32px PNG |
| `client/src/assets/icons/apple-touch-icon.png` | iPhone・iPadのホーム画面用、180px |

`client/index.html` から参照し、Viteがアイコンをハッシュ付きアセットまたはHTML内のデータURLとして出力します。初回設置と更新用の配布物の両方に含まれます。

**Art direction:** 月春の水色、淡いピンク、温かいクリームと控えめな濃い青緑を使った、静かで読みやすい2D飛行機着陸ゲーム。第三者の横追従視点、雲のある春空、簡潔な滑走路、コンパクトなHUDを備える。

## Reference

| Name | Role | Size | Image |
|---|---|---|---|
| landing-reference | カメラ、HUD、空と滑走路の色密度の基準 | 16:9 / 1920×1080表示想定 | `/manus-storage/tsukiharu-flight-landing-reference_acb07027.png` |

## Sprites

| Name | Description | Size | Image |
|---|---|---|---|
| airplane | クリーム、水色、淡いピンクの単発プロペラ機。右向きの横視点。 | 170×100px | `/manus-storage/tsukiharu-flight-airplane-sprite_dcf3986b.png` |
