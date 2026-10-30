# phone ∧ shoot (P2P / 静的ホスティング版)

このリポジトリ/ディレクトリ（`p2p/`）は、Node.jsの専用サーバーを用いずに、ブラウザ上でこのゲームをホスティングするためにPeerJS（WebRTC）を用いた実装です。

- https://osu-denken.github.io/phone-and-shoot/

ソースコード: https://github.com/osu-denken/hackathon-team_weii

ゲームのロジックは `../backend/src` のものを共有・再利用しつつ、Viteを用いて静的サイトとしてビルド・デプロイできる構成になっています。

## 特徴
- **Node.jsサーバー不要**: 全てのゲーム処理（敵の出現、当たり判定など）はホスト（PCモニター）のブラウザ上で100fpsで動作します。
- **ロジックの共有**: バックエンドの `app.js` と同じ `MessageHandler.js` を用いており、サーバー版との挙動の差異がありません。
- **静的ホスティング**: GitHub Pages, Cloudflare Pages, Vercel 等の静的ホスティングサービスにデプロイして、完全無料でゲームを公開・運用できます。

## 構成
- `host.html` / `src/host.js`: PCモニター用の画面。部屋（Room ID）を発行し、ゲームの進行（サーバー役割）を担当します。
- `client.html` / `src/client.js`: スマートフォン用のコントローラー画面。ホストに接続し、ジャイロやタップの入力を送信します。
- `src/mock/`: バックエンド用の設定ファイルなどに含まれるNode.js依存（`fs`, `os`など）をブラウザ向けに無効化・差し替えるためのモックファイル群です。

## 開発・実行方法

### ローカルでの動作確認
```bash
cd p2p
npm install
npm run dev
```
起動後、PCのブラウザで `http://localhost:5173/host.html` を開き、表示されたQRコードをスマホで読み取る（または手動でRoom IDを入力する）ことでテストプレイが可能です。

### プロダクションビルド（デプロイ用）
```bash
npm run build
```
実行すると `p2p/dist/` フォルダが生成されます。
この `dist/` フォルダ内のすべてのファイルを、お好みの静的ホスティングサービスにアップロードするだけで公開が完了します。
（※ビルド時に `asset/` フォルダの画像なども自動でコピー・内包されます）

## デバッグ（接続できないとき）
ホスト画面・コントローラー画面のURLの末尾に `?debug=1`（すでに `?room=…` が付いている場合は `&debug=1`）を付けて開くと、画面の左下に接続状況（ICE の状態など）が表示されます。通常は何も表示されません。

例: `https://osu-denken.github.io/phone-and-shoot/client/?room=xxxxxxxx&debug=1`

## URL パラメータ
| パラメータ | 対象 | 内容 |
|---|---|---|
| `debug=1` | ホスト / コントローラー / プレイ | 画面の左下に接続状況を表示する |
| `maxPlayers=N` | ホスト | 同時に参加できる人数。既定は `4`、`-1` で無制限。満員のときの参加は断られる |
| `room=ID` | コントローラー | 接続先のルーム ID（ホストの QR コードに含まれる） |

例: `https://osu-denken.net/phone-and-shoot/host/?maxPlayers=8&debug=1`

### TURN サーバー（任意）
会場のネットワークによっては、PeerJS 標準の TURN では接続できないことがあります。その場合は、TURN の認証情報を返す Cloudflare Worker（`../worker/`）をデプロイし、ビルド時に環境変数 `VITE_TURN_CREDENTIALS_URL`（`.env.example` 参照）にその URL を指定してください。未設定、または取得に失敗した場合は PeerJS の標準設定で動作します。

## 通信方式について
現在は **PeerJS** を利用したWebRTC（P2P DataChannel）によって通信を行っており、パブリックなシグナリングサーバー（`0.peerjs.com`）を利用して接続を確立しています。
