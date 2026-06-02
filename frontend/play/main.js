const createId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`);

const clientId = createId();
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${window.location.host}`;

const playerState = document.getElementById('player-state');
const playerBadge = document.getElementById('player-badge');
const itemState = document.getElementById('item-state');
const playerDetail = document.getElementById('player-detail');
const btnJoin = document.getElementById('btn-join');
const btnShoot = document.getElementById('btn-shoot');
const btnUseItem = document.getElementById('btn-use-item');
const itemIcon = document.getElementById('item-icon');

const itemIconMap = {
  health_potion: '/asset/images/health_potion.png',
  score_up: '/asset/images/score_up.png',
  shield: '/asset/images/shield.png',
  triple_shot: '/asset/images/triple_shot.png',
  empty: '/asset/images/empty.png',
};

let socket = null;
let connected = false;
let currentHeldItem = null;
let moveTimer = null;
let lastMoveSendAt = 0;
let shootTimer = null;
const activeKeys = new Set();

// Movement tuning: smaller step, higher frequency for smoother long-press movement
const MOVE_INTERVAL_MS = 30; // tick every 30ms (~33fps)
const MOVE_STEP = 0.06; // smaller per-tick delta for smooth motion
const THROTTLE_MS = 20; // allow more frequent sends
const SHOOT_INTERVAL_MS = 120; // auto-fire interval when holding Space (ms)

const setConnectionState = (value) => {
  connected = value;
  if (btnJoin) {
    btnJoin.textContent = value ? 'LEAVE' : 'JOIN';
    btnJoin.classList.toggle('danger', value);
    btnJoin.classList.toggle('primary', !value);
  }
  if (btnShoot) {
    btnShoot.disabled = !value;
  }
};

const setPlayerInfo = (player) => {
  if (!player) {
    if (playerState) playerState.textContent = '-';
    if (playerBadge) playerBadge.textContent = '-';
    if (playerDetail) playerDetail.textContent = 'waiting...';
    currentHeldItem = null;
    if (btnUseItem) btnUseItem.disabled = true;
    if (itemState) itemState.textContent = 'none';
    if (itemIcon) {
      itemIcon.src = itemIconMap.empty;
      itemIcon.style.opacity = '0.35';
    }
    return;
  }

  if (playerState) playerState.textContent = `P${player.number ?? player.id}`;
  if (playerBadge) playerBadge.textContent = String(player.number ?? player.id ?? '-');
  if (playerDetail) {
    const hp = player.hp ?? 0;
    const maxHp = player.maxHp ?? 0;
    const score = player.score ?? 0;
    const cooldown = Math.ceil((player.cooldownRemainingMs ?? 0) / 1000);
    playerDetail.textContent = `HP ${hp}/${maxHp} · SCORE ${score} · CD ${cooldown}s`;
  }

  currentHeldItem = player.heldItem ?? null;
  if (btnUseItem) btnUseItem.disabled = !currentHeldItem;
  if (itemState) itemState.textContent = currentHeldItem ? currentHeldItem.type : 'none';
  if (itemIcon) {
    const key = currentHeldItem ? currentHeldItem.type : 'empty';
    itemIcon.src = itemIconMap[key] || itemIconMap.empty;
    itemIcon.style.opacity = currentHeldItem ? '1' : '0.35';
  }
};

const send = (payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
};

const sendJoin = () => {
  send({ type: 'join', id: clientId });
};

const sendLeave = () => {
  send({ type: 'leave' });
};

const sendShoot = () => {
  send({ type: 'shoot' });
};

const sendUseItem = () => {
  if (!currentHeldItem) {
    return;
  }

  send({ type: 'useItem' });
};

const sendMove = (delta) => {
  const now = Date.now();
  if (now - lastMoveSendAt < THROTTLE_MS) {
    return;
  }

  send({ type: 'move', delta });
  lastMoveSendAt = now;
};

const currentMoveDelta = () => {
  const left = activeKeys.has('ArrowLeft') || activeKeys.has('KeyA');
  const right = activeKeys.has('ArrowRight') || activeKeys.has('KeyD');

  if (left && !right) return -MOVE_STEP;
  if (right && !left) return MOVE_STEP;
  return 0;
};

