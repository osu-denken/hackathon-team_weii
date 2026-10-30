// frontend/play/main.js は WebSocket でサーバーに接続する作りなので、
// 同じ API を持つ PeerJS 版の WebSocket に差し替えて、そのまま P2P で使えるようにする。
// 接続先は、同じページ内の iframe (ホスト画面) が発行した Room ID。
import Peer from 'peerjs';
import { fetchPeerConfig, watchIceState, debugLog } from './iceServers.js';

const ROOM_ID_PATTERN = /^[A-Za-z0-9]{8}$/;
const ROOM_ID_TIMEOUT_MS = 20000;

function waitForRoomId() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const iframe = document.querySelector('iframe');
      const text = iframe?.contentDocument?.getElementById('room-id-display')?.textContent?.trim();
      if (text && ROOM_ID_PATTERN.test(text)) {
        clearInterval(timer);
        resolve(text);
      } else if (Date.now() - startedAt > ROOM_ID_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error('ホストの Room ID を取得できませんでした'));
      }
    }, 200);
  });
}

class PeerSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor() {
    super();
    this.readyState = PeerSocket.CONNECTING;
    this._peer = null;
    this._conn = null;
    this._player = null;
    this._start();
  }

  async _start() {
    try {
      const roomId = await waitForRoomId();
      const peerConfig = await fetchPeerConfig();
      this._peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true, config: peerConfig });

      this._peer.on('open', () => {
        this._conn = this._peer.connect(roomId);
        watchIceState(this._conn, 'play');

        this._conn.on('open', () => {
          this.readyState = PeerSocket.OPEN;
          this.dispatchEvent(new Event('open'));
        });
        this._conn.on('data', (data) => this._onData(data));
        this._conn.on('close', () => this._finish());
        this._conn.on('error', () => this._finish(true));
      });
      this._peer.on('error', (err) => {
        debugLog('[play] peer error: ' + err.type);
        this._finish(true);
      });
    } catch (err) {
      debugLog('[play] ' + err);
      this._finish(true);
    }
  }

  // ホストは 'update' で自分のプレイヤー情報を送ってくる (一部の項目のみの場合がある)
  _onData(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'joinRejected') {
      alert('満員のため参加できません');
      this.close();
      return;
    }
    if (data.type === 'kicked' || data.type === 'gameReset') {
      this.close();
      return;
    }
    let payload = data;
    if (data.type === 'joinAck' || data.type === 'update') {
      if (data.player) this._player = { ...this._player, ...data.player };
      payload = { ...data, type: data.type === 'update' ? 'playerState' : data.type, player: this._player };
    }
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }

  send(text) {
    if (this.readyState !== PeerSocket.OPEN || !this._conn) return;
    try {
      this._conn.send(JSON.parse(text));
    } catch (err) {
      console.error('send error', err);
    }
  }

  close() {
    if (this.readyState === PeerSocket.CLOSED) return;
    this.readyState = PeerSocket.CLOSING;
    try { this._conn?.close(); } catch { /* noop */ }
    this._finish();
  }

  _finish(isError = false) {
    if (this.readyState === PeerSocket.CLOSED) return;
    this.readyState = PeerSocket.CLOSED;
    try { this._peer?.destroy(); } catch { /* noop */ }
    if (isError) this.dispatchEvent(new Event('error'));
    this.dispatchEvent(new Event('close'));
  }
}

window.WebSocket = PeerSocket;
