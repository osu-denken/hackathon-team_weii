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

識別のためにcrypto.randomUUID()で端末のuuidを生成しておく, WebSocketで実装する

