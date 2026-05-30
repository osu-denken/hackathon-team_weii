# スマートフォンのフロントエンド（操作用）

言語: HTML + JavaScript + CSS

- ブラウザでの操作画面
- スマートフォンの傾きの検知
- バックエンドへ移動量や操作したボタンなどを送信する

## 送信データ
### 参加
```json
{
  "type": "join",
  "id": "<端末のuuid>"
}
```


### 離脱
```json
{
  "type": "leave"
}
```


### 移動
```json
{
  "type": "move",
  "delta": -0.4
}
```
スマートフォンのジャイロセンサーからdelta (移動量)を求める. 
範囲は-1 ～ 1

### 射撃
```json
{
  "type": "shoot"
}
```

### アイテム使用
```json
{
  "type": "useItem"
}
```

識別のためにcrypto.randomUUID()で端末のuuidを生成しておく, WebSocketで実装する

## 受信データ
### 参加応答
参加したときにバックエンドから送られてくる
```json
{
  "type": "joinAck",
  "player": {
    "id": "<端末のuuid>",
    "number": 1,
    "color": "#2563eb"
  }
}
```

### プレイヤー状態
```json
{
  "type": "playerState",
  "player": {
    "id": "<端末のuuid>",
    "hp": 5,
    "maxHp": 5,
    "score": 12,
    "attackPower": 1,
    "powerRemainingMs": 0,
    "number": 1,
    "color": "#2563eb",
    "bulletsActive": 2,
    "bulletsMax": 12,
    "canShoot": true,
    "cooldownRemainingMs": 0
  },
  "item": {
    "id": "<アイテムのuuid>",
    "type": "heal",
    "x": 0,
    "y": 2
  },
  "game": {
    "totalScore": 20,
    "targetScore": 100,
    "timeLimitMs": 120000,
    "timeRemainingMs": 65000,
    "cleared": false
  }
}
```

## 債務
- アイテム表示 (回復/攻撃力アップ) とタップで使用
- ショットのクールダウン表示、長押し連射対応
- 残弾やクールダウンの視覚化
- プレイヤーHPやスコア表示の追加
- 受信したplayerStateをもとにUIを更新

