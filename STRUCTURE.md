# Tsukiharu Landing Structure

## Runtime ownership

| 層 | 所有物 | 責務 |
|---|---|---|
| React | `Game.tsx` | サイト枠、説明、再開始・タッチ操作、HUDのアクセシブルな補助UI |
| Babylon host | `GameCanvas.tsx` | Engineの生成・破棄、リサイズ、ゲームイベントをReactへ通知 |
| Game logic | `client/src/game/landingGame.ts` | 操作状態、飛行モデル、着陸判定、デモ操縦、描画用状態 |
| Babylon scene | `client/src/game/scene.ts` | シーン、正投影カメラ、機体・雲・滑走路のメッシュ、HUDテクスチャ |
| Styling | `game-landing.css` | ページ枠、タッチ操作、HUD表示、縮小画面のレイアウト |

## State contract

`LandingGame`は`ready`、`flying`、`landed`、`crashed`の4状態を明示的に扱う。Reactは押下中の入力と再開始だけを通知し、物理更新・着陸判定・第三者カメラはBabylon側に閉じる。

## Asset hints

飛行機は生成済みPNGをBabylonの`Sprite`として約170×100pxで表示する。空、雲、滑走路は安全なコード生成のレイヤーにし、基準画像は配色・密度・HUD配置を決める視覚基準として使う。
