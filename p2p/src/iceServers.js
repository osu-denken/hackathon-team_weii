// PeerJS 標準の ICE サーバーを優先しつつ、Cloudflare の TURN を追加で渡す
// ICE は直接接続 > STUN > TURN 中継の順で自動的に選ぶので、PeerJS 標準で繋がるならそちらが使われ、
// 繋がらない場合にだけ Cloudflare の TURN (TCP/443 含む) に切り替わる
// VITE_TURN_CREDENTIALS_URL が未設定、または取得に失敗した場合は PeerJS のデフォルトのまま動く
const CREDENTIALS_URL = import.meta.env.VITE_TURN_CREDENTIALS_URL;
const TIMEOUT_MS = 4000;

// PeerJS 1.5 のデフォルト設定と同じもの (config を渡すとデフォルトが置き換わるため明示する)
const PEERJS_DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
    username: 'peerjs',
    credential: 'peerjsp'
  }
];

export async function fetchPeerConfig() {
  if (!CREDENTIALS_URL) {
    debugLog("[turn] URL未設定。PeerJS標準で動作");
    return undefined;
  }
  try {
    const res = await fetch(CREDENTIALS_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { iceServers } = await res.json();

    if (!Array.isArray(iceServers) || iceServers.length === 0) throw new Error('empty iceServers');
    const merged = [...PEERJS_DEFAULT_ICE_SERVERS, ...iceServers];

    // 形式が不正だと RTCPeerConnection の生成で例外になり PeerJS ごと使えなくなるので、先に検証する
    new RTCPeerConnection({ iceServers: merged }).close();

    debugLog('[turn] Cloudflare TURN を追加');
    return { iceServers: merged };
  } catch (err) {
    debugLog('[turn] 取得失敗。PeerJS標準で動作: ' + err);
    return undefined;
  }
}

// URL に ?debug=1 を付けたときだけ、画面の端に接続状況を表示する (接続失敗の切り分け用)
const DEBUG = new URLSearchParams(window.location.search).has('debug');
let debugBox = null;

export function debugLog(text) {
  console.log(text);
  if (!DEBUG) return;
  if (!debugBox) {
    debugBox = document.createElement('pre');
    debugBox.style.cssText =
      'position:fixed;left:0;bottom:0;margin:0;padding:4px 6px;max-width:100%;' +
      'font:10px/1.3 monospace;color:#0f0;background:rgba(0,0,0,.7);z-index:99999;' +
      'pointer-events:none;white-space:pre-wrap';
    document.body.appendChild(debugBox);
  }
  debugBox.textContent += text + '\n';
}

export const isDebug = () => DEBUG;

export function watchIceState(conn, label) {
  const pc = conn.peerConnection;
  if (!pc) return;
  pc.addEventListener('iceconnectionstatechange', () => {
    debugLog('[' + label + '] ice: ' + pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      logSelectedRoute(pc, label);
    }
  });
}

// 実際に使われている経路 (直接 / STUN / TURN中継) を表示する
async function logSelectedRoute(pc, label) {
  try {
    const stats = await pc.getStats();
    const byId = new Map();
    stats.forEach((s) => byId.set(s.id, s));

    let pair = null;
    stats.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = byId.get(s.selectedCandidatePairId);
    });
    if (!pair) {
      // selectedCandidatePairId 非対応のブラウザ向け
      stats.forEach((s) => {
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && (s.nominated || s.selected)) pair = s;
      });
    }
    if (!pair) return debugLog('[' + label + '] route: 不明');

    const local = byId.get(pair.localCandidateId);
    const remote = byId.get(pair.remoteCandidateId);
    const kinds = { host: '直接(同一ネットワーク)', srflx: '直接(STUN)', prflx: '直接', relay: 'TURN中継' };
    const type = local?.candidateType;
    let text = '[' + label + '] route: ' + (kinds[type] || type || '不明');
    if (type === 'relay') {
      // url が取れる環境 (Chrome 等) では、どの TURN を使ったかも出す
      const server = local.url ? (local.url.includes('cloudflare') ? 'Cloudflare' : 'PeerJS') : '';
      text += ' ' + (local.relayProtocol || local.protocol || '') + (server ? ' / ' + server : '');
    } else if (remote?.candidateType === 'relay') {
      text += ' (相手側がTURN中継)';
    }
    debugLog(text);
  } catch (err) {
    debugLog('[' + label + '] route: 取得失敗 ' + err);
  }
}
