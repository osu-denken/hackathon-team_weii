# TURN 認証情報 Worker

P2P 版 (`../p2p/`) が使う、Cloudflare Realtime の TURN 認証情報を発行する Cloudflare Worker です。<br>
`GET /` にアクセスすると、PeerJS の `config.iceServers` に追加できる形式の JSON を返します。

```json
{ "iceServers": [{ "urls": ["stun:…", "turn:…", "turns:…"], "username": "…", "credential": "…" }] }
```

API トークンはブラウザに置けないため、この Worker が代わりに Cloudflare の API を呼びます。トークンは Worker のシークレットに保存し、リポジトリには含めません。

## セットアップ (Cloudflare)
1. Realtime の TURN Server アプリを作成する。
2. 表示される Turn Token ID と API トークン を控える (API トークンは作成時にしか表示されません)。

## デプロイ
```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put TURN_KEY_ID      # Turn Token ID を入力
npx wrangler secret put TURN_API_TOKEN   # API トークンを入力
npx wrangler deploy
```

デプロイすると `https://phone-and-shoot-turn.<アカウント名>.workers.dev` のような URL が表示されます。

### 動作確認
```bash
curl https://phone-and-shoot-turn.<アカウント名>.workers.dev
```
`iceServers` を含む JSON が返れば成功です。

### アクセス元の制限 (任意)
`wrangler.toml` の `[vars]` に `ALLOWED_ORIGINS` (カンマ区切り) を指定すると、そのオリジン以外からのリクエストを拒否します。未設定の場合は全てのオリジンを許可します。

```toml
[vars]
ALLOWED_ORIGINS = "https://osu-denken.github.io"
```

## P2P 側への反映
1. `p2p/.env` を作成し、デプロイした URL を指定する (`p2p/.env.example` 参照)。

   ```
   VITE_TURN_CREDENTIALS_URL=https://phone-and-shoot-turn.<アカウント名>.workers.dev
   ```
2. `p2p` でビルドする。

   ```bash
   cd p2p
   npm run build
   ```
3. `p2p/dist` (phone-and-shoot のサブモジュール) の中で commit / push する。
4. 親リポジトリで `git add p2p/dist` して、参照先を更新する。

URL が未設定、または Worker から取得できなかった場合は、PeerJS の標準設定のまま動作します。

## 動作の確認
ホスト画面・コントローラー画面の URL の末尾に `?debug=1` を付けると、画面の左下に TURN の取得結果と接続状況が表示されます。

## 注意
- API トークンはチャットや Git に載せないでください。漏れた場合は、ダッシュボードで再生成して `wrangler secret put TURN_API_TOKEN` をやり直します。
- 発行する認証情報の有効期間は 24 時間です (`src/index.js` の `TTL_SECONDS`)。
- Cloudflare の TURN には無料枠があります。超過した場合の料金は、Cloudflare の最新の料金ページで確認してください。
