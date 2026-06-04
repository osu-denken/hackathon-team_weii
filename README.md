# phone ∧ shoot (phone AND shoot)
スマートフォンでモニター上に次々と現れる敵(バグ)を撃ちまくる電脳世界のシューティングゲーム

- スマートフォンの傾きで自機を移動させる
- スマートフォンのタップで射撃
- 時々現れるアイテムを取ると即時回復もしくは使うと一定時間無敵、3点バーストショット、スコア2倍などの効果が得られる

<img width="2560" height="1680" alt="univ-pc kmmz jp_viewer_ (2)" src="https://github.com/user-attachments/assets/3a200823-8e2a-42ce-9183-8a9380aa6170" />


<img width="2560" height="1680" alt="univ-pc kmmz jp_viewer_" src="https://github.com/user-attachments/assets/fec5ab9a-f787-4776-9dee-82cd88bf86d7" />


<img width="2532" height="1170" alt="univ-pc kmmz jp_client_(iPhone 12 Pro)" src="https://github.com/user-attachments/assets/06e16ba1-1352-4658-87d9-45f9d6dbcc99" />


<img width="2560" height="1680" alt="univ-pc kmmz jp_viewer_ (2)" src="https://github.com/user-attachments/assets/d35d1cb2-af2f-4b94-8024-1b7791f1fc1c" />




<img width="1919" height="1199" alt="image" src="https://github.com/user-attachments/assets/734bacab-c780-4ecd-bc75-2adda2da4eb2" />

## 工夫点
- 処理が増えるため、プレイヤー以外の動きはあらかじめ決定しておき、フロントエンドに関数やベクトルを送るようにした

## 技術構成
### モニター (フロントエンド)
- HTML/CSS/JavaScript/Canvas/WebSocket

サーバーから受け取ったデータをもとにゲームの画面を描画する。<br>
キャラクターや敵、弾などのオブジェクトを描画する。

### スマートフォン (フロントエンド)
- HTML/CSS/JavaScript/WebSocket

スマートフォンのジャイロセンサーから傾きを検知して、サーバーに移動量を送信する。<br>
スマートフォンのタップを検知して、サーバーに射撃の指示などを送信する。

### サーバー (バックエンド)
- JavaScript/Node.js/WebSocket/Express

ゲームのシステムを実装する。<br>
スマートフォンから受け取ったデータを処理して、ゲームの状態を更新し、モニターに描画する指示データを送信する。<br>
ゲームの状態は、プレイヤーの位置やHP、スコア、敵の位置やHP、弾の位置などを管理する。

# 起動手順
バックエンドを起動すると自動的にフロントエンド側もパスが通されます。<br>
フロントエンド側はモニターが/viewer, スマートフォンが/clientとなります。

## 起動方法1
```bash
run.bat
```

Windowsであればrun.batから実行します

## 起動方法2
```bash
cd backend
npm install
npm run dev
npm run ngrok
```

