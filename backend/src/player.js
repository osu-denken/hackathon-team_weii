const players = new Map();
const socketToPlayerId = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const X_MIN = -5;
const X_MAX = 5;

const BASE_ATTACK = 1;
const POWER_ATTACK = 2;
const MAX_HP = 5;

const PLAYER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
let nextPlayerNumber = 1;

const join = (ws, id) => {
  const playerNumber = nextPlayerNumber++;
  const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
  const player = {
    id,
    x: 0,
    hp: MAX_HP,
    maxHp: MAX_HP,
    score: 0,
    attackPower: BASE_ATTACK,
    powerUntil: 0,
    lastShotAt: 0,
    number: playerNumber,
    color,
    heldItem: null,
  };

  players.set(id, player);
  socketToPlayerId.set(ws, id);
  return player;
};

const leave = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return;
  }

  players.delete(id);
  socketToPlayerId.delete(ws);

  if (players.size === 0) {
    nextPlayerNumber = 1;
  }
};

const move = (ws, delta) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return;
  }

  const player = players.get(id);
  if (!player) {
    return;
  }

  const moveDelta = clamp(Number(delta) || 0, -1, 1);
  player.x = clamp(player.x + moveDelta, X_MIN, X_MAX);
};

const addScore = (id, value) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.score += value;
};

const totalScore = () => Array.from(players.values()).reduce((sum, player) => sum + player.score, 0);

const heal = (id, amount) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.hp = clamp(player.hp + amount, 0, player.maxHp);
};

const damage = (id, amount) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.hp = clamp(player.hp - amount, 0, player.maxHp);
};

const listRaw = () => Array.from(players.values());

const setHeldItem = (id, item) => {
  const player = players.get(id);
  if (!player || player.heldItem) {
    return false;
  }

  player.heldItem = item;
  return true;
};

const consumeHeldItem = (id) => {
  const player = players.get(id);
  if (!player || !player.heldItem) {
    return null;
  }

  const item = player.heldItem;
  player.heldItem = null;
  return item;
};

const getHeldItem = (id) => {
  const player = players.get(id);
  if (!player) {
    return null;
  }

  return player.heldItem;
};

const hasHeldItem = (id) => {
  const player = players.get(id);
  return !!(player && player.heldItem);
};

const applyPower = (id, now, durationMs) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.attackPower = POWER_ATTACK;
  player.powerUntil = now + durationMs;
};

const updatePowers = (now) => {
  players.forEach((player) => {
    if (player.attackPower !== BASE_ATTACK && player.powerUntil <= now) {
      player.attackPower = BASE_ATTACK;
      player.powerUntil = 0;
    }
  });
};

const canShoot = (id, now, cooldownMs) => {
  const player = players.get(id);
  if (!player) {
    return false;
  }

  return now - player.lastShotAt >= cooldownMs;
};

const markShot = (id, now) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.lastShotAt = now;
};

const getPlayerBySocket = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return null;
  }

  return players.get(id) || null;
};

const list = () => Array.from(players.values()).map((player) => ({
  id: player.id,
  x: player.x,
  hp: player.hp,
  maxHp: player.maxHp,
  score: player.score,
  number: player.number,
  color: player.color,
}));

const forEachSocket = (callback) => {
  socketToPlayerId.forEach((id, ws) => {
    const player = players.get(id);
    if (!player) {
      return;
    }

    callback(ws, player);
  });
};

export {
  join,
  leave,
  move,
  getPlayerBySocket,
  list,
  addScore,
  totalScore,
  heal,
  damage,
  listRaw,
  setHeldItem,
  consumeHeldItem,
  getHeldItem,
  hasHeldItem,
  applyPower,
  updatePowers,
  canShoot,
  markShot,
  forEachSocket,
};