const updateMovement = () => {
  if (!connected) {
    return;
  }

  const delta = currentMoveDelta();
  if (delta !== 0) {
    sendMove(delta);
  }
};

const startMovementLoop = () => {
  if (moveTimer) {
    return;
  }

  // send initial movement immediately, then schedule repeated updates
  updateMovement();
  moveTimer = window.setInterval(updateMovement, MOVE_INTERVAL_MS);
};

const stopMovementLoop = () => {
  if (!moveTimer) {
    return;
  }

  window.clearInterval(moveTimer);
  moveTimer = null;
};

const connect = () => {
  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    setConnectionState(true);
    sendJoin();
  });

  socket.addEventListener('close', () => {
    setConnectionState(false);
    setPlayerInfo(null);
    stopMovementLoop();
  });

  socket.addEventListener('error', () => {
    setConnectionState(false);
  });

  socket.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (payload.type === 'joinAck' && payload.player) {
      setPlayerInfo(payload.player);
      return;
    }

    if (payload.type === 'playerState' && payload.player) {
      setPlayerInfo(payload.player);
    }
  });
};

const disconnect = () => {
  if (!socket) {
    return;
  }

  try {
    sendLeave();
  } finally {
    socket.close();
    socket = null;
  }
};

btnJoin.addEventListener('click', () => {
  if (connected) {
    disconnect();
    return;
  }

  connect();
});

// Ensure shoot fires reliably while moving: prevent focus stealing and
// support multiple pointer events.
btnShoot.addEventListener('mousedown', (e) => {
  e.preventDefault();
  sendShoot();
});
btnShoot.addEventListener('pointerdown', (e) => {
  // pointerdown covers mouse/touch/pen; preventDefault to avoid focus change
  e.preventDefault();
  sendShoot();
});
btnShoot.addEventListener('click', (e) => {
  // fallback for environments where click is preferred
  e.preventDefault();
  sendShoot();
});
btnShoot.addEventListener('touchstart', (event) => {
  event.preventDefault();
  sendShoot();
}, { passive: false });

btnUseItem.addEventListener('click', sendUseItem);

const startShootingLoop = () => {
  if (shootTimer) return;
  // send immediately and then repeat
  sendShoot();
  shootTimer = window.setInterval(() => sendShoot(), SHOOT_INTERVAL_MS);
};

const stopShootingLoop = () => {
  if (!shootTimer) return;
  window.clearInterval(shootTimer);
  shootTimer = null;
};

const isTypingTarget = (element) => {
  if (!element) {
    return false;
  }

  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable;
};

window.addEventListener('keydown', (event) => {
  if (isTypingTarget(event.target)) {
    return;
  }

  if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'Space') {
    event.preventDefault();
  }

  if (!connected) {
    return;
  }

  if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD') {
    activeKeys.add(event.code);
    startMovementLoop();
    updateMovement();
    return;
  }

  if (event.code === 'Space') {
    // start auto-fire while Space is held so holding Space + movement works reliably
    startShootingLoop();
    return;
  }

  if (event.code === 'KeyE' || event.code === 'Enter') {
    sendUseItem();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD') {
    activeKeys.delete(event.code);
    if (currentMoveDelta() === 0) {
      stopMovementLoop();
    }
  }
  if (event.code === 'Space') {
    stopShootingLoop();
  }
});

window.addEventListener('blur', () => {
  activeKeys.clear();
  stopMovementLoop();
});

window.addEventListener('beforeunload', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendLeave();
    socket.close();
  }
});

setConnectionState(false);
setPlayerInfo(null);
connect();

// Relay clicks from iframe-block to iframe
const iframeBlock = document.querySelector('.iframe-block');
const iframe = document.querySelector('iframe');

if (iframeBlock && iframe) {
  iframeBlock.addEventListener('click', (e) => {
    const rect = iframeBlock.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'simulateClick', x, y }, '*');
    }
  });
}